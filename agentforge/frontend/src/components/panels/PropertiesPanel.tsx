"use client";

import { useCanvasStore } from "@/lib/store/canvasStore";
import { StateSchemaEditor } from "./StateSchemaEditor";

export function PropertiesPanel() {
  const { irDocument, selectedNodeId, selectedEdgeId, updateAgent, updateNode } =
    useCanvasStore();

  if (!irDocument || !selectedNodeId) {
    return (
      <div className="w-72 bg-[var(--bg-secondary)] border-l border-[var(--border-color)] shrink-0 overflow-y-auto">
        <div className="p-4">
          <p className="text-sm text-[var(--text-secondary)]">
            Select a node to view its properties
          </p>
        </div>
        <StateSchemaEditor />
      </div>
    );
  }

  const node = irDocument.workflow.nodes.find((n) => n.id === selectedNodeId);
  if (!node) return null;

  // Agent properties
  if (node.type === "agent" && node.agent_ref) {
    const agent = irDocument.agents.find((a) => a.id === node.agent_ref);
    if (!agent) return null;

    return (
      <div className="w-72 bg-[var(--bg-secondary)] border-l border-[var(--border-color)] p-4 shrink-0 overflow-y-auto">
        <h3 className="text-sm font-semibold mb-4 text-[var(--accent)]">
          Agent Properties
        </h3>

        <div className="space-y-3">
          <Field
            label="Name"
            value={agent.name}
            onChange={(v) => updateAgent(agent.id, { name: v })}
          />
          <Field
            label="Role"
            value={agent.role}
            onChange={(v) => updateAgent(agent.id, { role: v })}
            multiline
          />
          <Field
            label="Goal"
            value={agent.goal}
            onChange={(v) => updateAgent(agent.id, { goal: v })}
            multiline
          />
          <Field
            label="Instructions"
            value={agent.instructions}
            onChange={(v) => updateAgent(agent.id, { instructions: v })}
            multiline
            rows={6}
          />
          <Field
            label="Backstory"
            value={agent.backstory}
            onChange={(v) => updateAgent(agent.id, { backstory: v })}
            multiline
            rows={3}
          />

          {/* LLM Config */}
          <div className="pt-2 border-t border-[var(--border-color)]">
            <h4 className="text-xs font-semibold text-[var(--text-secondary)] mb-2 uppercase">
              LLM Configuration
            </h4>
            <Field
              label="Model"
              value={agent.llm_config?.model || irDocument.config.default_llm.model}
              onChange={(v) =>
                updateAgent(agent.id, {
                  llm_config: { ...irDocument.config.default_llm, ...agent.llm_config, model: v },
                })
              }
            />
          </div>

          {/* Tools */}
          <div className="pt-2 border-t border-[var(--border-color)]">
            <h4 className="text-xs font-semibold text-[var(--text-secondary)] mb-2 uppercase">
              Tools ({agent.tools.length})
            </h4>
            {agent.tools.map((toolId) => {
              const tool = irDocument.tools.find((t) => t.id === toolId);
              return (
                <div key={toolId} className="text-xs text-[var(--text-secondary)] py-1">
                  {tool?.name || toolId}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // Condition properties
  if (node.type === "condition") {
    return (
      <div className="w-72 bg-[var(--bg-secondary)] border-l border-[var(--border-color)] p-4 shrink-0">
        <h3 className="text-sm font-semibold mb-4 text-yellow-400">
          Condition Properties
        </h3>
        <Field
          label="Expression"
          value={node.config.condition?.condition_expression || ""}
          onChange={(v) =>
            updateNode(node.id, {
              config: { ...node.config, condition: { condition_expression: v } },
            })
          }
          multiline
          rows={3}
        />
      </div>
    );
  }

  // Human input properties
  if (node.type === "human_input") {
    return (
      <div className="w-72 bg-[var(--bg-secondary)] border-l border-[var(--border-color)] p-4 shrink-0">
        <h3 className="text-sm font-semibold mb-4 text-green-400">
          Human Review Properties
        </h3>
        <Field
          label="Prompt"
          value={node.config.human_input?.prompt_template || ""}
          onChange={(v) =>
            updateNode(node.id, {
              config: {
                ...node.config,
                human_input: {
                  ...node.config.human_input,
                  prompt_template: v,
                  input_type: node.config.human_input?.input_type || "approve_reject",
                  timeout_action: node.config.human_input?.timeout_action || "escalate",
                },
              },
            })
          }
          multiline
          rows={3}
        />
      </div>
    );
  }

  // Default: show node type
  return (
    <div className="w-72 bg-[var(--bg-secondary)] border-l border-[var(--border-color)] p-4 shrink-0">
      <h3 className="text-sm font-semibold mb-4">
        {node.type} Node
      </h3>
      <Field
        label="Name"
        value={node.name}
        onChange={(v) => updateNode(node.id, { name: v })}
      />
    </div>
  );
}

// ============================================================================
// Shared field component
// ============================================================================

function Field({
  label,
  value,
  onChange,
  multiline = false,
  rows = 2,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  multiline?: boolean;
  rows?: number;
}) {
  const inputClass =
    "w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded px-2 py-1.5 text-sm text-[var(--text-primary)] focus:border-[var(--accent)] focus:outline-none";

  return (
    <div>
      <label className="block text-xs text-[var(--text-secondary)] mb-1">
        {label}
      </label>
      {multiline ? (
        <textarea
          className={inputClass}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={rows}
        />
      ) : (
        <input
          className={inputClass}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
    </div>
  );
}
