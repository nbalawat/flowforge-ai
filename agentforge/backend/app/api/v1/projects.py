"""Project management API endpoints."""

from __future__ import annotations

import uuid
from datetime import datetime

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

router = APIRouter()


# ============================================================================
# Request/Response models
# ============================================================================


class CreateProjectRequest(BaseModel):
    name: str
    description: str = ""


class ProjectResponse(BaseModel):
    id: str
    name: str
    description: str
    created_at: str
    updated_at: str


class ProjectListResponse(BaseModel):
    projects: list[ProjectResponse]
    total: int


# ============================================================================
# In-memory store (will be replaced with PostgreSQL)
# ============================================================================

_projects: dict[str, dict] = {}


# ============================================================================
# Endpoints
# ============================================================================


@router.post("/", response_model=ProjectResponse)
async def create_project(request: CreateProjectRequest) -> ProjectResponse:
    """Create a new project."""
    project_id = str(uuid.uuid4())
    now = datetime.utcnow().isoformat()

    project = {
        "id": project_id,
        "name": request.name,
        "description": request.description,
        "created_at": now,
        "updated_at": now,
    }
    _projects[project_id] = project

    return ProjectResponse(**project)


@router.get("/", response_model=ProjectListResponse)
async def list_projects() -> ProjectListResponse:
    """List all projects."""
    projects = [ProjectResponse(**p) for p in _projects.values()]
    return ProjectListResponse(projects=projects, total=len(projects))


@router.get("/{project_id}", response_model=ProjectResponse)
async def get_project(project_id: str) -> ProjectResponse:
    """Get a specific project."""
    if project_id not in _projects:
        raise HTTPException(status_code=404, detail="Project not found")
    return ProjectResponse(**_projects[project_id])


@router.delete("/{project_id}")
async def delete_project(project_id: str) -> dict:
    """Delete a project."""
    if project_id not in _projects:
        raise HTTPException(status_code=404, detail="Project not found")
    del _projects[project_id]
    return {"status": "deleted"}
