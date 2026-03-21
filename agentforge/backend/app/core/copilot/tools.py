"""
Copilot Tool Definitions for Claude API.

These tools allow the AI copilot to produce structured IR patches that
modify the canvas. Each tool returns a JSON patch that the backend validates
against the current IR before applying.

The copilot uses Claude's tool-use capability to produce these structured
operations rather than free-text descriptions.
"""

from __future__ import annotations

# Claude API tool definitions (JSON schema format)
COPILOT_TOOLS = [
    {
        "name": "add_agent",
        "description": (
            "Add a new agent to the workflow canvas. Creates both the agent definition "
            "and a corresponding node on the canvas at the specified position."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "name": {
                    "type": "string",
                    "description": "Name of the agent (e.g., 'Data Analyst', 'Classifier')",
                },
                "role": {
                    "type": "string",
                    "description": "The agent's role description (becomes part of system prompt)",
                },
                "goal": {
                    "type": "string",
                    "description": "What this agent aims to accomplish",
                },
                "backstory": {
                    "type": "string",
                    "description": "Background context for the agent's personality",
                },
                "instructions": {
                    "type": "string",
                    "description": "Detailed system prompt instructions",
                },
                "description": {
                    "type": "string",
                    "description": "Short description used for delegation/routing decisions",
                },
                "tools": {
                    "type": "array",
                    "items": {"type": "string"},
                    "description": "Tool IDs this agent should have access to",
                },
                "position_x": {
                    "type": "number",
                    "description": "X position on canvas (default: auto-layout)",
                },
                "position_y": {
                    "type": "number",
                    "description": "Y position on canvas (default: auto-layout)",
                },
            },
            "required": ["name"],
        },
    },
    {
        "name": "add_tool",
        "description": (
            "Add a new tool that agents can use. Tools are functions with typed parameters "
            "that agents invoke to interact with external systems."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "name": {
                    "type": "string",
                    "description": "Name of the tool (e.g., 'web_search', 'query_database')",
                },
                "description": {
                    "type": "string",
                    "description": "What the tool does (used by LLM to decide when to invoke)",
                },
                "parameters": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "name": {"type": "string"},
                            "type": {
                                "type": "string",
                                "enum": ["string", "integer", "float", "boolean", "list", "dict"],
                            },
                            "description": {"type": "string"},
                            "required": {"type": "boolean"},
                        },
                        "required": ["name", "type"],
                    },
                    "description": "Tool parameters with types",
                },
                "implementation": {
                    "type": "string",
                    "description": "Python source code implementing the tool",
                },
            },
            "required": ["name", "description"],
        },
    },
    {
        "name": "add_edge",
        "description": (
            "Connect two nodes in the workflow graph with an edge. "
            "Can be a default (unconditional) or conditional edge."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "source_node_name": {
                    "type": "string",
                    "description": "Name of the source node",
                },
                "target_node_name": {
                    "type": "string",
                    "description": "Name of the target node (use 'Start' or 'End' for entry/exit)",
                },
                "edge_type": {
                    "type": "string",
                    "enum": ["default", "conditional", "error"],
                    "description": "Type of edge",
                },
                "condition_expression": {
                    "type": "string",
                    "description": "Python expression for conditional edges (e.g., \"state['score'] > 0.8\")",
                },
                "condition_label": {
                    "type": "string",
                    "description": "Human-readable label for conditional edges",
                },
            },
            "required": ["source_node_name", "target_node_name"],
        },
    },
    {
        "name": "remove_node",
        "description": "Remove a node from the workflow canvas. Also removes connected edges.",
        "input_schema": {
            "type": "object",
            "properties": {
                "node_name": {
                    "type": "string",
                    "description": "Name of the node to remove",
                },
            },
            "required": ["node_name"],
        },
    },
    {
        "name": "modify_agent",
        "description": "Modify an existing agent's properties (role, goal, instructions, tools, etc.).",
        "input_schema": {
            "type": "object",
            "properties": {
                "agent_name": {
                    "type": "string",
                    "description": "Name of the agent to modify",
                },
                "updates": {
                    "type": "object",
                    "properties": {
                        "name": {"type": "string"},
                        "role": {"type": "string"},
                        "goal": {"type": "string"},
                        "backstory": {"type": "string"},
                        "instructions": {"type": "string"},
                        "description": {"type": "string"},
                    },
                    "description": "Fields to update",
                },
            },
            "required": ["agent_name", "updates"],
        },
    },
    {
        "name": "add_human_in_the_loop",
        "description": (
            "Add a human-in-the-loop review point to the workflow. "
            "Inserts a human review node and connects it between existing nodes."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "after_node_name": {
                    "type": "string",
                    "description": "Name of the node after which to insert human review",
                },
                "prompt": {
                    "type": "string",
                    "description": "Prompt shown to the human reviewer",
                },
                "review_type": {
                    "type": "string",
                    "enum": ["approve_reject", "free_text", "select_option", "edit_content"],
                    "description": "Type of human input expected",
                },
            },
            "required": ["after_node_name", "prompt"],
        },
    },
    {
        "name": "add_condition",
        "description": (
            "Add a conditional branching node that routes the workflow based on state. "
            "Creates a condition node with two or more outgoing edges."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "name": {
                    "type": "string",
                    "description": "Name for the condition node",
                },
                "expression": {
                    "type": "string",
                    "description": "Python expression to evaluate (e.g., \"state['category'] == 'urgent'\")",
                },
                "true_target_name": {
                    "type": "string",
                    "description": "Node name for the true branch",
                },
                "false_target_name": {
                    "type": "string",
                    "description": "Node name for the false branch",
                },
                "position_x": {"type": "number"},
                "position_y": {"type": "number"},
            },
            "required": ["name", "expression"],
        },
    },
    {
        "name": "suggest_architecture",
        "description": (
            "Given a problem description, suggest a complete agent workflow architecture. "
            "Returns a full set of agents, tools, and workflow connections."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "problem_description": {
                    "type": "string",
                    "description": "Description of the problem the user wants to solve",
                },
                "num_agents": {
                    "type": "integer",
                    "description": "Suggested number of agents (optional, copilot will decide if not specified)",
                },
                "workflow_type": {
                    "type": "string",
                    "enum": ["sequential", "parallel", "hierarchical", "custom_graph"],
                    "description": "Preferred workflow structure",
                },
            },
            "required": ["problem_description"],
        },
    },
    {
        "name": "refine_prompt",
        "description": (
            "Help the user refine a system prompt for an agent. "
            "Takes the current prompt and feedback, returns an improved version."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "agent_name": {
                    "type": "string",
                    "description": "Name of the agent whose prompt to refine",
                },
                "current_prompt": {
                    "type": "string",
                    "description": "The current system prompt",
                },
                "feedback": {
                    "type": "string",
                    "description": "User feedback on what to improve",
                },
            },
            "required": ["agent_name"],
        },
    },
    {
        "name": "set_workflow_type",
        "description": "Set the overall workflow orchestration type.",
        "input_schema": {
            "type": "object",
            "properties": {
                "workflow_type": {
                    "type": "string",
                    "enum": ["sequential", "parallel", "hierarchical", "custom_graph"],
                    "description": "The workflow type to set",
                },
            },
            "required": ["workflow_type"],
        },
    },
    {
        "name": "add_state_field",
        "description": "Add a field to the workflow state schema.",
        "input_schema": {
            "type": "object",
            "properties": {
                "name": {
                    "type": "string",
                    "description": "Field name (e.g., 'messages', 'score', 'documents')",
                },
                "type": {
                    "type": "string",
                    "enum": ["string", "integer", "float", "boolean", "list", "dict", "any"],
                    "description": "Field type",
                },
                "description": {
                    "type": "string",
                    "description": "What this field stores",
                },
                "reducer": {
                    "type": "string",
                    "enum": ["replace", "append", "merge"],
                    "description": "How concurrent updates are handled (append for lists, replace for scalars)",
                },
                "default_value": {
                    "type": "string",
                    "description": "Default value as a JSON string",
                },
            },
            "required": ["name", "type"],
        },
    },
]
