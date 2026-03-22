"""
AgentForge Backend - FastAPI Application

The backend handles:
- IR validation and storage
- Code generation for 6 frameworks
- AI Copilot conversations
- Project management and versioning
"""

import base64
import os
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from .api.v1 import copilot, execution, generation, ir, projects
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
app.include_router(execution.router, prefix="/api/v1/execution", tags=["execution"])


@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": settings.app_name}


class ScreenshotPayload(BaseModel):
    filename: str
    data: str  # base64 encoded image data


@app.post("/api/v1/screenshots")
async def save_screenshot(payload: ScreenshotPayload):
    """Save a base64-encoded screenshot to /app/screenshots/"""
    screenshots_dir = Path("/app/screenshots")
    screenshots_dir.mkdir(parents=True, exist_ok=True)
    img_data = base64.b64decode(payload.data)
    filepath = screenshots_dir / payload.filename
    filepath.write_bytes(img_data)
    return {"saved": str(filepath), "size": len(img_data)}
