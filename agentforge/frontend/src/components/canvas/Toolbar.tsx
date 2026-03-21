"use client";

import { useCanvasStore } from "@/lib/store/canvasStore";

const NODE_ITEMS = [
  { type: "agent", label: "Agent", icon: "A", color: "bg-blue-600" },
  { type: "tool", label: "Tool", icon: "T", color: "bg-purple-600" },
  { type: "condition", label: "Condition", icon: "?", color: "bg-yellow-600" },
  { type: "human", label: "Human", icon: "H", color: "bg-green-600" },
  { type: "loop", label: "Loop", icon: "L", color: "bg-pink-600" },
  { type: "parallel", label: "Parallel", icon: "P", color: "bg-cyan-600" },
  { type: "subworkflow", label: "Sub", icon: "S", color: "bg-orange-600" },
] as const;

export function Toolbar() {
  const store = useCanvasStore();

  const handleAdd = (type: string) => {
    const ir = store.irDocument;
    if (!ir) return;

    // Auto-layout: place below existing nodes with some randomness
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
                config: {
                  loop: { max_iterations: 10, exit_condition: "" },
                },
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
    <div className="w-14 bg-[var(--bg-secondary)] border-r border-[var(--border-color)] flex flex-col items-center py-4 gap-2 shrink-0">
      <div className="text-[8px] text-[var(--text-secondary)] uppercase tracking-wider mb-1">
        Nodes
      </div>
      {NODE_ITEMS.map((item) => (
        <button
          key={item.type}
          onClick={() => handleAdd(item.type)}
          className="w-10 h-10 rounded-lg border border-[var(--border-color)] hover:border-[var(--accent)] flex items-center justify-center transition-colors group"
          title={`Add ${item.label} Node`}
        >
          <div
            className={`w-6 h-6 rounded ${item.color} flex items-center justify-center text-xs font-bold group-hover:scale-110 transition-transform`}
          >
            {item.icon}
          </div>
        </button>
      ))}
    </div>
  );
}
