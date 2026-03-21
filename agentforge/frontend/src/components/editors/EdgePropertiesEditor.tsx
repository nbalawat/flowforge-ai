"use client";

import { SelectField, CodeField, TextField, NumberField } from "@/components/ui/FormFields";
import type { WorkflowEdge, EdgeType } from "@/lib/ir/types";

const EDGE_TYPES = [
  { value: "default", label: "Default" },
  { value: "conditional", label: "Conditional" },
  { value: "error", label: "Error" },
  { value: "timeout", label: "Timeout" },
];

interface EdgePropertiesEditorProps {
  edge: WorkflowEdge;
  onUpdate: (updates: Partial<WorkflowEdge>) => void;
}

export function EdgePropertiesEditor({
  edge,
  onUpdate,
}: EdgePropertiesEditorProps) {
  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-[var(--accent)] mb-2">
        Edge Properties
      </h3>
      <SelectField
        label="Type"
        value={edge.type}
        onChange={(v) => onUpdate({ type: v as EdgeType })}
        options={EDGE_TYPES}
      />
      {edge.type === "conditional" && (
        <>
          <CodeField
            label="Condition Expression"
            value={edge.condition?.expression || ""}
            onChange={(v) =>
              onUpdate({
                condition: {
                  expression: v,
                  label: edge.condition?.label || "",
                },
              })
            }
            rows={3}
          />
          <TextField
            label="Condition Label"
            value={edge.condition?.label || ""}
            onChange={(v) =>
              onUpdate({
                condition: {
                  expression: edge.condition?.expression || "",
                  label: v,
                },
              })
            }
          />
        </>
      )}
      <NumberField
        label="Priority"
        value={edge.priority}
        onChange={(v) => onUpdate({ priority: v })}
        min={0}
      />
    </div>
  );
}
