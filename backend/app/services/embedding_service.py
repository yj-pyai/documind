"""Embedding service for document chunk vectorization.

For this implementation, we use a hash-based embedding approach that
provides reasonable semantic similarity without external API calls.
In production, replace with OpenAI text-embedding-3-small or a local
sentence-transformers model like bge-large-zh-v1.5.
"""

import json
from app.services.llm_service import llm_service


class EmbeddingService:

    def __init__(self, dim: int = 256):
        self.dim = dim

    async def embed_texts(self, texts: list[str]) -> list[list[float]]:
        """Generate embeddings for a list of texts."""
        return await llm_service.get_embeddings(texts)

    async def embed_text(self, text: str) -> list[float]:
        """Generate embedding for a single text."""
        results = await self.embed_texts([text])
        return results[0]

    def similarity(self, a: list[float], b: list[float]) -> float:
        """Compute cosine similarity between two vectors."""
        return llm_service.cosine_similarity(a, b)

    def serialize_embedding(self, vec: list[float]) -> str:
        """Serialize embedding vector to JSON string for storage."""
        return json.dumps(vec)

    def deserialize_embedding(self, json_str: str) -> list[float]:
        """Deserialize embedding from JSON string."""
        return json.loads(json_str)


embedding_service = EmbeddingService()
