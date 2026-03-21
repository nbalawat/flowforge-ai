"use client";

import { memo } from "react";
import { Handle, Position, type NodeProps } from "reactflow";

interface ToolNodeData {
  label: string;
  toolRef?: string;
  description?: string;
}

export const ToolNode = memo(({ data, selected }: NodeProps<ToolNodeData>) => {
  return (
    <div
      className={`px-4 py-3 rounded-lg border-2 min-w-[160px] shadow-lg ${
        selected
          ? "border-[var(--accent)] bg-[#1e1e3a]"
          : "border-[#4a3a6a] bg-[#1e1630]"
      }`}
    >
      <Handle type="target" position={Position.Top} className="!bg-purple-400" />

      <div className="flex items-center gap-2 mb-1">
        <div className="w-6 h-6 rounded bg-purple-600 flex items-center justify-center text-xs font-bold">
          T
        </div>
        <span className="font-medium text-sm truncate">{data.label}</span>
      </div>

      {data.description && (
        <p className="text-xs text-[var(--text-secondary)] truncate mt-1">
          {data.description}
        </p>
      )}

      <Handle type="source" position={Position.Bottom} className="!bg-purple-400" />
    </div>
  );
});

ToolNode.displayName = "ToolNode";
