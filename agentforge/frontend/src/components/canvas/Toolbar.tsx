"use client";

import { useCanvasStore } from "@/lib/store/canvasStore";

const TOOL_ITEMS = [
  { type: "agent", label: "Agent", icon: "A", color: "bg-blue-600" },
  { type: "tool", label: "Tool", icon: "T", color: "bg-purple-600" },
  { type: "condition", label: "Condition", icon: "?", color: "bg-yellow-600" },
  { type: "human", label: "Human", icon: "H", color: "bg-green-600" },
] as const;

export function Toolbar() {
  const { addAgentNode, addToolNode, addConditionNode, addHumanInputNode } =
    useCanvasStore();

  const handleAdd = (type: string) => {
    // Place new nodes at a reasonable default position
    const position = { x: 250 + Math.random() * 100, y: 200 + Math.random() * 100 };

    switch (type) {
      case "agent":
        addAgentNode({ name: "New Agent" }, position);
        break;
      case "tool":
        addToolNode({ name: "New Tool", description: "Tool description" }, position);
        break;
      case "condition":
        addConditionNode("state.get('status') == 'approved'", position);
        break;
      case "human":
        addHumanInputNode("Please review the output.", position);
        break;
    }
  };

  return (
    <div className="w-14 bg-[var(--bg-secondary)] border-r border-[var(--border-color)] flex flex-col items-center py-4 gap-3 shrink-0">
      {TOOL_ITEMS.map((item) => (
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

      <div className="flex-1" />

      {/* Framework selector could go here */}
    </div>
  );
}
