/**
 * Canvas state management using Zustand.
 *
 * Manages the React Flow canvas state and the underlying IR document.
 * Canvas edits update the IR; copilot IR patches update the canvas.
 */

import { create } from "zustand";
import { v4 as uuidv4 } from "uuid";
import type {
  AgentDefinition,
  IRDocument,
  ToolDefinition,
  WorkflowNode,
  WorkflowEdge,
  TargetFramework,
} from "../ir/types";

// ============================================================================
// Store types
// ============================================================================

interface SavedProject {
  id: string;
  name: string;
  savedAt: string;
}

interface CanvasState {
  // Core IR document
  irDocument: IRDocument | null;

  // Selected node/edge for properties panel
  selectedNodeId: string | null;
  selectedEdgeId: string | null;

  // UI state
  isLoading: boolean;
  isCopilotOpen: boolean;
  selectedFramework: TargetFramework;

  // Undo/redo history
  undoStack: IRDocument[];
  redoStack: IRDocument[];

  // Actions: IR document
  setIRDocument: (ir: IRDocument) => void;
  createNewProject: (name: string, description?: string) => void;

  // Actions: Project management
  saveProject: () => void;
  loadProject: (id: string) => void;
  listSavedProjects: () => SavedProject[];
  deleteSavedProject: (id: string) => void;
  clearCanvas: () => void;
  renameProject: (name: string) => void;

  // Actions: Undo/Redo
  undo: () => void;
  redo: () => void;
  pushUndo: () => void;

  // Actions: Export/Import
  exportIR: () => string;
  importIR: (json: string) => boolean;

  // Actions: Nodes
  addAgentNode: (agent: Partial<AgentDefinition>, position: { x: number; y: number }) => void;
  addToolNode: (tool: Partial<ToolDefinition>, position: { x: number; y: number }) => void;
  addConditionNode: (expression: string, position: { x: number; y: number }) => void;
  addHumanInputNode: (prompt: string, position: { x: number; y: number }) => void;
  updateNode: (nodeId: string, updates: Partial<WorkflowNode>) => void;
  removeNode: (nodeId: string) => void;

  // Actions: Edges
  addEdge: (edge: Partial<WorkflowEdge>) => void;
  updateEdge: (edgeId: string, updates: Partial<WorkflowEdge>) => void;
  removeEdge: (edgeId: string) => void;

  // Actions: Agents
  addAgent: (agent: Partial<AgentDefinition>) => void;
  updateAgent: (agentId: string, updates: Partial<AgentDefinition>) => void;
  removeAgent: (agentId: string) => void;

  // Actions: Tools
  addTool: (tool: Partial<ToolDefinition>) => void;
  updateTool: (toolId: string, updates: Partial<ToolDefinition>) => void;
  removeTool: (toolId: string) => void;

  // Actions: Selection
  selectNode: (nodeId: string | null) => void;
  selectEdge: (edgeId: string | null) => void;

  // Actions: UI
  toggleCopilot: () => void;
  setFramework: (framework: TargetFramework) => void;
}

// ============================================================================
// Default IR document
// ============================================================================

function createDefaultIR(name: string, description: string = ""): IRDocument {
  const entryId = `node_${uuidv4().slice(0, 8)}`;
  const exitId = `node_${uuidv4().slice(0, 8)}`;

  return {
    ir_version: "1.0",
    metadata: {
      id: uuidv4(),
      name,
      description,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      created_by: "",
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
    agents: [],
    tools: [],
    skills: [],
    workflow: {
      id: `wf_${uuidv4().slice(0, 8)}`,
      name: "",
      type: "custom_graph",
      state_schema: { fields: [], initial_state: {} },
      nodes: [
        { id: entryId, name: "Start", type: "entry", config: {}, position: { x: 250, y: 50 } },
        { id: exitId, name: "End", type: "exit", config: {}, position: { x: 250, y: 500 } },
      ],
      edges: [],
      entry_node: entryId,
      exit_nodes: [exitId],
    },
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

// ============================================================================
// Store implementation
// ============================================================================

const STORAGE_KEY = "agentforge_projects";
const MAX_UNDO = 50;

export const useCanvasStore = create<CanvasState>((set, get) => ({
  irDocument: null,
  selectedNodeId: null,
  selectedEdgeId: null,
  isLoading: false,
  isCopilotOpen: true,
  selectedFramework: "langgraph",
  undoStack: [],
  redoStack: [],

  setIRDocument: (ir) => set({ irDocument: ir }),

  createNewProject: (name, description) =>
    set({
      irDocument: createDefaultIR(name, description),
      undoStack: [],
      redoStack: [],
      selectedNodeId: null,
      selectedEdgeId: null,
    }),

  // ── Project management ───────────────────────────────────
  saveProject: () => {
    const { irDocument } = get();
    if (!irDocument || typeof window === "undefined") return;

    const saved = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "{}");
    saved[irDocument.metadata.id] = {
      ir: irDocument,
      savedAt: new Date().toISOString(),
    };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
  },

  loadProject: (id: string) => {
    if (typeof window === "undefined") return;
    const saved = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "{}");
    const project = saved[id];
    if (project) {
      set({
        irDocument: project.ir,
        undoStack: [],
        redoStack: [],
        selectedNodeId: null,
        selectedEdgeId: null,
      });
    }
  },

  listSavedProjects: (): SavedProject[] => {
    if (typeof window === "undefined") return [];
    const saved = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "{}");
    return Object.entries(saved).map(([id, data]: [string, any]) => ({
      id,
      name: data.ir?.metadata?.name || "Untitled",
      savedAt: data.savedAt || "",
    }));
  },

  deleteSavedProject: (id: string) => {
    if (typeof window === "undefined") return;
    const saved = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "{}");
    delete saved[id];
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
  },

  clearCanvas: () => {
    const { irDocument, pushUndo } = get();
    if (!irDocument) return;
    pushUndo();
    set({
      irDocument: createDefaultIR(
        irDocument.metadata.name,
        irDocument.metadata.description
      ),
      selectedNodeId: null,
      selectedEdgeId: null,
    });
  },

  renameProject: (name: string) => {
    const { irDocument } = get();
    if (!irDocument) return;
    set({
      irDocument: {
        ...irDocument,
        metadata: { ...irDocument.metadata, name, updated_at: new Date().toISOString() },
      },
    });
  },

  // ── Undo / Redo ──────────────────────────────────────────
  pushUndo: () => {
    const { irDocument, undoStack } = get();
    if (!irDocument) return;
    const newStack = [...undoStack, JSON.parse(JSON.stringify(irDocument))];
    if (newStack.length > MAX_UNDO) newStack.shift();
    set({ undoStack: newStack, redoStack: [] });
  },

  undo: () => {
    const { irDocument, undoStack, redoStack } = get();
    if (undoStack.length === 0) return;
    const previous = undoStack[undoStack.length - 1];
    const newUndoStack = undoStack.slice(0, -1);
    const newRedoStack = irDocument
      ? [...redoStack, JSON.parse(JSON.stringify(irDocument))]
      : redoStack;
    set({
      irDocument: previous,
      undoStack: newUndoStack,
      redoStack: newRedoStack,
      selectedNodeId: null,
      selectedEdgeId: null,
    });
  },

  redo: () => {
    const { irDocument, undoStack, redoStack } = get();
    if (redoStack.length === 0) return;
    const next = redoStack[redoStack.length - 1];
    const newRedoStack = redoStack.slice(0, -1);
    const newUndoStack = irDocument
      ? [...undoStack, JSON.parse(JSON.stringify(irDocument))]
      : undoStack;
    set({
      irDocument: next,
      undoStack: newUndoStack,
      redoStack: newRedoStack,
      selectedNodeId: null,
      selectedEdgeId: null,
    });
  },

  // ── Export / Import ──────────────────────────────────────
  exportIR: (): string => {
    const { irDocument } = get();
    return JSON.stringify(irDocument, null, 2);
  },

  importIR: (json: string): boolean => {
    try {
      const ir = JSON.parse(json) as IRDocument;
      if (!ir.ir_version || !ir.metadata || !ir.workflow) return false;
      get().pushUndo();
      set({ irDocument: ir, selectedNodeId: null, selectedEdgeId: null });
      return true;
    } catch {
      return false;
    }
  },

  addAgentNode: (agentPartial, position) => {
    const state = get();
    if (!state.irDocument) return;
    get().pushUndo();

    const agentId = `agent_${uuidv4().slice(0, 8)}`;
    const nodeId = `node_${uuidv4().slice(0, 8)}`;

    const agent: AgentDefinition = {
      name: agentPartial.name || "New Agent",
      type: agentPartial.type || "llm",
      role: agentPartial.role || "",
      goal: agentPartial.goal || "",
      backstory: agentPartial.backstory || "",
      instructions: agentPartial.instructions || "",
      description: agentPartial.description || "",
      tools: [],
      allowed_tools: [],
      capabilities: { code_execution: false, web_browsing: false, file_access: false, mcp_servers: [] },
      guardrails: [],
      memory_config: { short_term: true, long_term_enabled: false, long_term_store: "none", entity_memory: false, session_persistence: "none", shared_memory: false },
      delegation: { can_delegate: false, delegate_to: [], handoff_type: "delegate" },
      skills: [],
      ...agentPartial,
      id: agentId,
    };

    const node: WorkflowNode = {
      id: nodeId,
      name: agent.name,
      type: "agent",
      agent_ref: agentId,
      config: {},
      position,
    };

    set({
      irDocument: {
        ...state.irDocument,
        agents: [...state.irDocument.agents, agent],
        workflow: {
          ...state.irDocument.workflow,
          nodes: [...state.irDocument.workflow.nodes, node],
        },
      },
    });
  },

  addToolNode: (toolPartial, position) => {
    const state = get();
    if (!state.irDocument) return;
    get().pushUndo();

    const toolId = `tool_${uuidv4().slice(0, 8)}`;
    const nodeId = `node_${uuidv4().slice(0, 8)}`;

    const tool: ToolDefinition = {
      name: toolPartial.name || "New Tool",
      description: toolPartial.description || "",
      type: toolPartial.type || "function",
      parameters: [],
      ...toolPartial,
      id: toolId,
    };

    const node: WorkflowNode = {
      id: nodeId,
      name: tool.name,
      type: "tool_call",
      tool_ref: toolId,
      config: {},
      position,
    };

    set({
      irDocument: {
        ...state.irDocument,
        tools: [...state.irDocument.tools, tool],
        workflow: {
          ...state.irDocument.workflow,
          nodes: [...state.irDocument.workflow.nodes, node],
        },
      },
    });
  },

  addConditionNode: (expression, position) => {
    const state = get();
    if (!state.irDocument) return;
    get().pushUndo();

    const nodeId = `node_${uuidv4().slice(0, 8)}`;
    const node: WorkflowNode = {
      id: nodeId,
      name: "Condition",
      type: "condition",
      config: { condition: { condition_expression: expression } },
      position,
    };

    set({
      irDocument: {
        ...state.irDocument,
        workflow: {
          ...state.irDocument.workflow,
          nodes: [...state.irDocument.workflow.nodes, node],
        },
      },
    });
  },

  addHumanInputNode: (prompt, position) => {
    const state = get();
    if (!state.irDocument) return;
    get().pushUndo();

    const nodeId = `node_${uuidv4().slice(0, 8)}`;
    const node: WorkflowNode = {
      id: nodeId,
      name: "Human Review",
      type: "human_input",
      config: {
        human_input: {
          prompt_template: prompt,
          input_type: "approve_reject",
          timeout_action: "escalate",
        },
      },
      position,
    };

    set({
      irDocument: {
        ...state.irDocument,
        workflow: {
          ...state.irDocument.workflow,
          nodes: [...state.irDocument.workflow.nodes, node],
        },
      },
    });
  },

  updateNode: (nodeId, updates) => {
    const state = get();
    if (!state.irDocument) return;

    set({
      irDocument: {
        ...state.irDocument,
        workflow: {
          ...state.irDocument.workflow,
          nodes: state.irDocument.workflow.nodes.map((n) =>
            n.id === nodeId ? { ...n, ...updates } : n
          ),
        },
      },
    });
  },

  removeNode: (nodeId) => {
    const state = get();
    if (!state.irDocument) return;
    get().pushUndo();

    set({
      irDocument: {
        ...state.irDocument,
        workflow: {
          ...state.irDocument.workflow,
          nodes: state.irDocument.workflow.nodes.filter((n) => n.id !== nodeId),
          edges: state.irDocument.workflow.edges.filter(
            (e) => e.source !== nodeId && e.target !== nodeId
          ),
        },
      },
    });
  },

  addEdge: (edgePartial) => {
    const state = get();
    if (!state.irDocument) return;

    const edge: WorkflowEdge = {
      id: `edge_${uuidv4().slice(0, 8)}`,
      source: edgePartial.source || "",
      target: edgePartial.target || "",
      type: edgePartial.type || "default",
      priority: 0,
      state_mapping: [],
      ...edgePartial,
    };

    set({
      irDocument: {
        ...state.irDocument,
        workflow: {
          ...state.irDocument.workflow,
          edges: [...state.irDocument.workflow.edges, edge],
        },
      },
    });
  },

  updateEdge: (edgeId, updates) => {
    const state = get();
    if (!state.irDocument) return;

    set({
      irDocument: {
        ...state.irDocument,
        workflow: {
          ...state.irDocument.workflow,
          edges: state.irDocument.workflow.edges.map((e) =>
            e.id === edgeId ? { ...e, ...updates } : e
          ),
        },
      },
    });
  },

  removeEdge: (edgeId) => {
    const state = get();
    if (!state.irDocument) return;
    get().pushUndo();

    set({
      irDocument: {
        ...state.irDocument,
        workflow: {
          ...state.irDocument.workflow,
          edges: state.irDocument.workflow.edges.filter((e) => e.id !== edgeId),
        },
      },
    });
  },

  addAgent: (agentPartial) => {
    const state = get();
    if (!state.irDocument) return;

    const agent: AgentDefinition = {
      id: `agent_${uuidv4().slice(0, 8)}`,
      name: "New Agent",
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
      ...agentPartial,
    };

    set({
      irDocument: {
        ...state.irDocument,
        agents: [...state.irDocument.agents, agent],
      },
    });
  },

  updateAgent: (agentId, updates) => {
    const state = get();
    if (!state.irDocument) return;

    set({
      irDocument: {
        ...state.irDocument,
        agents: state.irDocument.agents.map((a) =>
          a.id === agentId ? { ...a, ...updates } : a
        ),
      },
    });
  },

  removeAgent: (agentId) => {
    const state = get();
    if (!state.irDocument) return;

    set({
      irDocument: {
        ...state.irDocument,
        agents: state.irDocument.agents.filter((a) => a.id !== agentId),
        workflow: {
          ...state.irDocument.workflow,
          nodes: state.irDocument.workflow.nodes.filter((n) => n.agent_ref !== agentId),
        },
      },
    });
  },

  addTool: (toolPartial) => {
    const state = get();
    if (!state.irDocument) return;

    const tool: ToolDefinition = {
      id: `tool_${uuidv4().slice(0, 8)}`,
      name: "New Tool",
      description: "",
      type: "function",
      parameters: [],
      ...toolPartial,
    };

    set({
      irDocument: {
        ...state.irDocument,
        tools: [...state.irDocument.tools, tool],
      },
    });
  },

  updateTool: (toolId, updates) => {
    const state = get();
    if (!state.irDocument) return;

    set({
      irDocument: {
        ...state.irDocument,
        tools: state.irDocument.tools.map((t) =>
          t.id === toolId ? { ...t, ...updates } : t
        ),
      },
    });
  },

  removeTool: (toolId) => {
    const state = get();
    if (!state.irDocument) return;

    set({
      irDocument: {
        ...state.irDocument,
        tools: state.irDocument.tools.filter((t) => t.id !== toolId),
      },
    });
  },

  selectNode: (nodeId) => set({ selectedNodeId: nodeId, selectedEdgeId: null }),
  selectEdge: (edgeId) => set({ selectedEdgeId: edgeId, selectedNodeId: null }),

  toggleCopilot: () => set((state) => ({ isCopilotOpen: !state.isCopilotOpen })),
  setFramework: (framework) => set({ selectedFramework: framework }),
}));
