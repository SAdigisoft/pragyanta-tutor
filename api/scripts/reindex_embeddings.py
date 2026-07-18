"""Rebuild every stored chunk vector with the currently configured AI provider."""

from sqlalchemy import select

from api.ai import get_ai_provider
from api.database import SessionLocal
from api.models import Chunk
from api.rag import embed


def main() -> None:
    with SessionLocal.begin() as db:
        chunks = list(db.scalars(select(Chunk).order_by(Chunk.lesson_id, Chunk.chunk_index)))
        if not chunks:
            print("No chunks found; nothing to reindex.")
            return
        vectors = embed([chunk.content for chunk in chunks])
        for chunk, vector in zip(chunks, vectors, strict=True):
            chunk.embedding = vector
    print(f"Reindexed {len(chunks)} chunks with AI_PROVIDER={get_ai_provider()}.")


if __name__ == "__main__":
    main()
