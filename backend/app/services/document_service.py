"""Document processing service: upload, parse, chunk, embed."""

import os
import uuid
import aiofiles
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.config import get_settings
from app.models.document import Document
from app.models.document_chunk import DocumentChunk
from app.models.knowledge_base import KnowledgeBase
from app.core.parser import parse_document
from app.core.chunker import chunk_text_semantic
from app.services.embedding_service import embedding_service


async def save_upload_file(file, kb_id: str) -> tuple[str, str, int]:
    """Save an uploaded file to disk. Returns (file_path, original_filename, file_size)."""
    settings = get_settings()
    upload_dir = os.path.join(settings.upload_dir, kb_id)
    os.makedirs(upload_dir, exist_ok=True)

    original_filename = file.filename or "unknown"
    ext = os.path.splitext(original_filename)[1].lower()
    unique_name = f"{uuid.uuid4().hex}{ext}"
    file_path = os.path.join(upload_dir, unique_name)

    content = await file.read()
    file_size = len(content)

    async with aiofiles.open(file_path, "wb") as f:
        await f.write(content)

    return file_path, original_filename, file_size


def get_file_type(filename: str) -> str:
    """Detect file type from extension."""
    ext = os.path.splitext(filename)[1].lower()
    mapping = {
        ".pdf": "pdf",
        ".docx": "docx",
        ".doc": "docx",
        ".md": "md",
        ".markdown": "md",
        ".txt": "txt",
    }
    return mapping.get(ext, "txt")


async def process_document(
    db: AsyncSession,
    doc: Document,
    chunk_size: int = 500,
    chunk_overlap: int = 100,
) -> None:
    """Process a document: parse → chunk → embed → store.

    This is the core document processing pipeline.
    """
    try:
        # Update status
        doc.status = "processing"
        await db.commit()

        # Step 1: Parse document to plain text
        text = await parse_document(doc.file_path, doc.file_type)

        if not text or not text.strip():
            raise ValueError("Document contains no extractable text")

        # Step 2: Chunk the text
        chunks_data = chunk_text_semantic(text, chunk_size, chunk_overlap)

        if not chunks_data:
            raise ValueError("Document could not be split into chunks")

        # Step 3: Generate embeddings for all chunks
        chunk_texts = [c["content"] for c in chunks_data]
        embeddings = await embedding_service.embed_texts(chunk_texts)

        # Step 4: Store chunks with embeddings
        for i, chunk_data in enumerate(chunks_data):
            chunk = DocumentChunk(
                doc_id=doc.id,
                chunk_index=chunk_data["index"],
                content=chunk_data["content"],
                section_title=chunk_data.get("section_title"),
                embedding_json=embedding_service.serialize_embedding(embeddings[i]),
            )
            db.add(chunk)

        doc.chunk_count = len(chunks_data)
        doc.status = "ready"
        await db.commit()

    except Exception as e:
        doc.status = "error"
        doc.error_message = str(e)
        await db.commit()
        raise


async def delete_document_files(doc: Document) -> None:
    """Delete document files from disk."""
    if os.path.exists(doc.file_path):
        os.remove(doc.file_path)


async def get_kb_document_count(db: AsyncSession, kb_id: str) -> int:
    """Get the count of documents in a knowledge base."""
    result = await db.execute(
        select(Document).where(Document.kb_id == kb_id)
    )
    return len(result.scalars().all())
