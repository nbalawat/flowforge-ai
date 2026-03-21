"use client";

import { memo } from "react";
import { Handle, Position, type NodeProps } from "reactflow";

interface AgentNodeData {
  label: string;
  agentRef?: string;
  role?: string;
  toolCount?: number;
}

export const AgentNode = memo(({ data, selected }: NodeProps<AgentNodeData>) => {
  return (
    <div
      className={`px-4 py-3 rounded-lg border-2 min-w-[180px] shadow-lg ${
        selected
          ? "border-[var(--accent)] bg-[#1e1e3a]"
          : "border-[#3a3a6a] bg-[var(--bg-surface)]"
      }`}
    >
      <Handle type="target" position={Position.Top} className="!bg-[var(--accent)]" />

      <div className="flex items-center gap-2 mb-1">
        <div className="w-6 h-6 rounded bg-blue-600 flex items-center justify-center text-xs font-bold">
          A
        </div>
        <span className="font-medium text-sm truncate">{data.label}</span>
      </div>

      {data.role && (
        <p className="text-xs text-[var(--text-secondary)] truncate mt-1">
          {data.role}
        </p>
      )}

      {(data.toolCount ?? 0) > 0 && (
        <div className="mt-2 flex items-center gap-1">
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#2a2a4a] text-[var(--text-secondary)]">
            {data.toolCount} tool{data.toolCount !== 1 ? "s" : ""}
          </span>
        </div>
      )}

      <Handle type="source" position={Position.Bottom} className="!bg-[var(--accent)]" />
    </div>
  );
});

AgentNode.displayName = "AgentNode";
