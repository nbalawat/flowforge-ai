"use client";

import { memo } from "react";
import { Handle, Position, type NodeProps } from "reactflow";

interface SubworkflowNodeData {
  label: string;
  subworkflowRef?: string;
}

export const SubworkflowNode = memo(({ data, selected }: NodeProps<SubworkflowNodeData>) => {
  return (
    <div
      className={`px-4 py-3 rounded-lg border-2 border-dashed min-w-[170px] shadow-lg ${
        selected
          ? "border-[var(--accent)] bg-[#1e1e3a]"
          : "border-[#5a5a3a] bg-[#1e1c14]"
      }`}
    >
      <Handle type="target" position={Position.Top} className="!bg-orange-400" />

      <div className="flex items-center gap-2 mb-1">
        <div className="w-6 h-6 rounded bg-orange-600 flex items-center justify-center text-xs font-bold">
          S
        </div>
        <span className="font-medium text-sm">{data.label}</span>
      </div>

      <p className="text-[10px] text-[var(--text-secondary)]">
        Subworkflow
      </p>

      <Handle type="source" position={Position.Bottom} className="!bg-orange-400" />
    </div>
  );
});

SubworkflowNode.displayName = "SubworkflowNode";
