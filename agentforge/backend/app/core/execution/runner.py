"""
Execution Runner — generates code and runs it in a subprocess.

Takes an IR document, generates code for a target framework,
writes it to a temp directory, and executes it, capturing output.
"""

from __future__ import annotations

import asyncio
import os
import subprocess
import sys
import tempfile
import shutil
from dataclasses import dataclass, field
from pathlib import Path

from ..ir.schema import IRDocument, TargetFramework
from ..generators.base import ProjectArtifact


@dataclass
class ExecutionResult:
    """Result of running generated code."""

    success: bool
    stdout: str
    stderr: str
    exit_code: int
    project_path: str = ""
    generated_files: list[str] = field(default_factory=list)
    error: str = ""


async def execute_generated_project(
    artifact: ProjectArtifact,
    test_message: str = "I have a billing issue with my account.",
    timeout_seconds: int = 120,
    env_vars: dict[str, str] | None = None,
) -> ExecutionResult:
    """Write generated code to disk and execute it.

    Args:
        artifact: The generated project files.
        test_message: User message to test with.
        timeout_seconds: Max execution time.
        env_vars: Extra environment variables (e.g., API keys).

    Returns:
        ExecutionResult with stdout/stderr and success status.
    """
    # Create temp directory
    tmp_dir = tempfile.mkdtemp(prefix="agentforge_run_")

    try:
        # Write all generated files
        generated_files = []
        for f in artifact.files:
            full_path = Path(tmp_dir) / f.path
            full_path.parent.mkdir(parents=True, exist_ok=True)
            full_path.write_text(f.content)
            generated_files.append(f.path)

        # Find the project root (first directory)
        project_dirs = set()
        for f in artifact.files:
            parts = f.path.split("/")
            if len(parts) > 1:
                project_dirs.add(parts[0])

        project_name = list(project_dirs)[0] if project_dirs else "project"
        project_path = Path(tmp_dir) / project_name

        # Install requirements
        req_file = project_path / "requirements.txt"
        if req_file.exists():
            install_result = subprocess.run(
                [sys.executable, "-m", "pip", "install", "-q", "-r", str(req_file)],
                capture_output=True,
                text=True,
                timeout=120,
                cwd=tmp_dir,
            )
            if install_result.returncode != 0:
                return ExecutionResult(
                    success=False,
                    stdout=install_result.stdout,
                    stderr=f"Failed to install dependencies:\n{install_result.stderr}",
                    exit_code=install_result.returncode,
                    project_path=str(project_path),
                    generated_files=generated_files,
                    error="Dependency installation failed",
                )

        # Build environment
        run_env = os.environ.copy()
        if env_vars:
            run_env.update(env_vars)

        # Run the test script
        test_script = project_path / "test_run.py"
        if test_script.exists():
            run_cmd = [sys.executable, "-m", f"{project_name}.test_run"]
        else:
            run_cmd = [sys.executable, "-m", f"{project_name}.main"]

        try:
            result = subprocess.run(
                run_cmd,
                capture_output=True,
                text=True,
                timeout=timeout_seconds,
                cwd=tmp_dir,
                env=run_env,
            )

            return ExecutionResult(
                success=result.returncode == 0,
                stdout=result.stdout,
                stderr=result.stderr,
                exit_code=result.returncode,
                project_path=str(project_path),
                generated_files=generated_files,
            )

        except subprocess.TimeoutExpired:
            return ExecutionResult(
                success=False,
                stdout="",
                stderr=f"Execution timed out after {timeout_seconds}s",
                exit_code=-1,
                project_path=str(project_path),
                generated_files=generated_files,
                error="Timeout",
            )

    except Exception as e:
        return ExecutionResult(
            success=False,
            stdout="",
            stderr=str(e),
            exit_code=-1,
            error=str(e),
        )
    # Note: we keep tmp_dir alive so ZIP download can access it
    # Cleanup happens after download or via periodic cleanup


def cleanup_project(project_path: str) -> None:
    """Remove a generated project directory."""
    parent = Path(project_path).parent
    if str(parent).startswith(tempfile.gettempdir()):
        shutil.rmtree(parent, ignore_errors=True)
