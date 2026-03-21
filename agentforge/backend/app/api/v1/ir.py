"""IR validation and management API endpoints."""

from __future__ import annotations

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, ValidationError

from ...core.ir.schema import IRDocument, TargetFramework
from ...core.ir.validation import ValidationResult, validate_ir

router = APIRouter()


# ============================================================================
# Request/Response models
# ============================================================================


class ValidateIRRequest(BaseModel):
    ir_document: dict  # Raw JSON, will be validated by Pydantic
    target_framework: str | None = None


class ValidationIssueResponse(BaseModel):
    stage: str
    severity: str
    message: str
    path: str
    suggestion: str


class ValidateIRResponse(BaseModel):
    is_valid: bool
    issues: list[ValidationIssueResponse]
    error_count: int
    warning_count: int


class SaveIRRequest(BaseModel):
    project_id: str
    ir_document: dict
    commit_message: str = ""


class SaveIRResponse(BaseModel):
    project_id: str
    version: int
    is_valid: bool


# ============================================================================
# In-memory store (will be replaced with PostgreSQL)
# ============================================================================

_ir_versions: dict[str, list[dict]] = {}  # project_id -> list of IR versions


# ============================================================================
# Endpoints
# ============================================================================


@router.post("/validate", response_model=ValidateIRResponse)
async def validate_ir_document(request: ValidateIRRequest) -> ValidateIRResponse:
    """Validate an IR document.

    Runs the full 6-stage validation pipeline:
    1. Schema validation (Pydantic)
    2. Referential integrity
    3. Graph validity
    4. Semantic validation
    5. Framework compatibility (if target_framework specified)
    6. Security scan
    """
    # Stage 1: Pydantic schema validation
    try:
        ir = IRDocument(**request.ir_document)
    except ValidationError as e:
        issues = []
        for error in e.errors():
            issues.append(
                ValidationIssueResponse(
                    stage="schema",
                    severity="error",
                    message=error["msg"],
                    path=".".join(str(p) for p in error["loc"]),
                    suggestion="",
                )
            )
        return ValidateIRResponse(
            is_valid=False,
            issues=issues,
            error_count=len(issues),
            warning_count=0,
        )

    # Stages 2-6
    target = None
    if request.target_framework:
        try:
            target = TargetFramework(request.target_framework)
        except ValueError:
            raise HTTPException(
                status_code=400,
                detail=f"Unknown framework: {request.target_framework}. "
                f"Available: {[f.value for f in TargetFramework]}",
            )

    result = validate_ir(ir, target)

    issues = [
        ValidationIssueResponse(
            stage=issue.stage,
            severity=issue.severity.value,
            message=issue.message,
            path=issue.path,
            suggestion=issue.suggestion,
        )
        for issue in result.issues
    ]

    return ValidateIRResponse(
        is_valid=result.is_valid,
        issues=issues,
        error_count=len(result.errors),
        warning_count=len(result.warnings),
    )


@router.post("/save", response_model=SaveIRResponse)
async def save_ir(request: SaveIRRequest) -> SaveIRResponse:
    """Save a new version of the IR document for a project."""
    try:
        ir = IRDocument(**request.ir_document)
    except ValidationError as e:
        raise HTTPException(status_code=400, detail=str(e))

    result = validate_ir(ir)

    if request.project_id not in _ir_versions:
        _ir_versions[request.project_id] = []

    version = len(_ir_versions[request.project_id]) + 1
    _ir_versions[request.project_id].append({
        "version": version,
        "ir_document": request.ir_document,
        "commit_message": request.commit_message,
        "is_valid": result.is_valid,
    })

    return SaveIRResponse(
        project_id=request.project_id,
        version=version,
        is_valid=result.is_valid,
    )


@router.get("/{project_id}/latest")
async def get_latest_ir(project_id: str) -> dict:
    """Get the latest IR version for a project."""
    if project_id not in _ir_versions or not _ir_versions[project_id]:
        raise HTTPException(status_code=404, detail="No IR versions found")

    latest = _ir_versions[project_id][-1]
    return latest


@router.get("/{project_id}/versions")
async def list_ir_versions(project_id: str) -> dict:
    """List all IR versions for a project."""
    versions = _ir_versions.get(project_id, [])
    return {
        "project_id": project_id,
        "versions": [
            {"version": v["version"], "commit_message": v["commit_message"]}
            for v in versions
        ],
        "total": len(versions),
    }
