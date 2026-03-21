"""
LangGraph Code Generator.

Converts an IR document into a runnable LangGraph project. This is the most
complex generator because LangGraph has the richest API surface and most
directly maps to the IR's graph-based model.

IR → LangGraph Mapping:
- Agent → Node function: def agent_name(state: AgentState) -> dict
- Workflow → StateGraph with add_node/add_edge/add_conditional_edges
- State → TypedDict with Annotated fields for reducers
- HITL → interrupt() + Command(resume=...)
- Tools → @tool decorated functions bound via llm.bind_tools()
- Parallel → Send() API for map-reduce
- Memory → MemorySaver checkpointer + InMemoryStore
- Subworkflow → Compiled subgraph as node
"""

from __future__ import annotations

import operator
from textwrap import dedent, indent

from ...core.ir.schema import (
    AgentDefinition,
    EdgeType,
    FieldType,
    IRDocument,
    NodeType,
    ReducerType,
    TargetFramework,
    ToolDefinition,
    WorkflowType,
)
from ...core.ir.validation import ValidationIssue, ValidationSeverity
from ..base import (
    CloudTarget,
    DeployArtifact,
    FrameworkGenerator,
    ProjectArtifact,
    TestArtifact,
    build_env_template,
    build_requirements_txt,
    sanitize_identifier,
)


LANGGRAPH_VERSION = ">=0.2.0"


class LangGraphGenerator:
    """Generates LangGraph projects from IR documents."""

    @property
    def framework(self) -> TargetFramework:
        return TargetFramework.LANGGRAPH

    @property
    def framework_version(self) -> str:
        return LANGGRAPH_VERSION

    def validate_ir(self, ir: IRDocument) -> list[ValidationIssue]:
        issues: list[ValidationIssue] = []
        # LangGraph supports all IR features natively
        # Only warn about features that need special handling
        for agent in ir.agents:
            if agent.backstory:
                issues.append(
                    ValidationIssue(
                        stage="framework_compatibility",
                        severity=ValidationSeverity.INFO,
                        message=f"Agent '{agent.name}' backstory will be appended to instructions "
                        "as LangGraph doesn't have a separate backstory field.",
                        path=f"agents[{agent.name}].backstory",
                    )
                )
        return issues

    def generate_project(
        self, ir: IRDocument, project_name: str | None = None
    ) -> ProjectArtifact:
        name = project_name or sanitize_identifier(ir.metadata.name)
        artifact = ProjectArtifact(framework=TargetFramework.LANGGRAPH)

        # Generate state definition
        artifact.add_file(f"{name}/src/state.py", self._generate_state(ir))

        # Generate tool files
        for tool in ir.tools:
            tool_id = sanitize_identifier(tool.name)
            artifact.add_file(
                f"{name}/src/tools/{tool_id}.py",
                self._generate_tool(tool),
            )

        # Generate agent node files
        for agent in ir.agents:
            agent_id = sanitize_identifier(agent.name)
            artifact.add_file(
                f"{name}/src/agents/{agent_id}.py",
                self._generate_agent_node(agent, ir),
            )

        # Generate the graph definition
        artifact.add_file(f"{name}/src/graph.py", self._generate_graph(ir))

        # Generate main entry point
        artifact.add_file(f"{name}/src/main.py", self._generate_main(ir, name))

        # Generate __init__ files
        artifact.add_file(f"{name}/src/__init__.py", "")
        artifact.add_file(f"{name}/src/agents/__init__.py", "")
        artifact.add_file(f"{name}/src/tools/__init__.py", "")

        # Generate project files
        packages = [
            f"langgraph{LANGGRAPH_VERSION}",
            "langchain-core>=0.3.0",
            "langchain-anthropic>=0.3.0",
            "langchain-openai>=0.2.0",
            "python-dotenv>=1.0.0",
        ]
        artifact.add_file(f"{name}/requirements.txt", build_requirements_txt(packages))
        artifact.requirements = packages

        env_vars = [
            ("ANTHROPIC_API_KEY", "Anthropic API key for Claude models"),
            ("OPENAI_API_KEY", "OpenAI API key (if using OpenAI models)"),
        ]
        artifact.add_file(f"{name}/.env.example", build_env_template(env_vars))

        artifact.add_file(f"{name}/Dockerfile", self._generate_dockerfile(name))

        return artifact

    def generate_tests(self, ir: IRDocument) -> TestArtifact:
        name = sanitize_identifier(ir.metadata.name)
        artifact = TestArtifact()

        artifact.files.append(
            __import__("agentforge.backend.app.core.generators.base", fromlist=["GeneratedFile"]).GeneratedFile(
                path=f"{name}/tests/__init__.py",
                content="",
            )
        )

        return artifact

    def generate_deployment(
        self, ir: IRDocument, target: CloudTarget = CloudTarget.LOCAL
    ) -> DeployArtifact:
        return DeployArtifact(target=target)

    # ================================================================
    # Private generation methods
    # ================================================================

    def _generate_state(self, ir: IRDocument) -> str:
        """Generate the TypedDict state definition."""
        lines = [
            '"""Workflow state definition."""',
            "",
            "from __future__ import annotations",
            "",
            "import operator",
            "from typing import Annotated, Any",
            "",
            "from typing_extensions import TypedDict",
            "",
            "",
        ]

        # Map IR field types to Python types
        type_map = {
            FieldType.STRING: "str",
            FieldType.INTEGER: "int",
            FieldType.FLOAT: "float",
            FieldType.BOOLEAN: "bool",
            FieldType.LIST: "list[Any]",
            FieldType.DICT: "dict[str, Any]",
            FieldType.ANY: "Any",
        }

        # Map IR reducers to LangGraph reducers
        reducer_map = {
            ReducerType.APPEND: "operator.add",
            ReducerType.REPLACE: None,  # No annotation needed
            ReducerType.MERGE: "operator.or_",
        }

        lines.append("class AgentState(TypedDict):")
        lines.append('    """State shared across all nodes in the workflow."""')
        lines.append("")

        fields = ir.workflow.state_schema.fields
        if not fields:
            # Default state with messages
            lines.append("    messages: Annotated[list[Any], operator.add]")
        else:
            for field in fields:
                py_type = type_map.get(field.type, "Any")
                reducer = reducer_map.get(field.reducer)

                if reducer:
                    lines.append(f"    {field.name}: Annotated[{py_type}, {reducer}]")
                else:
                    default = repr(field.default) if field.default is not None else None
                    if default:
                        lines.append(f"    {field.name}: {py_type}  # default: {default}")
                    else:
                        lines.append(f"    {field.name}: {py_type}")

                if field.description:
                    lines[-1] += f"  # {field.description}"

        lines.append("")
        return "\n".join(lines)

    def _generate_tool(self, tool: ToolDefinition) -> str:
        """Generate a tool file with @tool decorator."""
        tool_id = sanitize_identifier(tool.name)

        lines = [
            f'"""Tool: {tool.name}"""',
            "",
            "from langchain_core.tools import tool",
            "",
            "",
        ]

        # Build parameter signature
        params = []
        for p in tool.parameters:
            py_type = {
                FieldType.STRING: "str",
                FieldType.INTEGER: "int",
                FieldType.FLOAT: "float",
                FieldType.BOOLEAN: "bool",
                FieldType.LIST: "list",
                FieldType.DICT: "dict",
                FieldType.ANY: "str",
            }.get(p.type, "str")

            if p.default is not None:
                params.append(f"{p.name}: {py_type} = {repr(p.default)}")
            elif not p.required:
                params.append(f"{p.name}: {py_type} | None = None")
            else:
                params.append(f"{p.name}: {py_type}")

        param_str = ", ".join(params)
        return_type = "str"
        if tool.returns:
            return_type = {
                FieldType.STRING: "str",
                FieldType.INTEGER: "int",
                FieldType.FLOAT: "float",
                FieldType.BOOLEAN: "bool",
                FieldType.LIST: "list",
                FieldType.DICT: "dict",
                FieldType.ANY: "str",
            }.get(tool.returns.type, "str")

        lines.append("@tool")
        lines.append(f"def {tool_id}({param_str}) -> {return_type}:")
        lines.append(f'    """{tool.description}"""')

        # Add implementation or placeholder
        if tool.implementation and tool.implementation.source:
            # Indent the source code
            for source_line in tool.implementation.source.strip().split("\n"):
                lines.append(f"    {source_line}")
        else:
            lines.append(f"    # TODO: Implement {tool.name}")
            lines.append(f'    raise NotImplementedError("{tool.name} not yet implemented")')

        lines.append("")
        return "\n".join(lines)

    def _generate_agent_node(self, agent: AgentDefinition, ir: IRDocument) -> str:
        """Generate a node function for an agent."""
        agent_id = sanitize_identifier(agent.name)

        # Build system prompt from role + instructions + backstory
        system_parts = []
        if agent.role:
            system_parts.append(agent.role)
        if agent.goal:
            system_parts.append(f"Your goal: {agent.goal}")
        if agent.backstory:
            system_parts.append(f"Background: {agent.backstory}")
        if agent.instructions:
            system_parts.append(agent.instructions)
        system_prompt = "\n\n".join(system_parts) or f"You are the {agent.name} agent."

        # Determine LLM to use
        llm_config = agent.llm_config or ir.config.default_llm
        provider = llm_config.provider.value
        model = llm_config.model

        lines = [
            f'"""Agent node: {agent.name}"""',
            "",
            "from __future__ import annotations",
            "",
            "from typing import Any",
            "",
        ]

        # Import the right LLM class
        if provider in ("anthropic", "bedrock"):
            lines.append("from langchain_anthropic import ChatAnthropic")
            llm_class = "ChatAnthropic"
        else:
            lines.append("from langchain_openai import ChatOpenAI")
            llm_class = "ChatOpenAI"

        lines.append("from langchain_core.messages import HumanMessage, SystemMessage")
        lines.append("")

        # Import tools this agent uses
        tool_imports = []
        for tool_ref in agent.tools:
            tool_def = next((t for t in ir.tools if t.id == tool_ref), None)
            if tool_def:
                tool_fn = sanitize_identifier(tool_def.name)
                tool_imports.append((tool_fn, f"..tools.{tool_fn}"))

        for tool_fn, tool_module in tool_imports:
            lines.append(f"from {tool_module} import {tool_fn}")

        if tool_imports:
            lines.append("")

        lines.append("from ..state import AgentState")
        lines.append("")
        lines.append("")

        # Check if this node has HITL
        has_hitl = any(
            h.node_ref in [n.id for n in ir.workflow.nodes if n.agent_ref == agent.id]
            for h in ir.human_in_the_loop
        )

        if has_hitl:
            lines.append("from langgraph.types import interrupt")
            lines.append("")

        # System prompt as constant
        lines.append(f"SYSTEM_PROMPT = '''{system_prompt}'''")
        lines.append("")
        lines.append("")

        # The node function
        lines.append(f"def {agent_id}(state: AgentState) -> dict:")
        lines.append(f'    """Execute the {agent.name} agent."""')

        # Build LLM
        lines.append(f"    llm = {llm_class}(model=\"{model}\", temperature={llm_config.temperature})")

        # Bind tools if any
        if tool_imports:
            tool_list = ", ".join(fn for fn, _ in tool_imports)
            lines.append(f"    tools = [{tool_list}]")
            lines.append("    llm_with_tools = llm.bind_tools(tools)")
        else:
            lines.append("    llm_with_tools = llm")

        # Build messages
        lines.append("    messages = [SystemMessage(content=SYSTEM_PROMPT)]")
        lines.append("    if state.get('messages'):")
        lines.append("        messages.extend(state['messages'])")

        # HITL interrupt if needed
        if has_hitl:
            lines.append("")
            lines.append("    # Human-in-the-loop: pause for review")
            lines.append("    human_input = interrupt('Please review before proceeding.')")
            lines.append("    if human_input:")
            lines.append("        messages.append(HumanMessage(content=str(human_input)))")

        # Invoke
        lines.append("")
        lines.append("    response = llm_with_tools.invoke(messages)")
        lines.append("    return {'messages': [response]}")
        lines.append("")

        return "\n".join(lines)

    def _generate_graph(self, ir: IRDocument) -> str:
        """Generate the StateGraph construction."""
        lines = [
            '"""Workflow graph definition."""',
            "",
            "from __future__ import annotations",
            "",
            "from langgraph.graph import END, START, StateGraph",
            "",
            "from .state import AgentState",
            "",
        ]

        # Import agent node functions
        for agent in ir.agents:
            agent_id = sanitize_identifier(agent.name)
            lines.append(f"from .agents.{agent_id} import {agent_id}")

        lines.append("")
        lines.append("")

        # Build the graph
        lines.append("def build_graph() -> StateGraph:")
        lines.append('    """Construct and compile the workflow graph."""')
        lines.append("    graph = StateGraph(AgentState)")
        lines.append("")

        # Add nodes
        lines.append("    # Add nodes")
        node_to_func: dict[str, str] = {}
        for node in ir.workflow.nodes:
            if node.type == NodeType.AGENT and node.agent_ref:
                agent = next((a for a in ir.agents if a.id == node.agent_ref), None)
                if agent:
                    func_name = sanitize_identifier(agent.name)
                    node_name = sanitize_identifier(node.name or agent.name)
                    node_to_func[node.id] = node_name
                    lines.append(f'    graph.add_node("{node_name}", {func_name})')

            elif node.type == NodeType.CONDITION:
                # Condition nodes are handled via conditional edges, not as graph nodes
                node_to_func[node.id] = f"__condition_{sanitize_identifier(node.name or node.id)}"

            elif node.type in (NodeType.ENTRY, NodeType.EXIT):
                node_to_func[node.id] = node.id

        lines.append("")

        # Add edges
        lines.append("    # Add edges")

        # Entry edge
        if ir.workflow.entry_node:
            entry_target = node_to_func.get(ir.workflow.entry_node, "")
            if entry_target and not entry_target.startswith("__condition_"):
                lines.append(f'    graph.add_edge(START, "{entry_target}")')

        # Regular and conditional edges
        for edge in ir.workflow.edges:
            source = node_to_func.get(edge.source, "")
            target = node_to_func.get(edge.target, "")

            if not source or not target:
                continue

            # Skip condition node internal edges (handled differently)
            if source.startswith("__condition_"):
                continue

            if edge.target in [n for n in ir.workflow.exit_nodes]:
                lines.append(f'    graph.add_edge("{source}", END)')
            elif edge.type == EdgeType.DEFAULT:
                if not target.startswith("__condition_"):
                    lines.append(f'    graph.add_edge("{source}", "{target}")')
            elif edge.type == EdgeType.CONDITIONAL:
                # Collect all conditional edges from this source
                pass  # Handled in batch below

        # Handle conditional edges (group by source node)
        cond_edges_by_source: dict[str, list] = {}
        for edge in ir.workflow.edges:
            if edge.type == EdgeType.CONDITIONAL:
                source = node_to_func.get(edge.source, "")
                if source:
                    cond_edges_by_source.setdefault(source, []).append(edge)

        for source, edges in cond_edges_by_source.items():
            if source.startswith("__condition_"):
                # Find the actual source (the node before the condition)
                continue

            lines.append("")
            lines.append(f"    # Conditional routing from {source}")

            # Build the routing function
            router_name = f"route_{sanitize_identifier(source)}"
            lines.append(f"    def {router_name}(state: AgentState) -> str:")

            for edge in edges:
                target = node_to_func.get(edge.target, "END")
                if target in ir.workflow.exit_nodes:
                    target = "END"
                if edge.condition:
                    expr = edge.condition.expression
                    label = edge.condition.label or target
                    lines.append(f"        if {expr}:")
                    lines.append(f'            return "{target}"')

            # Default fallback
            default_target = node_to_func.get(edges[-1].target, "END")
            lines.append(f'        return "{default_target}"')

            # Build the path map
            path_map = {}
            for edge in edges:
                target = node_to_func.get(edge.target, "")
                if target:
                    target_val = "END" if edge.target in ir.workflow.exit_nodes else target
                    path_map[target_val] = target_val

            path_map_str = ", ".join(f'"{k}": "{v}"' for k, v in path_map.items())
            lines.append(
                f"    graph.add_conditional_edges(\"{source}\", {router_name}, "
                f"{{{path_map_str}}})"
            )

        lines.append("")
        lines.append("    return graph.compile()")
        lines.append("")
        return "\n".join(lines)

    def _generate_main(self, ir: IRDocument, project_name: str) -> str:
        """Generate the main entry point."""
        return dedent(f'''\
            """
            {ir.metadata.name} - Main Entry Point

            {ir.metadata.description}
            """

            from dotenv import load_dotenv

            from .graph import build_graph

            load_dotenv()


            def main() -> None:
                """Run the agent workflow."""
                graph = build_graph()

                # Initial state
                initial_state = {{
                    "messages": [],
                }}

                # Run the graph
                config = {{"configurable": {{"thread_id": "default"}}}}
                result = graph.invoke(initial_state, config=config)

                # Print final state
                if result.get("messages"):
                    for msg in result["messages"]:
                        print(f"{{msg.__class__.__name__}}: {{msg.content}}")


            if __name__ == "__main__":
                main()
        ''')

    def _generate_dockerfile(self, project_name: str) -> str:
        return dedent(f"""\
            FROM python:3.12-slim

            WORKDIR /app

            COPY requirements.txt .
            RUN pip install --no-cache-dir -r requirements.txt

            COPY . .

            CMD ["python", "-m", "src.main"]
        """)
