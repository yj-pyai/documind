from pydantic import BaseModel


class SearchResultItem(BaseModel):
    chunk_id: str
    doc_id: str
    doc_name: str
    content: str
    chunk_index: int
    score: float


class SearchResponse(BaseModel):
    query: str
    results: list[SearchResultItem]
    total: int
