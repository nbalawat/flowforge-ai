"use client";

import { useState } from "react";
import { useCanvasStore } from "@/lib/store/canvasStore";
import { StateSchemaEditor } from "./StateSchemaEditor";
import { PromptPlayground } from "./PromptPlayground";
import { EdgePropertiesEditor } from "@/components/editors/EdgePropertiesEditor";

// ============================================================================
// Model options for dropdown
// ============================================================================

const MODEL_OPTIONS = [
  { group: "Anthropic", models: ["claude-sonnet-4-20250514", "claude-opus-4-20250514", "claude-haiku-3-20250307"] },
  { group: "OpenAI", models: ["gpt-4o", "gpt-4o-mini", "gpt-4-turbo", "o1", "o3-mini"] },
  { group: "Google", models: ["gemini-2.0-flash", "gemini-2.0-pro", "gemini-1.5-pro"] },
  { group: "Meta", models: ["llama-3.1-70b", "llama-3.1-8b"] },
];

// ============================================================================
// Collapsible Section
// ============================================================================

function Section({
  title,
  icon,
  iconBg,
  defaultOpen = true,
  badge,
  children,
}: {
  title: string;
  icon: string;
  iconBg: string;
  defaultOpen?: boolean;
  badge?: string | number;
  children: React.ReactNode;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="border border-[var(--border-color)] rounded-lg overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center gap-2 px-3 py-2 bg-[var(--bg-primary)] hover:bg-[#1a1a3a] transition-colors text-left"
      >
        <div className={`w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold ${iconBg}`}>
          {icon}
        </div>
        <span className="text-xs font-semibold text-white flex-1">{title}</span>
        {badge !== undefined && (
          <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-[var(--accent)]/20 text-[var(--accent)]">
            {badge}
          </span>
        )}
        <svg
          className={`w-3 h-3 text-[var(--text-secondary)] transition-transform ${isOpen ? "rotate-180" : ""}`}
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
        </svg>
      </button>
      {isOpen && <div className="p-3 space-y-2.5">{children}</div>}
    </div>
  );
}

// ============================================================================
// Main Properties Panel
// ============================================================================

export function PropertiesPanel() {
  const {
    irDocument,
    selectedNodeId,
    selectedEdgeId,
    updateAgent,
    updateNode,
    updateEdge,
    addTool,
    updateTool,
  } = useCanvasStore();

  // Edge properties panel
  if (irDocument && !selectedNodeId && selectedEdgeId) {
    const edge = irDocument.workflow.edges.find((e) => e.id === selectedEdgeId);
    if (edge) {
      return (
        <div className="w-80 bg-[var(--bg-secondary)] border-l border-[var(--border-color)] p-4 shrink-0 overflow-y-auto">
          <EdgePropertiesEditor
            edge={edge}
            onUpdate={(updates) => updateEdge(edge.id, updates)}
          />
        </div>
      );
    }
  }

  if (!irDocument || !selectedNodeId) {
    return (
      <div className="w-80 bg-[var(--bg-secondary)] border-l border-[var(--border-color)] shrink-0 overflow-y-auto">
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

  // ======================= AGENT PROPERTIES =======================
  if (node.type === "agent" && node.agent_ref) {
    const agent = irDocument.agents.find((a) => a.id === node.agent_ref);
    if (!agent) return null;

    return (
      <div className="w-80 bg-[var(--bg-secondary)] border-l border-[var(--border-color)] shrink-0 overflow-y-auto">
        {/* Agent header */}
        <div className="p-4 border-b border-[var(--border-color)] bg-[var(--bg-primary)]">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-sm font-bold">
              A
            </div>
            <div className="flex-1 min-w-0">
              <input
                className="w-full bg-transparent text-sm font-semibold text-white focus:outline-none border-b border-transparent focus:border-[var(--accent)] pb-0.5"
                value={agent.name}
                onChange={(e) => updateAgent(agent.id, { name: e.target.value })}
                placeholder="Agent name"
              />
              <p className="text-[10px] text-[var(--text-secondary)] truncate mt-0.5">
                {agent.id}
              </p>
            </div>
          </div>
        </div>

        <div className="p-3 space-y-3 max-h-[calc(100vh-180px)] overflow-y-auto">
          {/* Identity Section */}
          <Section title="Identity" icon="🎭" iconBg="bg-indigo-600" defaultOpen={true}>
            <Field
              label="Role"
              value={agent.role}
              onChange={(v) => updateAgent(agent.id, { role: v })}
              placeholder="e.g. Content Classifier, Data Analyst..."
              multiline
              rows={2}
            />
            <Field
              label="Goal"
              value={agent.goal}
              onChange={(v) => updateAgent(agent.id, { goal: v })}
              placeholder="What should this agent achieve?"
              multiline
              rows={2}
            />
            <Field
              label="Backstory"
              value={agent.backstory}
              onChange={(v) => updateAgent(agent.id, { backstory: v })}
              placeholder="Background context for the agent..."
              multiline
              rows={2}
            />
          </Section>

          {/* Instructions Section */}
          <Section title="Instructions" icon="📝" iconBg="bg-emerald-600" defaultOpen={true}>
            <div>
              <label className="block text-[10px] text-[var(--text-secondary)] mb-1 uppercase font-semibold">
                System Prompt
              </label>
              <textarea
                className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg px-3 py-2 text-xs font-mono text-[var(--text-primary)] focus:border-[var(--accent)] focus:outline-none resize-y leading-relaxed"
                value={agent.instructions || ""}
                onChange={(e) => updateAgent(agent.id, { instructions: e.target.value })}
                rows={8}
                placeholder="You are a helpful agent that..."
              />
              <div className="flex justify-between items-center mt-1">
                <span className="text-[9px] text-[var(--text-secondary)]">
                  {(agent.instructions || "").length} chars
                </span>
                <span className="text-[9px] text-[var(--text-secondary)]">
                  ~{Math.ceil((agent.instructions || "").length / 4)} tokens
                </span>
              </div>
            </div>
          </Section>

          {/* Model Configuration */}
          <Section title="LLM Configuration" icon="🧠" iconBg="bg-purple-600" defaultOpen={false}>
            <div>
              <label className="block text-[10px] text-[var(--text-secondary)] mb-1 uppercase font-semibold">
                Model
              </label>
              <select
                className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded px-2 py-1.5 text-xs text-[var(--text-primary)] focus:border-[var(--accent)] focus:outline-none"
                value={agent.llm_config?.model || irDocument.config.default_llm.model}
                onChange={(e) =>
                  updateAgent(agent.id, {
                    llm_config: {
                      ...irDocument.config.default_llm,
                      ...agent.llm_config,
                      model: e.target.value,
                    },
                  })
                }
              >
                {MODEL_OPTIONS.map((group) => (
                  <optgroup key={group.group} label={group.group}>
                    {group.models.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] text-[var(--text-secondary)] mb-1">Temperature</label>
                <input
                  type="number"
                  className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded px-2 py-1.5 text-xs focus:border-[var(--accent)] focus:outline-none"
                  value={agent.llm_config?.temperature ?? 0.7}
                  min={0}
                  max={2}
                  step={0.1}
                  onChange={(e) =>
                    updateAgent(agent.id, {
                      llm_config: {
                        ...irDocument.config.default_llm,
                        ...agent.llm_config,
                        temperature: parseFloat(e.target.value),
                      },
                    })
                  }
                />
              </div>
              <div>
                <label className="block text-[10px] text-[var(--text-secondary)] mb-1">Max Tokens</label>
                <input
                  type="number"
                  className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded px-2 py-1.5 text-xs focus:border-[var(--accent)] focus:outline-none"
                  value={agent.llm_config?.max_tokens ?? 4096}
                  min={1}
                  max={200000}
                  step={256}
                  onChange={(e) =>
                    updateAgent(agent.id, {
                      llm_config: {
                        ...irDocument.config.default_llm,
                        ...agent.llm_config,
                        max_tokens: parseInt(e.target.value),
                      },
                    })
                  }
                />
              </div>
            </div>
          </Section>

          {/* Tools Section */}
          <Section
            title="Toolbox"
            icon="🔧"
            iconBg="bg-amber-600"
            defaultOpen={true}
            badge={agent.tools.length}
          >
            {agent.tools.length === 0 ? (
              <p className="text-[10px] text-[var(--text-secondary)] italic py-2 text-center">
                No tools assigned. Add tools below.
              </p>
            ) : (
              <div className="space-y-1.5">
                {agent.tools.map((toolId) => {
                  const tool = irDocument.tools.find((t) => t.id === toolId);
                  if (!tool) return null;

                  return (
                    <div
                      key={toolId}
                      className="flex items-center gap-2 px-2 py-1.5 rounded bg-[var(--bg-primary)] border border-[var(--border-color)] group"
                    >
                      <div className="w-4 h-4 rounded bg-purple-600/50 flex items-center justify-center text-[8px] font-bold text-purple-300">
                        T
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="text-xs text-white block truncate">{tool.name}</span>
                        {tool.description && (
                          <span className="text-[9px] text-[var(--text-secondary)] block truncate">
                            {tool.description}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5">
                        {/* Require Approval Toggle */}
                        <label
                          className="relative inline-flex items-center cursor-pointer"
                          title="Require human approval before execution"
                        >
                          <input
                            type="checkbox"
                            className="sr-only peer"
                            checked={tool.require_approval || false}
                            onChange={(e) =>
                              updateTool(tool.id, { require_approval: e.target.checked })
                            }
                          />
                          <div className="w-7 h-4 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:bg-amber-500 after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:rounded-full after:h-3 after:w-3 after:transition-all"></div>
                        </label>
                        <span className="text-[8px] text-[var(--text-secondary)]">
                          {tool.require_approval ? "🔒" : ""}
                        </span>
                        {/* Remove tool */}
                        <button
                          onClick={() => {
                            updateAgent(agent.id, {
                              tools: agent.tools.filter((t) => t !== toolId),
                            });
                          }}
                          className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-300 text-xs transition-opacity"
                          title="Remove tool"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Add tool */}
            <AddToolWidget
              existingToolIds={agent.tools}
              allTools={irDocument.tools}
              onAddExisting={(toolId) => {
                updateAgent(agent.id, {
                  tools: [...agent.tools, toolId],
                });
              }}
              onAddNew={(name, description) => {
                const toolId = `tool_${Date.now()}`;
                addTool({
                  id: toolId,
                  name,
                  description,
                  type: "function",
                  parameters: { type: "object", properties: {}, required: [] },
                  implementation: { type: "inline", code: "" },
                });
                updateAgent(agent.id, {
                  tools: [...agent.tools, toolId],
                });
              }}
            />
          </Section>

          {/* Capabilities */}
          <Section title="Capabilities" icon="⚡" iconBg="bg-sky-600" defaultOpen={false}>
            <div className="space-y-2">
              <ToggleField
                label="Can Delegate to Sub-Agents"
                description="Allow this agent to pass tasks to other agents"
                checked={agent.delegation?.can_delegate || false}
                onChange={(v) =>
                  updateAgent(agent.id, {
                    delegation: { ...agent.delegation, can_delegate: v, delegate_to: agent.delegation?.delegate_to || [], handoff_type: agent.delegation?.handoff_type || "full" },
                  })
                }
              />
              <ToggleField
                label="Long-term Memory"
                description="Persist context across conversations"
                checked={agent.memory_config?.long_term_enabled || false}
                onChange={(v) =>
                  updateAgent(agent.id, {
                    memory_config: { ...agent.memory_config, long_term_enabled: v, short_term: agent.memory_config?.short_term ?? true, long_term_store: agent.memory_config?.long_term_store || "in_memory", entity_memory: agent.memory_config?.entity_memory || false, session_persistence: agent.memory_config?.session_persistence || "in_memory", shared_memory: agent.memory_config?.shared_memory || false },
                  })
                }
              />
              <ToggleField
                label="Code Execution"
                description="Allow running code snippets"
                checked={agent.capabilities?.code_execution || false}
                onChange={(v) =>
                  updateAgent(agent.id, {
                    capabilities: { ...agent.capabilities, code_execution: v, web_browsing: agent.capabilities?.web_browsing || false, file_access: agent.capabilities?.file_access || false, mcp_servers: agent.capabilities?.mcp_servers || [] },
                  })
                }
              />
              <ToggleField
                label="Web Browsing"
                description="Allow web search and browsing"
                checked={agent.capabilities?.web_browsing || false}
                onChange={(v) =>
                  updateAgent(agent.id, {
                    capabilities: { ...agent.capabilities, web_browsing: v, code_execution: agent.capabilities?.code_execution || false, file_access: agent.capabilities?.file_access || false, mcp_servers: agent.capabilities?.mcp_servers || [] },
                  })
                }
              />
              <ToggleField
                label="File Access"
                description="Allow reading/writing files"
                checked={agent.capabilities?.file_access || false}
                onChange={(v) =>
                  updateAgent(agent.id, {
                    capabilities: { ...agent.capabilities, file_access: v, code_execution: agent.capabilities?.code_execution || false, web_browsing: agent.capabilities?.web_browsing || false, mcp_servers: agent.capabilities?.mcp_servers || [] },
                  })
                }
              />
            </div>
          </Section>

          {/* Prompt Playground */}
          <Section title="Test Chat" icon="💬" iconBg="bg-pink-600" defaultOpen={false}>
            <PromptPlayground
              agentName={agent.name}
              systemPrompt={agent.instructions || agent.role || ""}
              onPromptChange={(newPrompt) =>
                updateAgent(agent.id, { instructions: newPrompt })
              }
            />
          </Section>
        </div>
      </div>
    );
  }

  // ======================= CONDITION PROPERTIES =======================
  if (node.type === "condition") {
    return (
      <div className="w-80 bg-[var(--bg-secondary)] border-l border-[var(--border-color)] shrink-0 overflow-y-auto">
        <div className="p-4 border-b border-[var(--border-color)] bg-[var(--bg-primary)]">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-yellow-600 flex items-center justify-center text-sm font-bold">?</div>
            <div>
              <h3 className="text-sm font-semibold text-yellow-400">Condition Node</h3>
              <p className="text-[10px] text-[var(--text-secondary)]">Routes workflow based on conditions</p>
            </div>
          </div>
        </div>
        <div className="p-4 space-y-3">
          <Field
            label="Node Name"
            value={node.name}
            onChange={(v) => updateNode(node.id, { name: v })}
          />
          <div>
            <label className="block text-[10px] text-[var(--text-secondary)] mb-1 uppercase font-semibold">
              Condition Expression
            </label>
            <textarea
              className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg px-3 py-2 text-xs font-mono text-amber-300 focus:border-yellow-400 focus:outline-none resize-y"
              value={node.config.condition?.condition_expression || ""}
              onChange={(v) =>
                updateNode(node.id, {
                  config: { ...node.config, condition: { condition_expression: v.target.value } },
                })
              }
              rows={4}
              placeholder="state.get('score') > 80"
            />
            <p className="text-[9px] text-[var(--text-secondary)] mt-1">
              Python expression. Access state variables with state.get(&apos;key&apos;).
              Returns True → left path, False → right path.
            </p>
          </div>
          <div className="p-2 rounded bg-yellow-900/20 border border-yellow-800/30">
            <p className="text-[10px] text-yellow-300 font-semibold mb-1">Routing</p>
            <div className="flex items-center gap-2 text-[10px]">
              <span className="w-2 h-2 rounded-full bg-green-400"></span>
              <span className="text-green-300">True → Left output</span>
            </div>
            <div className="flex items-center gap-2 text-[10px] mt-0.5">
              <span className="w-2 h-2 rounded-full bg-red-400"></span>
              <span className="text-red-300">False → Right output</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ======================= HUMAN INPUT PROPERTIES =======================
  if (node.type === "human_input") {
    return (
      <div className="w-80 bg-[var(--bg-secondary)] border-l border-[var(--border-color)] shrink-0 overflow-y-auto">
        <div className="p-4 border-b border-[var(--border-color)] bg-[var(--bg-primary)]">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-green-600 flex items-center justify-center text-sm font-bold">H</div>
            <div>
              <h3 className="text-sm font-semibold text-green-400">Human Review</h3>
              <p className="text-[10px] text-[var(--text-secondary)]">Pauses workflow for human input</p>
            </div>
          </div>
        </div>
        <div className="p-4 space-y-3">
          <Field
            label="Node Name"
            value={node.name}
            onChange={(v) => updateNode(node.id, { name: v })}
          />
          <div>
            <label className="block text-[10px] text-[var(--text-secondary)] mb-1 uppercase font-semibold">
              Prompt to Reviewer
            </label>
            <textarea
              className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg px-3 py-2 text-xs text-[var(--text-primary)] focus:border-green-400 focus:outline-none resize-y"
              value={node.config.human_input?.prompt_template || ""}
              onChange={(e) =>
                updateNode(node.id, {
                  config: {
                    ...node.config,
                    human_input: {
                      ...node.config.human_input,
                      prompt_template: e.target.value,
                      input_type: node.config.human_input?.input_type || "approve_reject",
                      timeout_action: node.config.human_input?.timeout_action || "escalate",
                    },
                  },
                })
              }
              rows={4}
              placeholder="Please review the following output..."
            />
          </div>

          <div>
            <label className="block text-[10px] text-[var(--text-secondary)] mb-1 uppercase font-semibold">
              Input Type
            </label>
            <select
              className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded px-2 py-1.5 text-xs text-[var(--text-primary)] focus:border-green-400 focus:outline-none"
              value={node.config.human_input?.input_type || "approve_reject"}
              onChange={(e) =>
                updateNode(node.id, {
                  config: {
                    ...node.config,
                    human_input: {
                      ...node.config.human_input,
                      input_type: e.target.value,
                      prompt_template: node.config.human_input?.prompt_template || "",
                      timeout_action: node.config.human_input?.timeout_action || "escalate",
                    },
                  },
                })
              }
            >
              <option value="approve_reject">Approve / Reject</option>
              <option value="free_text">Free Text Response</option>
              <option value="rating">Rating Scale</option>
              <option value="multiple_choice">Multiple Choice</option>
            </select>
          </div>

          <div>
            <label className="block text-[10px] text-[var(--text-secondary)] mb-1 uppercase font-semibold">
              Timeout Action
            </label>
            <select
              className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded px-2 py-1.5 text-xs text-[var(--text-primary)] focus:border-green-400 focus:outline-none"
              value={node.config.human_input?.timeout_action || "escalate"}
              onChange={(e) =>
                updateNode(node.id, {
                  config: {
                    ...node.config,
                    human_input: {
                      ...node.config.human_input,
                      timeout_action: e.target.value,
                      prompt_template: node.config.human_input?.prompt_template || "",
                      input_type: node.config.human_input?.input_type || "approve_reject",
                    },
                  },
                })
              }
            >
              <option value="escalate">Escalate</option>
              <option value="auto_approve">Auto Approve</option>
              <option value="auto_reject">Auto Reject</option>
              <option value="skip">Skip</option>
            </select>
          </div>

          <div className="p-2 rounded bg-green-900/20 border border-green-800/30">
            <p className="text-[10px] text-green-300">
              💡 The workflow will pause at this node and wait for human input before continuing.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ======================= LOOP PROPERTIES =======================
  if (node.type === "loop") {
    return (
      <div className="w-80 bg-[var(--bg-secondary)] border-l border-[var(--border-color)] shrink-0 overflow-y-auto">
        <div className="p-4 border-b border-[var(--border-color)] bg-[var(--bg-primary)]">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-cyan-600 flex items-center justify-center text-sm font-bold">↻</div>
            <div>
              <h3 className="text-sm font-semibold text-cyan-400">Loop Node</h3>
              <p className="text-[10px] text-[var(--text-secondary)]">Repeats until condition is met</p>
            </div>
          </div>
        </div>
        <div className="p-4 space-y-3">
          <Field
            label="Node Name"
            value={node.name}
            onChange={(v) => updateNode(node.id, { name: v })}
          />
          <div>
            <label className="block text-[10px] text-[var(--text-secondary)] mb-1">Max Iterations</label>
            <input
              type="number"
              className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded px-2 py-1.5 text-xs focus:border-cyan-400 focus:outline-none"
              value={node.config.loop?.max_iterations ?? 5}
              min={1}
              max={100}
              onChange={(e) =>
                updateNode(node.id, {
                  config: {
                    ...node.config,
                    loop: {
                      ...node.config.loop,
                      max_iterations: parseInt(e.target.value),
                      exit_condition: node.config.loop?.exit_condition || "",
                    },
                  },
                })
              }
            />
          </div>
          <Field
            label="Exit Condition"
            value={node.config.loop?.exit_condition || ""}
            onChange={(v) =>
              updateNode(node.id, {
                config: {
                  ...node.config,
                  loop: {
                    ...node.config.loop,
                    max_iterations: node.config.loop?.max_iterations ?? 5,
                    exit_condition: v,
                  },
                },
              })
            }
            multiline
            rows={3}
            placeholder="state.get('is_complete') == True"
          />
        </div>
      </div>
    );
  }

  // ======================= PARALLEL PROPERTIES =======================
  if (node.type === "parallel_fan_out" || node.type === "parallel_fan_in") {
    return (
      <div className="w-80 bg-[var(--bg-secondary)] border-l border-[var(--border-color)] shrink-0 overflow-y-auto">
        <div className="p-4 border-b border-[var(--border-color)] bg-[var(--bg-primary)]">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-teal-600 flex items-center justify-center text-sm font-bold">
              {node.type === "parallel_fan_out" ? "⤵" : "⤴"}
            </div>
            <div>
              <h3 className="text-sm font-semibold text-teal-400">
                {node.type === "parallel_fan_out" ? "Parallel Fan-Out" : "Parallel Fan-In"}
              </h3>
              <p className="text-[10px] text-[var(--text-secondary)]">
                {node.type === "parallel_fan_out" ? "Splits work across parallel branches" : "Merges parallel results"}
              </p>
            </div>
          </div>
        </div>
        <div className="p-4 space-y-3">
          <Field
            label="Node Name"
            value={node.name}
            onChange={(v) => updateNode(node.id, { name: v })}
          />
          {node.type === "parallel_fan_out" && (
            <Field
              label="Fan Out On (state key)"
              value={node.config.parallel_fan_out?.fan_out_on || ""}
              onChange={(v) =>
                updateNode(node.id, {
                  config: {
                    ...node.config,
                    parallel_fan_out: { fan_out_on: v },
                  },
                })
              }
              placeholder="e.g. research_tracks"
            />
          )}
          {node.type === "parallel_fan_in" && (
            <Field
              label="Merge Strategy"
              value={node.config.parallel_fan_in?.merge_strategy || "merge"}
              onChange={(v) =>
                updateNode(node.id, {
                  config: {
                    ...node.config,
                    parallel_fan_in: { merge_strategy: v },
                  },
                })
              }
            />
          )}
        </div>
      </div>
    );
  }

  // ======================= DEFAULT NODE PROPERTIES =======================
  return (
    <div className="w-80 bg-[var(--bg-secondary)] border-l border-[var(--border-color)] shrink-0 overflow-y-auto">
      <div className="p-4 border-b border-[var(--border-color)] bg-[var(--bg-primary)]">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-[#3a3a6a] flex items-center justify-center text-sm font-bold">
            {node.type === "entry" ? "▶" : node.type === "exit" ? "■" : "N"}
          </div>
          <div>
            <h3 className="text-sm font-semibold">{node.name || node.type} Node</h3>
            <p className="text-[10px] text-[var(--text-secondary)]">{node.type}</p>
          </div>
        </div>
      </div>
      <div className="p-4">
        <Field
          label="Name"
          value={node.name}
          onChange={(v) => updateNode(node.id, { name: v })}
        />
      </div>
    </div>
  );
}

// ============================================================================
// Add Tool Widget
// ============================================================================

function AddToolWidget({
  existingToolIds,
  allTools,
  onAddExisting,
  onAddNew,
}: {
  existingToolIds: string[];
  allTools: { id: string; name: string }[];
  onAddExisting: (toolId: string) => void;
  onAddNew: (name: string, description: string) => void;
}) {
  const [mode, setMode] = useState<"idle" | "existing" | "new">("idle");
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");

  const availableTools = allTools.filter((t) => !existingToolIds.includes(t.id));

  if (mode === "idle") {
    return (
      <div className="flex gap-1.5 mt-1">
        {availableTools.length > 0 && (
          <button
            onClick={() => setMode("existing")}
            className="flex-1 py-1 text-[10px] border border-dashed border-[var(--border-color)] rounded hover:border-[var(--accent)] text-[var(--text-secondary)] hover:text-[var(--accent)] transition-colors"
          >
            + Add Existing
          </button>
        )}
        <button
          onClick={() => setMode("new")}
          className="flex-1 py-1 text-[10px] border border-dashed border-[var(--border-color)] rounded hover:border-purple-400 text-[var(--text-secondary)] hover:text-purple-400 transition-colors"
        >
          + Create New
        </button>
      </div>
    );
  }

  if (mode === "existing") {
    return (
      <div className="mt-1 space-y-1">
        {availableTools.map((tool) => (
          <button
            key={tool.id}
            onClick={() => {
              onAddExisting(tool.id);
              setMode("idle");
            }}
            className="w-full text-left px-2 py-1 text-xs rounded bg-[var(--bg-primary)] hover:bg-[#1a1a3a] border border-[var(--border-color)] text-[var(--text-secondary)] hover:text-white"
          >
            {tool.name}
          </button>
        ))}
        <button
          onClick={() => setMode("idle")}
          className="text-[10px] text-[var(--text-secondary)] hover:text-white"
        >
          Cancel
        </button>
      </div>
    );
  }

  // mode === "new"
  return (
    <div className="mt-1 space-y-1.5">
      <input
        className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded px-2 py-1 text-xs focus:border-purple-400 focus:outline-none"
        placeholder="Tool name"
        value={newName}
        onChange={(e) => setNewName(e.target.value)}
        autoFocus
      />
      <input
        className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded px-2 py-1 text-xs focus:border-purple-400 focus:outline-none"
        placeholder="Description"
        value={newDesc}
        onChange={(e) => setNewDesc(e.target.value)}
      />
      <div className="flex gap-1">
        <button
          onClick={() => {
            if (newName.trim()) {
              onAddNew(newName.trim(), newDesc.trim());
              setNewName("");
              setNewDesc("");
              setMode("idle");
            }
          }}
          disabled={!newName.trim()}
          className="flex-1 py-1 text-[10px] bg-purple-600 text-white rounded disabled:opacity-50"
        >
          Create & Add
        </button>
        <button
          onClick={() => setMode("idle")}
          className="px-2 py-1 text-[10px] text-[var(--text-secondary)] hover:text-white"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

// ============================================================================
// Toggle Field
// ============================================================================

function ToggleField({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className="flex items-start gap-2.5">
      <label className="relative inline-flex items-center cursor-pointer mt-0.5">
        <input
          type="checkbox"
          className="sr-only peer"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
        />
        <div className="w-8 h-4.5 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:bg-[var(--accent)] after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:rounded-full after:h-3.5 after:w-3.5 after:transition-all"></div>
      </label>
      <div>
        <div className="text-xs text-white">{label}</div>
        <div className="text-[9px] text-[var(--text-secondary)]">{description}</div>
      </div>
    </div>
  );
}

// ============================================================================
// Shared Field Component
// ============================================================================

function Field({
  label,
  value,
  onChange,
  multiline = false,
  rows = 2,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  multiline?: boolean;
  rows?: number;
  placeholder?: string;
}) {
  const inputClass =
    "w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded px-2 py-1.5 text-xs text-[var(--text-primary)] focus:border-[var(--accent)] focus:outline-none";

  return (
    <div>
      <label className="block text-[10px] text-[var(--text-secondary)] mb-1 uppercase font-semibold">
        {label}
      </label>
      {multiline ? (
        <textarea
          className={inputClass + " resize-y"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={rows}
          placeholder={placeholder}
        />
      ) : (
        <input
          className={inputClass}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
        />
      )}
    </div>
  );
}
