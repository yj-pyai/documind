import json
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db
from app.models.user import User
from app.models.knowledge_base import KnowledgeBase
from app.models.conversation import Conversation
from app.models.message import Message
from app.schemas.chat import (
    ChatRequest,
    ConversationResponse,
    ConversationListItem,
    ConversationListResponse,
    MessageResponse,
    Citation,
)
from app.middleware.auth import get_current_user
from app.services.rag_service import stream_rag_response
from app.core.prompts import CONVERSATION_TITLE_PROMPT
from app.services.llm_service import llm_service

router = APIRouter(prefix="/api", tags=["chat"])


async def _verify_kb_access(kb_id: str, user_id: str, db: AsyncSession) -> KnowledgeBase:
    """Verify user owns the knowledge base."""
    result = await db.execute(
        select(KnowledgeBase).where(
            KnowledgeBase.id == kb_id,
            KnowledgeBase.user_id == user_id,
        )
    )
    kb = result.scalar_one_or_none()
    if kb is None:
        raise HTTPException(status_code=404, detail="Knowledge base not found")
    return kb


@router.post("/knowledge-bases/{kb_id}/chat")
async def chat_with_kb(
    kb_id: str,
    req: ChatRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Chat with a knowledge base using RAG. Returns SSE stream."""
    kb = await _verify_kb_access(kb_id, user.id, db)

    # Get or create conversation
    conv_id = req.conversation_id
    if conv_id:
        # Verify conversation belongs to user
        conv_result = await db.execute(
            select(Conversation).where(
                Conversation.id == conv_id,
                Conversation.user_id == user.id,
            )
        )
        conv = conv_result.scalar_one_or_none()
        if conv is None:
            conv_id = None  # Create new if not found

    if not conv_id:
        # Generate title from first question
        try:
            title = await llm_service.chat(
                [
                    {"role": "system", "content": CONVERSATION_TITLE_PROMPT.format(question=req.question)},
                ],
                max_tokens=30,
            )
            title = title.strip()[:20]
        except Exception:
            title = req.question[:20]

        conv = Conversation(kb_id=kb_id, user_id=user.id, title=title)
        db.add(conv)
        await db.commit()
        await db.refresh(conv)
        conv_id = conv.id

    # Save user message
    user_msg = Message(conv_id=conv_id, role="user", content=req.question)
    db.add(user_msg)
    await db.commit()

    async def generate():
        """SSE event generator."""
        full_answer = ""
        citations = []

        try:
            async for event in stream_rag_response(db, kb_id, req.question, conv_id):
                event_type = event.get("type")

                if event_type == "references":
                    yield f"event: references\ndata: {json.dumps(event['data'], ensure_ascii=False)}\n\n"

                elif event_type == "token":
                    yield f"event: token\ndata: {json.dumps({'text': event['data']}, ensure_ascii=False)}\n\n"

                elif event_type == "done":
                    full_answer = event["data"]["answer"]
                    citations = event["data"]["citations"]

                    # Save assistant message with citations
                    assistant_msg = Message(
                        conv_id=conv_id,
                        role="assistant",
                        content=full_answer,
                        citations_json=json.dumps(citations, ensure_ascii=False),
                    )
                    db.add(assistant_msg)
                    await db.commit()

                    yield f"event: done\ndata: {json.dumps(event['data'], ensure_ascii=False)}\n\n"

                elif event_type == "error":
                    yield f"event: error\ndata: {json.dumps({'message': event['data']}, ensure_ascii=False)}\n\n"

        except Exception as e:
            yield f"event: error\ndata: {json.dumps({'message': str(e)}, ensure_ascii=False)}\n\n"

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",  # Disable nginx buffering
        },
    )


@router.get("/conversations", response_model=ConversationListResponse)
async def list_conversations(
    kb_id: str | None = None,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List conversations for the current user, optionally filtered by knowledge base."""
    query = select(Conversation).where(Conversation.user_id == user.id)
    if kb_id:
        query = query.where(Conversation.kb_id == kb_id)
    query = query.order_by(Conversation.updated_at.desc())

    result = await db.execute(query)
    convs = result.scalars().all()

    items = []
    for conv in convs:
        # Count messages
        msg_result = await db.execute(
            select(Message).where(Message.conv_id == conv.id)
        )
        messages = msg_result.scalars().all()
        last_msg = messages[-1].content[:100] if messages else None

        items.append(ConversationListItem(
            id=conv.id,
            kb_id=conv.kb_id,
            title=conv.title,
            message_count=len(messages),
            last_message=last_msg,
            created_at=conv.created_at.isoformat(),
            updated_at=conv.updated_at.isoformat(),
        ))

    return ConversationListResponse(items=items, total=len(items))


@router.get("/conversations/{conv_id}", response_model=ConversationResponse)
async def get_conversation(
    conv_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get a conversation with all messages."""
    result = await db.execute(
        select(Conversation).where(
            Conversation.id == conv_id,
            Conversation.user_id == user.id,
        )
    )
    conv = result.scalar_one_or_none()
    if conv is None:
        raise HTTPException(status_code=404, detail="Conversation not found")

    msg_result = await db.execute(
        select(Message)
        .where(Message.conv_id == conv_id)
        .order_by(Message.created_at)
    )
    messages = msg_result.scalars().all()

    message_responses = []
    for msg in messages:
        citations = None
        if msg.citations_json:
            try:
                citations_data = json.loads(msg.citations_json)
                citations = [Citation(**c) for c in citations_data]
            except (json.JSONDecodeError, TypeError):
                pass

        message_responses.append(MessageResponse(
            id=msg.id,
            role=msg.role,
            content=msg.content,
            citations=citations,
            created_at=msg.created_at.isoformat(),
        ))

    return ConversationResponse(
        id=conv.id,
        kb_id=conv.kb_id,
        title=conv.title,
        messages=message_responses,
        created_at=conv.created_at.isoformat(),
        updated_at=conv.updated_at.isoformat(),
    )


@router.delete("/conversations/{conv_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_conversation(
    conv_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete a conversation."""
    result = await db.execute(
        select(Conversation).where(
            Conversation.id == conv_id,
            Conversation.user_id == user.id,
        )
    )
    conv = result.scalar_one_or_none()
    if conv is None:
        raise HTTPException(status_code=404, detail="Conversation not found")

    await db.delete(conv)
    await db.commit()
