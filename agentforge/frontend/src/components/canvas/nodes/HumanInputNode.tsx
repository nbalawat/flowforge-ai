"use client";

import { memo } from "react";
import { Handle, Position, type NodeProps } from "reactflow";

interface HumanInputNodeData {
  label: string;
  prompt?: string;
}

export const HumanInputNode = memo(({ data, selected }: NodeProps<HumanInputNodeData>) => {
  return (
    <div
      className={`px-4 py-3 rounded-lg border-2 min-w-[160px] shadow-lg ${
        selected
          ? "border-[var(--accent)] bg-[#1e1e3a]"
          : "border-[#3a6a4a] bg-[#141e16]"
      }`}
    >
      <Handle type="target" position={Position.Top} className="!bg-green-400" />

      <div className="flex items-center gap-2 mb-1">
        <div className="w-6 h-6 rounded bg-green-600 flex items-center justify-center text-xs font-bold">
          H
        </div>
        <span className="font-medium text-sm">{data.label}</span>
      </div>

      {data.prompt && (
        <p className="text-xs text-[var(--text-secondary)] truncate mt-1">
          {data.prompt}
        </p>
      )}

      <Handle type="source" position={Position.Bottom} className="!bg-green-400" />
    </div>
  );
});

HumanInputNode.displayName = "HumanInputNode";
