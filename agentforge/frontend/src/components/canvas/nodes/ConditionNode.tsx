"use client";

import { memo } from "react";
import { Handle, Position, type NodeProps } from "reactflow";

interface ConditionNodeData {
  label: string;
  expression?: string;
}

export const ConditionNode = memo(({ data, selected }: NodeProps<ConditionNodeData>) => {
  return (
    <div
      className={`px-4 py-3 rounded-lg border-2 min-w-[160px] shadow-lg ${
        selected
          ? "border-[var(--accent)] bg-[#1e1e3a]"
          : "border-[#6a5a3a] bg-[#1e1a14]"
      }`}
      style={{ transform: "rotate(0deg)" }} // Diamond shape could be achieved with CSS
    >
      <Handle type="target" position={Position.Top} className="!bg-yellow-400" />

      <div className="flex items-center gap-2 mb-1">
        <div className="w-6 h-6 rounded bg-yellow-600 flex items-center justify-center text-xs font-bold">
          ?
        </div>
        <span className="font-medium text-sm">{data.label}</span>
      </div>

      {data.expression && (
        <p className="text-xs text-[var(--text-secondary)] font-mono truncate mt-1">
          {data.expression}
        </p>
      )}

      <Handle type="source" position={Position.Bottom} id="true" className="!bg-green-400 !left-[30%]" />
      <Handle type="source" position={Position.Bottom} id="false" className="!bg-red-400 !left-[70%]" />
    </div>
  );
});

ConditionNode.displayName = "ConditionNode";
