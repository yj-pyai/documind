from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db
from app.models.user import User
from app.models.knowledge_base import KnowledgeBase
from app.models.document import Document
from app.schemas.knowledge_base import KBCreate, KBUpdate, KBResponse, KBListResponse
from app.middleware.auth import get_current_user

router = APIRouter(prefix="/api/knowledge-bases", tags=["knowledge-bases"])


@router.post("", response_model=KBResponse, status_code=status.HTTP_201_CREATED)
async def create_kb(
    req: KBCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a new knowledge base."""
    kb = KnowledgeBase(
        user_id=user.id,
        name=req.name,
        description=req.description,
        icon=req.icon,
    )
    db.add(kb)
    await db.commit()
    await db.refresh(kb)

    return KBResponse(
        id=kb.id,
        user_id=kb.user_id,
        name=kb.name,
        description=kb.description,
        icon=kb.icon,
        document_count=0,
        created_at=kb.created_at.isoformat(),
        updated_at=kb.updated_at.isoformat(),
    )


@router.get("", response_model=KBListResponse)
async def list_kbs(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List all knowledge bases for the current user."""
    result = await db.execute(
        select(KnowledgeBase)
        .where(KnowledgeBase.user_id == user.id)
        .order_by(KnowledgeBase.updated_at.desc())
    )
    kbs = result.scalars().all()

    items = []
    for kb in kbs:
        # Count documents
        doc_result = await db.execute(
            select(Document).where(Document.kb_id == kb.id)
        )
        doc_count = len(doc_result.scalars().all())

        items.append(KBResponse(
            id=kb.id,
            user_id=kb.user_id,
            name=kb.name,
            description=kb.description,
            icon=kb.icon,
            document_count=doc_count,
            created_at=kb.created_at.isoformat(),
            updated_at=kb.updated_at.isoformat(),
        ))

    return KBListResponse(items=items, total=len(items))


@router.get("/{kb_id}", response_model=KBResponse)
async def get_kb(
    kb_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get a knowledge base by ID."""
    result = await db.execute(
        select(KnowledgeBase).where(
            KnowledgeBase.id == kb_id,
            KnowledgeBase.user_id == user.id,
        )
    )
    kb = result.scalar_one_or_none()
    if kb is None:
        raise HTTPException(status_code=404, detail="Knowledge base not found")

    doc_result = await db.execute(select(Document).where(Document.kb_id == kb.id))
    doc_count = len(doc_result.scalars().all())

    return KBResponse(
        id=kb.id,
        user_id=kb.user_id,
        name=kb.name,
        description=kb.description,
        icon=kb.icon,
        document_count=doc_count,
        created_at=kb.created_at.isoformat(),
        updated_at=kb.updated_at.isoformat(),
    )


@router.put("/{kb_id}", response_model=KBResponse)
async def update_kb(
    kb_id: str,
    req: KBUpdate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update a knowledge base."""
    result = await db.execute(
        select(KnowledgeBase).where(
            KnowledgeBase.id == kb_id,
            KnowledgeBase.user_id == user.id,
        )
    )
    kb = result.scalar_one_or_none()
    if kb is None:
        raise HTTPException(status_code=404, detail="Knowledge base not found")

    if req.name is not None:
        kb.name = req.name
    if req.description is not None:
        kb.description = req.description
    if req.icon is not None:
        kb.icon = req.icon

    await db.commit()
    await db.refresh(kb)

    doc_result = await db.execute(select(Document).where(Document.kb_id == kb.id))
    doc_count = len(doc_result.scalars().all())

    return KBResponse(
        id=kb.id,
        user_id=kb.user_id,
        name=kb.name,
        description=kb.description,
        icon=kb.icon,
        document_count=doc_count,
        created_at=kb.created_at.isoformat(),
        updated_at=kb.updated_at.isoformat(),
    )


@router.delete("/{kb_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_kb(
    kb_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete a knowledge base and all its documents."""
    result = await db.execute(
        select(KnowledgeBase).where(
            KnowledgeBase.id == kb_id,
            KnowledgeBase.user_id == user.id,
        )
    )
    kb = result.scalar_one_or_none()
    if kb is None:
        raise HTTPException(status_code=404, detail="Knowledge base not found")

    await db.delete(kb)
    await db.commit()
