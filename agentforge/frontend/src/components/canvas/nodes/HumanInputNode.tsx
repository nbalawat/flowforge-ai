"use client";

import { memo } from "react";
import { Handle, Position, type NodeProps } from "reactflow";

interface HumanInputNodeData {
  label: string;
  prompt?: string;
  inputType?: string;
}

const INPUT_TYPE_LABELS: Record<string, string> = {
  approve_reject: "Approve / Reject",
  free_text: "Free Text",
  rating: "Rating",
  multiple_choice: "Multiple Choice",
};

export const HumanInputNode = memo(({ data, selected }: NodeProps<HumanInputNodeData>) => {
  return (
    <div
      className={`rounded-xl border-2 min-w-[180px] max-w-[260px] shadow-lg transition-all ${
        selected
          ? "border-green-400 bg-[#1e1e3a] shadow-green-400/20 shadow-xl"
          : "border-[#3a6a4a] bg-[#141e16] hover:border-green-500"
      }`}
    >
      <Handle type="target" position={Position.Top} className="!bg-green-400 !w-3 !h-3 !-top-1.5" />

      {/* Header */}
      <div className="px-3 py-2 border-b border-green-900/30">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-green-600 flex items-center justify-center text-sm font-bold">
            H
          </div>
          <div className="min-w-0 flex-1">
            <span className="font-semibold text-sm text-green-200">{data.label}</span>
            <p className="text-[10px] text-green-500/70">Human-in-the-Loop</p>
          </div>
        </div>
      </div>

      {/* Prompt preview */}
      {data.prompt && (
        <div className="px-3 py-1.5 border-b border-green-900/20">
          <p className="text-[10px] text-[var(--text-secondary)] line-clamp-2">
            {data.prompt}
          </p>
        </div>
      )}

      {/* Input type badge */}
      <div className="px-3 py-1.5">
        <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-green-900/40 text-green-300 border border-green-800/40">
          {INPUT_TYPE_LABELS[data.inputType || "approve_reject"] || data.inputType}
        </span>
        <span className="text-[9px] ml-1 text-green-400">⏸ Pauses workflow</span>
      </div>

      <Handle type="source" position={Position.Bottom} className="!bg-green-400 !w-3 !h-3 !-bottom-1.5" />
    </div>
  );
});

HumanInputNode.displayName = "HumanInputNode";
