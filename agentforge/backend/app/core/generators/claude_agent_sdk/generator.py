"""
Claude Agent SDK Code Generator.

Converts an IR document into a runnable Claude Agent SDK project.

IR → Claude Agent SDK Mapping:
- Agent → ClaudeSDKClient with ClaudeAgentOptions (or subagent definitions)
- Tool → Custom MCP tools via createSdkMcpServer / @tool
- Skills → SKILL.md files in .claude/skills/
- Workflow → Main agent delegates to subagents (sequential/parallel spawning)
- State → File-based memory system (/memories directory)
- HITL → Permission modes + PreToolUse/PostToolUse hooks + can_use_tool callback
- MCP → Native MCP server integration
- Hooks → PreToolUse/PostToolUse hook definitions
- Delegation → Subagent spawning with independent context windows
"""

from __future__ import annotations

from textwrap import dedent

from ...core.ir.schema import (
    AgentDefinition,
    FieldType,
    HookTrigger,
    IRDocument,
    NodeType,
    PermissionMode,
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


SDK_VERSION = ">=0.1.0"


class ClaudeAgentSDKGenerator:
    """Generates Claude Agent SDK projects from IR documents."""

    @property
    def framework(self) -> TargetFramework:
        return TargetFramework.CLAUDE_AGENT_SDK

    @property
    def framework_version(self) -> str:
        return SDK_VERSION

    def validate_ir(self, ir: IRDocument) -> list[ValidationIssue]:
        issues: list[ValidationIssue] = []

        # Claude SDK uses subagent spawning for multi-agent
        if len(ir.agents) > 1:
            issues.append(
                ValidationIssue(
                    stage="framework_compatibility",
                    severity=ValidationSeverity.INFO,
                    message=f"{len(ir.agents)} agents defined. Claude Agent SDK implements "
                    "multi-agent workflows via subagent spawning with independent "
                    "context windows.",
                    path="agents",
                )
            )

        # Native MCP support
        mcp_tools = [t for t in ir.tools if t.type.value == "mcp_server"]
        if mcp_tools:
            issues.append(
                ValidationIssue(
                    stage="framework_compatibility",
                    severity=ValidationSeverity.INFO,
                    message=f"{len(mcp_tools)} MCP tool(s) are natively supported by Claude SDK.",
                    path="tools",
                )
            )

        # Skills are native
        if ir.skills:
            issues.append(
                ValidationIssue(
                    stage="framework_compatibility",
                    severity=ValidationSeverity.INFO,
                    message=f"{len(ir.skills)} skill(s) will be generated as SKILL.md files.",
                    path="skills",
                )
            )

        return issues

    def generate_project(
        self, ir: IRDocument, project_name: str | None = None
    ) -> ProjectArtifact:
        name = project_name or sanitize_identifier(ir.metadata.name)
        artifact = ProjectArtifact(framework=TargetFramework.CLAUDE_AGENT_SDK)

        # Generate custom tools as MCP server
        if ir.tools:
            artifact.add_file(
                f"{name}/tools/custom_tools.py",
                self._generate_tools_mcp_server(ir),
            )

        # Generate skill files
        for skill in ir.skills:
            skill_id = sanitize_identifier(skill.name)
            artifact.add_file(
                f"{name}/.claude/skills/{skill_id}/SKILL.md",
                self._generate_skill_file(skill, ir),
            )

        # Generate subagent definitions
        for agent in ir.agents:
            if agent != ir.agents[0]:  # First agent is the main agent
                agent_id = sanitize_identifier(agent.name)
                artifact.add_file(
                    f"{name}/.claude/agents/{agent_id}.md",
                    self._generate_subagent_definition(agent, ir),
                )

        # Generate hooks if defined
        if ir.hooks:
            artifact.add_file(f"{name}/hooks.py", self._generate_hooks(ir))

        # Generate main agent runner
        artifact.add_file(f"{name}/main.py", self._generate_main(ir, name))

        # Generate configuration
        artifact.add_file(f"{name}/config.py", self._generate_config(ir))

        # Generate __init__ files
        artifact.add_file(f"{name}/__init__.py", "")
        artifact.add_file(f"{name}/tools/__init__.py", "")

        # Project files
        packages = [
            f"claude-agent-sdk{SDK_VERSION}",
            "anthropic>=0.40.0",
            "python-dotenv>=1.0.0",
        ]
        artifact.add_file(f"{name}/requirements.txt", build_requirements_txt(packages))
        artifact.requirements = packages

        env_vars = [
            ("ANTHROPIC_API_KEY", "Anthropic API key for Claude models"),
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

    def _generate_tools_mcp_server(self, ir: IRDocument) -> str:
        """Generate custom tools as an in-process MCP server."""
        lines = [
            '"""Custom tools implemented as an MCP server for Claude Agent SDK."""',
            "",
            "from claude_agent_sdk import tool",
            "",
            "",
        ]

        for tool_def in ir.tools:
            if tool_def.type.value == "mcp_server":
                continue  # External MCP servers are configured, not generated

            tool_id = sanitize_identifier(tool_def.name)

            # Build parameter signature
            params = []
            for p in tool_def.parameters:
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

            lines.append("@tool")
            lines.append(f"def {tool_id}({param_str}) -> str:")
            lines.append(f'    """{tool_def.description}"""')

            if tool_def.implementation and tool_def.implementation.source:
                for source_line in tool_def.implementation.source.strip().split("\n"):
                    lines.append(f"    {source_line}")
            else:
                lines.append(f"    # TODO: Implement {tool_def.name}")
                lines.append(f'    return "Not yet implemented: {tool_def.name}"')

            lines.append("")
            lines.append("")

        return "\n".join(lines)

    def _generate_skill_file(self, skill, ir: IRDocument) -> str:
        """Generate a SKILL.md file for Claude Agent SDK."""
        lines = [
            "---",
            f"name: {skill.name}",
            f"description: {skill.description}",
            "---",
            "",
            f"# {skill.name}",
            "",
            skill.instructions or f"Instructions for the {skill.name} skill.",
            "",
        ]

        # Reference tools this skill uses
        if skill.tools:
            lines.append("## Tools")
            lines.append("")
            for tool_ref in skill.tools:
                tool_def = next((t for t in ir.tools if t.id == tool_ref), None)
                if tool_def:
                    lines.append(f"- **{tool_def.name}**: {tool_def.description}")
            lines.append("")

        # Reference agents this skill orchestrates
        if skill.agents:
            lines.append("## Agents")
            lines.append("")
            for agent_ref in skill.agents:
                agent_def = next((a for a in ir.agents if a.id == agent_ref), None)
                if agent_def:
                    lines.append(f"- **{agent_def.name}**: {agent_def.description or agent_def.goal}")
            lines.append("")

        return "\n".join(lines)

    def _generate_subagent_definition(self, agent: AgentDefinition, ir: IRDocument) -> str:
        """Generate a subagent .md file for Claude Agent SDK."""
        # Build system prompt
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

        # Build tool permissions
        allowed_tools = []
        for tool_ref in agent.tools:
            tool_def = next((t for t in ir.tools if t.id == tool_ref), None)
            if tool_def:
                allowed_tools.append(sanitize_identifier(tool_def.name))

        lines = [
            "---",
            f"name: {agent.name}",
            f"description: {agent.description or agent.goal or agent.role}",
        ]

        if allowed_tools:
            tools_str = ", ".join(allowed_tools)
            lines.append(f"allowed_tools: [{tools_str}]")

        if agent.max_iterations:
            lines.append(f"max_turns: {agent.max_iterations}")

        if agent.max_budget_usd:
            lines.append(f"max_budget_usd: {agent.max_budget_usd}")

        lines.append("---")
        lines.append("")
        lines.append(system_prompt)
        lines.append("")

        return "\n".join(lines)

    def _generate_hooks(self, ir: IRDocument) -> str:
        """Generate hook implementations."""
        lines = [
            '"""Hooks for controlling agent behavior at specific execution points."""',
            "",
            "from claude_agent_sdk import PreToolUseHookInput, PostToolUseHookInput",
            "",
            "",
        ]

        for hook in ir.hooks:
            hook_id = sanitize_identifier(hook.name)

            if hook.trigger == HookTrigger.PRE_TOOL_USE:
                lines.append(f"def {hook_id}(input: PreToolUseHookInput) -> None:")
                lines.append(f'    """{hook.name} - fires before tool execution."""')
                if hook.implementation:
                    for line in hook.implementation.strip().split("\n"):
                        lines.append(f"    {line}")
                else:
                    lines.append(f'    print(f"[Hook: {hook.name}] Pre-tool: {{input.tool_name}}")')
                    if hook.can_block:
                        lines.append("    # Return to block execution, or None to continue")
                lines.append("")
                lines.append("")

            elif hook.trigger == HookTrigger.POST_TOOL_USE:
                lines.append(f"def {hook_id}(input: PostToolUseHookInput) -> None:")
                lines.append(f'    """{hook.name} - fires after tool execution."""')
                if hook.implementation:
                    for line in hook.implementation.strip().split("\n"):
                        lines.append(f"    {line}")
                else:
                    lines.append(f'    print(f"[Hook: {hook.name}] Post-tool: {{input.tool_name}}")')
                lines.append("")
                lines.append("")

        return "\n".join(lines)

    def _generate_config(self, ir: IRDocument) -> str:
        """Generate the agent configuration."""
        main_agent = ir.agents[0] if ir.agents else None

        # Determine permission mode
        perm_mode = "default"
        if main_agent and main_agent.permission_mode:
            perm_mode = main_agent.permission_mode.value

        # Build MCP server configs
        mcp_configs = []
        for server in ir.mcp_servers:
            mcp_configs.append(f'        "{server.name}": {{"uri": "{server.uri}"}}')
        for tool in ir.tools:
            if tool.type.value == "mcp_server" and tool.implementation and tool.implementation.mcp_server:
                srv = tool.implementation.mcp_server
                mcp_configs.append(f'        "{srv.name}": {{"uri": "{srv.uri}"}}')

        llm_config = ir.config.default_llm

        lines = [
            '"""Agent configuration."""',
            "",
            "",
            "AGENT_CONFIG = {",
            f'    "model": "{llm_config.model}",',
            f'    "permission_mode": "{perm_mode}",',
            f"    \"max_turns\": {main_agent.max_iterations or ir.config.execution.max_iterations},",
        ]

        if main_agent and main_agent.max_budget_usd:
            lines.append(f'    "max_budget_usd": {main_agent.max_budget_usd},')

        if mcp_configs:
            lines.append('    "mcp_servers": {')
            lines.append(",\n".join(mcp_configs))
            lines.append("    },")

        # Allowed tools
        if main_agent and main_agent.allowed_tools:
            tools_str = ", ".join(f'"{t}"' for t in main_agent.allowed_tools)
            lines.append(f'    "allowed_tools": [{tools_str}],')

        lines.append("}")
        lines.append("")

        return "\n".join(lines)

    def _generate_main(self, ir: IRDocument, project_name: str) -> str:
        """Generate the main entry point using Claude Agent SDK."""
        main_agent = ir.agents[0] if ir.agents else None

        # Build system prompt for main agent
        system_parts = []
        if main_agent:
            if main_agent.role:
                system_parts.append(main_agent.role)
            if main_agent.goal:
                system_parts.append(f"Your goal: {main_agent.goal}")
            if main_agent.instructions:
                system_parts.append(main_agent.instructions)

        # Add delegation instructions if there are subagents
        subagents = ir.agents[1:] if len(ir.agents) > 1 else []
        if subagents:
            system_parts.append("\nYou have access to the following specialist agents:")
            for sa in subagents:
                desc = sa.description or sa.goal or sa.role
                system_parts.append(f"- @{sanitize_identifier(sa.name)}: {desc}")
            system_parts.append(
                "\nDelegate tasks to the appropriate specialist when their expertise is needed."
            )

        system_prompt = "\n\n".join(system_parts) or f"You are the {project_name} agent."

        return dedent(f'''\
            """
            {ir.metadata.name} - Claude Agent SDK Runner

            {ir.metadata.description}
            """

            import asyncio

            from dotenv import load_dotenv
            from claude_agent_sdk import query, ClaudeAgentOptions

            from .config import AGENT_CONFIG

            load_dotenv()

            SYSTEM_PROMPT = """{system_prompt}"""


            async def main() -> None:
                """Run the agent workflow."""
                options = ClaudeAgentOptions(
                    system_prompt=SYSTEM_PROMPT,
                    model=AGENT_CONFIG["model"],
                    permission_mode=AGENT_CONFIG.get("permission_mode", "default"),
                    max_turns=AGENT_CONFIG.get("max_turns", 25),
                    mcp_servers=AGENT_CONFIG.get("mcp_servers"),
                    allowed_tools=AGENT_CONFIG.get("allowed_tools"),
                )

                print("Running agent workflow...")
                async for message in query(
                    prompt="Hello, please help me with my task.",
                    options=options,
                ):
                    if hasattr(message, "content"):
                        print(f"[{{message.__class__.__name__}}]: {{message.content}}")
                    elif hasattr(message, "result"):
                        print(f"\\nResult: {{message.result}}")


            if __name__ == "__main__":
                asyncio.run(main())
        ''')

    def _generate_dockerfile(self, project_name: str) -> str:
        return dedent(f"""\
            FROM python:3.12-slim

            # Install Claude CLI (required for Claude Agent SDK)
            RUN pip install claude-agent-sdk

            WORKDIR /app

            COPY requirements.txt .
            RUN pip install --no-cache-dir -r requirements.txt

            COPY . .

            CMD ["python", "-m", "main"]
        """)
