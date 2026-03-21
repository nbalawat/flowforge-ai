"""
IR Validation Pipeline.

6-stage validation ensuring the IR is correct before code generation:
1. Schema Validation (handled by Pydantic)
2. Referential Integrity (all refs resolve)
3. Graph Validity (connected, reachable, proper entry/exit)
4. Semantic Validation (expressions parseable, state fields exist)
5. Framework Compatibility (can the target framework express this IR?)
6. Security Scan (tool implementations safe)
"""

from __future__ import annotations

import ast
from dataclasses import dataclass, field
from enum import Enum

from .schema import (
    EdgeType,
    IRDocument,
    NodeType,
    TargetFramework,
    ToolType,
    WorkflowType,
)


class ValidationSeverity(str, Enum):
    ERROR = "error"
    WARNING = "warning"
    INFO = "info"


@dataclass
class ValidationIssue:
    """A single validation issue found in the IR."""

    stage: str
    severity: ValidationSeverity
    message: str
    path: str = ""  # JSON path to the problematic field (e.g. "agents[0].tools[1]")
    suggestion: str = ""


@dataclass
class ValidationResult:
    """Aggregated result of all validation stages."""

    is_valid: bool = True
    issues: list[ValidationIssue] = field(default_factory=list)

    def add_error(self, stage: str, message: str, path: str = "", suggestion: str = "") -> None:
        self.issues.append(
            ValidationIssue(stage, ValidationSeverity.ERROR, message, path, suggestion)
        )
        self.is_valid = False

    def add_warning(self, stage: str, message: str, path: str = "", suggestion: str = "") -> None:
        self.issues.append(
            ValidationIssue(stage, ValidationSeverity.WARNING, message, path, suggestion)
        )

    def add_info(self, stage: str, message: str, path: str = "") -> None:
        self.issues.append(ValidationIssue(stage, ValidationSeverity.INFO, message, path))

    @property
    def errors(self) -> list[ValidationIssue]:
        return [i for i in self.issues if i.severity == ValidationSeverity.ERROR]

    @property
    def warnings(self) -> list[ValidationIssue]:
        return [i for i in self.issues if i.severity == ValidationSeverity.WARNING]


def validate_ir(ir: IRDocument, target_framework: TargetFramework | None = None) -> ValidationResult:
    """Run the full validation pipeline on an IR document.

    Args:
        ir: The IR document to validate.
        target_framework: If provided, also run framework-specific compatibility checks.

    Returns:
        ValidationResult with all issues found.
    """
    result = ValidationResult()

    # Stage 1: Schema validation is implicit (Pydantic already validated on construction)

    # Stage 2: Referential integrity
    _validate_referential_integrity(ir, result)

    # Stage 3: Graph validity
    _validate_graph(ir, result)

    # Stage 4: Semantic validation
    _validate_semantics(ir, result)

    # Stage 5: Framework compatibility (if target specified)
    if target_framework:
        _validate_framework_compatibility(ir, target_framework, result)

    # Stage 6: Security scan
    _validate_security(ir, result)

    return result


def _validate_referential_integrity(ir: IRDocument, result: ValidationResult) -> None:
    """Stage 2: Ensure all references resolve to existing entities."""
    stage = "referential_integrity"

    agent_ids = {a.id for a in ir.agents}
    tool_ids = {t.id for t in ir.tools}
    node_ids = {n.id for n in ir.workflow.nodes}

    # Agent tool references
    for i, agent in enumerate(ir.agents):
        for j, tool_ref in enumerate(agent.tools):
            if tool_ref not in tool_ids:
                result.add_error(
                    stage,
                    f"Agent '{agent.name}' references unknown tool '{tool_ref}'",
                    f"agents[{i}].tools[{j}]",
                    f"Available tools: {sorted(tool_ids)}",
                )

    # Agent delegation references
    for i, agent in enumerate(ir.agents):
        for j, delegate_id in enumerate(agent.delegation.delegate_to):
            if delegate_id not in agent_ids:
                result.add_error(
                    stage,
                    f"Agent '{agent.name}' delegates to unknown agent '{delegate_id}'",
                    f"agents[{i}].delegation.delegate_to[{j}]",
                )

    # Node agent_ref and tool_ref
    for i, node in enumerate(ir.workflow.nodes):
        if node.type == NodeType.AGENT and node.agent_ref:
            if node.agent_ref not in agent_ids:
                result.add_error(
                    stage,
                    f"Node '{node.id}' references unknown agent '{node.agent_ref}'",
                    f"workflow.nodes[{i}].agent_ref",
                )
        if node.type == NodeType.TOOL_CALL and node.tool_ref:
            if node.tool_ref not in tool_ids:
                result.add_error(
                    stage,
                    f"Node '{node.id}' references unknown tool '{node.tool_ref}'",
                    f"workflow.nodes[{i}].tool_ref",
                )

    # Edge source/target references
    for i, edge in enumerate(ir.workflow.edges):
        if edge.source not in node_ids:
            result.add_error(
                stage,
                f"Edge '{edge.id}' source '{edge.source}' not found in nodes",
                f"workflow.edges[{i}].source",
            )
        if edge.target not in node_ids:
            result.add_error(
                stage,
                f"Edge '{edge.id}' target '{edge.target}' not found in nodes",
                f"workflow.edges[{i}].target",
            )

    # Entry/exit node references
    if ir.workflow.entry_node and ir.workflow.entry_node not in node_ids:
        result.add_error(
            stage,
            f"Entry node '{ir.workflow.entry_node}' not found in nodes",
            "workflow.entry_node",
        )
    for i, exit_id in enumerate(ir.workflow.exit_nodes):
        if exit_id not in node_ids:
            result.add_error(
                stage,
                f"Exit node '{exit_id}' not found in nodes",
                f"workflow.exit_nodes[{i}]",
            )

    # HITL node references
    for i, hitl in enumerate(ir.human_in_the_loop):
        if hitl.node_ref not in node_ids:
            result.add_error(
                stage,
                f"HITL '{hitl.id}' references unknown node '{hitl.node_ref}'",
                f"human_in_the_loop[{i}].node_ref",
            )

    # Skill references
    skill_ids = {s.id for s in ir.skills}
    for i, skill in enumerate(ir.skills):
        for j, tool_ref in enumerate(skill.tools):
            if tool_ref not in tool_ids:
                result.add_error(
                    stage,
                    f"Skill '{skill.name}' references unknown tool '{tool_ref}'",
                    f"skills[{i}].tools[{j}]",
                )
        for j, agent_ref in enumerate(skill.agents):
            if agent_ref not in agent_ids:
                result.add_error(
                    stage,
                    f"Skill '{skill.name}' references unknown agent '{agent_ref}'",
                    f"skills[{i}].agents[{j}]",
                )

    # Agent skill references
    for i, agent in enumerate(ir.agents):
        for j, skill_ref in enumerate(agent.skills):
            if skill_ref not in skill_ids:
                result.add_error(
                    stage,
                    f"Agent '{agent.name}' references unknown skill '{skill_ref}'",
                    f"agents[{i}].skills[{j}]",
                )

    # Hook references
    for i, hook in enumerate(ir.hooks):
        if hook.target_agent and hook.target_agent not in agent_ids:
            result.add_error(
                stage,
                f"Hook '{hook.name}' references unknown agent '{hook.target_agent}'",
                f"hooks[{i}].target_agent",
            )
        if hook.target_tool and hook.target_tool not in tool_ids:
            result.add_error(
                stage,
                f"Hook '{hook.name}' references unknown tool '{hook.target_tool}'",
                f"hooks[{i}].target_tool",
            )


def _validate_graph(ir: IRDocument, result: ValidationResult) -> None:
    """Stage 3: Validate the workflow graph structure."""
    stage = "graph_validity"

    nodes = ir.workflow.nodes
    edges = ir.workflow.edges

    if not nodes:
        result.add_warning(stage, "Workflow has no nodes", "workflow.nodes")
        return

    node_ids = {n.id for n in nodes}

    # Must have entry node
    if not ir.workflow.entry_node:
        result.add_error(stage, "Workflow has no entry node", "workflow.entry_node")
        return

    # Must have at least one exit node
    if not ir.workflow.exit_nodes:
        result.add_error(stage, "Workflow has no exit nodes", "workflow.exit_nodes")
        return

    # Build adjacency list
    adjacency: dict[str, list[str]] = {nid: [] for nid in node_ids}
    for edge in edges:
        if edge.source in adjacency and edge.target in node_ids:
            adjacency[edge.source].append(edge.target)

    # Check reachability from entry
    visited: set[str] = set()
    stack = [ir.workflow.entry_node]
    while stack:
        current = stack.pop()
        if current in visited:
            continue
        visited.add(current)
        stack.extend(adjacency.get(current, []))

    unreachable = node_ids - visited
    for nid in unreachable:
        node = next((n for n in nodes if n.id == nid), None)
        node_name = node.name or node.id if node else nid
        result.add_warning(
            stage,
            f"Node '{node_name}' is unreachable from the entry node",
            f"workflow.nodes (id={nid})",
        )

    # Check that at least one exit node is reachable
    reachable_exits = set(ir.workflow.exit_nodes) & visited
    if not reachable_exits:
        result.add_error(
            stage,
            "No exit node is reachable from the entry node",
            "workflow.exit_nodes",
        )

    # Condition nodes must have at least 2 outgoing edges
    for node in nodes:
        if node.type == NodeType.CONDITION:
            outgoing = [e for e in edges if e.source == node.id]
            if len(outgoing) < 2:
                result.add_warning(
                    stage,
                    f"Condition node '{node.name or node.id}' has fewer than 2 outgoing edges",
                    f"workflow.nodes (id={node.id})",
                    "Condition nodes should branch to at least 2 paths",
                )


def _validate_semantics(ir: IRDocument, result: ValidationResult) -> None:
    """Stage 4: Validate semantic correctness of expressions and references."""
    stage = "semantic"

    state_field_names = {f.name for f in ir.workflow.state_schema.fields}

    # Validate condition expressions are parseable Python
    for i, node in enumerate(ir.workflow.nodes):
        if node.type == NodeType.CONDITION and node.config.condition:
            expr = node.config.condition.condition_expression
            try:
                ast.parse(expr, mode="eval")
            except SyntaxError as e:
                result.add_error(
                    stage,
                    f"Condition expression in node '{node.id}' is not valid Python: {e}",
                    f"workflow.nodes[{i}].config.condition.condition_expression",
                )

        if node.type == NodeType.TRANSFORM and node.config.transform:
            expr = node.config.transform.transform_expression
            try:
                ast.parse(expr, mode="eval")
            except SyntaxError as e:
                result.add_error(
                    stage,
                    f"Transform expression in node '{node.id}' is not valid Python: {e}",
                    f"workflow.nodes[{i}].config.transform.transform_expression",
                )

        if node.type == NodeType.LOOP and node.config.loop:
            expr = node.config.loop.exit_condition
            if expr:
                try:
                    ast.parse(expr, mode="eval")
                except SyntaxError as e:
                    result.add_error(
                        stage,
                        f"Loop exit condition in node '{node.id}' is not valid Python: {e}",
                        f"workflow.nodes[{i}].config.loop.exit_condition",
                    )

    # Validate edge condition expressions
    for i, edge in enumerate(ir.workflow.edges):
        if edge.type == EdgeType.CONDITIONAL and edge.condition:
            try:
                ast.parse(edge.condition.expression, mode="eval")
            except SyntaxError as e:
                result.add_error(
                    stage,
                    f"Edge condition expression is not valid Python: {e}",
                    f"workflow.edges[{i}].condition.expression",
                )

    # Validate fan-out references a state field
    for i, node in enumerate(ir.workflow.nodes):
        if node.type == NodeType.PARALLEL_FAN_OUT and node.config.parallel_fan_out:
            field_name = node.config.parallel_fan_out.fan_out_on
            if state_field_names and field_name not in state_field_names:
                result.add_warning(
                    stage,
                    f"Fan-out field '{field_name}' not found in state schema",
                    f"workflow.nodes[{i}].config.parallel_fan_out.fan_out_on",
                )

    # Validate agents have non-empty instructions or role
    for i, agent in enumerate(ir.agents):
        if not agent.instructions and not agent.role:
            result.add_warning(
                stage,
                f"Agent '{agent.name}' has no instructions or role defined",
                f"agents[{i}]",
                "Agents typically need instructions for the LLM to follow",
            )


def _validate_framework_compatibility(
    ir: IRDocument, framework: TargetFramework, result: ValidationResult
) -> None:
    """Stage 5: Check if the IR can be expressed in the target framework."""
    stage = "framework_compatibility"

    if framework == TargetFramework.CREWAI:
        # CrewAI doesn't support arbitrary graph topologies without Flows
        if ir.workflow.type == WorkflowType.CUSTOM_GRAPH:
            # Check for cycles (CrewAI Flows can handle them, but basic Crew cannot)
            has_cycles = _detect_cycles(ir)
            if has_cycles:
                result.add_warning(
                    stage,
                    "CrewAI basic Crew does not support cyclic graphs. "
                    "Will use CrewAI Flows (@start/@listen/@router) for this workflow.",
                    "workflow.type",
                )

        # CrewAI requires backstory for agents
        for i, agent in enumerate(ir.agents):
            if not agent.backstory:
                result.add_info(
                    stage,
                    f"Agent '{agent.name}' has no backstory. "
                    "CrewAI agents work best with role + goal + backstory.",
                    f"agents[{i}].backstory",
                )

    if framework == TargetFramework.AUTOGEN:
        # AutoGen requires async code
        result.add_info(
            stage,
            "AutoGen v0.4 generates async Python code (async def, await).",
            "config",
        )

    if framework == TargetFramework.GOOGLE_ADK:
        # ADK uses LLM-based routing, not explicit conditional edges
        conditional_edges = [e for e in ir.workflow.edges if e.type == EdgeType.CONDITIONAL]
        if conditional_edges:
            result.add_info(
                stage,
                f"Google ADK uses LLM-based routing. {len(conditional_edges)} conditional "
                "edge(s) will be translated to agent instructions guiding routing decisions.",
                "workflow.edges",
            )

    if framework == TargetFramework.STRANDS:
        # Strands GraphBuilder has specific patterns
        if ir.workflow.type == WorkflowType.HIERARCHICAL:
            result.add_info(
                stage,
                "Strands implements hierarchical workflows via agent-as-tool or swarm patterns.",
                "workflow.type",
            )

    if framework == TargetFramework.CLAUDE_AGENT_SDK:
        # Claude SDK uses subagent spawning for multi-agent patterns
        result.add_info(
            stage,
            "Claude Agent SDK uses subagent spawning. Multi-agent workflows are implemented "
            "as a main agent delegating to subagents with independent context windows.",
            "config",
        )
        # Claude SDK supports MCP natively
        for i, tool in enumerate(ir.tools):
            if tool.type.value == "mcp_server" and tool.implementation:
                if tool.implementation.mcp_server:
                    result.add_info(
                        stage,
                        f"Tool '{tool.name}' uses MCP, which is natively supported by Claude SDK.",
                        f"tools[{i}]",
                    )
        # Skills are a Claude SDK native concept
        if ir.skills:
            result.add_info(
                stage,
                f"{len(ir.skills)} skill(s) defined. Claude Agent SDK has native skill support "
                "via SKILL.md files.",
                "skills",
            )


def _validate_security(ir: IRDocument, result: ValidationResult) -> None:
    """Stage 6: Scan tool implementations for dangerous patterns."""
    stage = "security"

    dangerous_patterns = [
        "subprocess",
        "os.system",
        "eval(",
        "exec(",
        "__import__",
        "shutil.rmtree",
        "os.remove",
    ]

    for i, tool in enumerate(ir.tools):
        if tool.implementation and tool.implementation.source:
            source = tool.implementation.source
            for pattern in dangerous_patterns:
                if pattern in source:
                    result.add_warning(
                        stage,
                        f"Tool '{tool.name}' implementation contains potentially "
                        f"dangerous pattern: '{pattern}'",
                        f"tools[{i}].implementation.source",
                        "Consider using safer alternatives or running in a sandboxed environment",
                    )


def _detect_cycles(ir: IRDocument) -> bool:
    """Detect cycles in the workflow graph using DFS."""
    node_ids = {n.id for n in ir.workflow.nodes}
    adjacency: dict[str, list[str]] = {nid: [] for nid in node_ids}
    for edge in ir.workflow.edges:
        if edge.source in adjacency:
            adjacency[edge.source].append(edge.target)

    WHITE, GRAY, BLACK = 0, 1, 2
    color: dict[str, int] = {nid: WHITE for nid in node_ids}

    def dfs(node: str) -> bool:
        color[node] = GRAY
        for neighbor in adjacency.get(node, []):
            if neighbor not in color:
                continue
            if color[neighbor] == GRAY:
                return True  # Back edge = cycle
            if color[neighbor] == WHITE and dfs(neighbor):
                return True
        color[node] = BLACK
        return False

    for nid in node_ids:
        if color[nid] == WHITE:
            if dfs(nid):
                return True
    return False
