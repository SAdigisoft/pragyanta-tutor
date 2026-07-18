from __future__ import annotations

from io import BytesIO

import pytest
from pypdf.errors import PdfReadError
from reportlab.pdfgen import canvas

from api import rag


def _content(chunk: object) -> str:
    if isinstance(chunk, str):
        return chunk
    if isinstance(chunk, dict):
        return str(chunk["content"])
    return str(getattr(chunk, "content"))


def _index(chunk: object, fallback: int) -> int:
    if isinstance(chunk, dict):
        return int(chunk.get("chunk_index", fallback))
    return int(getattr(chunk, "chunk_index", fallback))


def test_chunking_is_deterministic_and_overlaps() -> None:
    text = " ".join(f"token{i}" for i in range(800))

    first = rag.chunk_text(text, chunk_size=500, overlap=50)
    second = rag.chunk_text(text, chunk_size=500, overlap=50)

    assert [_content(c) for c in first] == [_content(c) for c in second]
    assert len(first) == 2
    assert all(_content(c).strip() for c in first)
    assert [_index(c, i) for i, c in enumerate(first)] == list(range(len(first)))

    left = _content(first[0]).split()
    right = _content(first[1]).split()
    assert left[-50:] == right[:50]


def test_chunking_empty_text_returns_no_chunks() -> None:
    assert rag.chunk_text("   \n\t") == []


def test_cosine_similarity_known_ranking() -> None:
    query = [1.0, 0.0]
    candidates = [[1.0, 0.0], [1.0, 1.0], [-1.0, 0.0]]

    scores = [rag.cosine_similarity(query, candidate) for candidate in candidates]

    assert scores[0] == pytest.approx(1.0)
    assert scores[1] == pytest.approx(2**-0.5)
    assert scores[2] == pytest.approx(-1.0)
    assert sorted(range(3), key=scores.__getitem__, reverse=True) == [0, 1, 2]


def test_cosine_similarity_handles_zero_vector() -> None:
    assert rag.cosine_similarity([0.0, 0.0], [1.0, 0.0]) == 0.0


def test_pdf_extraction_returns_text() -> None:
    stream = BytesIO()
    pdf = canvas.Canvas(stream)
    pdf.drawString(72, 720, "Teacher-approved lesson about immutable tuples.")
    pdf.save()

    extracted = rag.extract_pdf_text(stream.getvalue())

    assert "immutable tuples" in extracted


def test_pdf_extraction_rejects_invalid_bytes() -> None:
    with pytest.raises(PdfReadError):
        rag.extract_pdf_text(b"not a PDF")
