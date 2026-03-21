"""
AgentForge Intermediate Representation (IR) Schema.

This is the SOURCE OF TRUTH for the entire system. The IR is a framework-agnostic
JSON schema that captures workflow intent. Users manipulate the IR through the canvas
and copilot; generators consume it to produce framework-specific code.

All other components (TypeScript types, validators, generators) derive from this schema.
"""

from __future__ import annotations

import uuid
from datetime import datetime
from enum import Enum
from typing import Any

from pydantic import BaseModel, Field


# ============================================================================
# Enums
# ============================================================================


class LLMProvider(str, Enum):
    OPENAI = "openai"
    ANTHROPIC = "anthropic"
    GOOGLE = "google"
    AZURE = "azure"
    BEDROCK = "bedrock"
    OLLAMA = "ollama"
    CUSTOM = "custom"


class ToolType(str, Enum):
    FUNCTION = "function"
    API = "api"
    MCP_SERVER = "mcp_server"
    BUILTIN = "builtin"


class AgentType(str, Enum):
    LLM = "llm"
    WORKFLOW = "workflow"
    HUMAN_PROXY = "human_proxy"
    CUSTOM = "custom"


class NodeType(str, Enum):
    AGENT = "agent"
    TOOL_CALL = "tool_call"
    CONDITION = "condition"
    HUMAN_INPUT = "human_input"
    SUBWORKFLOW = "subworkflow"
    PARALLEL_FAN_OUT = "parallel_fan_out"
    PARALLEL_FAN_IN = "parallel_fan_in"
    LOOP = "loop"
    TRANSFORM = "transform"
    ENTRY = "entry"
    EXIT = "exit"


class EdgeType(str, Enum):
    DEFAULT = "default"
    CONDITIONAL = "conditional"
    ERROR = "error"
    TIMEOUT = "timeout"


class WorkflowType(str, Enum):
    SEQUENTIAL = "sequential"
    PARALLEL = "parallel"
    HIERARCHICAL = "hierarchical"
    CUSTOM_GRAPH = "custom_graph"


class ReducerType(str, Enum):
    REPLACE = "replace"
    APPEND = "append"
    MERGE = "merge"
    CUSTOM = "custom"


class FieldType(str, Enum):
    STRING = "string"
    INTEGER = "integer"
    FLOAT = "float"
    BOOLEAN = "boolean"
    LIST = "list"
    DICT = "dict"
    ANY = "any"


class HITLType(str, Enum):
    APPROVAL = "approval"
    FEEDBACK = "feedback"
    EDIT = "edit"
    ESCALATION = "escalation"
    OVERRIDE = "override"


class HITLInputType(str, Enum):
    APPROVE_REJECT = "approve_reject"
    FREE_TEXT = "free_text"
    SELECT_OPTION = "select_option"
    EDIT_CONTENT = "edit_content"


class HITLTimeoutAction(str, Enum):
    APPROVE = "approve"
    REJECT = "reject"
    ESCALATE = "escalate"


class NotificationChannel(str, Enum):
    EMAIL = "email"
    SLACK = "slack"
    WEBHOOK = "webhook"


class ValidatorType(str, Enum):
    INPUT = "input"
    OUTPUT = "output"
    CONTENT_FILTER = "content_filter"
    SCHEMA_VALIDATION = "schema_validation"
    CUSTOM = "custom"


class ValidatorAction(str, Enum):
    BLOCK = "block"
    WARN = "warn"
    RETRY_WITH_FEEDBACK = "retry_with_feedback"
    ESCALATE = "escalate"


class FanInStrategy(str, Enum):
    MERGE = "merge"
    APPEND = "append"
    FIRST = "first"
    VOTE = "vote"


class BackoffStrategy(str, Enum):
    FIXED = "fixed"
    EXPONENTIAL = "exponential"


class TracingProvider(str, Enum):
    LANGSMITH = "langsmith"
    OPENTELEMETRY = "opentelemetry"
    CUSTOM = "custom"


class LogLevel(str, Enum):
    DEBUG = "debug"
    INFO = "info"
    WARNING = "warning"
    ERROR = "error"


class MetricType(str, Enum):
    COUNTER = "counter"
    GAUGE = "gauge"
    HISTOGRAM = "histogram"


class TargetFramework(str, Enum):
    LANGGRAPH = "langgraph"
    GOOGLE_ADK = "google_adk"
    AUTOGEN = "autogen"
    CREWAI = "crewai"
    STRANDS = "strands"
    CLAUDE_AGENT_SDK = "claude_agent_sdk"


class PermissionMode(str, Enum):
    """Permission modes for Claude Agent SDK."""

    DEFAULT = "default"
    ACCEPT_EDITS = "acceptEdits"
    BYPASS = "bypassPermissions"
    DONT_ASK = "dontAsk"


class SessionPersistence(str, Enum):
    """How agent sessions are persisted across invocations."""

    NONE = "none"
    IN_MEMORY = "in_memory"
    FILE = "file"
    DATABASE = "database"
    S3 = "s3"


class HandoffType(str, Enum):
    """How control is transferred between agents."""

    DELEGATE = "delegate"  # Parent delegates to child, child returns result
    TRANSFER = "transfer"  # Full control transfer (ADK transfer_to_agent, Strands handoff)
    SPAWN = "spawn"  # Spawn independent agent (Claude SDK subagent)
    TOOL_CALL = "tool_call"  # Agent wrapped as tool (Strands agent-as-tool)


# ============================================================================
# Sub-models
# ============================================================================


class LLMConfig(BaseModel):
    """LLM provider and model configuration."""

    provider: LLMProvider = LLMProvider.ANTHROPIC
    model: str = "claude-sonnet-4-20250514"
    temperature: float = Field(default=0.7, ge=0.0, le=2.0)
    max_tokens: int = Field(default=4096, gt=0)
    api_key_ref: str | None = Field(
        default=None,
        description="Reference to secrets manager key (never store actual keys)",
    )


class RetryPolicy(BaseModel):
    """Retry configuration for failed operations."""

    max_retries: int = Field(default=3, ge=0, le=10)
    backoff_strategy: BackoffStrategy = BackoffStrategy.EXPONENTIAL


class ExecutionConfig(BaseModel):
    """Global execution constraints."""

    max_iterations: int = Field(default=25, gt=0, le=100)
    timeout_seconds: int = Field(default=300, gt=0)
    retry_policy: RetryPolicy = Field(default_factory=RetryPolicy)


class GlobalConfig(BaseModel):
    """Top-level configuration for the entire workflow."""

    default_llm: LLMConfig = Field(default_factory=LLMConfig)
    execution: ExecutionConfig = Field(default_factory=ExecutionConfig)


# --- Tool models ---


class ToolParameter(BaseModel):
    """A typed parameter for a tool."""

    name: str
    type: FieldType = FieldType.STRING
    description: str = ""
    required: bool = True
    default: Any | None = None


class ToolReturns(BaseModel):
    """Return type specification for a tool."""

    type: FieldType = FieldType.STRING
    description: str = ""


class APIAuth(BaseModel):
    """Authentication config for API tools."""

    type: str = "bearer"  # bearer, api_key, basic, oauth2
    token_ref: str | None = None


class MCPServerConfig(BaseModel):
    """Configuration for an MCP (Model Context Protocol) server.

    MCP is supported by Claude Agent SDK natively, Google ADK, and Strands.
    For other frameworks, MCP tools are wrapped as native function tools.
    """

    uri: str  # Server URI (stdio:// or http://)
    name: str = ""  # Human-readable server name
    auth_headers: dict[str, str] = Field(default_factory=dict)
    transport: str = "stdio"  # stdio, http, sse


class ToolImplementation(BaseModel):
    """How a tool is implemented."""

    # For function tools
    language: str | None = "python"
    source: str | None = None  # inline code or file path
    is_async: bool = False  # Required for AutoGen v0.4 (all async)

    # For API tools
    endpoint: str | None = None
    method: str | None = None
    headers: dict[str, str] | None = None
    auth: APIAuth | None = None

    # For MCP tools
    mcp_server: MCPServerConfig | None = None
    mcp_tool_name: str | None = None


class ToolDefinition(BaseModel):
    """A tool that agents can use."""

    id: str = Field(default_factory=lambda: f"tool_{uuid.uuid4().hex[:8]}")
    name: str
    description: str
    type: ToolType = ToolType.FUNCTION
    parameters: list[ToolParameter] = Field(default_factory=list)
    returns: ToolReturns | None = None
    implementation: ToolImplementation | None = None
    rate_limit_rpm: int | None = None
    timeout_seconds: int | None = None


# --- Agent models ---


class GuardrailRef(BaseModel):
    """Reference to a guardrail validator."""

    validator_id: str


class MemoryConfig(BaseModel):
    """Memory configuration for an agent.

    Maps to:
    - LangGraph: MemorySaver checkpointer + InMemoryStore for cross-thread
    - Google ADK: Session state (short-term) + MemoryService (long-term)
    - CrewAI: STM (ChromaDB), LTM (SQLite), Entity Memory
    - AutoGen: save_state/load_state + message history
    - Strands: SessionManager + AgentCore Memory
    - Claude SDK: File-based memory system (/memories directory)
    """

    short_term: bool = True
    long_term_enabled: bool = False
    long_term_store: SessionPersistence = SessionPersistence.NONE
    entity_memory: bool = False
    session_persistence: SessionPersistence = SessionPersistence.NONE
    shared_memory: bool = Field(
        default=False,
        description="Whether this agent's memory is shared with other agents in the workflow",
    )


class DelegationConfig(BaseModel):
    """Whether and to whom this agent can delegate work.

    Maps to:
    - LangGraph: Subgraph invocation from parent node
    - Google ADK: sub_agents list + transfer_to_agent
    - CrewAI: allow_delegation=True + agent list
    - AutoGen: GroupChat participant selection
    - Strands: agent-as-tool wrapping or handoff
    - Claude SDK: Subagent spawning with custom tools/permissions
    """

    can_delegate: bool = False
    delegate_to: list[str] = Field(default_factory=list)  # Agent IDs
    handoff_type: HandoffType = HandoffType.DELEGATE


class AgentCapabilities(BaseModel):
    """What capabilities an agent has beyond LLM + tools."""

    code_execution: bool = False
    web_browsing: bool = False
    file_access: bool = False
    mcp_servers: list[str] = Field(
        default_factory=list,
        description="MCP server URIs this agent can connect to (Claude SDK, ADK)",
    )


class AgentDefinition(BaseModel):
    """An autonomous agent with role, goal, and capabilities.

    This is the universal agent primitive that maps to all 6 frameworks:
    - LangGraph: Node function with state parameter
    - Google ADK: LlmAgent(name, model, instruction, tools, sub_agents)
    - CrewAI: Agent(role, goal, backstory, tools, llm)
    - AutoGen: AssistantAgent(name, model_client, tools, system_message)
    - Strands: Agent(model, tools, system_prompt)
    - Claude SDK: ClaudeSDKClient with ClaudeAgentOptions
    """

    id: str = Field(default_factory=lambda: f"agent_{uuid.uuid4().hex[:8]}")
    name: str
    type: AgentType = AgentType.LLM
    role: str = ""  # "You are a senior data analyst..."
    goal: str = ""  # What this agent aims to accomplish
    backstory: str = ""  # Personality/context (CrewAI, enriches prompts for others)
    instructions: str = ""  # Detailed system prompt
    description: str = Field(
        default="",
        description="Short description used for delegation/routing decisions. "
        "Maps to Claude SDK subagent description, ADK agent description, "
        "CrewAI agent goal.",
    )
    llm_config: LLMConfig | None = None  # Override global default
    tools: list[str] = Field(default_factory=list)  # Tool IDs
    allowed_tools: list[str] = Field(
        default_factory=list,
        description="Tools auto-approved without human confirmation (Claude SDK permission model)",
    )
    capabilities: AgentCapabilities = Field(default_factory=AgentCapabilities)
    guardrails: list[GuardrailRef] = Field(default_factory=list)
    memory_config: MemoryConfig = Field(default_factory=MemoryConfig)
    delegation: DelegationConfig = Field(default_factory=DelegationConfig)
    max_iterations: int | None = None  # Per-agent override (maps to max_turns in Claude SDK)
    max_budget_usd: float | None = Field(
        default=None,
        description="Maximum spend for this agent (Claude SDK budget control)",
    )
    permission_mode: PermissionMode | None = Field(
        default=None,
        description="Permission mode for tool execution (Claude SDK)",
    )
    skills: list[str] = Field(
        default_factory=list,
        description="Skill IDs this agent can invoke (Claude SDK skills)",
    )


# --- State schema ---


class StateField(BaseModel):
    """A field in the workflow state."""

    name: str
    type: FieldType = FieldType.STRING
    description: str = ""
    default: Any | None = None
    reducer: ReducerType = ReducerType.REPLACE


class StateSchema(BaseModel):
    """Schema for data flowing through the workflow."""

    fields: list[StateField] = Field(default_factory=list)
    initial_state: dict[str, Any] = Field(default_factory=dict)


# --- Workflow graph models ---


class NodePosition(BaseModel):
    """Canvas position metadata (non-semantic)."""

    x: float = 0.0
    y: float = 0.0


class ConditionConfig(BaseModel):
    """Configuration for condition nodes."""

    condition_expression: str  # Python-like expression evaluated against state


class HumanInputConfig(BaseModel):
    """Configuration for human-in-the-loop input nodes."""

    prompt_template: str = "Please review and provide input."
    input_type: HITLInputType = HITLInputType.APPROVE_REJECT
    timeout_seconds: int | None = None
    timeout_action: HITLTimeoutAction = HITLTimeoutAction.ESCALATE


class LoopConfig(BaseModel):
    """Configuration for loop nodes."""

    max_iterations: int = Field(default=10, gt=0, le=100)
    exit_condition: str = ""  # Expression that when true, exits the loop


class ParallelFanOutConfig(BaseModel):
    """Configuration for parallel fan-out nodes."""

    fan_out_on: str  # State field to parallelize over


class ParallelFanInConfig(BaseModel):
    """Configuration for parallel fan-in (aggregation) nodes."""

    aggregation_strategy: FanInStrategy = FanInStrategy.MERGE


class TransformConfig(BaseModel):
    """Configuration for pure data transformation nodes."""

    transform_expression: str  # Python-like expression


class SubworkflowConfig(BaseModel):
    """Configuration for subworkflow nodes."""

    subworkflow_ref: str  # ID of another WorkflowDefinition


class NodeConfig(BaseModel):
    """Union of all possible node configurations.

    Only the fields relevant to the node type are populated.
    """

    condition: ConditionConfig | None = None
    human_input: HumanInputConfig | None = None
    loop: LoopConfig | None = None
    parallel_fan_out: ParallelFanOutConfig | None = None
    parallel_fan_in: ParallelFanInConfig | None = None
    transform: TransformConfig | None = None
    subworkflow: SubworkflowConfig | None = None


class WorkflowNode(BaseModel):
    """A node in the workflow graph."""

    id: str = Field(default_factory=lambda: f"node_{uuid.uuid4().hex[:8]}")
    name: str = ""
    type: NodeType
    agent_ref: str | None = None  # For agent nodes -> AgentDefinition.id
    tool_ref: str | None = None  # For tool_call nodes -> ToolDefinition.id
    config: NodeConfig = Field(default_factory=NodeConfig)
    position: NodePosition = Field(default_factory=NodePosition)


class EdgeCondition(BaseModel):
    """Condition for conditional edges."""

    expression: str  # Evaluated against workflow state
    label: str = ""  # Human-readable label for the canvas


class StateMapping(BaseModel):
    """Optional state field mapping between nodes."""

    source_field: str
    target_field: str


class WorkflowEdge(BaseModel):
    """An edge connecting two nodes in the workflow graph."""

    id: str = Field(default_factory=lambda: f"edge_{uuid.uuid4().hex[:8]}")
    source: str  # Node ID
    target: str  # Node ID
    type: EdgeType = EdgeType.DEFAULT
    condition: EdgeCondition | None = None
    priority: int = 0  # For multiple conditional edges from same node
    state_mapping: list[StateMapping] = Field(default_factory=list)


class WorkflowDefinition(BaseModel):
    """The complete workflow graph."""

    id: str = Field(default_factory=lambda: f"wf_{uuid.uuid4().hex[:8]}")
    name: str = ""
    type: WorkflowType = WorkflowType.CUSTOM_GRAPH

    state_schema: StateSchema = Field(default_factory=StateSchema)
    nodes: list[WorkflowNode] = Field(default_factory=list)
    edges: list[WorkflowEdge] = Field(default_factory=list)

    entry_node: str | None = None  # Node ID
    exit_nodes: list[str] = Field(default_factory=list)


# --- Human in the loop ---


class HITLNotification(BaseModel):
    """How to notify humans when their input is needed."""

    channels: list[NotificationChannel] = Field(default_factory=list)
    template: str = ""


class HITLDefinition(BaseModel):
    """A human-in-the-loop interaction point."""

    id: str = Field(default_factory=lambda: f"hitl_{uuid.uuid4().hex[:8]}")
    node_ref: str  # References WorkflowNode.id
    type: HITLType = HITLType.APPROVAL
    prompt: str = "Please review and approve."
    options: list[str] = Field(default_factory=list)
    required_role: str | None = None
    sla_seconds: int | None = None
    escalation_chain: list[str] = Field(default_factory=list)
    notification: HITLNotification = Field(default_factory=HITLNotification)


# --- Guardrails ---


class GuardrailValidator(BaseModel):
    """A validation rule applied to agent inputs or outputs."""

    id: str = Field(default_factory=lambda: f"guard_{uuid.uuid4().hex[:8]}")
    name: str
    type: ValidatorType
    config: dict[str, Any] = Field(default_factory=dict)
    action_on_fail: ValidatorAction = ValidatorAction.BLOCK


class GuardrailsConfig(BaseModel):
    """All guardrails for the workflow."""

    validators: list[GuardrailValidator] = Field(default_factory=list)


# --- Observability ---


class TracingConfig(BaseModel):
    """Distributed tracing configuration."""

    enabled: bool = False
    provider: TracingProvider = TracingProvider.OPENTELEMETRY
    sample_rate: float = Field(default=1.0, ge=0.0, le=1.0)


class LoggingConfig(BaseModel):
    """Logging configuration."""

    level: LogLevel = LogLevel.INFO
    structured: bool = True


class CustomMetric(BaseModel):
    """A custom metric to track."""

    name: str
    type: MetricType
    description: str = ""


class MetricsConfig(BaseModel):
    """Metrics collection configuration."""

    enabled: bool = False
    custom_metrics: list[CustomMetric] = Field(default_factory=list)


class ObservabilityConfig(BaseModel):
    """Observability configuration for the workflow."""

    tracing: TracingConfig = Field(default_factory=TracingConfig)
    logging: LoggingConfig = Field(default_factory=LoggingConfig)
    metrics: MetricsConfig = Field(default_factory=MetricsConfig)


# --- Skills (Claude Agent SDK concept, useful across frameworks) ---


class SkillDefinition(BaseModel):
    """A reusable skill that can be invoked by agents.

    In Claude Agent SDK, skills are filesystem-based SKILL.md files that inject
    specialized instructions and context. For other frameworks, skills map to:
    - LangGraph: Reusable subgraph templates
    - Google ADK: Agent hierarchies with pre-configured instructions
    - CrewAI: Pre-built task/agent combos
    - AutoGen: Pre-configured agent groups
    - Strands: Pre-built tool + prompt combos
    """

    id: str = Field(default_factory=lambda: f"skill_{uuid.uuid4().hex[:8]}")
    name: str
    description: str  # Used by the LLM to decide when to invoke
    instructions: str = ""  # The detailed skill instructions
    tools: list[str] = Field(default_factory=list)  # Tool IDs this skill needs
    agents: list[str] = Field(default_factory=list)  # Agent IDs this skill orchestrates


# --- Hooks (Claude Agent SDK concept, maps to callbacks in other frameworks) ---


class HookTrigger(str, Enum):
    PRE_TOOL_USE = "pre_tool_use"
    POST_TOOL_USE = "post_tool_use"
    PRE_AGENT = "pre_agent"
    POST_AGENT = "post_agent"
    PRE_MODEL = "pre_model"
    POST_MODEL = "post_model"
    ON_ERROR = "on_error"


class HookDefinition(BaseModel):
    """A hook that fires at specific points in the agent loop.

    Maps to:
    - Claude SDK: PreToolUse/PostToolUse hooks
    - Google ADK: before_agent_callback/after_agent_callback/before_model_callback
    - LangGraph: Node pre/post processing
    - CrewAI: step_callback on Agent
    - AutoGen: Agent event handlers
    - Strands: Custom hooks for logging/performance
    """

    id: str = Field(default_factory=lambda: f"hook_{uuid.uuid4().hex[:8]}")
    name: str
    trigger: HookTrigger
    target_agent: str | None = None  # If None, applies to all agents
    target_tool: str | None = None  # If None, applies to all tools
    implementation: str = ""  # Python code for the hook logic
    can_block: bool = False  # Whether hook can prevent execution


# ============================================================================
# Top-Level IR Document
# ============================================================================


class IRMetadata(BaseModel):
    """Metadata for the IR document."""

    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    description: str = ""
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    created_by: str = ""
    version: int = 1
    tags: list[str] = Field(default_factory=list)


class IRDocument(BaseModel):
    """The complete Intermediate Representation document.

    This is the central data structure of AgentForge. It captures the full
    specification of an agentic workflow in a framework-agnostic format.

    Canvas → IR → Code Generation for 6 frameworks:
      LangGraph, Google ADK, CrewAI, AutoGen, Strands, Claude Agent SDK
    """

    ir_version: str = "1.0"
    metadata: IRMetadata

    config: GlobalConfig = Field(default_factory=GlobalConfig)
    agents: list[AgentDefinition] = Field(default_factory=list)
    tools: list[ToolDefinition] = Field(default_factory=list)
    skills: list[SkillDefinition] = Field(default_factory=list)
    workflow: WorkflowDefinition = Field(default_factory=WorkflowDefinition)
    human_in_the_loop: list[HITLDefinition] = Field(default_factory=list)
    hooks: list[HookDefinition] = Field(default_factory=list)
    guardrails: GuardrailsConfig = Field(default_factory=GuardrailsConfig)
    observability: ObservabilityConfig = Field(default_factory=ObservabilityConfig)
    mcp_servers: list[MCPServerConfig] = Field(
        default_factory=list,
        description="Global MCP servers available to all agents",
    )

    # Framework-specific extensions (escape hatch)
    extensions: dict[str, Any] = Field(
        default_factory=dict,
        description="Framework-specific passthrough config. Keys are TargetFramework values.",
    )
