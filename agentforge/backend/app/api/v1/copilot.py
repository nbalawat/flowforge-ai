"""Copilot API endpoints — Claude-powered workflow design assistant."""

from __future__ import annotations

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from ...config import settings
from ...core.copilot.service import CopilotService, IRPatch

router = APIRouter()

# Singleton copilot service (lazy init with API key)
_copilot: CopilotService | None = None


def _get_copilot() -> CopilotService:
    global _copilot
    if _copilot is None:
        if not settings.anthropic_api_key:
            raise HTTPException(
                status_code=503,
                detail="ANTHROPIC_API_KEY not configured. Set it in .env to enable the copilot.",
            )
        _copilot = CopilotService(api_key=settings.anthropic_api_key)
    return _copilot


# ============================================================================
# Request/Response models
# ============================================================================


class CopilotChatRequest(BaseModel):
    project_id: str
    message: str
    ir_document: dict
    target_framework: str = "langgraph"


class IRPatchResponse(BaseModel):
    action: str
    data: dict
    description: str


class CopilotChatResponse(BaseModel):
    text: str
    patches: list[IRPatchResponse]
    error: str | None = None


# ============================================================================
# Endpoints
# ============================================================================


@router.post("/chat", response_model=CopilotChatResponse)
async def copilot_chat(request: CopilotChatRequest) -> CopilotChatResponse:
    """Send a message to the AI copilot and receive text + IR patches.

    The copilot uses Claude with tool-use to produce structured modifications
    to the IR document. Patches should be applied to the canvas by the frontend.
    """
    copilot = _get_copilot()

    result = await copilot.chat(
        project_id=request.project_id,
        user_message=request.message,
        ir_document=request.ir_document,
        target_framework=request.target_framework,
    )

    return CopilotChatResponse(
        text=result.text,
        patches=[
            IRPatchResponse(
                action=p.action,
                data=p.data,
                description=p.description,
            )
            for p in result.patches
        ],
        error=result.error,
    )


@router.delete("/{project_id}/history")
async def clear_copilot_history(project_id: str) -> dict:
    """Clear conversation history for a project."""
    copilot = _get_copilot()
    if project_id in copilot.conversations:
        del copilot.conversations[project_id]
    return {"status": "cleared"}
