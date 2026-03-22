"""
Base generator protocol and shared utilities for all framework generators.

Each framework generator implements the FrameworkGenerator protocol to convert
an IR document into a runnable project for that specific framework.
"""

from __future__ import annotations

import os
import zipfile
from dataclasses import dataclass, field
from enum import Enum
from io import BytesIO
from pathlib import Path
from typing import Protocol

from ..ir.schema import IRDocument, TargetFramework
from ..ir.validation import ValidationIssue


class CloudTarget(str, Enum):
    AWS = "aws"
    GCP = "gcp"
    AZURE = "azure"
    LOCAL = "local"


@dataclass
class GeneratedFile:
    """A single file in the generated project."""

    path: str  # Relative path within the project (e.g., "src/agents/classifier.py")
    content: str
    is_executable: bool = False


@dataclass
class NodeMapping:
    """Maps an IR node to its generated code location."""

    node_id: str
    node_name: str
    node_type: str  # agent, condition, human_input, etc.
    file_path: str  # relative path in generated project
    function_name: str  # the function/class name
    line_start: int  # approximate line number


@dataclass
class ProjectArtifact:
    """The complete generated project."""

    framework: TargetFramework
    files: list[GeneratedFile] = field(default_factory=list)
    requirements: list[str] = field(default_factory=list)  # pip dependencies
    errors: list[str] = field(default_factory=list)
    node_mappings: list[NodeMapping] = field(default_factory=list)

    def add_file(self, path: str, content: str, is_executable: bool = False) -> None:
        self.files.append(GeneratedFile(path, content, is_executable))

    def to_zip(self) -> bytes:
        """Package all files into a ZIP archive."""
        buffer = BytesIO()
        with zipfile.ZipFile(buffer, "w", zipfile.ZIP_DEFLATED) as zf:
            for f in self.files:
                zf.writestr(f.path, f.content)
        return buffer.getvalue()

    def write_to_disk(self, output_dir: str) -> None:
        """Write all files to a directory on disk."""
        for f in self.files:
            full_path = Path(output_dir) / f.path
            full_path.parent.mkdir(parents=True, exist_ok=True)
            full_path.write_text(f.content)
            if f.is_executable:
                os.chmod(full_path, 0o755)


@dataclass
class TestArtifact:
    """Generated test files."""

    files: list[GeneratedFile] = field(default_factory=list)
    test_command: str = "pytest tests/"  # Command to run tests


@dataclass
class DeployArtifact:
    """Generated deployment configuration."""

    files: list[GeneratedFile] = field(default_factory=list)
    target: CloudTarget = CloudTarget.LOCAL


class FrameworkGenerator(Protocol):
    """Protocol that all framework generators must implement.

    Each generator converts an IR document into a runnable project
    for a specific agent framework.
    """

    @property
    def framework(self) -> TargetFramework:
        """The target framework this generator produces code for."""
        ...

    @property
    def framework_version(self) -> str:
        """The version of the framework this generator targets."""
        ...

    def validate_ir(self, ir: IRDocument) -> list[ValidationIssue]:
        """Check if the IR can be fully expressed in this framework.

        Returns framework-specific validation issues (warnings for features
        that will be approximated, errors for features that cannot be translated).
        """
        ...

    def generate_project(self, ir: IRDocument, project_name: str | None = None) -> ProjectArtifact:
        """Generate a complete, runnable project from the IR.

        The generated project should include:
        - All source code files
        - requirements.txt / pyproject.toml
        - Configuration files
        - README with setup instructions
        - Dockerfile (optional)
        """
        ...

    def generate_tests(self, ir: IRDocument) -> TestArtifact:
        """Generate test files for the project.

        Tests should cover:
        - Agent instantiation
        - Tool execution with mock inputs
        - Workflow graph construction and validation
        - End-to-end flow with mocked LLM responses
        """
        ...

    def generate_deployment(
        self, ir: IRDocument, target: CloudTarget = CloudTarget.LOCAL
    ) -> DeployArtifact:
        """Generate deployment configuration for the target cloud."""
        ...


def sanitize_identifier(name: str) -> str:
    """Convert a name to a valid Python identifier."""
    result = name.lower().replace(" ", "_").replace("-", "_")
    # Remove non-alphanumeric characters (except underscore)
    result = "".join(c for c in result if c.isalnum() or c == "_")
    # Ensure it doesn't start with a digit
    if result and result[0].isdigit():
        result = f"_{result}"
    return result or "unnamed"


def build_requirements_txt(packages: list[str]) -> str:
    """Generate requirements.txt content from a list of packages."""
    return "\n".join(sorted(packages)) + "\n"


def build_env_template(variables: list[tuple[str, str]]) -> str:
    """Generate .env.example content."""
    lines = ["# Environment variables for the agent project", "# Copy to .env and fill in values", ""]
    for name, description in variables:
        lines.append(f"# {description}")
        lines.append(f"{name}=")
        lines.append("")
    return "\n".join(lines)
