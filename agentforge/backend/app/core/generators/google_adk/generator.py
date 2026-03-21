"""
Google ADK (Agent Development Kit) Code Generator.

Produces a fully runnable Google ADK project from an IR document.
Supports Anthropic Claude models via LiteLLM integration.
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

        # __init__.py for package
        artifact.add_file(f"{name}/__init__.py", "")
        artifact.add_file(f"{name}/tools/__init__.py", "")

        # Generate tool files
        for tool in ir.tools:
            tool_id = sanitize_identifier(tool.name)
            artifact.add_file(f"{name}/tools/{tool_id}.py", self._generate_tool(tool))

        # Generate the agent hierarchy
        artifact.add_file(f"{name}/agent.py", self._generate_agent_module(ir, name))

        # Generate the runner
        artifact.add_file(f"{name}/main.py", self._generate_main(ir, name))

        # Generate a test script
        artifact.add_file(f"{name}/test_run.py", self._generate_test_script(ir, name))

        # Project files
        packages = [
            "google-adk>=1.0.0",
            "google-genai>=1.0.0",
            "litellm>=1.40.0",
            "python-dotenv>=1.0.0",
        ]
        artifact.add_file(f"{name}/requirements.txt", build_requirements_txt(packages))
        artifact.requirements = packages

        env_vars = [
            ("ANTHROPIC_API_KEY", "Anthropic API key for Claude models (used via LiteLLM)"),
            ("GOOGLE_API_KEY", "Google AI API key (alternative to Anthropic)"),
        ]
        artifact.add_file(f"{name}/.env.example", build_env_template(env_vars))

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
        """Generate a tool function file."""
        tool_id = sanitize_identifier(tool.name)

        params = []
        for p in tool.parameters:
            py_type = {
                FieldType.STRING: "str", FieldType.INTEGER: "int",
                FieldType.FLOAT: "float", FieldType.BOOLEAN: "bool",
                FieldType.LIST: "list", FieldType.DICT: "dict", FieldType.ANY: "str",
            }.get(p.type, "str")
            if p.default is not None:
                params.append(f"{p.name}: {py_type} = {repr(p.default)}")
            elif not p.required:
                params.append(f"{p.name}: {py_type} | None = None")
            else:
                params.append(f"{p.name}: {py_type}")

        param_str = ", ".join(params)

        lines = [
            f'"""Tool: {tool.name}"""',
            "",
            "",
            f"def {tool_id}({param_str}) -> str:",
            f'    """{tool.description}',
        ]
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
            lines.append(f'    return f"[{tool.name}] executed with args: {param_str or "no args"}"')

        lines.append("")
        return "\n".join(lines)

    def _generate_agent_module(self, ir: IRDocument, project_name: str) -> str:
        """Generate the complete agent.py with hierarchy."""
        lines = [
            '"""',
            f'Agent hierarchy for {ir.metadata.name}.',
            '',
            'Auto-generated by AgentForge.',
            '"""',
            '',
            'from google.adk.agents import LlmAgent',
        ]

        # Determine workflow agents needed
        workflow_imports = set()
        wf_type = ir.workflow.type
        if wf_type == WorkflowType.SEQUENTIAL:
            workflow_imports.add("SequentialAgent")
        elif wf_type == WorkflowType.PARALLEL:
            workflow_imports.add("ParallelAgent")

        for node in ir.workflow.nodes:
            if node.type == NodeType.LOOP:
                workflow_imports.add("LoopAgent")
            if node.type in (NodeType.PARALLEL_FAN_OUT, NodeType.PARALLEL_FAN_IN):
                workflow_imports.add("ParallelAgent")

        if workflow_imports:
            lines.append(f"from google.adk.agents import {', '.join(sorted(workflow_imports))}")

        # Import tools
        tool_ids = []
        for tool in ir.tools:
            tid = sanitize_identifier(tool.name)
            tool_ids.append(tid)
            lines.append(f"from .tools.{tid} import {tid}")

        lines.append("")
        lines.append("")

        # Determine model - prefer Anthropic since user has that key
        llm_model = ir.config.default_llm.model
        # Map common Anthropic model names to litellm format
        if "claude" in llm_model.lower():
            model_str = f"anthropic/{llm_model}"
        else:
            model_str = llm_model

        lines.append(f'MODEL = "{model_str}"')
        lines.append("")
        lines.append("")

        # Build individual agents from IR
        agent_var_map: dict[str, str] = {}  # agent.id -> variable name

        # Determine node execution order from edges
        ordered_agent_ids = self._get_agent_execution_order(ir)

        for agent in ir.agents:
            agent_id = sanitize_identifier(agent.name)
            var_name = f"{agent_id}_agent"
            agent_var_map[agent.id] = var_name

            # Build instruction
            instruction_parts = []
            if agent.role:
                instruction_parts.append(agent.role)
            if agent.goal:
                instruction_parts.append(f"Your goal: {agent.goal}")
            if agent.backstory:
                instruction_parts.append(f"Background: {agent.backstory}")
            if agent.instructions:
                instruction_parts.append(agent.instructions)
            instruction = "\\n\\n".join(instruction_parts) or f"You are the {agent.name} agent."

            # Agent-specific model override
            agent_model = model_str
            if agent.llm_config and agent.llm_config.model:
                m = agent.llm_config.model
                agent_model = f"anthropic/{m}" if "claude" in m.lower() else m

            # Tools for this agent
            agent_tools = []
            for tool_ref in agent.tools:
                tool_def = next((t for t in ir.tools if t.id == tool_ref), None)
                if tool_def:
                    agent_tools.append(sanitize_identifier(tool_def.name))

            tools_str = f"[{', '.join(agent_tools)}]" if agent_tools else "[]"

            lines.append(f"{var_name} = LlmAgent(")
            lines.append(f'    name="{agent.name}",')
            lines.append(f'    model="{agent_model}",')
            lines.append(f'    instruction="{instruction}",')
            if agent_tools:
                lines.append(f"    tools={tools_str},")
            lines.append(")")
            lines.append("")

        # Build the root agent / orchestrator
        lines.append("")
        lines.append("# ── Root Agent (Orchestrator) ──")
        lines.append("")

        agent_list = []
        for aid in ordered_agent_ids:
            if aid in agent_var_map:
                agent_list.append(agent_var_map[aid])
        # Include any agents not in the ordered list
        for agent in ir.agents:
            if agent.id not in ordered_agent_ids and agent.id in agent_var_map:
                agent_list.append(agent_var_map[agent.id])

        sub_agents_str = ", ".join(agent_list)

        if not agent_list:
            # No agents, create a simple root
            lines.append("root_agent = LlmAgent(")
            lines.append(f'    name="{ir.metadata.name or project_name}",')
            lines.append(f'    model="{model_str}",')
            lines.append(f'    instruction="You are the {ir.metadata.name} assistant.",')
            lines.append(")")
        elif wf_type == WorkflowType.SEQUENTIAL:
            lines.append("root_agent = SequentialAgent(")
            lines.append(f'    name="{project_name}_pipeline",')
            lines.append(f"    sub_agents=[{sub_agents_str}],")
            lines.append(")")
        elif wf_type == WorkflowType.PARALLEL:
            lines.append("root_agent = ParallelAgent(")
            lines.append(f'    name="{project_name}_parallel",')
            lines.append(f"    sub_agents=[{sub_agents_str}],")
            lines.append(")")
        else:
            # Custom graph or hierarchical → LlmAgent orchestrator with sub_agents
            routing = self._build_routing_instructions(ir)
            lines.append("root_agent = LlmAgent(")
            lines.append(f'    name="{project_name}_orchestrator",')
            lines.append(f'    model="{model_str}",')
            lines.append(f'    instruction="""{routing}""",')
            lines.append(f"    sub_agents=[{sub_agents_str}],")
            lines.append(")")

        lines.append("")
        return "\n".join(lines)

    def _generate_main(self, ir: IRDocument, project_name: str) -> str:
        """Generate main.py runner."""
        return dedent(f'''\
            """
            {ir.metadata.name} — Google ADK Runner

            Run with: python -m {project_name}.main
            """

            import asyncio
            import os

            from dotenv import load_dotenv
            from google.adk.runners import Runner
            from google.adk.sessions import InMemorySessionService
            from google.genai import types

            load_dotenv()

            # Import the agent hierarchy
            from .agent import root_agent


            async def run(user_message: str = "Hello, I need help with a customer support issue.") -> None:
                """Run the agent with a user message."""
                session_service = InMemorySessionService()
                runner = Runner(
                    agent=root_agent,
                    app_name="{project_name}",
                    session_service=session_service,
                )

                session = await session_service.create_session(
                    app_name="{project_name}",
                    user_id="test_user",
                )

                message = types.Content(
                    role="user",
                    parts=[types.Part(text=user_message)],
                )

                print(f"\\n>>> User: {{user_message}}")
                print("=" * 60)

                async for event in runner.run_async(
                    user_id="test_user",
                    session_id=session.id,
                    new_message=message,
                ):
                    if event.content and event.content.parts:
                        for part in event.content.parts:
                            if part.text:
                                author = event.author or "agent"
                                print(f"[{{author}}]: {{part.text}}")

                print("=" * 60)
                print("Done.")


            if __name__ == "__main__":
                asyncio.run(run())
        ''')

    def _generate_test_script(self, ir: IRDocument, project_name: str) -> str:
        """Generate a standalone test script that validates the agent hierarchy."""
        agent_names = [a.name for a in ir.agents]
        tool_names = [t.name for t in ir.tools]

        return dedent(f'''\
            """
            Test script for {ir.metadata.name}

            Validates the agent hierarchy can be constructed and run.
            Run with: python -m {project_name}.test_run
            """

            import asyncio
            import os
            import sys

            from dotenv import load_dotenv

            load_dotenv()


            def test_imports():
                """Test that all modules import correctly."""
                print("[TEST] Importing agent module...")
                from .agent import root_agent
                print(f"  root_agent: {{root_agent.name}}")
                print(f"  type: {{type(root_agent).__name__}}")
                if hasattr(root_agent, "sub_agents") and root_agent.sub_agents:
                    for sa in root_agent.sub_agents:
                        print(f"    sub_agent: {{sa.name}} ({{type(sa).__name__}})")
                print("[TEST] Imports OK\\n")
                return root_agent


            async def test_run(root_agent):
                """Test running the agent with a sample message."""
                from google.adk.runners import Runner
                from google.adk.sessions import InMemorySessionService
                from google.genai import types

                print("[TEST] Running agent with test message...")
                session_service = InMemorySessionService()
                runner = Runner(
                    agent=root_agent,
                    app_name="{project_name}_test",
                    session_service=session_service,
                )

                session = await session_service.create_session(
                    app_name="{project_name}_test",
                    user_id="test_user",
                )

                test_message = "I have a billing issue with my account. My last charge was incorrect."

                message = types.Content(
                    role="user",
                    parts=[types.Part(text=test_message)],
                )

                print(f"  Input: {{test_message}}")
                print("-" * 40)

                responses = []
                async for event in runner.run_async(
                    user_id="test_user",
                    session_id=session.id,
                    new_message=message,
                ):
                    if event.content and event.content.parts:
                        for part in event.content.parts:
                            if part.text:
                                author = event.author or "agent"
                                print(f"  [{{author}}]: {{part.text[:200]}}")
                                responses.append(part.text)

                print("-" * 40)
                if responses:
                    print(f"[TEST] Got {{len(responses)}} response(s). PASS")
                else:
                    print("[TEST] No responses received. FAIL")
                    sys.exit(1)


            if __name__ == "__main__":
                agent = test_imports()
                asyncio.run(test_run(agent))
                print("\\n[ALL TESTS PASSED]")
        ''')

    def _get_agent_execution_order(self, ir: IRDocument) -> list[str]:
        """Get agent IDs in execution order by tracing edges from entry."""
        node_to_agent: dict[str, str] = {}
        for node in ir.workflow.nodes:
            if node.type == NodeType.AGENT and node.agent_ref:
                node_to_agent[node.id] = node.agent_ref

        # Build adjacency from edges
        adj: dict[str, list[str]] = {}
        for edge in ir.workflow.edges:
            adj.setdefault(edge.source, []).append(edge.target)

        # BFS from entry
        ordered: list[str] = []
        visited: set[str] = set()
        queue = [ir.workflow.entry_node] if ir.workflow.entry_node else []

        while queue:
            node_id = queue.pop(0)
            if node_id in visited:
                continue
            visited.add(node_id)
            if node_id in node_to_agent:
                agent_id = node_to_agent[node_id]
                if agent_id not in ordered:
                    ordered.append(agent_id)
            for neighbor in adj.get(node_id, []):
                queue.append(neighbor)

        return ordered

    def _build_routing_instructions(self, ir: IRDocument) -> str:
        """Build orchestrator routing instructions from the graph."""
        ordered = self._get_agent_execution_order(ir)

        instructions = [
            f"You are the orchestrator for {ir.metadata.name}.",
            "",
            "Process the user request by delegating to your sub-agents in this order:",
        ]

        for i, agent_id in enumerate(ordered, 1):
            agent = next((a for a in ir.agents if a.id == agent_id), None)
            if agent:
                desc = agent.description or agent.goal or agent.role or f"Handle {agent.name} tasks"
                instructions.append(f"{i}. **{agent.name}**: {desc}")

        # Check for HITL nodes
        hitl_nodes = [n for n in ir.workflow.nodes if n.type == NodeType.HUMAN_INPUT]
        if hitl_nodes:
            instructions.append("")
            instructions.append("IMPORTANT: After the classification step, pause and present the "
                              "classification result for human review before proceeding.")

        # Check for condition nodes
        cond_nodes = [n for n in ir.workflow.nodes if n.type == NodeType.CONDITION]
        if cond_nodes:
            instructions.append("")
            for cn in cond_nodes:
                expr = cn.config.condition.condition_expression if cn.config.condition else ""
                instructions.append(f"Routing rule: If {expr or 'condition is met'}, "
                                  "route to the appropriate specialist agent.")

        instructions.append("")
        instructions.append("Synthesize the results from all agents into a final response.")

        return "\\n".join(instructions)
