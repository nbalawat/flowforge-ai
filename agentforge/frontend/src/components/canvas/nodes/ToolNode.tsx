"use client";

import { memo } from "react";
import { Handle, Position, type NodeProps } from "reactflow";

interface ToolNodeData {
  label: string;
  toolRef?: string;
  description?: string;
  paramCount?: number;
  toolType?: string;
}

const TYPE_LABELS: Record<string, string> = {
  function: "fn",
  api: "API",
  mcp_server: "MCP",
  builtin: "built-in",
};

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

      {(data.paramCount !== undefined || data.toolType) && (
        <div className="mt-2 flex items-center gap-1">
          {data.toolType && (
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-purple-900/50 text-purple-300 border border-purple-800/50">
              {TYPE_LABELS[data.toolType] || data.toolType}
            </span>
          )}
          {data.paramCount !== undefined && data.paramCount > 0 && (
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#2a2a4a] text-[var(--text-secondary)]">
              {data.paramCount} param{data.paramCount !== 1 ? "s" : ""}
            </span>
          )}
        </div>
      )}

      <Handle type="source" position={Position.Bottom} className="!bg-purple-400" />
    </div>
  );
});

ToolNode.displayName = "ToolNode";
