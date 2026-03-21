"use client";

import { memo } from "react";
import { Handle, Position, type NodeProps } from "reactflow";

interface LoopNodeData {
  label: string;
  maxIterations?: number;
  exitCondition?: string;
}

export const LoopNode = memo(({ data, selected }: NodeProps<LoopNodeData>) => {
  return (
    <div
      className={`px-4 py-3 rounded-lg border-2 min-w-[170px] shadow-lg ${
        selected
          ? "border-[var(--accent)] bg-[#1e1e3a]"
          : "border-[#5a3a6a] bg-[#1e1428]"
      }`}
    >
      <Handle type="target" position={Position.Top} className="!bg-pink-400" />

      <div className="flex items-center gap-2 mb-1">
        <div className="w-6 h-6 rounded bg-pink-600 flex items-center justify-center text-xs font-bold">
          L
        </div>
        <span className="font-medium text-sm">{data.label}</span>
      </div>

      {data.maxIterations && (
        <p className="text-[10px] text-[var(--text-secondary)]">
          Max: {data.maxIterations} iterations
        </p>
      )}
      {data.exitCondition && (
        <p className="text-[10px] text-[var(--text-secondary)] font-mono truncate">
          Exit: {data.exitCondition}
        </p>
      )}

      {/* Loop-back handle on left */}
      <Handle type="source" position={Position.Left} id="loop" className="!bg-pink-400" />
      {/* Continue handle on bottom */}
      <Handle type="source" position={Position.Bottom} id="exit" className="!bg-pink-400" />
    </div>
  );
});

LoopNode.displayName = "LoopNode";
