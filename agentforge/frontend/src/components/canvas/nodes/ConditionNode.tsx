"use client";

import { memo } from "react";
import { Handle, Position, type NodeProps } from "reactflow";

interface ConditionNodeData {
  label: string;
  expression?: string;
}

export const ConditionNode = memo(({ data, selected }: NodeProps<ConditionNodeData>) => {
  return (
    <div
      className={`rounded-xl border-2 min-w-[180px] max-w-[260px] shadow-lg transition-all ${
        selected
          ? "border-yellow-400 bg-[#1e1e3a] shadow-yellow-400/20 shadow-xl"
          : "border-[#6a5a3a] bg-[#1e1a14] hover:border-yellow-600"
      }`}
    >
      <Handle type="target" position={Position.Top} className="!bg-yellow-400 !w-3 !h-3 !-top-1.5" />

      {/* Header */}
      <div className="px-3 py-2 border-b border-yellow-900/30">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-yellow-600 flex items-center justify-center text-sm font-bold">
            ?
          </div>
          <div className="min-w-0 flex-1">
            <span className="font-semibold text-sm text-yellow-200">{data.label}</span>
            <p className="text-[10px] text-yellow-500/70">Conditional Branch</p>
          </div>
        </div>
      </div>

      {/* Expression preview */}
      {data.expression && (
        <div className="px-3 py-1.5 border-b border-yellow-900/20">
          <code className="text-[10px] text-amber-300 font-mono block truncate">
            {data.expression}
          </code>
        </div>
      )}

      {/* Output labels */}
      <div className="px-3 py-1.5 flex justify-between">
        <span className="text-[9px] text-green-400 font-semibold">✓ True</span>
        <span className="text-[9px] text-red-400 font-semibold">✗ False</span>
      </div>

      <Handle type="source" position={Position.Bottom} id="true" className="!bg-green-400 !w-3 !h-3 !-bottom-1.5 !left-[30%]" />
      <Handle type="source" position={Position.Bottom} id="false" className="!bg-red-400 !w-3 !h-3 !-bottom-1.5 !left-[70%]" />
    </div>
  );
});

ConditionNode.displayName = "ConditionNode";
