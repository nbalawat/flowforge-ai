"""
Google ADK (Agent Development Kit) Code Generator.

Converts an IR document into a runnable Google ADK project.

IR → Google ADK Mapping:
- Agent → LlmAgent(name, model, instruction, tools, sub_agents)
- Sequential workflow → SequentialAgent(sub_agents=[...])
- Parallel workflow → ParallelAgent(sub_agents=[...])
- Loop → LoopAgent(sub_agents=[...], max_iterations)
- Tool → FunctionTool(fn) with typed parameters
- State → ctx.session.state with prefix scoping (app:, user:, temp:)
- HITL → before_agent_callback / after_agent_callback
- Routing → LLM-based via agent instructions + transfer_to_agent
- Conditional edges → Translated to agent instructions guiding routing
"""

from __future__ import annotations

from textwrap import dedent

from ...ir.schema import (
    AgentDefinition,
    EdgeType,
    FieldType,
    IRDocument,
    NodeType,
    TargetFramework,
    ToolDefinition,
    WorkflowType,
)
from ...ir.validation import ValidationIssue, ValidationSeverity
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


ADK_VERSION = ">=1.0.0"


class GoogleADKGenerator:
    """Generates Google ADK projects from IR documents."""

    @property
    def framework(self) -> TargetFramework:
        return TargetFramework.GOOGLE_ADK

    @property
    def framework_version(self) -> str:
        return ADK_VERSION

    def validate_ir(self, ir: IRDocument) -> list[ValidationIssue]:
        issues: list[ValidationIssue] = []

        # ADK uses LLM-based routing, not explicit conditional edges
        cond_edges = [e for e in ir.workflow.edges if e.type == EdgeType.CONDITIONAL]
        if cond_edges:
            issues.append(
                ValidationIssue(
                    stage="framework_compatibility",
                    severity=ValidationSeverity.INFO,
                    message=f"Google ADK uses LLM-based routing. {len(cond_edges)} conditional "
                    "edges will be translated to agent instructions guiding routing.",
                    path="workflow.edges",
                )
            )

        return issues

    def generate_project(
        self, ir: IRDocument, project_name: str | None = None
    ) -> ProjectArtifact:
        name = project_name or sanitize_identifier(ir.metadata.name)
        artifact = ProjectArtifact(framework=TargetFramework.GOOGLE_ADK)

        # Generate tool files
        for tool in ir.tools:
            tool_id = sanitize_identifier(tool.name)
            artifact.add_file(
                f"{name}/tools/{tool_id}.py",
                self._generate_tool(tool),
            )

        # Generate the agent hierarchy
        artifact.add_file(f"{name}/agent.py", self._generate_agent_hierarchy(ir))

        # Generate the runner/main entry point
        artifact.add_file(f"{name}/main.py", self._generate_main(ir, name))

        # Generate __init__ files
        artifact.add_file(f"{name}/__init__.py", "")
        artifact.add_file(f"{name}/tools/__init__.py", "")

        # Generate callbacks if HITL is configured
        if ir.human_in_the_loop:
            artifact.add_file(f"{name}/callbacks.py", self._generate_callbacks(ir))

        # Project files
        packages = [
            f"google-adk{ADK_VERSION}",
            "google-genai>=1.0.0",
            "python-dotenv>=1.0.0",
        ]
        artifact.add_file(f"{name}/requirements.txt", build_requirements_txt(packages))
        artifact.requirements = packages

        env_vars = [
            ("GOOGLE_API_KEY", "Google AI API key"),
            ("GOOGLE_CLOUD_PROJECT", "Google Cloud project ID (optional, for Vertex AI)"),
        ]
        artifact.add_file(f"{name}/.env.example", build_env_template(env_vars))
        artifact.add_file(f"{name}/Dockerfile", self._generate_dockerfile(name))

        return artifact

    def generate_tests(self, ir: IRDocument) -> TestArtifact:
        return TestArtifact()

    def generate_deployment(
        self, ir: IRDocument, target: CloudTarget = CloudTarget.LOCAL
    ) -> DeployArtifact:
        return DeployArtifact(target=target)

    # ================================================================
    # Private generation methods
    # ================================================================

    def _generate_tool(self, tool: ToolDefinition) -> str:
        """Generate an ADK FunctionTool."""
        tool_id = sanitize_identifier(tool.name)

        # Build parameter signature with type hints
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
            }.get(tool.returns.type, "str")

        lines = [
            f'"""Tool: {tool.name}"""',
            "",
            "",
            f"def {tool_id}({param_str}) -> {return_type}:",
            f'    """{tool.description}',
        ]

        # Add parameter descriptions as docstring
        if tool.parameters:
            lines.append("")
            lines.append("    Args:")
            for p in tool.parameters:
                lines.append(f"        {p.name}: {p.description or p.name}")

        lines.append('    """')

        if tool.implementation and tool.implementation.source:
            for source_line in tool.implementation.source.strip().split("\n"):
                lines.append(f"    {source_line}")
        else:
            lines.append(f"    # TODO: Implement {tool.name}")
            lines.append(f'    raise NotImplementedError("{tool.name} not yet implemented")')

        lines.append("")
        return "\n".join(lines)

    def _generate_agent_hierarchy(self, ir: IRDocument) -> str:
        """Generate the ADK agent hierarchy.

        ADK uses a hierarchical agent model:
        - LlmAgent for LLM-driven agents
        - SequentialAgent for sequential workflows
        - ParallelAgent for parallel workflows
        - LoopAgent for iterative workflows
        """
        lines = [
            '"""Agent hierarchy definition."""',
            "",
            "from google.adk.agents import LlmAgent",
        ]

        # Import workflow agents based on workflow type
        workflow_imports = set()
        if ir.workflow.type == WorkflowType.SEQUENTIAL:
            workflow_imports.add("SequentialAgent")
        elif ir.workflow.type == WorkflowType.PARALLEL:
            workflow_imports.add("ParallelAgent")

        # Check for loop nodes
        for node in ir.workflow.nodes:
            if node.type == NodeType.LOOP:
                workflow_imports.add("LoopAgent")
            if node.type == NodeType.PARALLEL_FAN_OUT:
                workflow_imports.add("ParallelAgent")

        if workflow_imports:
            imports_str = ", ".join(sorted(workflow_imports))
            lines.append(f"from google.adk.agents import {imports_str}")

        lines.append("from google.adk.tools import FunctionTool")
        lines.append("")

        # Import tools
        for tool in ir.tools:
            tool_id = sanitize_identifier(tool.name)
            lines.append(f"from .tools.{tool_id} import {tool_id}")

        lines.append("")

        # Import callbacks if HITL
        if ir.human_in_the_loop:
            lines.append("from .callbacks import before_agent_review, after_agent_review")
            lines.append("")

        lines.append("")

        # Build tool references
        lines.append("# Tools")
        for tool in ir.tools:
            tool_id = sanitize_identifier(tool.name)
            lines.append(f"{tool_id}_tool = FunctionTool({tool_id})")
        lines.append("")

        # Build individual LlmAgent definitions
        lines.append("# Agents")
        agent_var_names: dict[str, str] = {}

        for agent in ir.agents:
            agent_id = sanitize_identifier(agent.name)
            agent_var_names[agent.id] = f"{agent_id}_agent"

            # Build instruction from role + goal + backstory + instructions
            instruction_parts = []
            if agent.role:
                instruction_parts.append(agent.role)
            if agent.goal:
                instruction_parts.append(f"Your goal: {agent.goal}")
            if agent.backstory:
                instruction_parts.append(f"Background: {agent.backstory}")
            if agent.instructions:
                instruction_parts.append(agent.instructions)
            instruction = "\n\n".join(instruction_parts) or f"You are the {agent.name} agent."

            # Determine model
            llm_config = agent.llm_config or ir.config.default_llm
            model = llm_config.model

            # Tools for this agent
            agent_tools = []
            for tool_ref in agent.tools:
                tool_def = next((t for t in ir.tools if t.id == tool_ref), None)
                if tool_def:
                    agent_tools.append(f"{sanitize_identifier(tool_def.name)}_tool")

            tools_str = f"[{', '.join(agent_tools)}]" if agent_tools else "[]"

            # Callbacks
            callbacks = ""
            hitl_for_agent = [
                h for h in ir.human_in_the_loop
                if any(
                    n.agent_ref == agent.id
                    for n in ir.workflow.nodes
                    if n.id == h.node_ref
                )
            ]
            if hitl_for_agent:
                callbacks = (
                    ",\n        before_agent_callback=before_agent_review,"
                    "\n        after_agent_callback=after_agent_review"
                )

            lines.append(f"{agent_id}_agent = LlmAgent(")
            lines.append(f'    name="{agent.name}",')
            lines.append(f'    model="{model}",')
            lines.append(f"    instruction=\"\"\"{instruction}\"\"\",")
            lines.append(f"    tools={tools_str},{callbacks}")
            lines.append(")")
            lines.append("")

        # Build the orchestrator based on workflow type
        lines.append("")
        lines.append("# Orchestrator")

        agent_list = ", ".join(
            agent_var_names[agent.id] for agent in ir.agents if agent.id in agent_var_names
        )

        if ir.workflow.type == WorkflowType.SEQUENTIAL:
            lines.append("root_agent = SequentialAgent(")
            lines.append(f'    name="{ir.metadata.name}_orchestrator",')
            lines.append(f"    sub_agents=[{agent_list}],")
            lines.append(")")
        elif ir.workflow.type == WorkflowType.PARALLEL:
            lines.append("root_agent = ParallelAgent(")
            lines.append(f'    name="{ir.metadata.name}_orchestrator",')
            lines.append(f"    sub_agents=[{agent_list}],")
            lines.append(")")
        elif ir.workflow.type == WorkflowType.HIERARCHICAL:
            # Use LlmAgent as root with sub_agents for hierarchical routing
            lines.append("root_agent = LlmAgent(")
            lines.append(f'    name="{ir.metadata.name}_orchestrator",')
            lines.append(f'    model="{ir.config.default_llm.model}",')
            lines.append(
                f'    instruction="You are the orchestrator. Delegate tasks to the '
                f'appropriate specialist agent.",')
            lines.append(f"    sub_agents=[{agent_list}],")
            lines.append(")")
        else:
            # Custom graph: use LlmAgent with sub_agents and routing instructions
            # Build routing instruction from conditional edges
            routing_instructions = self._build_routing_instructions(ir)
            lines.append("root_agent = LlmAgent(")
            lines.append(f'    name="{ir.metadata.name}_orchestrator",')
            lines.append(f'    model="{ir.config.default_llm.model}",')
            lines.append(f'    instruction="""{routing_instructions}""",')
            lines.append(f"    sub_agents=[{agent_list}],")
            lines.append(")")

        lines.append("")
        return "\n".join(lines)

    def _build_routing_instructions(self, ir: IRDocument) -> str:
        """Build routing instructions from conditional edges for LLM-based routing."""
        instructions = [
            "You are the orchestrator agent. Route tasks to the appropriate specialist agent.",
            "",
            "Available agents and when to use them:",
        ]

        for agent in ir.agents:
            desc = agent.description or agent.goal or agent.role or f"Handles {agent.name} tasks"
            instructions.append(f"- {agent.name}: {desc}")

        # Add routing rules from conditional edges
        cond_edges = [e for e in ir.workflow.edges if e.type == EdgeType.CONDITIONAL]
        if cond_edges:
            instructions.append("")
            instructions.append("Routing rules:")
            for edge in cond_edges:
                if edge.condition and edge.condition.label:
                    target_node = next(
                        (n for n in ir.workflow.nodes if n.id == edge.target), None
                    )
                    if target_node and target_node.agent_ref:
                        target_agent = next(
                            (a for a in ir.agents if a.id == target_node.agent_ref), None
                        )
                        if target_agent:
                            instructions.append(
                                f"- When {edge.condition.label}: "
                                f"delegate to {target_agent.name}"
                            )

        return "\n".join(instructions)

    def _generate_callbacks(self, ir: IRDocument) -> str:
        """Generate callback functions for HITL."""
        return dedent('''\
            """Callbacks for human-in-the-loop review."""

            from google.adk.agents import CallbackContext
            from google.genai import types


            def before_agent_review(callback_context: CallbackContext) -> types.Content | None:
                """Called before an agent executes. Return Content to skip agent logic."""
                agent_name = callback_context.agent_name
                print(f"\\n[HITL] Agent '{agent_name}' is about to execute.")
                print("[HITL] Type 'skip' to skip, or press Enter to continue:")

                user_input = input("> ").strip()
                if user_input.lower() == "skip":
                    return types.Content(
                        role="model",
                        parts=[types.Part(text=f"Agent {agent_name} was skipped by human review.")]
                    )
                return None  # Continue to agent logic


            def after_agent_review(callback_context: CallbackContext) -> types.Content | None:
                """Called after an agent executes. Return Content to append to output."""
                agent_name = callback_context.agent_name
                print(f"\\n[HITL] Agent '{agent_name}' has completed execution.")
                print("[HITL] Type feedback or press Enter to accept:")

                user_input = input("> ").strip()
                if user_input:
                    return types.Content(
                        role="model",
                        parts=[types.Part(text=f"Human feedback: {user_input}")]
                    )
                return None  # Accept agent output as-is
        ''')

    def _generate_main(self, ir: IRDocument, project_name: str) -> str:
        """Generate the main runner entry point."""
        return dedent(f'''\
            """
            {ir.metadata.name} - Main Entry Point

            {ir.metadata.description}

            Uses Google ADK Runner with InMemorySessionService for local development.
            """

            import asyncio

            from dotenv import load_dotenv
            from google.adk.runners import Runner
            from google.adk.sessions import InMemorySessionService
            from google.genai import types

            from .agent import root_agent

            load_dotenv()


            async def main() -> None:
                """Run the agent workflow."""
                session_service = InMemorySessionService()
                runner = Runner(
                    agent=root_agent,
                    app_name="{project_name}",
                    session_service=session_service,
                )

                # Create a session
                session = await session_service.create_session(
                    app_name="{project_name}",
                    user_id="default_user",
                )

                # Send initial message
                message = types.Content(
                    role="user",
                    parts=[types.Part(text="Hello, please help me with my task.")]
                )

                print("Running agent workflow...")
                async for event in runner.run_async(
                    user_id="default_user",
                    session_id=session.id,
                    new_message=message,
                ):
                    if event.content and event.content.parts:
                        for part in event.content.parts:
                            if part.text:
                                print(f"[{{event.author}}]: {{part.text}}")


            if __name__ == "__main__":
                asyncio.run(main())
        ''')

    def _generate_dockerfile(self, project_name: str) -> str:
        return dedent(f"""\
            FROM python:3.12-slim

            WORKDIR /app

            COPY requirements.txt .
            RUN pip install --no-cache-dir -r requirements.txt

            COPY . .

            CMD ["python", "-m", "main"]
        """)
