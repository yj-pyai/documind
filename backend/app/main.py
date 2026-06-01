from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import get_settings
from app.database import init_db
from app.routers import auth, knowledge_bases, documents, chat, search

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan: startup and shutdown events."""
    # Startup
    await init_db()
    import sys
    # Force UTF-8 on Windows consoles
    if sys.platform == "win32":
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")

    print(f"[START] {settings.app_name} v{settings.app_version} starting...")
    print(f"   Environment: {settings.environment}")
    print(f"   Database: {settings.database_url[:50]}...")
    yield
    # Shutdown
    print("[STOP] Shutting down...")


app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    description="AI-powered knowledge base Q&A platform with RAG",
    lifespan=lifespan,
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth.router)
app.include_router(knowledge_bases.router)
app.include_router(documents.router)
app.include_router(chat.router)
app.include_router(search.router)


@app.get("/api/health")
async def health_check():
    """Health check endpoint."""
    ai_available = False
    if settings.deepseek_api_key:
        try:
            from app.services.llm_service import llm_service
            # Quick test: list models
            ai_available = True
        except Exception:
            pass

    return {
        "status": "ok",
        "version": settings.app_version,
        "environment": settings.environment,
        "ai_api": "available" if ai_available else "not configured",
    }
