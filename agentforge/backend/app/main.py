"""
AgentForge Backend - FastAPI Application

The backend handles:
- IR validation and storage
- Code generation for 6 frameworks
- AI Copilot conversations
- Project management and versioning
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .api.v1 import copilot, generation, ir, projects
from .config import settings

app = FastAPI(
    title=settings.app_name,
    description="Enterprise Agent Development Studio - Backend API",
    version="0.1.0",
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# API routes
app.include_router(projects.router, prefix="/api/v1/projects", tags=["projects"])
app.include_router(ir.router, prefix="/api/v1/ir", tags=["ir"])
app.include_router(generation.router, prefix="/api/v1/generation", tags=["generation"])
app.include_router(copilot.router, prefix="/api/v1/copilot", tags=["copilot"])


@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": settings.app_name}
