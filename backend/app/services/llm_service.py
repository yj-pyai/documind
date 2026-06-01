import json
import httpx
from app.config import get_settings


class LLMService:
    """DeepSeek Chat API client with streaming support."""

    def __init__(self):
        settings = get_settings()
        self.api_key = settings.deepseek_api_key
        self.base_url = settings.deepseek_base_url.rstrip("/")
        self.chat_model = settings.deepseek_chat_model

    def _headers(self) -> dict:
        return {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }

    async def chat_stream(self, messages: list[dict], temperature: float = 0.7, max_tokens: int = 1500):
        """Stream chat completion from DeepSeek."""
        async with httpx.AsyncClient(timeout=60.0) as client:
            async with client.stream(
                "POST",
                f"{self.base_url}/v1/chat/completions",
                headers=self._headers(),
                json={
                    "model": self.chat_model,
                    "messages": messages,
                    "temperature": temperature,
                    "max_tokens": max_tokens,
                    "stream": True,
                },
            ) as response:
                response.raise_for_status()
                async for line in response.aiter_lines():
                    if line.startswith("data: "):
                        data_str = line[6:]
                        if data_str == "[DONE]":
                            break
                        try:
                            data = json.loads(data_str)
                            delta = data["choices"][0].get("delta", {})
                            content = delta.get("content", "")
                            if content:
                                yield content
                        except (json.JSONDecodeError, KeyError, IndexError):
                            continue

    async def chat(self, messages: list[dict], temperature: float = 0.7, max_tokens: int = 1500) -> str:
        """Non-streaming chat completion. Returns full response."""
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(
                f"{self.base_url}/v1/chat/completions",
                headers=self._headers(),
                json={
                    "model": self.chat_model,
                    "messages": messages,
                    "temperature": temperature,
                    "max_tokens": max_tokens,
                    "stream": False,
                },
            )
            response.raise_for_status()
            data = response.json()
            return data["choices"][0]["message"]["content"]

    async def get_embeddings(self, texts: list[str]) -> list[list[float]]:
        """Get embeddings for texts using DeepSeek API.

        Note: If DeepSeek doesn't have a dedicated embedding endpoint,
        we use the chat API with a special prompt to extract embeddings.
        For production, use a dedicated embedding API.
        """
        # DeepSeek doesn't have a standalone embedding API as of now.
        # We'll use a workaround: generate embeddings via the chat API
        # with a special system prompt that asks for a numerical representation.
        #
        # In production, you might switch to:
        # - text-embedding-3-small (OpenAI)
        # - bge-large-zh (local via sentence-transformers)
        #
        # For this project, we implement a simple keyword-frequency based
        # embedding approach as fallback, or use the chat model's internal states.

        # Simple bag-of-words + TF approach for demonstration
        # This is a simplified embedding; in production use a real embedding model
        embeddings = []
        for text in texts:
            vec = self._simple_embed(text)
            embeddings.append(vec)
        return embeddings

    def _simple_embed(self, text: str, dim: int = 256) -> list[float]:
        """Generate a simple frequency-based embedding.

        For production: replace with real embedding API calls.
        This provides a basic but functional semantic representation.
        """
        import hashlib

        # Use character n-grams with hashing trick for a simple embedding
        n_grams = [3, 4, 5]  # n-gram sizes
        vec = [0.0] * dim

        text_lower = text.lower()
        for n in n_grams:
            for i in range(len(text_lower) - n + 1):
                ngram = text_lower[i:i + n]
                h = int(hashlib.md5(ngram.encode()).hexdigest(), 16)
                idx = h % dim
                vec[idx] += 1.0

        # Normalize
        norm = sum(v * v for v in vec) ** 0.5
        if norm > 0:
            vec = [v / norm for v in vec]

        return vec

    @staticmethod
    def cosine_similarity(a: list[float], b: list[float]) -> float:
        """Compute cosine similarity between two vectors."""
        dot = sum(x * y for x, y in zip(a, b))
        norm_a = sum(x * x for x in a) ** 0.5
        norm_b = sum(x * x for x in b) ** 0.5
        if norm_a == 0 or norm_b == 0:
            return 0.0
        return dot / (norm_a * norm_b)


# Singleton
llm_service = LLMService()
