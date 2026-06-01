import os
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db
from app.models.user import User
from app.models.knowledge_base import KnowledgeBase
from app.models.document import Document
from app.schemas.document import DocumentResponse, DocumentListResponse
from app.middleware.auth import get_current_user
from app.services.document_service import (
    save_upload_file,
    get_file_type,
    process_document,
    delete_document_files,
)

router = APIRouter(prefix="/api/knowledge-bases", tags=["documents"])


@router.post("/{kb_id}/documents", response_model=DocumentResponse, status_code=status.HTTP_201_CREATED)
async def upload_document(
    kb_id: str,
    file: UploadFile = File(...),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Upload a document to a knowledge base."""
    # Verify knowledge base ownership
    result = await db.execute(
        select(KnowledgeBase).where(
            KnowledgeBase.id == kb_id,
            KnowledgeBase.user_id == user.id,
        )
    )
    kb = result.scalar_one_or_none()
    if kb is None:
        raise HTTPException(status_code=404, detail="Knowledge base not found")

    # Validate file type
    file_type = get_file_type(file.filename or "")
    if file_type not in ("pdf", "docx", "md", "txt"):
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type. Supported: PDF, DOCX, MD, TXT",
        )

    # Save file
    file_path, original_filename, file_size = await save_upload_file(file, kb_id)

    # Create document record
    doc = Document(
        kb_id=kb_id,
        filename=original_filename,
        file_type=file_type,
        file_size=file_size,
        file_path=file_path,
        status="processing",
    )
    db.add(doc)
    await db.commit()
    await db.refresh(doc)

    # Process document asynchronously
    try:
        await process_document(db, doc)
    except Exception as e:
        # Document status is already set to "error" in process_document
        pass

    return DocumentResponse(
        id=doc.id,
        kb_id=doc.kb_id,
        filename=doc.filename,
        file_type=doc.file_type,
        file_size=doc.file_size,
        chunk_count=doc.chunk_count,
        status=doc.status,
        error_message=doc.error_message,
        created_at=doc.created_at.isoformat(),
    )


@router.get("/{kb_id}/documents", response_model=DocumentListResponse)
async def list_documents(
    kb_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List all documents in a knowledge base."""
    # Verify ownership
    result = await db.execute(
        select(KnowledgeBase).where(
            KnowledgeBase.id == kb_id,
            KnowledgeBase.user_id == user.id,
        )
    )
    if result.scalar_one_or_none() is None:
        raise HTTPException(status_code=404, detail="Knowledge base not found")

    result = await db.execute(
        select(Document)
        .where(Document.kb_id == kb_id)
        .order_by(Document.created_at.desc())
    )
    docs = result.scalars().all()

    items = [
        DocumentResponse(
            id=doc.id,
            kb_id=doc.kb_id,
            filename=doc.filename,
            file_type=doc.file_type,
            file_size=doc.file_size,
            chunk_count=doc.chunk_count,
            status=doc.status,
            error_message=doc.error_message,
            created_at=doc.created_at.isoformat(),
        )
        for doc in docs
    ]

    return DocumentListResponse(items=items, total=len(items))


@router.delete("/{kb_id}/documents/{doc_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_document(
    kb_id: str,
    doc_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete a document from a knowledge base."""
    # Verify ownership
    result = await db.execute(
        select(KnowledgeBase).where(
            KnowledgeBase.id == kb_id,
            KnowledgeBase.user_id == user.id,
        )
    )
    if result.scalar_one_or_none() is None:
        raise HTTPException(status_code=404, detail="Knowledge base not found")

    result = await db.execute(
        select(Document).where(Document.id == doc_id, Document.kb_id == kb_id)
    )
    doc = result.scalar_one_or_none()
    if doc is None:
        raise HTTPException(status_code=404, detail="Document not found")

    # Delete files from disk
    await delete_document_files(doc)

    await db.delete(doc)
    await db.commit()


@router.post("/{kb_id}/documents/{doc_id}/reprocess", response_model=DocumentResponse)
async def reprocess_document(
    kb_id: str,
    doc_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Re-process a document (parse, chunk, embed again)."""
    result = await db.execute(
        select(Document).where(
            Document.id == doc_id,
            Document.kb_id == kb_id,
        )
    )
    doc = result.scalar_one_or_none()
    if doc is None:
        raise HTTPException(status_code=404, detail="Document not found")

    # Clear existing chunks
    from app.models.document_chunk import DocumentChunk
    chunk_result = await db.execute(
        select(DocumentChunk).where(DocumentChunk.doc_id == doc.id)
    )
    for chunk in chunk_result.scalars().all():
        await db.delete(chunk)
    await db.commit()

    # Re-process
    try:
        await process_document(db, doc)
    except Exception:
        pass

    return DocumentResponse(
        id=doc.id,
        kb_id=doc.kb_id,
        filename=doc.filename,
        file_type=doc.file_type,
        file_size=doc.file_size,
        chunk_count=doc.chunk_count,
        status=doc.status,
        error_message=doc.error_message,
        created_at=doc.created_at.isoformat(),
    )
