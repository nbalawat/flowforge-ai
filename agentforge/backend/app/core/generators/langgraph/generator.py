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

from ...ir.schema import (
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
from ...ir.validation import ValidationIssue, ValidationSeverity
from ..base import (
    CloudTarget,
    DeployArtifact,
    FrameworkGenerator,
    NodeMapping,
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
            file_path = f"{name}/src/tools/{tool_id}.py"
            artifact.add_file(file_path, self._generate_tool(tool))
            # Find corresponding node for this tool
            for node in ir.workflow.nodes:
                if node.type == NodeType.TOOL_CALL and node.tool_ref == tool.id:
                    artifact.node_mappings.append(NodeMapping(
                        node_id=node.id,
                        node_name=node.name or tool.name,
                        node_type=node.type.value if hasattr(node.type, 'value') else str(node.type),
                        file_path=file_path,
                        function_name=tool_id,
                        line_start=6,
                    ))

        # Generate agent node files
        for agent in ir.agents:
            agent_id = sanitize_identifier(agent.name)
            file_path = f"{name}/src/agents/{agent_id}.py"
            artifact.add_file(file_path, self._generate_agent_node(agent, ir))
            # Find corresponding node(s) for this agent
            for node in ir.workflow.nodes:
                if node.type == NodeType.AGENT and node.agent_ref == agent.id:
                    artifact.node_mappings.append(NodeMapping(
                        node_id=node.id,
                        node_name=node.name or agent.name,
                        node_type=node.type.value if hasattr(node.type, 'value') else str(node.type),
                        file_path=file_path,
                        function_name=agent_id,
                        line_start=1,
                    ))

        # Generate the graph definition
        graph_file_path = f"{name}/src/graph.py"
        graph_content = self._generate_graph(ir)
        artifact.add_file(graph_file_path, graph_content)

        # Map condition and other non-agent/tool nodes to graph.py
        line_offset = 10  # approximate starting line for routing functions
        for node in ir.workflow.nodes:
            if node.type == NodeType.CONDITION:
                artifact.node_mappings.append(NodeMapping(
                    node_id=node.id,
                    node_name=node.name or node.id,
                    node_type=node.type.value if hasattr(node.type, 'value') else str(node.type),
                    file_path=graph_file_path,
                    function_name=f"route_{sanitize_identifier(node.name or node.id)}",
                    line_start=line_offset,
                ))
                line_offset += 10
            elif node.type == NodeType.HUMAN_INPUT:
                artifact.node_mappings.append(NodeMapping(
                    node_id=node.id,
                    node_name=node.name or node.id,
                    node_type=node.type.value if hasattr(node.type, 'value') else str(node.type),
                    file_path=graph_file_path,
                    function_name="build_graph",
                    line_start=line_offset,
                ))
                line_offset += 5

        # Generate main entry point
        artifact.add_file(f"{name}/src/main.py", self._generate_main(ir, name))

        # Generate __init__ files
        artifact.add_file(f"{name}/__init__.py", "")
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

        # Generate test_run.py at project root (used by execution runner)
        artifact.add_file(f"{name}/test_run.py", self._generate_test_run(ir, name))

        return artifact

    def generate_tests(self, ir: IRDocument) -> TestArtifact:
        from ..base import GeneratedFile as GF

        name = sanitize_identifier(ir.metadata.name)
        artifact = TestArtifact()
        artifact.files.append(GF(path=f"{name}/tests/__init__.py", content=""))
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
        # Always include messages field for LangGraph (needed for chat-based agents)
        has_messages = any(f.name == "messages" for f in fields)
        if not has_messages:
            lines.append("    messages: Annotated[list[Any], operator.add]")

        if not fields:
            pass  # messages already added above
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

            elif node.type == NodeType.ENTRY:
                node_to_func[node.id] = "__START__"
            elif node.type == NodeType.EXIT:
                node_to_func[node.id] = "__END__"

            elif node.type == NodeType.HUMAN_INPUT:
                # HITL nodes become passthrough nodes in LangGraph
                node_name = sanitize_identifier(node.name or f"human_{node.id}")
                node_to_func[node.id] = node_name
                lines.append(f'    graph.add_node("{node_name}", lambda state: state)  # HITL placeholder')

        lines.append("")

        # Add edges
        lines.append("    # Add edges")

        # Regular and conditional edges
        for edge in ir.workflow.edges:
            source = node_to_func.get(edge.source, "")
            target = node_to_func.get(edge.target, "")

            if not source or not target:
                continue

            # Skip condition node internal edges (handled differently)
            if source.startswith("__condition_"):
                continue

            # Map START/END markers to LangGraph constants
            actual_source = "START" if source == "__START__" else f'"{source}"'
            actual_target = "END" if target == "__END__" else f'"{target}"'

            if edge.type == EdgeType.DEFAULT:
                # Skip edges to/from condition nodes (handled by conditional_edges)
                if target.startswith("__condition_") or source.startswith("__condition_"):
                    continue
                lines.append(f'    graph.add_edge({actual_source}, {actual_target})')
            elif edge.type == EdgeType.CONDITIONAL:
                # Collect all conditional edges from this source
                pass  # Handled in batch below

        # Handle conditional edges
        # In AgentForge IR, conditions are modeled as:
        #   predecessor_node → condition_node → target_nodes (via conditional edges)
        # In LangGraph, this becomes:
        #   graph.add_conditional_edges(predecessor, routing_fn, path_map)

        # Find condition nodes and their predecessors
        condition_nodes = {n.id: n for n in ir.workflow.nodes if n.type == NodeType.CONDITION}

        for cond_id, cond_node in condition_nodes.items():
            # Find the predecessor: who connects to this condition node?
            predecessor_edge = next(
                (e for e in ir.workflow.edges if e.target == cond_id and e.type == EdgeType.DEFAULT),
                None
            )
            if not predecessor_edge:
                continue

            pred_func = node_to_func.get(predecessor_edge.source, "")
            if not pred_func or pred_func in ("__START__", "__END__"):
                continue

            # Find outgoing conditional edges from this condition node
            cond_out_edges = [
                e for e in ir.workflow.edges
                if e.source == cond_id and e.type == EdgeType.CONDITIONAL
            ]
            if not cond_out_edges:
                continue

            # Remove the default edge we already added (predecessor → condition)
            # by noting it — we'll replace it with conditional_edges
            lines.append("")
            lines.append(f"    # Conditional routing after {pred_func}")

            router_name = f"route_{sanitize_identifier(pred_func)}"
            lines.append(f"    def {router_name}(state: AgentState) -> str:")

            path_map = {}
            for edge in cond_out_edges:
                target = node_to_func.get(edge.target, "__END__")
                target_val = "END" if target == "__END__" else target
                if edge.condition:
                    expr = edge.condition.expression
                    lines.append(f"        if {expr}:")
                    lines.append(f'            return "{target_val}"')
                path_map[target_val] = target_val

            # Default fallback
            last_target = node_to_func.get(cond_out_edges[-1].target, "__END__")
            last_val = "END" if last_target == "__END__" else last_target
            lines.append(f'        return "{last_val}"')

            path_map_str = ", ".join(f'"{k}": "{v}"' for k, v in path_map.items())
            lines.append(
                f'    graph.add_conditional_edges("{pred_func}", {router_name}, '
                f'{{{path_map_str}}})'
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

    def _generate_test_run(self, ir: IRDocument, project_name: str) -> str:
        """Generate a test_run.py at the project root for the execution runner."""
        # Build state field initializers
        state_lines = []
        for f in ir.workflow.state_schema.fields:
            t = f.type.value
            if t == "string":
                state_lines.append(f'    "{f.name}": ""')
            elif t == "boolean":
                state_lines.append(f'    "{f.name}": False')
            elif t in ("dict", "object"):
                state_lines.append(f'    "{f.name}": {{}}')
            elif t in ("list", "array"):
                state_lines.append(f'    "{f.name}": []')
            elif t in ("integer", "number", "float"):
                state_lines.append(f'    "{f.name}": 0')
            else:
                state_lines.append(f'    "{f.name}": None')
        extra_state = ",\n".join(state_lines)

        lines = [
            f'"""Test runner for {ir.metadata.name} — LangGraph"""',
            "import os",
            "import sys",
            "",
            "from dotenv import load_dotenv",
            "load_dotenv()",
            "",
            'api_key = os.environ.get("ANTHROPIC_API_KEY", "")',
            "if not api_key:",
            '    print("[TEST] ERROR: ANTHROPIC_API_KEY not set")',
            "    sys.exit(1)",
            "",
            "from langchain_core.messages import HumanMessage",
            "from .src.graph import build_graph",
            "",
            "",
            "def run_test():",
            '    print("[TEST] Building LangGraph workflow...")',
            "    graph = build_graph()",
            "",
            '    test_input = os.environ.get("TEST_MESSAGE", "I need help with my billing issue.")',
            "    initial_state = {",
            '        "messages": [HumanMessage(content=test_input)],',
        ]

        if extra_state:
            lines.append(extra_state + ",")

        lines.extend([
            "    }",
            "",
            '    print("[TEST] Running workflow with test input...")',
            '    config = {"configurable": {"thread_id": "test-run-1"}}',
            "",
            "    try:",
            "        result = graph.invoke(initial_state, config=config)",
            '        print("[TEST] Workflow completed successfully")',
            "",
            '        if result.get("messages"):',
            '            for msg in result["messages"]:',
            "                role = msg.__class__.__name__",
            '                content = msg.content if hasattr(msg, "content") else str(msg)',
            '                print(f"[{role}]: {content[:500]}")',
            "",
            '        print("[ALL TESTS PASSED]")',
            "    except Exception as e:",
            '        print(f"[TEST] ERROR: {e}")',
            "        sys.exit(1)",
            "",
            "",
            'if __name__ == "__main__":',
            "    run_test()",
        ])

        return "\n".join(lines)

    def _generate_dockerfile(self, project_name: str) -> str:
        return dedent(f"""\
            FROM python:3.12-slim

            WORKDIR /app

            COPY requirements.txt .
            RUN pip install --no-cache-dir -r requirements.txt

            COPY . .

            CMD ["python", "-m", "src.main"]
        """)
