"""Code generation API endpoints."""

from __future__ import annotations

import base64

from fastapi import APIRouter, HTTPException
from fastapi.responses import Response
from pydantic import BaseModel, ValidationError

from ...core.ir.schema import IRDocument, TargetFramework
from ...core.ir.validation import validate_ir
from ...core.generators.base import ProjectArtifact
from ...core.generators.langgraph.generator import LangGraphGenerator
from ...core.generators.google_adk.generator import GoogleADKGenerator
from ...core.generators.claude_agent_sdk.generator import ClaudeAgentSDKGenerator

router = APIRouter()


# ============================================================================
# Generator instances
# ============================================================================

_generators = {
    TargetFramework.LANGGRAPH: LangGraphGenerator(),
    TargetFramework.GOOGLE_ADK: GoogleADKGenerator(),
    TargetFramework.CLAUDE_AGENT_SDK: ClaudeAgentSDKGenerator(),
}


# ============================================================================
# Request/Response models
# ============================================================================


class GenerateRequest(BaseModel):
    ir_document: dict
    target_framework: str
    project_name: str | None = None


class GeneratedFileResponse(BaseModel):
    path: str
    content: str


class GenerateResponse(BaseModel):
    framework: str
    files: list[GeneratedFileResponse]
    requirements: list[str]
    errors: list[str]


class GenerateZipRequest(BaseModel):
    ir_document: dict
    target_framework: str
    project_name: str | None = None


class FrameworkInfo(BaseModel):
    id: str
    name: str
    version: str
    description: str


class ListFrameworksResponse(BaseModel):
    frameworks: list[FrameworkInfo]


# ============================================================================
# Endpoints
# ============================================================================


@router.get("/frameworks", response_model=ListFrameworksResponse)
async def list_frameworks() -> ListFrameworksResponse:
    """List all available target frameworks."""
    framework_info = {
        TargetFramework.LANGGRAPH: FrameworkInfo(
            id="langgraph",
            name="LangGraph",
            version=">=0.2.0",
            description="LangChain's graph-based agent orchestration with StateGraph, "
            "conditional edges, checkpointing, and human-in-the-loop via interrupts.",
        ),
        TargetFramework.GOOGLE_ADK: FrameworkInfo(
            id="google_adk",
            name="Google ADK",
            version=">=1.0.0",
            description="Google's Agent Development Kit with hierarchical agents "
            "(LlmAgent, SequentialAgent, ParallelAgent, LoopAgent), "
            "LLM-based routing, and session state management.",
        ),
        TargetFramework.CLAUDE_AGENT_SDK: FrameworkInfo(
            id="claude_agent_sdk",
            name="Claude Agent SDK",
            version=">=0.1.0",
            description="Anthropic's Agent SDK with subagent delegation, native MCP support, "
            "skills system, hooks for HITL, and file-based memory.",
        ),
        TargetFramework.CREWAI: FrameworkInfo(
            id="crewai",
            name="CrewAI",
            version=">=0.80.0",
            description="Multi-agent orchestration with role-based Agents, Tasks, Crews, "
            "and Flows for event-driven workflows.",
        ),
        TargetFramework.AUTOGEN: FrameworkInfo(
            id="autogen",
            name="AutoGen",
            version=">=0.4.0",
            description="Microsoft's multi-agent conversation framework with GroupChat, "
            "async agents, and state persistence.",
        ),
        TargetFramework.STRANDS: FrameworkInfo(
            id="strands",
            name="AWS Strands",
            version=">=1.0.0",
            description="AWS agent SDK with GraphBuilder, swarm patterns, "
            "agent-as-tool composition, and Bedrock AgentCore deployment.",
        ),
    }

    available = [
        framework_info[fw] for fw in _generators if fw in framework_info
    ]
    # Also list upcoming frameworks
    for fw, info in framework_info.items():
        if fw not in _generators:
            info.description = f"[Coming Soon] {info.description}"
            available.append(info)

    return ListFrameworksResponse(frameworks=available)


@router.post("/generate", response_model=GenerateResponse)
async def generate_code(request: GenerateRequest) -> GenerateResponse:
    """Generate code for a specific framework from an IR document."""
    # Parse and validate IR
    try:
        ir = IRDocument(**request.ir_document)
    except ValidationError as e:
        raise HTTPException(status_code=400, detail=f"Invalid IR document: {e}")

    # Get framework
    try:
        framework = TargetFramework(request.target_framework)
    except ValueError:
        raise HTTPException(
            status_code=400,
            detail=f"Unknown framework: {request.target_framework}. "
            f"Available: {[f.value for f in _generators]}",
        )

    if framework not in _generators:
        raise HTTPException(
            status_code=400,
            detail=f"Generator for '{framework.value}' is not yet available. "
            f"Available: {[f.value for f in _generators]}",
        )

    # Validate for target framework
    result = validate_ir(ir, framework)
    if not result.is_valid:
        error_messages = [issue.message for issue in result.errors]
        raise HTTPException(
            status_code=400,
            detail=f"IR validation failed for {framework.value}: {error_messages}",
        )

    # Generate
    generator = _generators[framework]
    artifact = generator.generate_project(ir, request.project_name)

    return GenerateResponse(
        framework=framework.value,
        files=[
            GeneratedFileResponse(path=f.path, content=f.content)
            for f in artifact.files
        ],
        requirements=artifact.requirements,
        errors=artifact.errors,
    )


@router.post("/generate/zip")
async def generate_zip(request: GenerateZipRequest) -> Response:
    """Generate code and return as a ZIP file download."""
    # Parse and validate IR
    try:
        ir = IRDocument(**request.ir_document)
    except ValidationError as e:
        raise HTTPException(status_code=400, detail=f"Invalid IR document: {e}")

    # Get framework
    try:
        framework = TargetFramework(request.target_framework)
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Unknown framework: {request.target_framework}")

    if framework not in _generators:
        raise HTTPException(status_code=400, detail=f"Generator not available for {framework.value}")

    # Generate
    generator = _generators[framework]
    artifact = generator.generate_project(ir, request.project_name)
    zip_bytes = artifact.to_zip()

    project_name = request.project_name or "generated_project"
    filename = f"{project_name}_{framework.value}.zip"

    return Response(
        content=zip_bytes,
        media_type="application/zip",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )
