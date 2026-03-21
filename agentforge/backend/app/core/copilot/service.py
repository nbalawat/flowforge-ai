"""
Copilot Service — Claude API integration with tool-use for structured IR patches.

The copilot maintains a conversation per project and uses Claude's tool-use to
produce structured modifications to the IR document. Each tool call returns a
patch that modifies the canvas.
"""

from __future__ import annotations

import json
import uuid
from dataclasses import dataclass, field
from typing import Any

import anthropic

from ..ir.schema import (
    AgentDefinition,
    AgentType,
    EdgeType,
    FieldType,
    HITLDefinition,
    HITLInputType,
    HITLTimeoutAction,
    NodeType,
    ReducerType,
    StateField,
    ToolDefinition,
    ToolParameter,
    ToolType,
    WorkflowEdge,
    WorkflowNode,
    WorkflowType,
)
from .prompts import COPILOT_SYSTEM_PROMPT, build_context_message
from .tools import COPILOT_TOOLS


@dataclass
class CopilotMessage:
    role: str  # "user" or "assistant"
    content: str
    tool_calls: list[dict] = field(default_factory=list)
    ir_patches: list[dict] = field(default_factory=list)


@dataclass
class IRPatch:
    """A single modification to the IR document."""

    action: str  # "add_agent", "add_tool", "add_edge", etc.
    data: dict[str, Any] = field(default_factory=dict)
    description: str = ""  # Human-readable description


@dataclass
class CopilotResponse:
    """Response from the copilot containing text and IR patches."""

    text: str
    patches: list[IRPatch] = field(default_factory=list)
    error: str | None = None


class CopilotService:
    """Manages copilot conversations and Claude API interactions."""

    def __init__(self, api_key: str) -> None:
        self.client = anthropic.Anthropic(api_key=api_key)
        self.conversations: dict[str, list[dict]] = {}  # project_id -> messages

    async def chat(
        self,
        project_id: str,
        user_message: str,
        ir_document: dict,
        target_framework: str = "langgraph",
    ) -> CopilotResponse:
        """Send a message to the copilot and get back text + IR patches."""

        # Build context with current IR state
        context = build_context_message(ir_document, target_framework)

        # Get or create conversation history
        if project_id not in self.conversations:
            self.conversations[project_id] = []

        history = self.conversations[project_id]

        # Add user message with context
        user_msg = f"{user_message}\n\n---\n{context}"
        history.append({"role": "user", "content": user_msg})

        try:
            # Call Claude with tools
            response = self.client.messages.create(
                model="claude-sonnet-4-20250514",
                max_tokens=4096,
                system=COPILOT_SYSTEM_PROMPT,
                tools=COPILOT_TOOLS,
                messages=history,
            )

            # Process response
            text_parts = []
            patches = []

            for block in response.content:
                if block.type == "text":
                    text_parts.append(block.text)
                elif block.type == "tool_use":
                    patch = self._process_tool_call(
                        block.name, block.input, ir_document
                    )
                    if patch:
                        patches.append(patch)

            # Handle tool use loop — Claude may need to see tool results
            if response.stop_reason == "tool_use":
                # Build tool results
                tool_results = []
                for block in response.content:
                    if block.type == "tool_use":
                        patch = self._process_tool_call(
                            block.name, block.input, ir_document
                        )
                        result_text = (
                            f"Successfully executed {block.name}: {patch.description}"
                            if patch
                            else f"Failed to execute {block.name}"
                        )
                        tool_results.append({
                            "type": "tool_result",
                            "tool_use_id": block.id,
                            "content": result_text,
                        })

                # Add assistant message and tool results to history
                history.append({"role": "assistant", "content": response.content})
                history.append({"role": "user", "content": tool_results})

                # Get follow-up response
                follow_up = self.client.messages.create(
                    model="claude-sonnet-4-20250514",
                    max_tokens=4096,
                    system=COPILOT_SYSTEM_PROMPT,
                    tools=COPILOT_TOOLS,
                    messages=history,
                )

                for block in follow_up.content:
                    if block.type == "text":
                        text_parts.append(block.text)
                    elif block.type == "tool_use":
                        patch = self._process_tool_call(
                            block.name, block.input, ir_document
                        )
                        if patch:
                            patches.append(patch)

                # Add follow-up to history
                history.append({"role": "assistant", "content": follow_up.content})
            else:
                # Add response to history
                history.append({"role": "assistant", "content": response.content})

            # Trim history to avoid context overflow (keep last 20 turns)
            if len(history) > 40:
                self.conversations[project_id] = history[-40:]

            return CopilotResponse(
                text="\n".join(text_parts),
                patches=patches,
            )

        except anthropic.APIError as e:
            return CopilotResponse(
                text="",
                error=f"Claude API error: {e}",
            )

    def _process_tool_call(
        self, tool_name: str, tool_input: dict, ir_document: dict
    ) -> IRPatch | None:
        """Convert a Claude tool call into an IR patch."""

        if tool_name == "add_agent":
            return self._patch_add_agent(tool_input, ir_document)
        elif tool_name == "add_tool":
            return self._patch_add_tool(tool_input)
        elif tool_name == "add_edge":
            return self._patch_add_edge(tool_input, ir_document)
        elif tool_name == "remove_node":
            return self._patch_remove_node(tool_input, ir_document)
        elif tool_name == "modify_agent":
            return self._patch_modify_agent(tool_input, ir_document)
        elif tool_name == "add_human_in_the_loop":
            return self._patch_add_hitl(tool_input, ir_document)
        elif tool_name == "add_condition":
            return self._patch_add_condition(tool_input, ir_document)
        elif tool_name == "suggest_architecture":
            return self._patch_suggest_architecture(tool_input)
        elif tool_name == "refine_prompt":
            return self._patch_refine_prompt(tool_input, ir_document)
        elif tool_name == "set_workflow_type":
            return self._patch_set_workflow_type(tool_input)
        elif tool_name == "add_state_field":
            return self._patch_add_state_field(tool_input)
        return None

    def _patch_add_agent(self, input: dict, ir: dict) -> IRPatch:
        agent_id = f"agent_{uuid.uuid4().hex[:8]}"
        node_id = f"node_{uuid.uuid4().hex[:8]}"

        # Auto-layout: place below existing nodes
        existing_nodes = ir.get("workflow", {}).get("nodes", [])
        max_y = max((n.get("position", {}).get("y", 0) for n in existing_nodes), default=50)
        x = input.get("position_x", 250)
        y = input.get("position_y", max_y + 120)

        return IRPatch(
            action="add_agent",
            data={
                "agent": {
                    "id": agent_id,
                    "name": input["name"],
                    "type": "llm",
                    "role": input.get("role", ""),
                    "goal": input.get("goal", ""),
                    "backstory": input.get("backstory", ""),
                    "instructions": input.get("instructions", ""),
                    "description": input.get("description", ""),
                    "tools": input.get("tools", []),
                },
                "node": {
                    "id": node_id,
                    "name": input["name"],
                    "type": "agent",
                    "agent_ref": agent_id,
                    "config": {},
                    "position": {"x": x, "y": y},
                },
            },
            description=f"Added agent '{input['name']}'",
        )

    def _patch_add_tool(self, input: dict) -> IRPatch:
        tool_id = f"tool_{uuid.uuid4().hex[:8]}"

        parameters = []
        for p in input.get("parameters", []):
            parameters.append({
                "name": p["name"],
                "type": p.get("type", "string"),
                "description": p.get("description", ""),
                "required": p.get("required", True),
            })

        return IRPatch(
            action="add_tool",
            data={
                "tool": {
                    "id": tool_id,
                    "name": input["name"],
                    "description": input["description"],
                    "type": "function",
                    "parameters": parameters,
                    "implementation": {
                        "language": "python",
                        "source": input.get("implementation"),
                    } if input.get("implementation") else None,
                },
            },
            description=f"Added tool '{input['name']}'",
        )

    def _patch_add_edge(self, input: dict, ir: dict) -> IRPatch:
        nodes = ir.get("workflow", {}).get("nodes", [])

        source_id = self._find_node_by_name(input["source_node_name"], nodes)
        target_id = self._find_node_by_name(input["target_node_name"], nodes)

        edge_type = input.get("edge_type", "default")
        condition = None
        if edge_type == "conditional" and input.get("condition_expression"):
            condition = {
                "expression": input["condition_expression"],
                "label": input.get("condition_label", ""),
            }

        return IRPatch(
            action="add_edge",
            data={
                "edge": {
                    "id": f"edge_{uuid.uuid4().hex[:8]}",
                    "source": source_id or input["source_node_name"],
                    "target": target_id or input["target_node_name"],
                    "type": edge_type,
                    "condition": condition,
                    "priority": 0,
                    "state_mapping": [],
                },
            },
            description=f"Connected '{input['source_node_name']}' → '{input['target_node_name']}'",
        )

    def _patch_remove_node(self, input: dict, ir: dict) -> IRPatch:
        nodes = ir.get("workflow", {}).get("nodes", [])
        node_id = self._find_node_by_name(input["node_name"], nodes)

        return IRPatch(
            action="remove_node",
            data={"node_id": node_id or input["node_name"]},
            description=f"Removed node '{input['node_name']}'",
        )

    def _patch_modify_agent(self, input: dict, ir: dict) -> IRPatch:
        agents = ir.get("agents", [])
        agent = next((a for a in agents if a["name"] == input["agent_name"]), None)
        agent_id = agent["id"] if agent else input["agent_name"]

        return IRPatch(
            action="modify_agent",
            data={
                "agent_id": agent_id,
                "updates": input["updates"],
            },
            description=f"Modified agent '{input['agent_name']}'",
        )

    def _patch_add_hitl(self, input: dict, ir: dict) -> IRPatch:
        nodes = ir.get("workflow", {}).get("nodes", [])
        after_node_id = self._find_node_by_name(input["after_node_name"], nodes)
        node_id = f"node_{uuid.uuid4().hex[:8]}"
        hitl_id = f"hitl_{uuid.uuid4().hex[:8]}"

        # Position below the target node
        after_node = next((n for n in nodes if n["id"] == after_node_id), None)
        x = after_node["position"]["x"] if after_node else 250
        y = (after_node["position"]["y"] + 120) if after_node else 300

        return IRPatch(
            action="add_human_in_the_loop",
            data={
                "node": {
                    "id": node_id,
                    "name": "Human Review",
                    "type": "human_input",
                    "config": {
                        "human_input": {
                            "prompt_template": input["prompt"],
                            "input_type": input.get("review_type", "approve_reject"),
                            "timeout_action": "escalate",
                        },
                    },
                    "position": {"x": x, "y": y},
                },
                "hitl": {
                    "id": hitl_id,
                    "node_ref": node_id,
                    "type": "approval",
                    "prompt": input["prompt"],
                },
                "after_node_id": after_node_id,
            },
            description=f"Added human review after '{input['after_node_name']}'",
        )

    def _patch_add_condition(self, input: dict, ir: dict) -> IRPatch:
        node_id = f"node_{uuid.uuid4().hex[:8]}"
        nodes = ir.get("workflow", {}).get("nodes", [])

        max_y = max((n.get("position", {}).get("y", 0) for n in nodes), default=50)
        x = input.get("position_x", 250)
        y = input.get("position_y", max_y + 120)

        patch_data: dict[str, Any] = {
            "node": {
                "id": node_id,
                "name": input["name"],
                "type": "condition",
                "config": {
                    "condition": {
                        "condition_expression": input["expression"],
                    },
                },
                "position": {"x": x, "y": y},
            },
        }

        # Add conditional edges if targets specified
        edges = []
        if input.get("true_target_name"):
            true_id = self._find_node_by_name(input["true_target_name"], nodes)
            edges.append({
                "id": f"edge_{uuid.uuid4().hex[:8]}",
                "source": node_id,
                "target": true_id or input["true_target_name"],
                "type": "conditional",
                "condition": {"expression": input["expression"], "label": "True"},
                "priority": 0,
                "state_mapping": [],
            })
        if input.get("false_target_name"):
            false_id = self._find_node_by_name(input["false_target_name"], nodes)
            edges.append({
                "id": f"edge_{uuid.uuid4().hex[:8]}",
                "source": node_id,
                "target": false_id or input["false_target_name"],
                "type": "conditional",
                "condition": {"expression": f"not ({input['expression']})", "label": "False"},
                "priority": 1,
                "state_mapping": [],
            })

        if edges:
            patch_data["edges"] = edges

        return IRPatch(
            action="add_condition",
            data=patch_data,
            description=f"Added condition '{input['name']}'",
        )

    def _patch_suggest_architecture(self, input: dict) -> IRPatch:
        return IRPatch(
            action="suggest_architecture",
            data={"problem": input["problem_description"]},
            description="Architecture suggestion (requires follow-up tool calls)",
        )

    def _patch_refine_prompt(self, input: dict, ir: dict) -> IRPatch:
        agents = ir.get("agents", [])
        agent = next((a for a in agents if a["name"] == input["agent_name"]), None)

        return IRPatch(
            action="refine_prompt",
            data={
                "agent_id": agent["id"] if agent else input["agent_name"],
                "agent_name": input["agent_name"],
                "current_prompt": input.get("current_prompt", agent.get("instructions", "") if agent else ""),
                "feedback": input.get("feedback", ""),
            },
            description=f"Refined prompt for '{input['agent_name']}'",
        )

    def _patch_set_workflow_type(self, input: dict) -> IRPatch:
        return IRPatch(
            action="set_workflow_type",
            data={"workflow_type": input["workflow_type"]},
            description=f"Set workflow type to '{input['workflow_type']}'",
        )

    def _patch_add_state_field(self, input: dict) -> IRPatch:
        default_value = None
        if input.get("default_value"):
            try:
                default_value = json.loads(input["default_value"])
            except json.JSONDecodeError:
                default_value = input["default_value"]

        return IRPatch(
            action="add_state_field",
            data={
                "field": {
                    "name": input["name"],
                    "type": input["type"],
                    "description": input.get("description", ""),
                    "reducer": input.get("reducer", "replace"),
                    "default": default_value,
                },
            },
            description=f"Added state field '{input['name']}'",
        )

    @staticmethod
    def _find_node_by_name(name: str, nodes: list[dict]) -> str | None:
        """Find a node ID by its name (case-insensitive)."""
        name_lower = name.lower()
        for node in nodes:
            if node.get("name", "").lower() == name_lower:
                return node["id"]
        return None
