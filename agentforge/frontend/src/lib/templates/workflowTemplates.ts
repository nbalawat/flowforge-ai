/**
 * Pre-built workflow templates for AgentForge.
 *
 * Each template factory returns a fresh IRDocument with unique IDs so
 * multiple instantiations never collide.
 */

import { v4 as uuidv4 } from "uuid";
import type { IRDocument, AgentDefinition, ToolDefinition, WorkflowNode, WorkflowEdge, StateField } from "../ir/types";

// ============================================================================
// Helpers
// ============================================================================

function id(prefix: string): string {
  return `${prefix}_${uuidv4().slice(0, 8)}`;
}

function baseIR(name: string, description: string): Omit<IRDocument, "agents" | "tools" | "workflow"> {
  return {
    ir_version: "1.0",
    metadata: {
      id: uuidv4(),
      name,
      description,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      created_by: "template",
      version: 1,
      tags: [],
    },
    config: {
      default_llm: {
        provider: "anthropic",
        model: "claude-sonnet-4-20250514",
        temperature: 0.7,
        max_tokens: 4096,
      },
      execution: {
        max_iterations: 25,
        timeout_seconds: 300,
        retry_policy: { max_retries: 3, backoff_strategy: "exponential" },
      },
    },
    skills: [],
    human_in_the_loop: [],
    hooks: [],
    guardrails: { validators: [] },
    observability: {
      tracing: { enabled: false, provider: "opentelemetry", sample_rate: 1.0 },
      logging: { level: "info", structured: true },
      metrics: { enabled: false, custom_metrics: [] },
    },
    mcp_servers: [],
    extensions: {},
  };
}

function makeAgent(overrides: Partial<AgentDefinition> & { id: string; name: string }): AgentDefinition {
  return {
    type: "llm",
    role: "",
    goal: "",
    backstory: "",
    instructions: "",
    description: "",
    tools: [],
    allowed_tools: [],
    capabilities: { code_execution: false, web_browsing: false, file_access: false, mcp_servers: [] },
    guardrails: [],
    memory_config: { short_term: true, long_term_enabled: false, long_term_store: "none", entity_memory: false, session_persistence: "none", shared_memory: false },
    delegation: { can_delegate: false, delegate_to: [], handoff_type: "delegate" },
    skills: [],
    ...overrides,
  };
}

function makeTool(overrides: Partial<ToolDefinition> & { id: string; name: string }): ToolDefinition {
  return {
    description: "",
    type: "function",
    parameters: [],
    ...overrides,
  };
}

// ============================================================================
// Template metadata (for gallery display)
// ============================================================================

export type Difficulty = "Beginner" | "Intermediate" | "Advanced" | "Expert";

export interface TemplateMeta {
  id: string;
  name: string;
  description: string;
  difficulty: Difficulty;
  agentCount: number;
  nodeCount: number;
  toolCount: number;
  features: string[];  // e.g. "HITL", "Conditions", "Loops", "Parallel", "Tools"
  factory: () => IRDocument;
}

// ============================================================================
// 1. Simple Chatbot (Beginner)
// ============================================================================

function createSimpleChatbot(): IRDocument {
  const entryId = id("node");
  const exitId = id("node");
  const agentId = id("agent");
  const agentNodeId = id("node");

  const agents: AgentDefinition[] = [
    makeAgent({
      id: agentId,
      name: "assistant",
      role: "Helpful Assistant",
      goal: "Answer user questions accurately and helpfully",
      backstory: "You are a friendly and knowledgeable AI assistant built to help users with any questions they may have.",
      instructions: "Respond to the user's message in a clear, concise, and helpful manner. Ask clarifying questions when the user's intent is ambiguous. Always be polite and professional.",
      description: "General-purpose conversational assistant",
    }),
  ];

  const nodes: WorkflowNode[] = [
    { id: entryId, name: "Start", type: "entry", config: {}, position: { x: 250, y: 50 } },
    { id: agentNodeId, name: "Assistant", type: "agent", agent_ref: agentId, config: {}, position: { x: 250, y: 250 } },
    { id: exitId, name: "End", type: "exit", config: {}, position: { x: 250, y: 450 } },
  ];

  const edges: WorkflowEdge[] = [
    { id: id("edge"), source: entryId, target: agentNodeId, type: "default", priority: 0, state_mapping: [] },
    { id: id("edge"), source: agentNodeId, target: exitId, type: "default", priority: 0, state_mapping: [] },
  ];

  return {
    ...baseIR("Simple Chatbot", "A single-agent chatbot for basic conversations"),
    agents,
    tools: [],
    workflow: {
      id: id("wf"),
      name: "Simple Chatbot",
      type: "sequential",
      state_schema: {
        fields: [
          { name: "user_message", type: "string", description: "The user's input message", reducer: "replace" },
          { name: "response", type: "string", description: "The assistant's response", reducer: "replace" },
        ],
        initial_state: {},
      },
      nodes,
      edges,
      entry_node: entryId,
      exit_nodes: [exitId],
    },
  };
}

// ============================================================================
// 2. Customer Support Classifier (Beginner)
// ============================================================================

function createCustomerSupportClassifier(): IRDocument {
  const entryId = id("node");
  const exitId = id("node");
  const classifierId = id("agent");
  const resolverId = id("agent");
  const classifierNodeId = id("node");
  const resolverNodeId = id("node");

  const agents: AgentDefinition[] = [
    makeAgent({
      id: classifierId,
      name: "ticket_classifier",
      role: "Ticket Classifier",
      goal: "Categorize incoming support tickets by type and urgency",
      backstory: "You are a ticket triage specialist trained on thousands of support interactions across billing, technical, and account categories.",
      instructions: "Analyze the incoming support ticket. Classify it into one of these categories: billing, technical, account, general. Assign an urgency level: low, medium, high. Output the classification in state fields.",
      description: "Classifies support tickets by category and urgency",
    }),
    makeAgent({
      id: resolverId,
      name: "ticket_resolver",
      role: "Ticket Resolver",
      goal: "Resolve customer support tickets based on their classification",
      backstory: "You are a senior support agent with deep knowledge of company policies, product features, and common troubleshooting procedures.",
      instructions: "Using the ticket classification and original message, provide a helpful and complete resolution. Reference relevant documentation when possible. If the issue requires human intervention, flag it clearly.",
      description: "Resolves classified support tickets",
    }),
  ];

  const nodes: WorkflowNode[] = [
    { id: entryId, name: "Start", type: "entry", config: {}, position: { x: 250, y: 50 } },
    { id: classifierNodeId, name: "Classifier", type: "agent", agent_ref: classifierId, config: {}, position: { x: 250, y: 220 } },
    { id: resolverNodeId, name: "Resolver", type: "agent", agent_ref: resolverId, config: {}, position: { x: 250, y: 400 } },
    { id: exitId, name: "End", type: "exit", config: {}, position: { x: 250, y: 580 } },
  ];

  const edges: WorkflowEdge[] = [
    { id: id("edge"), source: entryId, target: classifierNodeId, type: "default", priority: 0, state_mapping: [] },
    { id: id("edge"), source: classifierNodeId, target: resolverNodeId, type: "default", priority: 0, state_mapping: [] },
    { id: id("edge"), source: resolverNodeId, target: exitId, type: "default", priority: 0, state_mapping: [] },
  ];

  return {
    ...baseIR("Customer Support Classifier", "Sequential pipeline: classify tickets then resolve them"),
    agents,
    tools: [],
    workflow: {
      id: id("wf"),
      name: "Customer Support Classifier",
      type: "sequential",
      state_schema: {
        fields: [
          { name: "ticket_text", type: "string", description: "The raw support ticket content", reducer: "replace" },
          { name: "category", type: "string", description: "Ticket category: billing, technical, account, general", reducer: "replace" },
          { name: "urgency", type: "string", description: "Urgency level: low, medium, high", reducer: "replace" },
          { name: "resolution", type: "string", description: "The support resolution message", reducer: "replace" },
        ],
        initial_state: {},
      },
      nodes,
      edges,
      entry_node: entryId,
      exit_nodes: [exitId],
    },
  };
}

// ============================================================================
// 3. RAG Pipeline (Intermediate)
// ============================================================================

function createRAGPipeline(): IRDocument {
  const entryId = id("node");
  const exitId = id("node");
  const analyzerId = id("agent");
  const retrieverId = id("agent");
  const generatorId = id("agent");
  const analyzerNodeId = id("node");
  const retrieverNodeId = id("node");
  const generatorNodeId = id("node");
  const searchToolId = id("tool");

  const tools: ToolDefinition[] = [
    makeTool({
      id: searchToolId,
      name: "vector_search",
      description: "Search the vector database for relevant documents using semantic similarity",
      type: "function",
      parameters: [
        { name: "query", type: "string", description: "The search query", required: true },
        { name: "top_k", type: "integer", description: "Number of results to return", required: false, default: 5 },
        { name: "filter", type: "dict", description: "Metadata filters", required: false },
      ],
      returns: { type: "list", description: "List of matching documents with scores" },
    }),
  ];

  const agents: AgentDefinition[] = [
    makeAgent({
      id: analyzerId,
      name: "query_analyzer",
      role: "Query Analyzer",
      goal: "Analyze and optimize user queries for effective retrieval",
      backstory: "You specialize in understanding user intent and reformulating queries for optimal document retrieval.",
      instructions: "Analyze the user's question. Identify key concepts, entities, and intent. Reformulate the query into an optimized search query that will retrieve the most relevant documents. Also generate 2-3 alternative query phrasings.",
      description: "Analyzes and optimizes queries for retrieval",
    }),
    makeAgent({
      id: retrieverId,
      name: "retriever",
      role: "Document Retriever",
      goal: "Retrieve the most relevant documents for the query",
      backstory: "You are an expert at searching knowledge bases and selecting the most relevant information.",
      instructions: "Use the vector_search tool with the optimized query to retrieve relevant documents. Evaluate the results for relevance and filter out noise. Return the top documents with their relevance scores.",
      description: "Retrieves relevant documents using search tools",
      tools: [searchToolId],
      allowed_tools: [searchToolId],
    }),
    makeAgent({
      id: generatorId,
      name: "response_generator",
      role: "Response Generator",
      goal: "Generate accurate, well-sourced responses from retrieved documents",
      backstory: "You are a skilled writer who synthesizes information from multiple sources into clear, accurate responses.",
      instructions: "Using the retrieved documents, generate a comprehensive and accurate answer to the user's original question. Cite specific sources. If the documents do not contain sufficient information, acknowledge the gaps clearly.",
      description: "Generates grounded responses from retrieved documents",
    }),
  ];

  const nodes: WorkflowNode[] = [
    { id: entryId, name: "Start", type: "entry", config: {}, position: { x: 250, y: 50 } },
    { id: analyzerNodeId, name: "Query Analyzer", type: "agent", agent_ref: analyzerId, config: {}, position: { x: 250, y: 220 } },
    { id: retrieverNodeId, name: "Retriever", type: "agent", agent_ref: retrieverId, config: {}, position: { x: 250, y: 400 } },
    { id: generatorNodeId, name: "Response Generator", type: "agent", agent_ref: generatorId, config: {}, position: { x: 250, y: 580 } },
    { id: exitId, name: "End", type: "exit", config: {}, position: { x: 250, y: 760 } },
  ];

  const edges: WorkflowEdge[] = [
    { id: id("edge"), source: entryId, target: analyzerNodeId, type: "default", priority: 0, state_mapping: [] },
    { id: id("edge"), source: analyzerNodeId, target: retrieverNodeId, type: "default", priority: 0, state_mapping: [] },
    { id: id("edge"), source: retrieverNodeId, target: generatorNodeId, type: "default", priority: 0, state_mapping: [] },
    { id: id("edge"), source: generatorNodeId, target: exitId, type: "default", priority: 0, state_mapping: [] },
  ];

  return {
    ...baseIR("RAG Pipeline", "Retrieval-Augmented Generation with query analysis, search, and response generation"),
    agents,
    tools,
    workflow: {
      id: id("wf"),
      name: "RAG Pipeline",
      type: "sequential",
      state_schema: {
        fields: [
          { name: "user_query", type: "string", description: "The original user question", reducer: "replace" },
          { name: "optimized_query", type: "string", description: "Reformulated search query", reducer: "replace" },
          { name: "retrieved_docs", type: "list", description: "Retrieved documents", reducer: "replace" },
          { name: "response", type: "string", description: "The generated response", reducer: "replace" },
        ],
        initial_state: {},
      },
      nodes,
      edges,
      entry_node: entryId,
      exit_nodes: [exitId],
    },
  };
}

// ============================================================================
// 4. Content Moderation Pipeline (Intermediate)
// ============================================================================

function createContentModerationPipeline(): IRDocument {
  const entryId = id("node");
  const exitId = id("node");
  const analyzerId = id("agent");
  const publisherId = id("agent");
  const analyzerNodeId = id("node");
  const conditionNodeId = id("node");
  const publisherNodeId = id("node");
  const humanReviewNodeId = id("node");

  const agents: AgentDefinition[] = [
    makeAgent({
      id: analyzerId,
      name: "content_analyzer",
      role: "Content Analyzer",
      goal: "Analyze content for policy violations, toxicity, and safety issues",
      backstory: "You are a content moderation expert trained to identify harmful, inappropriate, or policy-violating content across many categories.",
      instructions: "Analyze the submitted content for: toxicity, hate speech, misinformation, spam, personal information exposure, and copyright violations. Output an is_safe boolean and a detailed analysis report with confidence scores per category.",
      description: "Analyzes content for safety and policy compliance",
    }),
    makeAgent({
      id: publisherId,
      name: "publisher",
      role: "Content Publisher",
      goal: "Publish approved content to the appropriate channels",
      backstory: "You handle the final publication step for content that has passed moderation review.",
      instructions: "Format the approved content for publication. Add any required metadata, timestamps, and attribution. Confirm successful publication.",
      description: "Publishes content that passes moderation",
    }),
  ];

  const nodes: WorkflowNode[] = [
    { id: entryId, name: "Start", type: "entry", config: {}, position: { x: 300, y: 50 } },
    { id: analyzerNodeId, name: "Content Analyzer", type: "agent", agent_ref: analyzerId, config: {}, position: { x: 300, y: 220 } },
    { id: conditionNodeId, name: "Is Safe?", type: "condition", config: { condition: { condition_expression: "state.get('is_safe') == True" } }, position: { x: 300, y: 400 } },
    { id: publisherNodeId, name: "Publisher", type: "agent", agent_ref: publisherId, config: {}, position: { x: 120, y: 580 } },
    { id: humanReviewNodeId, name: "Human Review", type: "human_input", config: { human_input: { prompt_template: "Content flagged for review. Analysis: {{analysis_report}}. Please approve or reject.", input_type: "approve_reject", timeout_action: "escalate" } }, position: { x: 480, y: 580 } },
    { id: exitId, name: "End", type: "exit", config: {}, position: { x: 300, y: 760 } },
  ];

  const edges: WorkflowEdge[] = [
    { id: id("edge"), source: entryId, target: analyzerNodeId, type: "default", priority: 0, state_mapping: [] },
    { id: id("edge"), source: analyzerNodeId, target: conditionNodeId, type: "default", priority: 0, state_mapping: [] },
    { id: id("edge"), source: conditionNodeId, target: publisherNodeId, type: "conditional", condition: { expression: "state.get('is_safe') == True", label: "Safe" }, priority: 0, state_mapping: [] },
    { id: id("edge"), source: conditionNodeId, target: humanReviewNodeId, type: "conditional", condition: { expression: "state.get('is_safe') == False", label: "Unsafe" }, priority: 1, state_mapping: [] },
    { id: id("edge"), source: publisherNodeId, target: exitId, type: "default", priority: 0, state_mapping: [] },
    { id: id("edge"), source: humanReviewNodeId, target: exitId, type: "default", priority: 0, state_mapping: [] },
  ];

  return {
    ...baseIR("Content Moderation Pipeline", "Analyze content safety with conditional routing to publisher or human review"),
    agents,
    tools: [],
    workflow: {
      id: id("wf"),
      name: "Content Moderation Pipeline",
      type: "custom_graph",
      state_schema: {
        fields: [
          { name: "content", type: "string", description: "The content to moderate", reducer: "replace" },
          { name: "is_safe", type: "boolean", description: "Whether the content passed safety checks", reducer: "replace" },
          { name: "analysis_report", type: "string", description: "Detailed moderation analysis", reducer: "replace" },
          { name: "published", type: "boolean", description: "Whether content was published", reducer: "replace" },
        ],
        initial_state: {},
      },
      nodes,
      edges,
      entry_node: entryId,
      exit_nodes: [exitId],
    },
  };
}

// ============================================================================
// 5. Multi-Agent Research Team (Advanced)
// ============================================================================

function createResearchTeam(): IRDocument {
  const entryId = id("node");
  const exitId = id("node");
  const plannerId = id("agent");
  const webResearcherId = id("agent");
  const dataAnalystId = id("agent");
  const reportWriterId = id("agent");
  const plannerNodeId = id("node");
  const fanOutNodeId = id("node");
  const webResearcherNodeId = id("node");
  const dataAnalystNodeId = id("node");
  const fanInNodeId = id("node");
  const reportWriterNodeId = id("node");
  const webSearchToolId = id("tool");
  const dataAnalysisToolId = id("tool");

  const tools: ToolDefinition[] = [
    makeTool({
      id: webSearchToolId,
      name: "web_search",
      description: "Search the web for current information on a topic",
      type: "function",
      parameters: [
        { name: "query", type: "string", description: "Search query", required: true },
        { name: "num_results", type: "integer", description: "Number of results", required: false, default: 10 },
      ],
      returns: { type: "list", description: "Search results with titles, snippets, and URLs" },
    }),
    makeTool({
      id: dataAnalysisToolId,
      name: "data_analyzer",
      description: "Analyze structured data and produce statistical summaries",
      type: "function",
      parameters: [
        { name: "data", type: "dict", description: "The data to analyze", required: true },
        { name: "analysis_type", type: "string", description: "Type of analysis: summary, trend, comparison", required: true },
      ],
      returns: { type: "dict", description: "Analysis results with charts and insights" },
    }),
  ];

  const agents: AgentDefinition[] = [
    makeAgent({
      id: plannerId,
      name: "research_planner",
      role: "Research Planner",
      goal: "Create a structured research plan breaking down the topic into sub-tasks",
      backstory: "You are a senior research director who excels at decomposing complex research questions into actionable investigation tasks.",
      instructions: "Given the research topic, create a detailed research plan. Break it into parallel tracks: (1) web research for qualitative information and current data, (2) data analysis for quantitative insights. Define specific questions for each track.",
      description: "Plans and decomposes research tasks",
      delegation: { can_delegate: true, delegate_to: [webResearcherId, dataAnalystId], handoff_type: "delegate" },
    }),
    makeAgent({
      id: webResearcherId,
      name: "web_researcher",
      role: "Web Researcher",
      goal: "Gather comprehensive qualitative information from web sources",
      backstory: "You are an investigative researcher skilled at finding and synthesizing information from diverse web sources.",
      instructions: "Follow the research plan to search for relevant web sources. Evaluate source credibility. Extract key findings, quotes, and data points. Compile a structured research brief with citations.",
      description: "Conducts web research and gathers qualitative data",
      tools: [webSearchToolId],
      allowed_tools: [webSearchToolId],
      capabilities: { code_execution: false, web_browsing: true, file_access: false, mcp_servers: [] },
    }),
    makeAgent({
      id: dataAnalystId,
      name: "data_analyst",
      role: "Data Analyst",
      goal: "Analyze quantitative data and produce statistical insights",
      backstory: "You are a data scientist who transforms raw data into actionable insights through statistical analysis.",
      instructions: "Using available data sources, perform quantitative analysis as specified in the research plan. Produce statistical summaries, identify trends, and create data visualizations. Report findings with confidence intervals.",
      description: "Analyzes data and produces statistical insights",
      tools: [dataAnalysisToolId],
      allowed_tools: [dataAnalysisToolId],
      capabilities: { code_execution: true, web_browsing: false, file_access: true, mcp_servers: [] },
    }),
    makeAgent({
      id: reportWriterId,
      name: "report_writer",
      role: "Report Writer",
      goal: "Synthesize all research findings into a comprehensive, well-structured report",
      backstory: "You are a senior technical writer who produces clear, compelling research reports for executive audiences.",
      instructions: "Combine the web research findings and data analysis results into a cohesive report. Include an executive summary, key findings, supporting evidence, data visualizations, and recommendations. Ensure consistency and proper citations.",
      description: "Synthesizes research into a final report",
    }),
  ];

  const nodes: WorkflowNode[] = [
    { id: entryId, name: "Start", type: "entry", config: {}, position: { x: 300, y: 50 } },
    { id: plannerNodeId, name: "Research Planner", type: "agent", agent_ref: plannerId, config: {}, position: { x: 300, y: 200 } },
    { id: fanOutNodeId, name: "Fan Out", type: "parallel_fan_out", config: { parallel_fan_out: { fan_out_on: "research_tracks" } }, position: { x: 300, y: 360 } },
    { id: webResearcherNodeId, name: "Web Researcher", type: "agent", agent_ref: webResearcherId, config: {}, position: { x: 120, y: 520 } },
    { id: dataAnalystNodeId, name: "Data Analyst", type: "agent", agent_ref: dataAnalystId, config: {}, position: { x: 480, y: 520 } },
    { id: fanInNodeId, name: "Join", type: "parallel_fan_in", config: { parallel_fan_in: { aggregation_strategy: "merge" } }, position: { x: 300, y: 680 } },
    { id: reportWriterNodeId, name: "Report Writer", type: "agent", agent_ref: reportWriterId, config: {}, position: { x: 300, y: 840 } },
    { id: exitId, name: "End", type: "exit", config: {}, position: { x: 300, y: 1000 } },
  ];

  const edges: WorkflowEdge[] = [
    { id: id("edge"), source: entryId, target: plannerNodeId, type: "default", priority: 0, state_mapping: [] },
    { id: id("edge"), source: plannerNodeId, target: fanOutNodeId, type: "default", priority: 0, state_mapping: [] },
    { id: id("edge"), source: fanOutNodeId, target: webResearcherNodeId, type: "default", priority: 0, state_mapping: [] },
    { id: id("edge"), source: fanOutNodeId, target: dataAnalystNodeId, type: "default", priority: 0, state_mapping: [] },
    { id: id("edge"), source: webResearcherNodeId, target: fanInNodeId, type: "default", priority: 0, state_mapping: [] },
    { id: id("edge"), source: dataAnalystNodeId, target: fanInNodeId, type: "default", priority: 0, state_mapping: [] },
    { id: id("edge"), source: fanInNodeId, target: reportWriterNodeId, type: "default", priority: 0, state_mapping: [] },
    { id: id("edge"), source: reportWriterNodeId, target: exitId, type: "default", priority: 0, state_mapping: [] },
  ];

  return {
    ...baseIR("Multi-Agent Research Team", "Parallel research with web researcher and data analyst feeding into a report writer"),
    agents,
    tools,
    workflow: {
      id: id("wf"),
      name: "Multi-Agent Research Team",
      type: "custom_graph",
      state_schema: {
        fields: [
          { name: "research_topic", type: "string", description: "The research topic or question", reducer: "replace" },
          { name: "research_plan", type: "dict", description: "The structured research plan", reducer: "replace" },
          { name: "research_tracks", type: "list", description: "Parallel research track definitions", reducer: "replace" },
          { name: "web_findings", type: "dict", description: "Web research findings", reducer: "merge" },
          { name: "data_analysis", type: "dict", description: "Data analysis results", reducer: "merge" },
          { name: "final_report", type: "string", description: "The final synthesized report", reducer: "replace" },
        ],
        initial_state: {},
      },
      nodes,
      edges,
      entry_node: entryId,
      exit_nodes: [exitId],
    },
  };
}

// ============================================================================
// 6. Sales Lead Qualification (Advanced)
// ============================================================================

function createSalesLeadQualification(): IRDocument {
  const entryId = id("node");
  const exitId = id("node");
  const intakeId = id("agent");
  const enrichmentId = id("agent");
  const scoringId = id("agent");
  const salesRepId = id("agent");
  const nurtureId = id("agent");
  const intakeNodeId = id("node");
  const enrichmentNodeId = id("node");
  const scoringNodeId = id("node");
  const conditionNodeId = id("node");
  const salesRepNodeId = id("node");
  const nurtureNodeId = id("node");
  const crmToolId = id("tool");
  const enrichmentToolId = id("tool");

  const tools: ToolDefinition[] = [
    makeTool({
      id: crmToolId,
      name: "crm_lookup",
      description: "Look up lead information in the CRM system",
      type: "api",
      parameters: [
        { name: "email", type: "string", description: "Lead email address", required: true },
        { name: "company", type: "string", description: "Company name", required: false },
      ],
      returns: { type: "dict", description: "CRM record with history and interactions" },
    }),
    makeTool({
      id: enrichmentToolId,
      name: "data_enrichment",
      description: "Enrich lead data with firmographic and technographic information",
      type: "api",
      parameters: [
        { name: "company_domain", type: "string", description: "Company domain", required: true },
      ],
      returns: { type: "dict", description: "Enriched company data: size, industry, tech stack, funding" },
    }),
  ];

  const agents: AgentDefinition[] = [
    makeAgent({
      id: intakeId,
      name: "lead_intake",
      role: "Lead Intake Specialist",
      goal: "Capture and validate incoming lead information",
      instructions: "Process the incoming lead data. Validate email, company name, and contact info. Normalize fields and check for duplicates in the CRM. Flag any data quality issues.",
      description: "Processes and validates incoming lead data",
      tools: [crmToolId],
      allowed_tools: [crmToolId],
    }),
    makeAgent({
      id: enrichmentId,
      name: "enrichment_agent",
      role: "Data Enrichment Specialist",
      goal: "Enrich lead profiles with external data sources",
      instructions: "Use the data enrichment tool to gather firmographic data: company size, industry, annual revenue, tech stack, and recent funding. Merge enriched data into the lead profile.",
      description: "Enriches lead data with external information",
      tools: [enrichmentToolId],
      allowed_tools: [enrichmentToolId],
    }),
    makeAgent({
      id: scoringId,
      name: "scoring_agent",
      role: "Lead Scoring Analyst",
      goal: "Score leads based on qualification criteria",
      instructions: "Evaluate the enriched lead against the ideal customer profile. Score based on: company size (0-20), industry fit (0-20), tech stack match (0-20), engagement signals (0-20), budget indicators (0-20). Total score out of 100. Set lead_score in state.",
      description: "Scores leads using qualification criteria",
    }),
    makeAgent({
      id: salesRepId,
      name: "sales_rep_agent",
      role: "Sales Development Representative",
      goal: "Prepare high-quality leads for sales team engagement",
      instructions: "For high-scoring leads: prepare a personalized outreach plan, draft an introductory email, identify key talking points, and schedule follow-up tasks in the CRM. Route to the assigned sales rep.",
      description: "Handles high-scoring leads for sales engagement",
      tools: [crmToolId],
      allowed_tools: [crmToolId],
    }),
    makeAgent({
      id: nurtureId,
      name: "nurture_agent",
      role: "Lead Nurturing Specialist",
      goal: "Place lower-scoring leads into appropriate nurture campaigns",
      instructions: "For leads scoring below the threshold: identify the most relevant nurture campaign based on industry and interest signals. Enroll the lead in the campaign. Set follow-up reminders for re-scoring in 30 days.",
      description: "Manages nurture campaigns for lower-scoring leads",
    }),
  ];

  const nodes: WorkflowNode[] = [
    { id: entryId, name: "Start", type: "entry", config: {}, position: { x: 300, y: 50 } },
    { id: intakeNodeId, name: "Lead Intake", type: "agent", agent_ref: intakeId, config: {}, position: { x: 300, y: 200 } },
    { id: enrichmentNodeId, name: "Enrichment", type: "agent", agent_ref: enrichmentId, config: {}, position: { x: 300, y: 360 } },
    { id: scoringNodeId, name: "Lead Scoring", type: "agent", agent_ref: scoringId, config: {}, position: { x: 300, y: 520 } },
    { id: conditionNodeId, name: "Score > 80?", type: "condition", config: { condition: { condition_expression: "state.get('lead_score', 0) > 80" } }, position: { x: 300, y: 680 } },
    { id: salesRepNodeId, name: "Sales Rep", type: "agent", agent_ref: salesRepId, config: {}, position: { x: 120, y: 850 } },
    { id: nurtureNodeId, name: "Nurture", type: "agent", agent_ref: nurtureId, config: {}, position: { x: 480, y: 850 } },
    { id: exitId, name: "End", type: "exit", config: {}, position: { x: 300, y: 1030 } },
  ];

  const edges: WorkflowEdge[] = [
    { id: id("edge"), source: entryId, target: intakeNodeId, type: "default", priority: 0, state_mapping: [] },
    { id: id("edge"), source: intakeNodeId, target: enrichmentNodeId, type: "default", priority: 0, state_mapping: [] },
    { id: id("edge"), source: enrichmentNodeId, target: scoringNodeId, type: "default", priority: 0, state_mapping: [] },
    { id: id("edge"), source: scoringNodeId, target: conditionNodeId, type: "default", priority: 0, state_mapping: [] },
    { id: id("edge"), source: conditionNodeId, target: salesRepNodeId, type: "conditional", condition: { expression: "state.get('lead_score', 0) > 80", label: "High Score" }, priority: 0, state_mapping: [] },
    { id: id("edge"), source: conditionNodeId, target: nurtureNodeId, type: "conditional", condition: { expression: "state.get('lead_score', 0) <= 80", label: "Low Score" }, priority: 1, state_mapping: [] },
    { id: id("edge"), source: salesRepNodeId, target: exitId, type: "default", priority: 0, state_mapping: [] },
    { id: id("edge"), source: nurtureNodeId, target: exitId, type: "default", priority: 0, state_mapping: [] },
  ];

  return {
    ...baseIR("Sales Lead Qualification", "Multi-stage lead processing: intake, enrichment, scoring, and conditional routing"),
    agents,
    tools,
    workflow: {
      id: id("wf"),
      name: "Sales Lead Qualification",
      type: "custom_graph",
      state_schema: {
        fields: [
          { name: "lead_data", type: "dict", description: "Raw lead information", reducer: "replace" },
          { name: "enriched_data", type: "dict", description: "Enriched company/contact data", reducer: "merge" },
          { name: "lead_score", type: "integer", description: "Qualification score (0-100)", reducer: "replace" },
          { name: "disposition", type: "string", description: "Lead disposition: qualified, nurture, disqualified", reducer: "replace" },
          { name: "outreach_plan", type: "string", description: "Personalized outreach plan for qualified leads", reducer: "replace" },
        ],
        initial_state: {},
      },
      nodes,
      edges,
      entry_node: entryId,
      exit_nodes: [exitId],
    },
  };
}

// ============================================================================
// 7. Automated Code Review (Expert)
// ============================================================================

function createAutomatedCodeReview(): IRDocument {
  const entryId = id("node");
  const exitId = id("node");
  const codeAnalyzerId = id("agent");
  const reviewerId = id("agent");
  const fixAgentId = id("agent");
  const approverId = id("agent");
  const analyzerNodeId = id("node");
  const reviewerNodeId = id("node");
  const conditionNodeId = id("node");
  const fixNodeId = id("node");
  const approverNodeId = id("node");
  const loopNodeId = id("node");
  const linterToolId = id("tool");
  const gitToolId = id("tool");

  const tools: ToolDefinition[] = [
    makeTool({
      id: linterToolId,
      name: "code_linter",
      description: "Run static analysis and linting on code files",
      type: "function",
      parameters: [
        { name: "file_path", type: "string", description: "Path to the file to lint", required: true },
        { name: "rules", type: "list", description: "Specific lint rules to check", required: false },
      ],
      returns: { type: "list", description: "List of lint issues with severity, line, and message" },
    }),
    makeTool({
      id: gitToolId,
      name: "git_diff",
      description: "Get the diff of changes in a pull request",
      type: "function",
      parameters: [
        { name: "pr_number", type: "integer", description: "Pull request number", required: true },
      ],
      returns: { type: "string", description: "The git diff output" },
    }),
  ];

  const agents: AgentDefinition[] = [
    makeAgent({
      id: codeAnalyzerId,
      name: "code_analyzer",
      role: "Code Analyzer",
      goal: "Perform initial static analysis of code changes",
      instructions: "Use the git_diff tool to retrieve the code changes. Run the code_linter tool to find issues. Categorize findings by severity: critical, warning, info. Flag security vulnerabilities, performance issues, and code smell.",
      description: "Performs static analysis on code changes",
      tools: [linterToolId, gitToolId],
      allowed_tools: [linterToolId, gitToolId],
      capabilities: { code_execution: true, web_browsing: false, file_access: true, mcp_servers: [] },
    }),
    makeAgent({
      id: reviewerId,
      name: "code_reviewer",
      role: "Code Reviewer",
      goal: "Provide thorough code review feedback",
      instructions: "Review the code changes and static analysis results. Evaluate: code correctness, design patterns, naming conventions, test coverage, documentation. Provide line-by-line feedback. Set issues_found to true if any critical or blocking issues exist.",
      description: "Reviews code and provides feedback",
    }),
    makeAgent({
      id: fixAgentId,
      name: "fix_agent",
      role: "Code Fix Agent",
      goal: "Automatically fix identified code issues",
      instructions: "For each issue flagged by the reviewer, generate a fix. Apply coding standards. Ensure fixes do not introduce regressions. Output the corrected code and a summary of changes made.",
      description: "Automatically fixes code issues",
      capabilities: { code_execution: true, web_browsing: false, file_access: true, mcp_servers: [] },
    }),
    makeAgent({
      id: approverId,
      name: "approver",
      role: "Final Approver",
      goal: "Give final approval for clean code",
      instructions: "Verify that all issues have been resolved. Perform a final sanity check on the code. If everything looks good, approve the pull request. Generate a summary of the review process.",
      description: "Gives final approval for reviewed code",
    }),
  ];

  const nodes: WorkflowNode[] = [
    { id: entryId, name: "Start", type: "entry", config: {}, position: { x: 300, y: 50 } },
    { id: analyzerNodeId, name: "Code Analyzer", type: "agent", agent_ref: codeAnalyzerId, config: {}, position: { x: 300, y: 200 } },
    { id: reviewerNodeId, name: "Code Reviewer", type: "agent", agent_ref: reviewerId, config: {}, position: { x: 300, y: 370 } },
    { id: conditionNodeId, name: "Issues Found?", type: "condition", config: { condition: { condition_expression: "state.get('issues_found') == True" } }, position: { x: 300, y: 540 } },
    { id: fixNodeId, name: "Fix Agent", type: "agent", agent_ref: fixAgentId, config: {}, position: { x: 540, y: 700 } },
    { id: loopNodeId, name: "Review Loop", type: "loop", config: { loop: { max_iterations: 3, exit_condition: "state.get('issues_found') == False" } }, position: { x: 540, y: 540 } },
    { id: approverNodeId, name: "Approver", type: "agent", agent_ref: approverId, config: {}, position: { x: 120, y: 700 } },
    { id: exitId, name: "End", type: "exit", config: {}, position: { x: 300, y: 880 } },
  ];

  const edges: WorkflowEdge[] = [
    { id: id("edge"), source: entryId, target: analyzerNodeId, type: "default", priority: 0, state_mapping: [] },
    { id: id("edge"), source: analyzerNodeId, target: reviewerNodeId, type: "default", priority: 0, state_mapping: [] },
    { id: id("edge"), source: reviewerNodeId, target: conditionNodeId, type: "default", priority: 0, state_mapping: [] },
    { id: id("edge"), source: conditionNodeId, target: approverNodeId, type: "conditional", condition: { expression: "state.get('issues_found') == False", label: "No Issues" }, priority: 0, state_mapping: [] },
    { id: id("edge"), source: conditionNodeId, target: fixNodeId, type: "conditional", condition: { expression: "state.get('issues_found') == True", label: "Issues Found" }, priority: 1, state_mapping: [] },
    { id: id("edge"), source: fixNodeId, target: reviewerNodeId, type: "default", priority: 0, state_mapping: [] },
    { id: id("edge"), source: approverNodeId, target: exitId, type: "default", priority: 0, state_mapping: [] },
  ];

  return {
    ...baseIR("Automated Code Review", "Code analysis, review, and iterative fix loop with final approval"),
    agents,
    tools,
    workflow: {
      id: id("wf"),
      name: "Automated Code Review",
      type: "custom_graph",
      state_schema: {
        fields: [
          { name: "pr_number", type: "integer", description: "Pull request number", reducer: "replace" },
          { name: "code_diff", type: "string", description: "The code diff to review", reducer: "replace" },
          { name: "lint_results", type: "list", description: "Static analysis results", reducer: "replace" },
          { name: "review_feedback", type: "list", description: "Code review comments", reducer: "append" },
          { name: "issues_found", type: "boolean", description: "Whether blocking issues exist", reducer: "replace" },
          { name: "fix_summary", type: "string", description: "Summary of applied fixes", reducer: "append" },
          { name: "iteration_count", type: "integer", description: "Number of review iterations", reducer: "replace" },
        ],
        initial_state: {},
      },
      nodes,
      edges,
      entry_node: entryId,
      exit_nodes: [exitId],
    },
  };
}

// ============================================================================
// 8. Enterprise Support Escalation (Expert)
// ============================================================================

function createEnterpriseSupportEscalation(): IRDocument {
  const entryId = id("node");
  const exitId = id("node");
  const intakeAgentId = id("agent");
  const classifierId = id("agent");
  const autoResolverId = id("agent");
  const toolAgentId = id("agent");
  const escalationAgentId = id("agent");
  const responseDrafterId = id("agent");
  const intakeNodeId = id("node");
  const classifierNodeId = id("node");
  const urgencyConditionId = id("node");
  const autoResolverNodeId = id("node");
  const toolAgentNodeId = id("node");
  const humanReviewNodeId = id("node");
  const escalationNodeId = id("node");
  const drafterNodeId = id("node");
  const kbToolId = id("tool");
  const ticketToolId = id("tool");
  const diagnosticToolId = id("tool");

  const tools: ToolDefinition[] = [
    makeTool({
      id: kbToolId,
      name: "knowledge_base",
      description: "Search the internal knowledge base for solutions and documentation",
      type: "function",
      parameters: [
        { name: "query", type: "string", description: "Search query", required: true },
        { name: "category", type: "string", description: "KB category filter", required: false },
      ],
      returns: { type: "list", description: "Matching KB articles" },
    }),
    makeTool({
      id: ticketToolId,
      name: "ticket_system",
      description: "Create, update, and query support tickets",
      type: "api",
      parameters: [
        { name: "action", type: "string", description: "create, update, query", required: true },
        { name: "ticket_data", type: "dict", description: "Ticket data", required: true },
      ],
      returns: { type: "dict", description: "Ticket operation result" },
    }),
    makeTool({
      id: diagnosticToolId,
      name: "system_diagnostics",
      description: "Run system diagnostics and health checks",
      type: "function",
      parameters: [
        { name: "system_id", type: "string", description: "System to diagnose", required: true },
        { name: "check_type", type: "string", description: "Type of diagnostic check", required: true },
      ],
      returns: { type: "dict", description: "Diagnostic results" },
    }),
  ];

  const agents: AgentDefinition[] = [
    makeAgent({
      id: intakeAgentId,
      name: "intake_agent",
      role: "Support Intake",
      goal: "Capture and normalize incoming support requests",
      instructions: "Process the incoming support request. Extract: customer ID, issue description, affected systems, and any error codes. Create a ticket in the system. Prepare structured data for classification.",
      description: "Captures and normalizes support requests",
      tools: [ticketToolId],
      allowed_tools: [ticketToolId],
    }),
    makeAgent({
      id: classifierId,
      name: "classifier_agent",
      role: "Issue Classifier",
      goal: "Classify support issues by type and urgency",
      instructions: "Analyze the support request. Classify urgency as: low (general questions, feature requests), medium (functionality issues, degraded performance), high (outages, security incidents, data loss). Set the urgency field in state.",
      description: "Classifies support issues by urgency level",
    }),
    makeAgent({
      id: autoResolverId,
      name: "auto_resolver",
      role: "Auto-Resolver",
      goal: "Automatically resolve low-urgency common issues",
      instructions: "Search the knowledge base for matching solutions. If a high-confidence match exists, generate a resolution. Apply the fix if possible and update the ticket with the resolution steps.",
      description: "Automatically resolves common low-urgency issues",
      tools: [kbToolId],
      allowed_tools: [kbToolId],
    }),
    makeAgent({
      id: toolAgentId,
      name: "diagnostic_agent",
      role: "Diagnostic Specialist",
      goal: "Diagnose medium-urgency issues using system tools",
      instructions: "For medium-urgency issues, run system diagnostics to identify the root cause. Check system health, review recent changes, and analyze error patterns. Propose a resolution based on diagnostic findings.",
      description: "Runs diagnostics for medium-urgency issues",
      tools: [kbToolId, diagnosticToolId],
      allowed_tools: [kbToolId, diagnosticToolId],
    }),
    makeAgent({
      id: escalationAgentId,
      name: "escalation_agent",
      role: "Escalation Manager",
      goal: "Handle escalated high-urgency issues after human review",
      instructions: "After human review, coordinate the escalation response. Assign to the appropriate engineering team. Set up a war room if severity is critical. Track resolution progress and provide status updates.",
      description: "Manages escalation for high-urgency issues",
      tools: [ticketToolId],
      allowed_tools: [ticketToolId],
    }),
    makeAgent({
      id: responseDrafterId,
      name: "response_drafter",
      role: "Response Drafter",
      goal: "Draft professional customer-facing responses",
      instructions: "Based on the resolution or escalation outcome, draft a customer response. Include: acknowledgment of the issue, steps taken, resolution or next steps, and estimated timeline. Maintain a professional and empathetic tone.",
      description: "Drafts customer-facing responses",
    }),
  ];

  const nodes: WorkflowNode[] = [
    { id: entryId, name: "Start", type: "entry", config: {}, position: { x: 350, y: 50 } },
    { id: intakeNodeId, name: "Intake", type: "agent", agent_ref: intakeAgentId, config: {}, position: { x: 350, y: 200 } },
    { id: classifierNodeId, name: "Classifier", type: "agent", agent_ref: classifierId, config: {}, position: { x: 350, y: 360 } },
    { id: urgencyConditionId, name: "Urgency?", type: "condition", config: { condition: { condition_expression: "state.get('urgency')" } }, position: { x: 350, y: 520 } },
    { id: autoResolverNodeId, name: "Auto-Resolver", type: "agent", agent_ref: autoResolverId, config: {}, position: { x: 80, y: 690 } },
    { id: toolAgentNodeId, name: "Diagnostic Agent", type: "agent", agent_ref: toolAgentId, config: {}, position: { x: 350, y: 690 } },
    { id: humanReviewNodeId, name: "Human Review", type: "human_input", config: { human_input: { prompt_template: "HIGH URGENCY: {{issue_summary}}. Customer: {{customer_id}}. Please review and approve escalation.", input_type: "approve_reject", timeout_action: "escalate" } }, position: { x: 620, y: 690 } },
    { id: escalationNodeId, name: "Escalation", type: "agent", agent_ref: escalationAgentId, config: {}, position: { x: 620, y: 860 } },
    { id: drafterNodeId, name: "Response Drafter", type: "agent", agent_ref: responseDrafterId, config: {}, position: { x: 350, y: 1030 } },
    { id: exitId, name: "End", type: "exit", config: {}, position: { x: 350, y: 1200 } },
  ];

  const edges: WorkflowEdge[] = [
    { id: id("edge"), source: entryId, target: intakeNodeId, type: "default", priority: 0, state_mapping: [] },
    { id: id("edge"), source: intakeNodeId, target: classifierNodeId, type: "default", priority: 0, state_mapping: [] },
    { id: id("edge"), source: classifierNodeId, target: urgencyConditionId, type: "default", priority: 0, state_mapping: [] },
    { id: id("edge"), source: urgencyConditionId, target: autoResolverNodeId, type: "conditional", condition: { expression: "state.get('urgency') == 'low'", label: "Low" }, priority: 0, state_mapping: [] },
    { id: id("edge"), source: urgencyConditionId, target: toolAgentNodeId, type: "conditional", condition: { expression: "state.get('urgency') == 'medium'", label: "Medium" }, priority: 1, state_mapping: [] },
    { id: id("edge"), source: urgencyConditionId, target: humanReviewNodeId, type: "conditional", condition: { expression: "state.get('urgency') == 'high'", label: "High" }, priority: 2, state_mapping: [] },
    { id: id("edge"), source: autoResolverNodeId, target: drafterNodeId, type: "default", priority: 0, state_mapping: [] },
    { id: id("edge"), source: toolAgentNodeId, target: drafterNodeId, type: "default", priority: 0, state_mapping: [] },
    { id: id("edge"), source: humanReviewNodeId, target: escalationNodeId, type: "default", priority: 0, state_mapping: [] },
    { id: id("edge"), source: escalationNodeId, target: drafterNodeId, type: "default", priority: 0, state_mapping: [] },
    { id: id("edge"), source: drafterNodeId, target: exitId, type: "default", priority: 0, state_mapping: [] },
  ];

  return {
    ...baseIR("Enterprise Support Escalation", "Full support pipeline with urgency-based routing, HITL, tools, and multi-path resolution"),
    agents,
    tools,
    workflow: {
      id: id("wf"),
      name: "Enterprise Support Escalation",
      type: "custom_graph",
      state_schema: {
        fields: [
          { name: "customer_id", type: "string", description: "Customer identifier", reducer: "replace" },
          { name: "issue_description", type: "string", description: "Original issue description", reducer: "replace" },
          { name: "issue_summary", type: "string", description: "Structured issue summary", reducer: "replace" },
          { name: "urgency", type: "string", description: "Urgency level: low, medium, high", reducer: "replace" },
          { name: "ticket_id", type: "string", description: "Support ticket ID", reducer: "replace" },
          { name: "diagnostic_results", type: "dict", description: "System diagnostic results", reducer: "merge" },
          { name: "resolution", type: "string", description: "The resolution or action taken", reducer: "replace" },
          { name: "customer_response", type: "string", description: "Draft customer-facing response", reducer: "replace" },
        ],
        initial_state: {},
      },
      nodes,
      edges,
      entry_node: entryId,
      exit_nodes: [exitId],
    },
  };
}

// ============================================================================
// Registry
// ============================================================================

export const workflowTemplates: TemplateMeta[] = [
  {
    id: "simple-chatbot",
    name: "Simple Chatbot",
    description: "A single-agent chatbot for basic conversations. Great for understanding the fundamentals of agent workflows.",
    difficulty: "Beginner",
    agentCount: 1,
    nodeCount: 3,
    toolCount: 0,
    features: [],
    factory: createSimpleChatbot,
  },
  {
    id: "customer-support-classifier",
    name: "Customer Support Classifier",
    description: "Sequential pipeline with a ticket classifier and resolver. Learn how agents can work in sequence.",
    difficulty: "Beginner",
    agentCount: 2,
    nodeCount: 4,
    toolCount: 0,
    features: [],
    factory: createCustomerSupportClassifier,
  },
  {
    id: "rag-pipeline",
    name: "RAG Pipeline",
    description: "Retrieval-Augmented Generation with query analysis, vector search, and grounded response generation.",
    difficulty: "Intermediate",
    agentCount: 3,
    nodeCount: 5,
    toolCount: 1,
    features: ["Tools"],
    factory: createRAGPipeline,
  },
  {
    id: "content-moderation",
    name: "Content Moderation Pipeline",
    description: "Analyze content safety with conditional routing to auto-publish or human review for flagged content.",
    difficulty: "Intermediate",
    agentCount: 2,
    nodeCount: 6,
    toolCount: 0,
    features: ["Conditions", "HITL"],
    factory: createContentModerationPipeline,
  },
  {
    id: "research-team",
    name: "Multi-Agent Research Team",
    description: "Parallel research execution with web researcher and data analyst feeding into a report writer.",
    difficulty: "Advanced",
    agentCount: 4,
    nodeCount: 8,
    toolCount: 2,
    features: ["Parallel", "Tools"],
    factory: createResearchTeam,
  },
  {
    id: "sales-lead-qualification",
    name: "Sales Lead Qualification",
    description: "Multi-stage lead processing pipeline with data enrichment, scoring, and conditional routing to sales or nurture tracks.",
    difficulty: "Advanced",
    agentCount: 5,
    nodeCount: 8,
    toolCount: 2,
    features: ["Conditions", "Tools"],
    factory: createSalesLeadQualification,
  },
  {
    id: "automated-code-review",
    name: "Automated Code Review",
    description: "Iterative code review with static analysis, AI reviewer, auto-fix loop, and final approval gate.",
    difficulty: "Expert",
    agentCount: 4,
    nodeCount: 8,
    toolCount: 2,
    features: ["Conditions", "Loops", "Tools"],
    factory: createAutomatedCodeReview,
  },
  {
    id: "enterprise-support-escalation",
    name: "Enterprise Support Escalation",
    description: "Full enterprise support pipeline with urgency-based routing, diagnostics, human review, and multi-path resolution.",
    difficulty: "Expert",
    agentCount: 6,
    nodeCount: 10,
    toolCount: 3,
    features: ["Conditions", "HITL", "Tools", "Parallel"],
    factory: createEnterpriseSupportEscalation,
  },
];
