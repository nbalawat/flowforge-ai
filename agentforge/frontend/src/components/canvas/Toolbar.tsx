"use client";

import { useCanvasStore } from "@/lib/store/canvasStore";

const NODE_ITEMS = [
  {
    type: "agent",
    label: "Agent",
    icon: "A",
    color: "bg-blue-600",
    description: "LLM-powered agent with role, goal, and tools",
  },
  {
    type: "tool",
    label: "Tool",
    icon: "T",
    color: "bg-purple-600",
    description: "Function tool that agents can invoke",
  },
  {
    type: "condition",
    label: "Branch",
    icon: "?",
    color: "bg-yellow-600",
    description: "Conditional branch based on state",
  },
  {
    type: "human",
    label: "Human",
    icon: "H",
    color: "bg-green-600",
    description: "Human-in-the-loop review point",
  },
  {
    type: "loop",
    label: "Loop",
    icon: "L",
    color: "bg-pink-600",
    description: "Repeat a section until exit condition",
  },
  {
    type: "parallel",
    label: "Parallel",
    icon: "P",
    color: "bg-cyan-600",
    description: "Fan-out work in parallel, then join",
  },
  {
    type: "subworkflow",
    label: "Sub",
    icon: "S",
    color: "bg-orange-600",
    description: "Nested subworkflow",
  },
] as const;

export function Toolbar() {
  const store = useCanvasStore();

  const handleAdd = (type: string) => {
    const ir = store.irDocument;
    if (!ir) return;

    // Place new nodes near the centroid of existing nodes, offset slightly right and down
    const existingNodes = ir.workflow.nodes;
    const avgX = existingNodes.length > 0
      ? existingNodes.reduce((sum, n) => sum + n.position.x, 0) / existingNodes.length
      : 300;
    const avgY = existingNodes.length > 0
      ? existingNodes.reduce((sum, n) => sum + n.position.y, 0) / existingNodes.length
      : 200;

    const position = {
      x: avgX + 30 + Math.random() * 60 - 30,
      y: avgY + 30 + Math.random() * 60 - 30,
    };

    switch (type) {
      case "agent":
        store.addAgentNode({ name: "New Agent" }, position);
        break;
      case "tool":
        store.addToolNode({ name: "New Tool", description: "Tool description" }, position);
        break;
      case "condition":
        store.addConditionNode("state.get('status') == 'approved'", position);
        break;
      case "human":
        store.addHumanInputNode("Please review the output.", position);
        break;
      case "loop": {
        const nodeId = `node_${crypto.randomUUID().slice(0, 8)}`;
        const irDoc = store.irDocument!;
        store.setIRDocument({
          ...irDoc,
          workflow: {
            ...irDoc.workflow,
            nodes: [
              ...irDoc.workflow.nodes,
              {
                id: nodeId,
                name: "Loop",
                type: "loop",
                config: { loop: { max_iterations: 10, exit_condition: "" } },
                position,
              },
            ],
          },
        });
        break;
      }
      case "parallel": {
        const fanOutId = `node_${crypto.randomUUID().slice(0, 8)}`;
        const fanInId = `node_${crypto.randomUUID().slice(0, 8)}`;
        const irDoc = store.irDocument!;
        store.setIRDocument({
          ...irDoc,
          workflow: {
            ...irDoc.workflow,
            nodes: [
              ...irDoc.workflow.nodes,
              {
                id: fanOutId,
                name: "Parallel",
                type: "parallel_fan_out",
                config: { parallel_fan_out: { fan_out_on: "items" } },
                position,
              },
              {
                id: fanInId,
                name: "Join",
                type: "parallel_fan_in",
                config: { parallel_fan_in: { aggregation_strategy: "merge" } },
                position: { x: position.x, y: position.y + 150 },
              },
            ],
          },
        });
        break;
      }
      case "subworkflow": {
        const nodeId = `node_${crypto.randomUUID().slice(0, 8)}`;
        const irDoc = store.irDocument!;
        store.setIRDocument({
          ...irDoc,
          workflow: {
            ...irDoc.workflow,
            nodes: [
              ...irDoc.workflow.nodes,
              {
                id: nodeId,
                name: "Subworkflow",
                type: "subworkflow",
                config: { subworkflow: { subworkflow_ref: "" } },
                position,
              },
            ],
          },
        });
        break;
      }
    }
  };

  return (
    <div className="w-16 bg-[var(--bg-secondary)] border-r border-[var(--border-color)] flex flex-col items-center py-3 gap-1 shrink-0">
      <div className="text-[9px] text-[var(--text-secondary)] uppercase tracking-wider mb-2 font-semibold">
        Nodes
      </div>
      {NODE_ITEMS.map((item) => (
        <div key={item.type} className="relative group">
          <button
            onClick={() => handleAdd(item.type)}
            className="w-12 h-12 rounded-lg border border-[var(--border-color)] hover:border-[var(--accent)] flex flex-col items-center justify-center transition-colors gap-0.5"
          >
            <div
              className={`w-5 h-5 rounded ${item.color} flex items-center justify-center text-[10px] font-bold`}
            >
              {item.icon}
            </div>
            <span className="text-[8px] text-[var(--text-secondary)] leading-tight">
              {item.label}
            </span>
          </button>

          {/* Tooltip on hover */}
          <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2 px-3 py-2 bg-[#222244] border border-[var(--border-color)] rounded-lg shadow-xl opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 whitespace-nowrap">
            <div className="text-xs font-semibold text-white">{item.label} Node</div>
            <div className="text-[10px] text-[var(--text-secondary)] mt-0.5">
              {item.description}
            </div>
            <div className="text-[9px] text-[var(--accent)] mt-1">Click to add</div>
          </div>
        </div>
      ))}

      {/* Divider */}
      <div className="w-8 h-px bg-[var(--border-color)] my-2" />

      {/* Layout actions */}
      <div className="text-[9px] text-[var(--text-secondary)] uppercase tracking-wider mb-1 font-semibold">
        Layout
      </div>

      <div className="relative group">
        <button
          onClick={() => window.dispatchEvent(new CustomEvent("agentforge:auto-layout"))}
          className="w-12 h-12 rounded-lg border border-[var(--border-color)] hover:border-[var(--accent)] flex flex-col items-center justify-center transition-colors gap-0.5"
          title="Auto-organize nodes based on connections"
        >
          <svg className="w-5 h-5 text-[var(--text-secondary)]" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M3 4a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H4a1 1 0 01-1-1V4zm2 1v2h2V5H5zM3 12a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H4a1 1 0 01-1-1v-4zm2 1v2h2v-2H5zM11 4a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1V4zm2 1v2h2V5h-2zM11 12a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4zm2 1v2h2v-2h-2z" clipRule="evenodd" />
          </svg>
          <span className="text-[8px] text-[var(--text-secondary)] leading-tight">
            Auto
          </span>
        </button>
        <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2 px-3 py-2 bg-[#222244] border border-[var(--border-color)] rounded-lg shadow-xl opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 whitespace-nowrap">
          <div className="text-xs font-semibold text-white">Auto Layout</div>
          <div className="text-[10px] text-[var(--text-secondary)] mt-0.5">
            Organize nodes top-to-bottom based on connections
          </div>
        </div>
      </div>

      <div className="relative group">
        <button
          onClick={() => window.dispatchEvent(new CustomEvent("agentforge:fit-view"))}
          className="w-12 h-12 rounded-lg border border-[var(--border-color)] hover:border-[var(--accent)] flex flex-col items-center justify-center transition-colors gap-0.5"
          title="Fit all nodes in view"
        >
          <svg className="w-5 h-5 text-[var(--text-secondary)]" viewBox="0 0 20 20" fill="currentColor">
            <path d="M3 4a1 1 0 011-1h3a1 1 0 010 2H5v2a1 1 0 01-2 0V4zM13 3a1 1 0 011-1h3a1 1 0 011 1v3a1 1 0 01-2 0V5h-2a1 1 0 010-2zM4 13a1 1 0 011-1h0a1 1 0 011 1v2h2a1 1 0 010 2H4a1 1 0 01-1-1v-3zM14 17a1 1 0 01-1-1v0a1 1 0 012 0v0h1a1 1 0 011 1v0a1 1 0 01-1 1h-2z" />
          </svg>
          <span className="text-[8px] text-[var(--text-secondary)] leading-tight">
            Fit
          </span>
        </button>
        <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2 px-3 py-2 bg-[#222244] border border-[var(--border-color)] rounded-lg shadow-xl opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 whitespace-nowrap">
          <div className="text-xs font-semibold text-white">Fit View</div>
          <div className="text-[10px] text-[var(--text-secondary)] mt-0.5">
            Zoom to fit all nodes in the viewport
          </div>
        </div>
      </div>
    </div>
  );
}
