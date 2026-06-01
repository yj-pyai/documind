"""RAG (Retrieval Augmented Generation) service.

Core pipeline:
1. Embed user question
2. Semantic search for relevant chunks
3. Build prompt with context
4. LLM streaming generation
"""

import json
from typing import AsyncGenerator
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.document import Document
from app.models.document_chunk import DocumentChunk
from app.models.conversation import Conversation
from app.models.message import Message
from app.services.embedding_service import embedding_service
from app.services.llm_service import llm_service, LLMService
from app.core.prompts import RAG_SYSTEM_PROMPT
from app.config import get_settings


async def search_relevant_chunks(
    db: AsyncSession,
    kb_id: str,
    query: str,
    top_k: int = 5,
) -> list[dict]:
    """Search for the most relevant document chunks in a knowledge base.

    Returns list of dicts with: chunk_id, doc_name, content, score, chunk_index
    """
    # Get all chunks from documents in this knowledge base
    result = await db.execute(
        select(DocumentChunk, Document.filename)
        .join(Document, DocumentChunk.doc_id == Document.id)
        .where(Document.kb_id == kb_id, Document.status == "ready")
    )
    chunks_with_docs = result.all()

    if not chunks_with_docs:
        return []

    # Embed the query
    query_embedding = await embedding_service.embed_text(query)

    # Compute similarity for each chunk
    scored_chunks = []
    for chunk, doc_name in chunks_with_docs:
        if not chunk.embedding_json:
            continue
        chunk_embedding = embedding_service.deserialize_embedding(chunk.embedding_json)
        score = embedding_service.similarity(query_embedding, chunk_embedding)
        scored_chunks.append({
            "chunk_id": chunk.id,
            "doc_name": doc_name,
            "content": chunk.content,
            "chunk_index": chunk.chunk_index,
            "score": score,
        })

    # Sort by relevance score descending
    scored_chunks.sort(key=lambda x: x["score"], reverse=True)

    return scored_chunks[:top_k]


def build_rag_prompt(
    chunks: list[dict],
    question: str,
    history: list[dict] | None = None,
) -> list[dict]:
    """Build the messages array for the LLM chat API with RAG context."""
    # Build context from chunks
    context_parts = []
    for i, chunk in enumerate(chunks):
        context_parts.append(
            f"[{i + 1}] （来源：{chunk['doc_name']}）\n{chunk['content']}"
        )

    context = "\n\n---\n\n".join(context_parts) if context_parts else "（当前知识库中没有文档内容）"

    # Format history
    history_str = ""
    if history:
        history_parts = []
        for msg in history[-6:]:  # Last 3 exchanges (6 messages)
            role = "用户" if msg["role"] == "user" else "助手"
            history_parts.append(f"{role}：{msg['content']}")
        history_str = "\n".join(history_parts)

    # Build system prompt
    system_prompt = RAG_SYSTEM_PROMPT.format(
        context=context,
        history=history_str if history_str else "（无历史对话）",
        question=question,
    )

    messages = [{"role": "system", "content": system_prompt}]

    # Add history as separate messages for better context
    if history:
        for msg in history[-8:]:
            messages.append({"role": msg["role"], "content": msg["content"]})

    messages.append({"role": "user", "content": question})

    return messages


async def get_conversation_history(
    db: AsyncSession, conv_id: str
) -> list[dict]:
    """Get conversation history as a list of {role, content} dicts."""
    result = await db.execute(
        select(Message)
        .where(Message.conv_id == conv_id)
        .order_by(Message.created_at)
    )
    messages = result.scalars().all()
    return [{"role": m.role, "content": m.content} for m in messages]


async def stream_rag_response(
    db: AsyncSession,
    kb_id: str,
    question: str,
    conv_id: str | None = None,
    top_k: int = 5,
) -> AsyncGenerator[dict, None]:
    """Main RAG pipeline: search → build prompt → stream LLM response.

    Yields dicts:
    - {"type": "references", "data": [...]}  -- retrieved chunks
    - {"type": "token", "data": "text"}      -- incremental response tokens
    - {"type": "done", "data": {"answer": "...", "citations": [...]}}
    - {"type": "error", "data": "message"}
    """
    try:
        # Step 1: Search for relevant chunks
        chunks = await search_relevant_chunks(db, kb_id, question, top_k)

        # Step 2: Yield references to the client
        references = [
            {
                "chunk_id": c["chunk_id"],
                "doc_name": c["doc_name"],
                "content_snippet": c["content"][:300],
                "score": round(c["score"], 4),
            }
            for c in chunks
        ]
        yield {"type": "references", "data": references}

        # Step 3: Get conversation history
        history = []
        if conv_id:
            history = await get_conversation_history(db, conv_id)

        # Step 4: Build RAG prompt
        messages = build_rag_prompt(chunks, question, history)

        # Step 5: Stream LLM response
        full_answer = ""
        async for token in llm_service.chat_stream(messages, temperature=0.3, max_tokens=1500):
            full_answer += token
            yield {"type": "token", "data": token}

        # Step 6: Yield done with citations
        citations = [
            {
                "chunk_id": c["chunk_id"],
                "doc_name": c["doc_name"],
                "content_snippet": c["content"][:200],
            }
            for c in chunks[:3]  # Top 3 citations
            if c["score"] > 0.1
        ]

        yield {
            "type": "done",
            "data": {
                "answer": full_answer,
                "citations": citations,
            },
        }

    except Exception as e:
        yield {"type": "error", "data": str(e)}
