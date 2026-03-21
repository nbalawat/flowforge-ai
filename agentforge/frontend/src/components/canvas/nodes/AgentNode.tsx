"use client";

import { memo } from "react";
import { Handle, Position, type NodeProps } from "reactflow";

interface AgentNodeData {
  label: string;
  agentRef?: string;
  role?: string;
  toolCount?: number;
  modelName?: string;
  hasMemory?: boolean;
  canDelegate?: boolean;
  capabilityFlags?: {
    code?: boolean;
    web?: boolean;
    file?: boolean;
  };
}

function truncateModel(model: string): string {
  // e.g. "claude-sonnet-4-20250514" -> "claude-sonnet"
  const parts = model.split("-");
  if (parts.length >= 2) {
    return parts.slice(0, 2).join("-");
  }
  return model.length > 20 ? model.slice(0, 20) : model;
}

export const AgentNode = memo(({ data, selected }: NodeProps<AgentNodeData>) => {
  const caps = data.capabilityFlags;
  const hasCaps = caps && (caps.code || caps.web || caps.file);
  const showIndicators =
    data.modelName ||
    (data.toolCount ?? 0) > 0 ||
    hasCaps ||
    data.hasMemory ||
    data.canDelegate;

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

      {showIndicators && (
        <div className="mt-2 flex flex-wrap items-center gap-1">
          {data.modelName && (
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-blue-900/50 text-blue-300 border border-blue-800/50">
              {truncateModel(data.modelName)}
            </span>
          )}
          {(data.toolCount ?? 0) > 0 && (
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#2a2a4a] text-[var(--text-secondary)]">
              {data.toolCount} tool{data.toolCount !== 1 ? "s" : ""}
            </span>
          )}
          {caps?.code && (
            <span className="text-[9px] px-1 py-0.5 rounded bg-emerald-900/40 text-emerald-300" title="Code Execution">
              {"</>"}
            </span>
          )}
          {caps?.web && (
            <span className="text-[9px] px-1 py-0.5 rounded bg-sky-900/40 text-sky-300" title="Web Browsing">
              www
            </span>
          )}
          {caps?.file && (
            <span className="text-[9px] px-1 py-0.5 rounded bg-amber-900/40 text-amber-300" title="File Access">
              file
            </span>
          )}
          {data.hasMemory && (
            <span className="text-[9px] px-1 py-0.5 rounded bg-purple-900/40 text-purple-300" title="Long-term Memory">
              mem
            </span>
          )}
          {data.canDelegate && (
            <span className="text-[9px] px-1 py-0.5 rounded bg-orange-900/40 text-orange-300" title="Can Delegate">
              del
            </span>
          )}
        </div>
      )}

      <Handle type="source" position={Position.Bottom} className="!bg-[var(--accent)]" />
    </div>
  );
});

AgentNode.displayName = "AgentNode";
