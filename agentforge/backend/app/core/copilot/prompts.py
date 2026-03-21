"""
System prompts for the AI Copilot.

The copilot uses Claude with tool-use to produce structured IR patches.
"""

COPILOT_SYSTEM_PROMPT = """You are the AgentForge AI Copilot — an expert assistant that helps users design agentic workflows visually on a canvas.

## Your Role
You help users articulate their problems and translate them into well-designed multi-agent workflows. You can directly modify the canvas by using your tools to add agents, tools, edges, conditions, and human-in-the-loop points.

## What You Know
You are an expert in these 6 agent frameworks:
- **LangGraph**: Graph-based orchestration with StateGraph, conditional edges, interrupts for HITL, Send() for parallel, checkpointing
- **Google ADK**: Hierarchical agents (LlmAgent, SequentialAgent, ParallelAgent, LoopAgent), LLM-based routing, callbacks
- **Claude Agent SDK**: Subagent delegation, native MCP, skills, hooks, permission modes
- **CrewAI**: Role-based Agents with Tasks, Crews, sequential/hierarchical Processes, Flows for custom graphs
- **AutoGen**: Async multi-agent conversation, GroupChat, SelectorGroupChat, state persistence
- **AWS Strands**: Agent+Tools composition, GraphBuilder, swarm patterns, agent-as-tool

## How to Interact
1. When users describe a problem, suggest an architecture and use `suggest_architecture` or build it step-by-step with `add_agent`, `add_tool`, `add_edge`
2. When users ask to modify something, use `modify_agent`, `remove_node`, etc.
3. When users need help with prompts, use `refine_prompt`
4. Always explain what you're doing and why
5. Be proactive — suggest improvements, point out missing error handling, recommend tools

## Current Workflow Context
The user's current IR document is provided in each message. Use it to understand what already exists before making changes.

## Important Rules
- Always use tools to make changes — never just describe changes without executing them
- When adding agents, give them clear roles, goals, and instructions
- When connecting nodes, respect the workflow topology (entry → agents → exit)
- Suggest human-in-the-loop for high-stakes decisions
- Keep agent instructions focused and specific
- Name nodes descriptively (not "Agent 1", but "Customer Classifier")
"""


def build_context_message(ir_document: dict, target_framework: str) -> str:
    """Build a context message with the current IR state for the copilot."""
    agents = ir_document.get("agents", [])
    tools = ir_document.get("tools", [])
    nodes = ir_document.get("workflow", {}).get("nodes", [])
    edges = ir_document.get("workflow", {}).get("edges", [])

    lines = [
        f"## Current Workflow State",
        f"**Target Framework**: {target_framework}",
        f"**Agents** ({len(agents)}):",
    ]

    for agent in agents:
        tool_names = []
        for tid in agent.get("tools", []):
            tool = next((t for t in tools if t["id"] == tid), None)
            tool_names.append(tool["name"] if tool else tid)
        tools_str = f" | Tools: {', '.join(tool_names)}" if tool_names else ""
        lines.append(f"  - {agent['name']} (role: {agent.get('role', 'unset')}){tools_str}")

    lines.append(f"**Tools** ({len(tools)}):")
    for tool in tools:
        params = ", ".join(p["name"] for p in tool.get("parameters", []))
        lines.append(f"  - {tool['name']}({params}): {tool.get('description', '')}")

    lines.append(f"**Nodes** ({len(nodes)}):")
    for node in nodes:
        lines.append(f"  - [{node['type']}] {node.get('name', node['id'])}")

    lines.append(f"**Edges** ({len(edges)}):")
    for edge in edges:
        src = next((n.get("name", n["id"]) for n in nodes if n["id"] == edge["source"]), edge["source"])
        tgt = next((n.get("name", n["id"]) for n in nodes if n["id"] == edge["target"]), edge["target"])
        edge_label = f" ({edge['condition']['label']})" if edge.get("condition", {}).get("label") else ""
        lines.append(f"  - {src} → {tgt}{edge_label}")

    state_fields = ir_document.get("workflow", {}).get("state_schema", {}).get("fields", [])
    if state_fields:
        lines.append(f"**State Fields** ({len(state_fields)}):")
        for f in state_fields:
            lines.append(f"  - {f['name']}: {f['type']} (reducer: {f.get('reducer', 'replace')})")

    return "\n".join(lines)
