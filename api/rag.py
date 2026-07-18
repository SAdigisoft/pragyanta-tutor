import hashlib
import math
import os
import re
from dataclasses import dataclass
from io import BytesIO
from uuid import UUID

import numpy as np
import httpx
from openai import OpenAI
from pypdf import PdfReader
from sqlalchemy import select
from sqlalchemy.orm import Session

from api.models import Chunk
from api.ai import get_ai_provider, ollama_base_url

EMBEDDING_MODEL = "text-embedding-3-small"
EMBEDDING_DIMS = 1536
OLLAMA_EMBEDDING_MODEL = "nomic-embed-text"


@dataclass
class TextChunk:
    chunk_index: int
    content: str


def chunk_text(text: str, chunk_size: int = 500, overlap: int = 50) -> list[TextChunk]:
    """Split on lesson section boundaries first, then use deterministic word windows."""
    text = text.strip()
    if not text:
        return []
    sections = [part.strip() for part in re.split(r"(?=^##\s)", text, flags=re.MULTILINE) if part.strip()]
    chunks: list[TextChunk] = []
    for section in sections or [text]:
        words = section.split()
        if len(words) <= chunk_size:
            chunks.append(TextChunk(len(chunks), section))
            continue
        start = 0
        while start < len(words):
            content = " ".join(words[start : start + chunk_size]).strip()
            if content:
                chunks.append(TextChunk(len(chunks), content))
            if start + chunk_size >= len(words):
                break
            start += max(1, chunk_size - overlap)
    return chunks


def extract_pdf_text(data: bytes) -> str:
    reader = PdfReader(BytesIO(data))
    return "\n\n".join((page.extract_text() or "").strip() for page in reader.pages).strip()


def _mock_embedding(text: str) -> list[float]:
    vector = np.zeros(EMBEDDING_DIMS, dtype=float)
    tokens = re.findall(r"[a-z0-9_]+", text.lower())
    for token in tokens:
        digest = hashlib.sha256(token.encode("utf-8")).digest()
        index = int.from_bytes(digest[:4], "big") % EMBEDDING_DIMS
        vector[index] += -1.0 if digest[4] & 1 else 1.0
    norm = float(np.linalg.norm(vector))
    if norm:
        vector /= norm
    return vector.tolist()


def embed(texts: list[str]) -> list[list[float]]:
    if not texts:
        return []
    provider = get_ai_provider()
    if provider == "mock":
        return [_mock_embedding(text) for text in texts]
    if provider == "ollama":
        model = os.getenv("OLLAMA_EMBED_MODEL", OLLAMA_EMBEDDING_MODEL)
        with httpx.Client(timeout=120.0) as client:
            response = client.post(
                f"{ollama_base_url()}/api/embed",
                json={"model": model, "input": texts, "dimensions": EMBEDDING_DIMS},
            )
            response.raise_for_status()
        vectors = response.json().get("embeddings", [])
        if len(vectors) != len(texts) or any(
            not vector or len(vector) > EMBEDDING_DIMS for vector in vectors
        ):
            raise RuntimeError(
                f"Ollama embedding model {model!r} must return between 1 and "
                f"{EMBEDDING_DIMS} dimensions for every input"
            )
        # Appending zeros preserves cosine similarity while keeping the fixed
        # PostgreSQL vector(1536) contract used by the OpenAI provider.
        return [vector + [0.0] * (EMBEDDING_DIMS - len(vector)) for vector in vectors]
    response = OpenAI().embeddings.create(model=EMBEDDING_MODEL, input=texts)
    ordered = sorted(response.data, key=lambda item: item.index)
    return [item.embedding for item in ordered]


def cosine_similarity(left: list[float], right: list[float]) -> float:
    a, b = np.asarray(left, dtype=float), np.asarray(right, dtype=float)
    denominator = float(np.linalg.norm(a) * np.linalg.norm(b))
    return float(np.dot(a, b) / denominator) if denominator else 0.0


def retrieve(db: Session, lesson_id: UUID, query: str, k: int = 4) -> list[Chunk]:
    query_vector = embed([query])[0]
    statement = (
        select(Chunk)
        .where(Chunk.lesson_id == lesson_id)
        .order_by(Chunk.embedding.cosine_distance(query_vector))
        .limit(k)
    )
    return list(db.scalars(statement))
