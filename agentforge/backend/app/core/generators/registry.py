"""
Generator registry — maps TargetFramework to its generator implementation.
"""

from __future__ import annotations

from ..ir.schema import TargetFramework
from .base import FrameworkGenerator


_registry: dict[TargetFramework, FrameworkGenerator] = {}


def register_generator(generator: FrameworkGenerator) -> None:
    """Register a framework generator."""
    _registry[generator.framework] = generator


def get_generator(framework: TargetFramework) -> FrameworkGenerator:
    """Get the generator for a specific framework."""
    if framework not in _registry:
        available = [f.value for f in _registry]
        raise ValueError(
            f"No generator registered for '{framework.value}'. "
            f"Available: {available}"
        )
    return _registry[framework]


def list_generators() -> list[TargetFramework]:
    """List all registered frameworks."""
    return list(_registry.keys())
