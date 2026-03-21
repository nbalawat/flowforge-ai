"use client";

import { TextField, SelectField } from "@/components/ui/FormFields";
import type { WorkflowNode, FanInStrategy } from "@/lib/ir/types";

const AGGREGATION_STRATEGIES = [
  { value: "merge", label: "Merge" },
  { value: "append", label: "Append" },
  { value: "first", label: "First" },
  { value: "vote", label: "Vote" },
];

interface ParallelEditorProps {
  node: WorkflowNode;
  onUpdate: (updates: Partial<WorkflowNode>) => void;
}

export function ParallelEditor({ node, onUpdate }: ParallelEditorProps) {
  const isFanOut = node.type === "parallel_fan_out";

  return (
    <div className="space-y-1">
      <TextField
        label="Name"
        value={node.name}
        onChange={(v) => onUpdate({ name: v })}
      />
      {isFanOut ? (
        <TextField
          label="Fan Out On"
          value={node.config.parallel_fan_out?.fan_out_on || ""}
          onChange={(v) =>
            onUpdate({
              config: {
                ...node.config,
                parallel_fan_out: { fan_out_on: v },
              },
            })
          }
          placeholder="items"
        />
      ) : (
        <SelectField
          label="Aggregation Strategy"
          value={node.config.parallel_fan_in?.aggregation_strategy || "merge"}
          onChange={(v) =>
            onUpdate({
              config: {
                ...node.config,
                parallel_fan_in: {
                  aggregation_strategy: v as FanInStrategy,
                },
              },
            })
          }
          options={AGGREGATION_STRATEGIES}
        />
      )}
    </div>
  );
}
