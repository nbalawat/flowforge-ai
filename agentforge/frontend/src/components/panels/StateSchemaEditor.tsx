"use client";

import { useState } from "react";
import { useCanvasStore } from "@/lib/store/canvasStore";
import type { StateField, FieldType, ReducerType } from "@/lib/ir/types";

const FIELD_TYPES: FieldType[] = ["string", "integer", "float", "boolean", "list", "dict", "any"];
const REDUCER_TYPES: ReducerType[] = ["replace", "append", "merge"];

export function StateSchemaEditor() {
  const { irDocument, setIRDocument } = useCanvasStore();
  const [isAdding, setIsAdding] = useState(false);
  const [newField, setNewField] = useState<Partial<StateField>>({
    name: "",
    type: "string",
    description: "",
    reducer: "replace",
  });

  if (!irDocument) return null;

  const fields = irDocument.workflow.state_schema.fields;

  const addField = () => {
    if (!newField.name) return;

    const field: StateField = {
      name: newField.name!,
      type: (newField.type as FieldType) || "string",
      description: newField.description || "",
      reducer: (newField.reducer as ReducerType) || "replace",
    };

    setIRDocument({
      ...irDocument,
      workflow: {
        ...irDocument.workflow,
        state_schema: {
          ...irDocument.workflow.state_schema,
          fields: [...fields, field],
        },
      },
    });

    setNewField({ name: "", type: "string", description: "", reducer: "replace" });
    setIsAdding(false);
  };

  const removeField = (fieldName: string) => {
    setIRDocument({
      ...irDocument,
      workflow: {
        ...irDocument.workflow,
        state_schema: {
          ...irDocument.workflow.state_schema,
          fields: fields.filter((f) => f.name !== fieldName),
        },
      },
    });
  };

  return (
    <div className="p-3 border-t border-[var(--border-color)]">
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-xs font-semibold text-[var(--text-secondary)] uppercase">
          State Schema ({fields.length})
        </h4>
        <button
          onClick={() => setIsAdding(!isAdding)}
          className="text-[10px] px-2 py-0.5 rounded border border-[var(--border-color)] hover:border-[var(--accent)] text-[var(--text-secondary)]"
        >
          {isAdding ? "Cancel" : "+ Add"}
        </button>
      </div>

      {/* Existing fields */}
      <div className="space-y-1">
        {fields.map((field) => (
          <div
            key={field.name}
            className="flex items-center justify-between bg-[var(--bg-primary)] rounded px-2 py-1"
          >
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-[var(--accent)]">{field.name}</span>
              <span className="text-[10px] text-[var(--text-secondary)]">{field.type}</span>
              {field.reducer !== "replace" && (
                <span className="text-[10px] px-1 rounded bg-[#2a2a4a] text-blue-400">
                  {field.reducer}
                </span>
              )}
            </div>
            <button
              onClick={() => removeField(field.name)}
              className="text-[10px] text-red-400 hover:text-red-300"
            >
              x
            </button>
          </div>
        ))}
      </div>

      {/* Add field form */}
      {isAdding && (
        <div className="mt-2 space-y-2 bg-[var(--bg-primary)] rounded p-2">
          <input
            className="w-full bg-transparent border border-[var(--border-color)] rounded px-2 py-1 text-xs focus:border-[var(--accent)] focus:outline-none"
            placeholder="Field name"
            value={newField.name}
            onChange={(e) => setNewField({ ...newField, name: e.target.value })}
          />
          <div className="flex gap-2">
            <select
              className="flex-1 bg-transparent border border-[var(--border-color)] rounded px-2 py-1 text-xs"
              value={newField.type}
              onChange={(e) => setNewField({ ...newField, type: e.target.value as FieldType })}
            >
              {FIELD_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
            <select
              className="flex-1 bg-transparent border border-[var(--border-color)] rounded px-2 py-1 text-xs"
              value={newField.reducer}
              onChange={(e) => setNewField({ ...newField, reducer: e.target.value as ReducerType })}
            >
              {REDUCER_TYPES.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>
          <input
            className="w-full bg-transparent border border-[var(--border-color)] rounded px-2 py-1 text-xs focus:border-[var(--accent)] focus:outline-none"
            placeholder="Description (optional)"
            value={newField.description}
            onChange={(e) => setNewField({ ...newField, description: e.target.value })}
          />
          <button
            onClick={addField}
            disabled={!newField.name}
            className="w-full py-1 bg-[var(--accent)] text-white rounded text-xs disabled:opacity-50"
          >
            Add Field
          </button>
        </div>
      )}
    </div>
  );
}
