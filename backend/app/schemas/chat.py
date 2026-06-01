from pydantic import BaseModel, Field


class ChatRequest(BaseModel):
    conversation_id: str | None = None
    question: str = Field(..., min_length=1, max_length=5000)


class Citation(BaseModel):
    chunk_id: str
    doc_name: str
    content_snippet: str


class MessageResponse(BaseModel):
    id: str
    role: str
    content: str
    citations: list[Citation] | None = None
    created_at: str

    model_config = {"from_attributes": True}


class ConversationResponse(BaseModel):
    id: str
    kb_id: str
    title: str | None = None
    messages: list[MessageResponse] = []
    created_at: str
    updated_at: str

    model_config = {"from_attributes": True}


class ConversationListItem(BaseModel):
    id: str
    kb_id: str
    title: str | None = None
    message_count: int = 0
    last_message: str | None = None
    created_at: str
    updated_at: str

    model_config = {"from_attributes": True}


class ConversationListResponse(BaseModel):
    items: list[ConversationListItem]
    total: int
