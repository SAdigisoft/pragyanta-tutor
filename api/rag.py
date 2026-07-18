import hashlib
import math
import os
import re
from dataclasses import dataclass
from io import BytesIO
from uuid import UUID

import numpy as np
from openai import OpenAI
from pypdf import PdfReader
from sqlalchemy import select
from sqlalchemy.orm import Session

from api.models import Chunk

EMBEDDING_MODEL = "text-embedding-3-small"
EMBEDDING_DIMS = 1536


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
    use_mock = os.getenv("MOCK_OPENAI", "1") == "1" or not os.getenv("OPENAI_API_KEY")
    if use_mock:
        return [_mock_embedding(text) for text in texts]
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

