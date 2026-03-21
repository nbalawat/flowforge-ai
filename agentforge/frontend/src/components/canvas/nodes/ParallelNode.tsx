"use client";

import { memo } from "react";
import { Handle, Position, type NodeProps } from "reactflow";

interface ParallelNodeData {
  label: string;
  nodeSubtype: "fan_out" | "fan_in";
  fanOutOn?: string;
  strategy?: string;
}

export const ParallelNode = memo(({ data, selected }: NodeProps<ParallelNodeData>) => {
  const isFanOut = data.nodeSubtype === "fan_out";

  return (
    <div
      className={`px-4 py-3 rounded-lg border-2 min-w-[170px] shadow-lg ${
        selected
          ? "border-[var(--accent)] bg-[#1e1e3a]"
          : "border-[#3a5a6a] bg-[#141e22]"
      }`}
    >
      <Handle type="target" position={Position.Top} className="!bg-cyan-400" />

      <div className="flex items-center gap-2 mb-1">
        <div className="w-6 h-6 rounded bg-cyan-600 flex items-center justify-center text-xs font-bold">
          {isFanOut ? "P" : "J"}
        </div>
        <span className="font-medium text-sm">{data.label}</span>
      </div>

      <p className="text-[10px] text-[var(--text-secondary)]">
        {isFanOut
          ? `Fan out on: ${data.fanOutOn || "items"}`
          : `Strategy: ${data.strategy || "merge"}`}
      </p>

      {/* Multiple output handles for fan-out */}
      <Handle type="source" position={Position.Bottom} className="!bg-cyan-400" />
      {isFanOut && (
        <>
          <Handle type="source" position={Position.Bottom} id="branch1" className="!bg-cyan-400 !left-[30%]" />
          <Handle type="source" position={Position.Bottom} id="branch2" className="!bg-cyan-400 !left-[70%]" />
        </>
      )}
    </div>
  );
});

ParallelNode.displayName = "ParallelNode";
