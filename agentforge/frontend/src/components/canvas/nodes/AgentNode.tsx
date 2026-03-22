"use client";

import { memo } from "react";
import { Handle, Position, type NodeProps } from "reactflow";

interface AgentNodeData {
  label: string;
  agentRef?: string;
  role?: string;
  instructions?: string;
  toolCount?: number;
  toolNames?: string[];
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
  const parts = model.split("-");
  if (parts.length >= 2) {
    return parts.slice(0, 2).join("-");
  }
  return model.length > 20 ? model.slice(0, 20) : model;
}

export const AgentNode = memo(({ data, selected }: NodeProps<AgentNodeData>) => {
  const caps = data.capabilityFlags;
  const hasCaps = caps && (caps.code || caps.web || caps.file);
  const instructionPreview = data.instructions
    ? data.instructions.slice(0, 80) + (data.instructions.length > 80 ? "..." : "")
    : null;

  return (
    <div
      className={`rounded-xl border-2 min-w-[200px] max-w-[280px] shadow-lg transition-all ${
        selected
          ? "border-[var(--accent)] bg-[#1e1e3a] shadow-[var(--accent)]/20 shadow-xl"
          : "border-[#3a3a6a] bg-[var(--bg-surface)] hover:border-[#5a5a8a]"
      }`}
    >
      <Handle type="target" position={Position.Top} className="!bg-[var(--accent)] !w-3 !h-3 !-top-1.5" />

      {/* Header */}
      <div className="px-3 py-2 border-b border-[#3a3a6a]/50">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center text-xs font-bold shrink-0">
            A
          </div>
          <div className="min-w-0 flex-1">
            <span className="font-semibold text-sm truncate block">{data.label}</span>
            {data.role && (
              <p className="text-[10px] text-[var(--text-secondary)] truncate">
                {data.role}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Body — instruction preview */}
      {instructionPreview && (
        <div className="px-3 py-1.5 border-b border-[#3a3a6a]/30">
          <p className="text-[10px] text-[var(--text-secondary)] leading-relaxed line-clamp-2">
            {instructionPreview}
          </p>
        </div>
      )}

      {/* Footer — badges */}
      <div className="px-3 py-1.5 flex flex-wrap items-center gap-1">
        {data.modelName && (
          <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-blue-900/50 text-blue-300 border border-blue-800/50">
            {truncateModel(data.modelName)}
          </span>
        )}
        {(data.toolCount ?? 0) > 0 && (
          <span
            className="text-[9px] px-1.5 py-0.5 rounded-md bg-purple-900/50 text-purple-300 border border-purple-800/50"
            title={data.toolNames?.join(", ") || ""}
          >
            🔧 {data.toolCount}
          </span>
        )}
        {caps?.code && (
          <span className="text-[9px] px-1 py-0.5 rounded-md bg-emerald-900/40 text-emerald-300" title="Code Execution">
            {"</>"}
          </span>
        )}
        {caps?.web && (
          <span className="text-[9px] px-1 py-0.5 rounded-md bg-sky-900/40 text-sky-300" title="Web Browsing">
            🌐
          </span>
        )}
        {caps?.file && (
          <span className="text-[9px] px-1 py-0.5 rounded-md bg-amber-900/40 text-amber-300" title="File Access">
            📁
          </span>
        )}
        {data.hasMemory && (
          <span className="text-[9px] px-1 py-0.5 rounded-md bg-purple-900/40 text-purple-300" title="Long-term Memory">
            🧠
          </span>
        )}
        {data.canDelegate && (
          <span className="text-[9px] px-1 py-0.5 rounded-md bg-orange-900/40 text-orange-300" title="Can Delegate">
            👥
          </span>
        )}
      </div>

      <Handle type="source" position={Position.Bottom} className="!bg-[var(--accent)] !w-3 !h-3 !-bottom-1.5" />
    </div>
  );
});

AgentNode.displayName = "AgentNode";
