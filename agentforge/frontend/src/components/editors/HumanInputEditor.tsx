"use client";

import { TextAreaField, SelectField, NumberField } from "@/components/ui/FormFields";
import type { WorkflowNode } from "@/lib/ir/types";

const INPUT_TYPES = [
  { value: "approve_reject", label: "Approve / Reject" },
  { value: "free_text", label: "Free Text" },
  { value: "select_option", label: "Select Option" },
  { value: "edit_content", label: "Edit Content" },
];

interface HumanInputEditorProps {
  node: WorkflowNode;
  onUpdate: (updates: Partial<WorkflowNode>) => void;
}

export function HumanInputEditor({ node, onUpdate }: HumanInputEditorProps) {
  const hi = node.config.human_input;

  return (
    <div className="space-y-1">
      <TextAreaField
        label="Prompt"
        value={hi?.prompt_template || ""}
        onChange={(v) =>
          onUpdate({
            config: {
              ...node.config,
              human_input: {
                prompt_template: v,
                input_type: hi?.input_type || "approve_reject",
                timeout_action: hi?.timeout_action || "escalate",
                timeout_seconds: hi?.timeout_seconds,
              },
            },
          })
        }
        rows={4}
      />
      <SelectField
        label="Input Type"
        value={hi?.input_type || "approve_reject"}
        onChange={(v) =>
          onUpdate({
            config: {
              ...node.config,
              human_input: {
                prompt_template: hi?.prompt_template || "",
                input_type: v as NonNullable<typeof hi>["input_type"],
                timeout_action: hi?.timeout_action || "escalate",
                timeout_seconds: hi?.timeout_seconds,
              },
            },
          })
        }
        options={INPUT_TYPES}
      />
      <NumberField
        label="Timeout (seconds)"
        value={hi?.timeout_seconds ?? 300}
        onChange={(v) =>
          onUpdate({
            config: {
              ...node.config,
              human_input: {
                prompt_template: hi?.prompt_template || "",
                input_type: hi?.input_type || "approve_reject",
                timeout_action: hi?.timeout_action || "escalate",
                timeout_seconds: v,
              },
            },
          })
        }
        min={0}
      />
    </div>
  );
}
