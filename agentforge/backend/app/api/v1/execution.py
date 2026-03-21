"""Execution API — generate, run, and download agent projects."""

from __future__ import annotations

import os
import tempfile
from pathlib import Path

from fastapi import APIRouter, HTTPException
from fastapi.responses import Response
from pydantic import BaseModel, ValidationError

from ...config import settings
from ...core.ir.schema import IRDocument, TargetFramework
from ...core.ir.validation import validate_ir
from ...core.generators.base import ProjectArtifact
from ...core.generators.langgraph.generator import LangGraphGenerator
from ...core.generators.google_adk.generator import GoogleADKGenerator
from ...core.generators.claude_agent_sdk.generator import ClaudeAgentSDKGenerator
from ...core.execution.runner import execute_generated_project, cleanup_project

router = APIRouter()

_generators = {
    TargetFramework.LANGGRAPH: LangGraphGenerator(),
    TargetFramework.GOOGLE_ADK: GoogleADKGenerator(),
    TargetFramework.CLAUDE_AGENT_SDK: ClaudeAgentSDKGenerator(),
}

# Cache of recent generation artifacts for download
_recent_artifacts: dict[str, ProjectArtifact] = {}


class ExecuteRequest(BaseModel):
    ir_document: dict
    target_framework: str = "google_adk"
    test_message: str = "I have a billing issue with my account. My last charge was incorrect."
    project_name: str | None = None


class ExecuteResponse(BaseModel):
    success: bool
    stdout: str
    stderr: str
    exit_code: int
    generated_files: list[str]
    error: str
    run_id: str  # Used to download the project


class DownloadRequest(BaseModel):
    ir_document: dict
    target_framework: str = "google_adk"
    project_name: str | None = None


@router.post("/run", response_model=ExecuteResponse)
async def execute_workflow(request: ExecuteRequest) -> ExecuteResponse:
    """Generate code for a framework and execute it with a real LLM.

    This generates the project, installs dependencies, runs the test script,
    and returns the output. The generated project can then be downloaded.
    """
    # Parse IR
    try:
        ir = IRDocument(**request.ir_document)
    except ValidationError as e:
        raise HTTPException(status_code=400, detail=f"Invalid IR: {e}")

    # Get framework
    try:
        framework = TargetFramework(request.target_framework)
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Unknown framework: {request.target_framework}")

    if framework not in _generators:
        raise HTTPException(status_code=400, detail=f"Generator not available for {framework.value}")

    # Validate
    result = validate_ir(ir, framework)
    if not result.is_valid:
        errors = [i.message for i in result.errors]
        raise HTTPException(status_code=400, detail=f"Validation failed: {errors}")

    # Generate
    generator = _generators[framework]
    project_name = request.project_name or sanitize_name(ir.metadata.name)
    artifact = generator.generate_project(ir, project_name)

    # Build env vars for execution
    env_vars = {}
    if settings.anthropic_api_key:
        env_vars["ANTHROPIC_API_KEY"] = settings.anthropic_api_key

    # Execute
    exec_result = await execute_generated_project(
        artifact=artifact,
        test_message=request.test_message,
        timeout_seconds=120,
        env_vars=env_vars,
    )

    # Cache artifact for download
    run_id = f"run_{id(artifact) % 100000}"
    _recent_artifacts[run_id] = artifact

    return ExecuteResponse(
        success=exec_result.success,
        stdout=exec_result.stdout,
        stderr=exec_result.stderr,
        exit_code=exec_result.exit_code,
        generated_files=exec_result.generated_files,
        error=exec_result.error,
        run_id=run_id,
    )


@router.post("/download")
async def download_project(request: DownloadRequest) -> Response:
    """Generate code and download as ZIP."""
    try:
        ir = IRDocument(**request.ir_document)
    except ValidationError as e:
        raise HTTPException(status_code=400, detail=f"Invalid IR: {e}")

    try:
        framework = TargetFramework(request.target_framework)
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Unknown framework: {request.target_framework}")

    if framework not in _generators:
        raise HTTPException(status_code=400, detail=f"Generator not available for {framework.value}")

    generator = _generators[framework]
    project_name = request.project_name or sanitize_name(ir.metadata.name)
    artifact = generator.generate_project(ir, project_name)
    zip_bytes = artifact.to_zip()

    filename = f"{project_name}_{framework.value}.zip"
    return Response(
        content=zip_bytes,
        media_type="application/zip",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )


def sanitize_name(name: str) -> str:
    return name.lower().replace(" ", "_").replace("-", "_")
