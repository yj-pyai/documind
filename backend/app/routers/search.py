from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.models.user import User
from app.models.knowledge_base import KnowledgeBase
from app.schemas.search import SearchResponse, SearchResultItem
from app.middleware.auth import get_current_user
from app.services.rag_service import search_relevant_chunks
from sqlalchemy import select

router = APIRouter(prefix="/api", tags=["search"])


@router.get("/knowledge-bases/{kb_id}/search", response_model=SearchResponse)
async def search_kb(
    kb_id: str,
    q: str = Query(..., min_length=1, description="Search query"),
    top_k: int = Query(10, ge=1, le=50),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Semantic search across documents in a knowledge base."""
    # Verify ownership
    result = await db.execute(
        select(KnowledgeBase).where(
            KnowledgeBase.id == kb_id,
            KnowledgeBase.user_id == user.id,
        )
    )
    if result.scalar_one_or_none() is None:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Knowledge base not found")

    chunks = await search_relevant_chunks(db, kb_id, q, top_k)

    results = [
        SearchResultItem(
            chunk_id=c["chunk_id"],
            doc_id="",  # We don't have doc_id directly from search_relevant_chunks
            doc_name=c["doc_name"],
            content=c["content"],
            chunk_index=c["chunk_index"],
            score=round(c["score"], 4),
        )
        for c in chunks
    ]

    return SearchResponse(query=q, results=results, total=len(results))
