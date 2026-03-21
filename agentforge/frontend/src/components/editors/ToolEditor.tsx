"use client";

import {
  TextField,
  TextAreaField,
  SelectField,
  ToggleField,
  NumberField,
  CodeField,
  KeyValueEditor,
} from "@/components/ui/FormFields";
import type { ToolDefinition, ToolParameter, FieldType } from "@/lib/ir/types";

const TOOL_TYPES = [
  { value: "function", label: "Function" },
  { value: "api", label: "API" },
  { value: "mcp_server", label: "MCP Server" },
  { value: "builtin", label: "Built-in" },
];

const PARAM_TYPES: { value: string; label: string }[] = [
  { value: "string", label: "string" },
  { value: "integer", label: "integer" },
  { value: "float", label: "float" },
  { value: "boolean", label: "boolean" },
  { value: "list", label: "list" },
  { value: "dict", label: "dict" },
  { value: "any", label: "any" },
];

const HTTP_METHODS = [
  { value: "GET", label: "GET" },
  { value: "POST", label: "POST" },
  { value: "PUT", label: "PUT" },
  { value: "DELETE", label: "DELETE" },
];

const LANGUAGES = [
  { value: "python", label: "Python" },
  { value: "javascript", label: "JavaScript" },
];

interface ToolEditorProps {
  tool: ToolDefinition;
  onUpdate: (updates: Partial<ToolDefinition>) => void;
}

export function ToolEditor({ tool, onUpdate }: ToolEditorProps) {
  const updateParam = (index: number, updates: Partial<ToolParameter>) => {
    const newParams = [...tool.parameters];
    newParams[index] = { ...newParams[index], ...updates };
    onUpdate({ parameters: newParams });
  };

  const addParam = () => {
    onUpdate({
      parameters: [
        ...tool.parameters,
        { name: "", type: "string" as FieldType, description: "", required: false },
      ],
    });
  };

  const removeParam = (index: number) => {
    onUpdate({ parameters: tool.parameters.filter((_, i) => i !== index) });
  };

  return (
    <div className="space-y-6">
      {/* Identity */}
      <section>
        <h3 className="text-sm font-semibold text-[var(--accent)] mb-3">
          Identity
        </h3>
        <TextField
          label="Name"
          value={tool.name}
          onChange={(v) => onUpdate({ name: v })}
        />
        <TextAreaField
          label="Description"
          value={tool.description}
          onChange={(v) => onUpdate({ description: v })}
          rows={2}
        />
        <SelectField
          label="Type"
          value={tool.type}
          onChange={(v) => onUpdate({ type: v as ToolDefinition["type"] })}
          options={TOOL_TYPES}
        />
      </section>

      {/* Parameters */}
      <section>
        <h3 className="text-sm font-semibold text-[var(--accent)] mb-3">
          Parameters
        </h3>
        <div className="space-y-2">
          {tool.parameters.map((param, i) => (
            <div
              key={i}
              className="grid grid-cols-[1fr_120px_1fr_60px_32px] gap-2 items-end"
            >
              <div>
                {i === 0 && (
                  <span className="text-[10px] text-[var(--text-secondary)]">
                    Name
                  </span>
                )}
                <input
                  className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded px-2 py-1.5 text-sm text-[var(--text-primary)] focus:border-[var(--accent)] focus:outline-none"
                  value={param.name}
                  onChange={(e) => updateParam(i, { name: e.target.value })}
                />
              </div>
              <div>
                {i === 0 && (
                  <span className="text-[10px] text-[var(--text-secondary)]">
                    Type
                  </span>
                )}
                <select
                  className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded px-2 py-1.5 text-sm text-[var(--text-primary)] focus:border-[var(--accent)] focus:outline-none"
                  value={param.type}
                  onChange={(e) =>
                    updateParam(i, { type: e.target.value as FieldType })
                  }
                >
                  {PARAM_TYPES.map((pt) => (
                    <option key={pt.value} value={pt.value}>
                      {pt.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                {i === 0 && (
                  <span className="text-[10px] text-[var(--text-secondary)]">
                    Description
                  </span>
                )}
                <input
                  className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded px-2 py-1.5 text-sm text-[var(--text-primary)] focus:border-[var(--accent)] focus:outline-none"
                  value={param.description}
                  onChange={(e) =>
                    updateParam(i, { description: e.target.value })
                  }
                />
              </div>
              <div className="flex items-center gap-1">
                {i === 0 && (
                  <span className="text-[10px] text-[var(--text-secondary)] block w-full">
                    Req?
                  </span>
                )}
                <input
                  type="checkbox"
                  checked={param.required}
                  onChange={(e) =>
                    updateParam(i, { required: e.target.checked })
                  }
                  className="accent-[var(--accent)]"
                />
              </div>
              <button
                onClick={() => removeParam(i)}
                className="px-2 py-1.5 text-red-400 hover:text-red-300 text-sm"
              >
                x
              </button>
            </div>
          ))}
          <button
            onClick={addParam}
            className="text-xs text-[var(--accent)] hover:underline"
          >
            + Add parameter
          </button>
        </div>
      </section>

      {/* Implementation */}
      <section>
        <h3 className="text-sm font-semibold text-[var(--accent)] mb-3">
          Implementation
        </h3>
        {tool.type === "function" && (
          <>
            <CodeField
              label="Source"
              value={tool.implementation?.source || ""}
              onChange={(v) =>
                onUpdate({
                  implementation: { ...tool.implementation, source: v },
                })
              }
              rows={8}
            />
            <SelectField
              label="Language"
              value={tool.implementation?.language || "python"}
              onChange={(v) =>
                onUpdate({
                  implementation: { ...tool.implementation, language: v },
                })
              }
              options={LANGUAGES}
            />
            <ToggleField
              label="Async"
              value={tool.implementation?.is_async || false}
              onChange={(v) =>
                onUpdate({
                  implementation: { ...tool.implementation, is_async: v },
                })
              }
            />
          </>
        )}
        {tool.type === "api" && (
          <>
            <TextField
              label="Endpoint"
              value={tool.implementation?.endpoint || ""}
              onChange={(v) =>
                onUpdate({
                  implementation: { ...tool.implementation, endpoint: v },
                })
              }
              placeholder="https://api.example.com/v1/..."
            />
            <SelectField
              label="Method"
              value={tool.implementation?.method || "GET"}
              onChange={(v) =>
                onUpdate({
                  implementation: { ...tool.implementation, method: v },
                })
              }
              options={HTTP_METHODS}
            />
            <KeyValueEditor
              label="Headers"
              value={tool.implementation?.headers || {}}
              onChange={(v) =>
                onUpdate({
                  implementation: { ...tool.implementation, headers: v },
                })
              }
            />
          </>
        )}
        {(tool.type === "mcp_server" || tool.type === "builtin") && (
          <p className="text-xs text-[var(--text-secondary)]">
            Configuration for {tool.type} tools is managed externally.
          </p>
        )}
      </section>

      {/* Advanced */}
      <section>
        <h3 className="text-sm font-semibold text-[var(--accent)] mb-3">
          Advanced
        </h3>
        <NumberField
          label="Rate Limit (RPM)"
          value={tool.rate_limit_rpm ?? 0}
          onChange={(v) => onUpdate({ rate_limit_rpm: v })}
          min={0}
        />
        <NumberField
          label="Timeout (seconds)"
          value={tool.timeout_seconds ?? 30}
          onChange={(v) => onUpdate({ timeout_seconds: v })}
          min={0}
        />
      </section>
    </div>
  );
}
