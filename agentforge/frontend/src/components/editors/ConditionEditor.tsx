"use client";

import { TextField, CodeField } from "@/components/ui/FormFields";
import type { WorkflowNode } from "@/lib/ir/types";

interface ConditionEditorProps {
  node: WorkflowNode;
  onUpdate: (updates: Partial<WorkflowNode>) => void;
}

export function ConditionEditor({ node, onUpdate }: ConditionEditorProps) {
  return (
    <div className="space-y-1">
      <TextField
        label="Name"
        value={node.name}
        onChange={(v) => onUpdate({ name: v })}
      />
      <CodeField
        label="Condition Expression"
        value={node.config.condition?.condition_expression || ""}
        onChange={(v) =>
          onUpdate({
            config: {
              ...node.config,
              condition: { condition_expression: v },
            },
          })
        }
        rows={6}
        placeholder="state.get('status') == 'approved'"
      />
    </div>
  );
}
