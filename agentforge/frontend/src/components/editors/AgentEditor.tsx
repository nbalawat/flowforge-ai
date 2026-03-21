"use client";

import { useState } from "react";
import { Tabs } from "@/components/ui/Tabs";
import {
  TextField,
  TextAreaField,
  SelectField,
  ToggleField,
  SliderField,
  NumberField,
  CodeField,
  MultiSelectField,
} from "@/components/ui/FormFields";
import { useCanvasStore } from "@/lib/store/canvasStore";
import type { AgentDefinition } from "@/lib/ir/types";

const TABS = [
  { id: "identity", label: "Identity & Prompts" },
  { id: "llm", label: "LLM & Tools" },
  { id: "memory", label: "Memory" },
  { id: "delegation", label: "Delegation" },
  { id: "advanced", label: "Advanced" },
];

const AGENT_TYPES = [
  { value: "llm", label: "LLM" },
  { value: "workflow", label: "Workflow" },
  { value: "human_proxy", label: "Human Proxy" },
  { value: "custom", label: "Custom" },
];

const STORE_OPTIONS = [
  { value: "none", label: "None" },
  { value: "in_memory", label: "In Memory" },
  { value: "file", label: "File" },
  { value: "database", label: "Database" },
  { value: "s3", label: "S3" },
];

const HANDOFF_TYPES = [
  { value: "delegate", label: "Delegate" },
  { value: "transfer", label: "Transfer" },
  { value: "spawn", label: "Spawn" },
  { value: "tool_call", label: "Tool Call" },
];

const PERMISSION_MODES = [
  { value: "default", label: "Default" },
  { value: "acceptEdits", label: "Accept Edits" },
  { value: "bypassPermissions", label: "Bypass Permissions" },
  { value: "dontAsk", label: "Don't Ask" },
];

interface AgentEditorProps {
  agent: AgentDefinition;
  onUpdate: (updates: Partial<AgentDefinition>) => void;
}

export function AgentEditor({ agent, onUpdate }: AgentEditorProps) {
  const [activeTab, setActiveTab] = useState("identity");
  const irDocument = useCanvasStore((s) => s.irDocument);

  const toolOptions = (irDocument?.tools || []).map((t) => ({
    value: t.id,
    label: t.name,
  }));

  const agentOptions = (irDocument?.agents || [])
    .filter((a) => a.id !== agent.id)
    .map((a) => ({ value: a.id, label: a.name }));

  return (
    <Tabs tabs={TABS} activeTab={activeTab} onTabChange={setActiveTab}>
      {/* Tab 1: Identity & Prompts */}
      {activeTab === "identity" && (
        <div className="space-y-1">
          <TextField
            label="Name"
            value={agent.name}
            onChange={(v) => onUpdate({ name: v })}
          />
          <SelectField
            label="Type"
            value={agent.type}
            onChange={(v) => onUpdate({ type: v as AgentDefinition["type"] })}
            options={AGENT_TYPES}
          />
          <TextAreaField
            label="Role"
            value={agent.role}
            onChange={(v) => onUpdate({ role: v })}
            rows={3}
          />
          <TextAreaField
            label="Goal"
            value={agent.goal}
            onChange={(v) => onUpdate({ goal: v })}
            rows={3}
          />
          <CodeField
            label="Instructions (System Prompt)"
            value={agent.instructions}
            onChange={(v) => onUpdate({ instructions: v })}
            rows={10}
          />
          <TextAreaField
            label="Backstory"
            value={agent.backstory}
            onChange={(v) => onUpdate({ backstory: v })}
            rows={3}
          />
          <TextAreaField
            label="Description"
            value={agent.description}
            onChange={(v) => onUpdate({ description: v })}
            rows={2}
          />
        </div>
      )}

      {/* Tab 2: LLM & Tools */}
      {activeTab === "llm" && (
        <div className="space-y-1">
          <TextField
            label="Model"
            value={
              agent.llm_config?.model ||
              irDocument?.config.default_llm.model ||
              ""
            }
            onChange={(v) =>
              onUpdate({
                llm_config: {
                  ...irDocument!.config.default_llm,
                  ...agent.llm_config,
                  model: v,
                },
              })
            }
            placeholder="claude-sonnet-4-20250514"
          />
          <SliderField
            label="Temperature"
            value={
              agent.llm_config?.temperature ??
              irDocument?.config.default_llm.temperature ??
              0.7
            }
            onChange={(v) =>
              onUpdate({
                llm_config: {
                  ...irDocument!.config.default_llm,
                  ...agent.llm_config,
                  temperature: v,
                },
              })
            }
            min={0}
            max={2}
            step={0.1}
          />
          <NumberField
            label="Max Tokens"
            value={
              agent.llm_config?.max_tokens ??
              irDocument?.config.default_llm.max_tokens ??
              4096
            }
            onChange={(v) =>
              onUpdate({
                llm_config: {
                  ...irDocument!.config.default_llm,
                  ...agent.llm_config,
                  max_tokens: v,
                },
              })
            }
          />
          <MultiSelectField
            label="Tools"
            options={toolOptions}
            selected={agent.tools}
            onChange={(v) => onUpdate({ tools: v })}
          />
        </div>
      )}

      {/* Tab 3: Memory */}
      {activeTab === "memory" && (
        <div className="space-y-1">
          <ToggleField
            label="Short-term Memory"
            value={agent.memory_config.short_term}
            onChange={(v) =>
              onUpdate({
                memory_config: { ...agent.memory_config, short_term: v },
              })
            }
          />
          <ToggleField
            label="Long-term Memory"
            value={agent.memory_config.long_term_enabled}
            onChange={(v) =>
              onUpdate({
                memory_config: {
                  ...agent.memory_config,
                  long_term_enabled: v,
                },
              })
            }
          />
          <SelectField
            label="Long-term Store"
            value={agent.memory_config.long_term_store}
            onChange={(v) =>
              onUpdate({
                memory_config: {
                  ...agent.memory_config,
                  long_term_store: v as AgentDefinition["memory_config"]["long_term_store"],
                },
              })
            }
            options={STORE_OPTIONS}
          />
          <ToggleField
            label="Entity Memory"
            value={agent.memory_config.entity_memory}
            onChange={(v) =>
              onUpdate({
                memory_config: { ...agent.memory_config, entity_memory: v },
              })
            }
          />
          <SelectField
            label="Session Persistence"
            value={agent.memory_config.session_persistence}
            onChange={(v) =>
              onUpdate({
                memory_config: {
                  ...agent.memory_config,
                  session_persistence: v as AgentDefinition["memory_config"]["session_persistence"],
                },
              })
            }
            options={STORE_OPTIONS}
          />
          <ToggleField
            label="Shared Memory"
            value={agent.memory_config.shared_memory}
            onChange={(v) =>
              onUpdate({
                memory_config: { ...agent.memory_config, shared_memory: v },
              })
            }
          />
        </div>
      )}

      {/* Tab 4: Delegation */}
      {activeTab === "delegation" && (
        <div className="space-y-1">
          <ToggleField
            label="Can Delegate"
            value={agent.delegation.can_delegate}
            onChange={(v) =>
              onUpdate({
                delegation: { ...agent.delegation, can_delegate: v },
              })
            }
          />
          <MultiSelectField
            label="Delegate To"
            options={agentOptions}
            selected={agent.delegation.delegate_to}
            onChange={(v) =>
              onUpdate({
                delegation: { ...agent.delegation, delegate_to: v },
              })
            }
          />
          <SelectField
            label="Handoff Type"
            value={agent.delegation.handoff_type}
            onChange={(v) =>
              onUpdate({
                delegation: {
                  ...agent.delegation,
                  handoff_type: v as AgentDefinition["delegation"]["handoff_type"],
                },
              })
            }
            options={HANDOFF_TYPES}
          />
        </div>
      )}

      {/* Tab 5: Advanced */}
      {activeTab === "advanced" && (
        <div className="space-y-1">
          <ToggleField
            label="Code Execution"
            value={agent.capabilities.code_execution}
            onChange={(v) =>
              onUpdate({
                capabilities: { ...agent.capabilities, code_execution: v },
              })
            }
          />
          <ToggleField
            label="Web Browsing"
            value={agent.capabilities.web_browsing}
            onChange={(v) =>
              onUpdate({
                capabilities: { ...agent.capabilities, web_browsing: v },
              })
            }
          />
          <ToggleField
            label="File Access"
            value={agent.capabilities.file_access}
            onChange={(v) =>
              onUpdate({
                capabilities: { ...agent.capabilities, file_access: v },
              })
            }
          />
          <NumberField
            label="Max Iterations"
            value={agent.max_iterations ?? 25}
            onChange={(v) => onUpdate({ max_iterations: v })}
          />
          <NumberField
            label="Max Budget (USD)"
            value={agent.max_budget_usd ?? 0}
            onChange={(v) => onUpdate({ max_budget_usd: v })}
            min={0}
          />
          <SelectField
            label="Permission Mode"
            value={agent.permission_mode ?? "default"}
            onChange={(v) =>
              onUpdate({
                permission_mode: v as AgentDefinition["permission_mode"],
              })
            }
            options={PERMISSION_MODES}
          />
        </div>
      )}
    </Tabs>
  );
}
