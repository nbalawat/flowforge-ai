"use client";

import { memo } from "react";
import { Handle, Position, type NodeProps } from "reactflow";

interface EntryExitNodeData {
  label: string;
  nodeType: "entry" | "exit";
}

export const EntryExitNode = memo(({ data, selected }: NodeProps<EntryExitNodeData>) => {
  const isEntry = data.nodeType === "entry";

  return (
    <div
      className={`px-6 py-2 rounded-full border-2 shadow-lg text-center ${
        selected
          ? "border-[var(--accent)]"
          : isEntry
          ? "border-emerald-500"
          : "border-rose-500"
      } ${isEntry ? "bg-emerald-900/30" : "bg-rose-900/30"}`}
    >
      {!isEntry && (
        <Handle type="target" position={Position.Top} className={isEntry ? "!bg-emerald-400" : "!bg-rose-400"} />
      )}

      <span className="font-medium text-sm">{data.label}</span>

      {isEntry && (
        <Handle type="source" position={Position.Bottom} className="!bg-emerald-400" />
      )}
    </div>
  );
});

EntryExitNode.displayName = "EntryExitNode";
