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

    const maxY = Math.max(
      ...ir.workflow.nodes.map((n) => n.position.y),
      50
    );
    const position = {
      x: 200 + Math.random() * 150,
      y: maxY + 100 + Math.random() * 40,
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
    </div>
  );
}
