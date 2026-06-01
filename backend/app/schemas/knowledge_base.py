from pydantic import BaseModel, Field


class KBCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    description: str | None = None
    icon: str = "books"


class KBUpdate(BaseModel):
    name: str | None = Field(None, min_length=1, max_length=200)
    description: str | None = None
    icon: str | None = None


class KBResponse(BaseModel):
    id: str
    user_id: str
    name: str
    description: str | None = None
    icon: str | None = "books"
    document_count: int = 0
    created_at: str
    updated_at: str

    model_config = {"from_attributes": True}


class KBListResponse(BaseModel):
    items: list[KBResponse]
    total: int
