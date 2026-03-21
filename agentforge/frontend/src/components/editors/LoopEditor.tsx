"use client";

import { SliderField, CodeField, TextField } from "@/components/ui/FormFields";
import type { WorkflowNode } from "@/lib/ir/types";

interface LoopEditorProps {
  node: WorkflowNode;
  onUpdate: (updates: Partial<WorkflowNode>) => void;
}

export function LoopEditor({ node, onUpdate }: LoopEditorProps) {
  const loop = node.config.loop;

  return (
    <div className="space-y-1">
      <TextField
        label="Name"
        value={node.name}
        onChange={(v) => onUpdate({ name: v })}
      />
      <SliderField
        label="Max Iterations"
        value={loop?.max_iterations ?? 10}
        onChange={(v) =>
          onUpdate({
            config: {
              ...node.config,
              loop: {
                max_iterations: v,
                exit_condition: loop?.exit_condition || "",
              },
            },
          })
        }
        min={1}
        max={100}
        step={1}
      />
      <CodeField
        label="Exit Condition"
        value={loop?.exit_condition || ""}
        onChange={(v) =>
          onUpdate({
            config: {
              ...node.config,
              loop: {
                max_iterations: loop?.max_iterations ?? 10,
                exit_condition: v,
              },
            },
          })
        }
        rows={4}
        placeholder="state.get('done') == True"
      />
    </div>
  );
}
