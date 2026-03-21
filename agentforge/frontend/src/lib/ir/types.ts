/**
 * AgentForge Intermediate Representation (IR) Types
 *
 * TypeScript mirror of the Python Pydantic schema at:
 *   backend/app/core/ir/schema.py
 *
 * These types must be kept in sync with the Python schema.
 */

// ============================================================================
// Enums
// ============================================================================

export type LLMProvider = "openai" | "anthropic" | "google" | "azure" | "bedrock" | "ollama" | "custom";
export type ToolType = "function" | "api" | "mcp_server" | "builtin";
export type AgentType = "llm" | "workflow" | "human_proxy" | "custom";
export type NodeType = "agent" | "tool_call" | "condition" | "human_input" | "subworkflow" | "parallel_fan_out" | "parallel_fan_in" | "loop" | "transform" | "entry" | "exit";
export type EdgeType = "default" | "conditional" | "error" | "timeout";
export type WorkflowType = "sequential" | "parallel" | "hierarchical" | "custom_graph";
export type ReducerType = "replace" | "append" | "merge" | "custom";
export type FieldType = "string" | "integer" | "float" | "boolean" | "list" | "dict" | "any";
export type HITLType = "approval" | "feedback" | "edit" | "escalation" | "override";
export type HITLInputType = "approve_reject" | "free_text" | "select_option" | "edit_content";
export type HITLTimeoutAction = "approve" | "reject" | "escalate";
export type NotificationChannel = "email" | "slack" | "webhook";
export type ValidatorType = "input" | "output" | "content_filter" | "schema_validation" | "custom";
export type ValidatorAction = "block" | "warn" | "retry_with_feedback" | "escalate";
export type FanInStrategy = "merge" | "append" | "first" | "vote";
export type HandoffType = "delegate" | "transfer" | "spawn" | "tool_call";
export type PermissionMode = "default" | "acceptEdits" | "bypassPermissions" | "dontAsk";
export type SessionPersistence = "none" | "in_memory" | "file" | "database" | "s3";
export type HookTrigger = "pre_tool_use" | "post_tool_use" | "pre_agent" | "post_agent" | "pre_model" | "post_model" | "on_error";

export type TargetFramework = "langgraph" | "google_adk" | "autogen" | "crewai" | "strands" | "claude_agent_sdk";

// ============================================================================
// Sub-models
// ============================================================================

export interface LLMConfig {
  provider: LLMProvider;
  model: string;
  temperature: number;
  max_tokens: number;
  api_key_ref?: string;
}

export interface ExecutionConfig {
  max_iterations: number;
  timeout_seconds: number;
  retry_policy: {
    max_retries: number;
    backoff_strategy: "fixed" | "exponential";
  };
}

export interface GlobalConfig {
  default_llm: LLMConfig;
  execution: ExecutionConfig;
}

export interface ToolParameter {
  name: string;
  type: FieldType;
  description: string;
  required: boolean;
  default?: unknown;
}

export interface MCPServerConfig {
  uri: string;
  name: string;
  auth_headers?: Record<string, string>;
  transport: string;
}

export interface ToolImplementation {
  language?: string;
  source?: string;
  is_async?: boolean;
  endpoint?: string;
  method?: string;
  headers?: Record<string, string>;
  mcp_server?: MCPServerConfig;
  mcp_tool_name?: string;
}

export interface ToolDefinition {
  id: string;
  name: string;
  description: string;
  type: ToolType;
  parameters: ToolParameter[];
  returns?: { type: FieldType; description: string };
  implementation?: ToolImplementation;
  rate_limit_rpm?: number;
  timeout_seconds?: number;
}

export interface MemoryConfig {
  short_term: boolean;
  long_term_enabled: boolean;
  long_term_store: SessionPersistence;
  entity_memory: boolean;
  session_persistence: SessionPersistence;
  shared_memory: boolean;
}

export interface DelegationConfig {
  can_delegate: boolean;
  delegate_to: string[];
  handoff_type: HandoffType;
}

export interface AgentCapabilities {
  code_execution: boolean;
  web_browsing: boolean;
  file_access: boolean;
  mcp_servers: string[];
}

export interface AgentDefinition {
  id: string;
  name: string;
  type: AgentType;
  role: string;
  goal: string;
  backstory: string;
  instructions: string;
  description: string;
  llm_config?: LLMConfig;
  tools: string[];
  allowed_tools: string[];
  capabilities: AgentCapabilities;
  guardrails: { validator_id: string }[];
  memory_config: MemoryConfig;
  delegation: DelegationConfig;
  max_iterations?: number;
  max_budget_usd?: number;
  permission_mode?: PermissionMode;
  skills: string[];
}

export interface SkillDefinition {
  id: string;
  name: string;
  description: string;
  instructions: string;
  tools: string[];
  agents: string[];
}

export interface HookDefinition {
  id: string;
  name: string;
  trigger: HookTrigger;
  target_agent?: string;
  target_tool?: string;
  implementation: string;
  can_block: boolean;
}

// ============================================================================
// Workflow graph models
// ============================================================================

export interface NodePosition {
  x: number;
  y: number;
}

export interface NodeConfig {
  condition?: { condition_expression: string };
  human_input?: {
    prompt_template: string;
    input_type: HITLInputType;
    timeout_seconds?: number;
    timeout_action: HITLTimeoutAction;
  };
  loop?: { max_iterations: number; exit_condition: string };
  parallel_fan_out?: { fan_out_on: string };
  parallel_fan_in?: { aggregation_strategy: FanInStrategy };
  transform?: { transform_expression: string };
  subworkflow?: { subworkflow_ref: string };
}

export interface WorkflowNode {
  id: string;
  name: string;
  type: NodeType;
  agent_ref?: string;
  tool_ref?: string;
  config: NodeConfig;
  position: NodePosition;
}

export interface EdgeCondition {
  expression: string;
  label: string;
}

export interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
  type: EdgeType;
  condition?: EdgeCondition;
  priority: number;
  state_mapping: { source_field: string; target_field: string }[];
}

export interface StateField {
  name: string;
  type: FieldType;
  description: string;
  default?: unknown;
  reducer: ReducerType;
}

export interface WorkflowDefinition {
  id: string;
  name: string;
  type: WorkflowType;
  state_schema: {
    fields: StateField[];
    initial_state: Record<string, unknown>;
  };
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  entry_node?: string;
  exit_nodes: string[];
}

export interface HITLDefinition {
  id: string;
  node_ref: string;
  type: HITLType;
  prompt: string;
  options: string[];
  required_role?: string;
  sla_seconds?: number;
  escalation_chain: string[];
  notification: {
    channels: NotificationChannel[];
    template: string;
  };
}

export interface GuardrailValidator {
  id: string;
  name: string;
  type: ValidatorType;
  config: Record<string, unknown>;
  action_on_fail: ValidatorAction;
}

// ============================================================================
// Top-level IR Document
// ============================================================================

export interface IRMetadata {
  id: string;
  name: string;
  description: string;
  created_at: string;
  updated_at: string;
  created_by: string;
  version: number;
  tags: string[];
}

export interface IRDocument {
  ir_version: string;
  metadata: IRMetadata;
  config: GlobalConfig;
  agents: AgentDefinition[];
  tools: ToolDefinition[];
  skills: SkillDefinition[];
  workflow: WorkflowDefinition;
  human_in_the_loop: HITLDefinition[];
  hooks: HookDefinition[];
  guardrails: { validators: GuardrailValidator[] };
  observability: {
    tracing: { enabled: boolean; provider: string; sample_rate: number };
    logging: { level: string; structured: boolean };
    metrics: { enabled: boolean; custom_metrics: { name: string; type: string; description: string }[] };
  };
  mcp_servers: MCPServerConfig[];
  extensions: Record<string, unknown>;
}
