"use client";

import { type ReactNode } from "react";

// ============================================================================
// Shared styles
// ============================================================================

const labelClass =
  "block text-xs font-medium text-[var(--text-secondary)] mb-1";
const inputClass =
  "w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded px-3 py-1.5 text-sm text-[var(--text-primary)] focus:border-[var(--accent)] focus:outline-none transition-colors";

function FieldWrapper({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="mb-3">
      <label className={labelClass}>{label}</label>
      {children}
    </div>
  );
}

// ============================================================================
// TextField
// ============================================================================

interface TextFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function TextField({
  label,
  value,
  onChange,
  placeholder,
}: TextFieldProps) {
  return (
    <FieldWrapper label={label}>
      <input
        className={inputClass}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
    </FieldWrapper>
  );
}

// ============================================================================
// TextAreaField
// ============================================================================

interface TextAreaFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  rows?: number;
  placeholder?: string;
}

export function TextAreaField({
  label,
  value,
  onChange,
  rows = 3,
  placeholder,
}: TextAreaFieldProps) {
  return (
    <FieldWrapper label={label}>
      <textarea
        className={inputClass + " resize-y"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={rows}
        placeholder={placeholder}
      />
    </FieldWrapper>
  );
}

// ============================================================================
// SelectField
// ============================================================================

interface SelectFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
}

export function SelectField({
  label,
  value,
  onChange,
  options,
}: SelectFieldProps) {
  return (
    <FieldWrapper label={label}>
      <select
        className={inputClass + " cursor-pointer"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </FieldWrapper>
  );
}

// ============================================================================
// ToggleField
// ============================================================================

interface ToggleFieldProps {
  label: string;
  value: boolean;
  onChange: (value: boolean) => void;
}

export function ToggleField({ label, value, onChange }: ToggleFieldProps) {
  return (
    <div className="flex items-center justify-between mb-3">
      <span className="text-xs font-medium text-[var(--text-secondary)]">
        {label}
      </span>
      <button
        type="button"
        onClick={() => onChange(!value)}
        className={`relative w-10 h-5 rounded-full transition-colors ${
          value ? "bg-[var(--accent)]" : "bg-[var(--border-color)]"
        }`}
      >
        <span
          className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
            value ? "translate-x-5" : "translate-x-0"
          }`}
        />
      </button>
    </div>
  );
}

// ============================================================================
// SliderField
// ============================================================================

interface SliderFieldProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
}

export function SliderField({
  label,
  value,
  onChange,
  min = 0,
  max = 1,
  step = 0.1,
}: SliderFieldProps) {
  return (
    <FieldWrapper label={`${label}: ${value}`}>
      <input
        type="range"
        className="w-full accent-[var(--accent)] cursor-pointer"
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        min={min}
        max={max}
        step={step}
      />
    </FieldWrapper>
  );
}

// ============================================================================
// NumberField
// ============================================================================

interface NumberFieldProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  placeholder?: string;
}

export function NumberField({
  label,
  value,
  onChange,
  min,
  max,
  placeholder,
}: NumberFieldProps) {
  return (
    <FieldWrapper label={label}>
      <input
        type="number"
        className={inputClass}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
        min={min}
        max={max}
        placeholder={placeholder}
      />
    </FieldWrapper>
  );
}

// ============================================================================
// CodeField
// ============================================================================

interface CodeFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  rows?: number;
  placeholder?: string;
}

export function CodeField({
  label,
  value,
  onChange,
  rows = 6,
  placeholder,
}: CodeFieldProps) {
  return (
    <FieldWrapper label={label}>
      <textarea
        className={inputClass + " font-mono text-xs resize-y"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={rows}
        placeholder={placeholder}
      />
    </FieldWrapper>
  );
}

// ============================================================================
// KeyValueEditor
// ============================================================================

interface KeyValueEditorProps {
  label: string;
  value: Record<string, string>;
  onChange: (value: Record<string, string>) => void;
}

export function KeyValueEditor({
  label,
  value,
  onChange,
}: KeyValueEditorProps) {
  const entries = Object.entries(value);

  const updateKey = (oldKey: string, newKey: string) => {
    const newVal = { ...value };
    const v = newVal[oldKey];
    delete newVal[oldKey];
    newVal[newKey] = v;
    onChange(newVal);
  };

  const updateValue = (key: string, val: string) => {
    onChange({ ...value, [key]: val });
  };

  const addRow = () => {
    onChange({ ...value, "": "" });
  };

  const removeRow = (key: string) => {
    const newVal = { ...value };
    delete newVal[key];
    onChange(newVal);
  };

  return (
    <FieldWrapper label={label}>
      <div className="space-y-1">
        {entries.map(([k, v], i) => (
          <div key={i} className="flex gap-1">
            <input
              className={inputClass + " flex-1"}
              value={k}
              onChange={(e) => updateKey(k, e.target.value)}
              placeholder="Key"
            />
            <input
              className={inputClass + " flex-1"}
              value={v}
              onChange={(e) => updateValue(k, e.target.value)}
              placeholder="Value"
            />
            <button
              onClick={() => removeRow(k)}
              className="px-2 text-red-400 hover:text-red-300 text-sm"
            >
              x
            </button>
          </div>
        ))}
        <button
          onClick={addRow}
          className="text-xs text-[var(--accent)] hover:underline"
        >
          + Add row
        </button>
      </div>
    </FieldWrapper>
  );
}

// ============================================================================
// MultiSelectField
// ============================================================================

interface MultiSelectFieldProps {
  label: string;
  options: { value: string; label: string }[];
  selected: string[];
  onChange: (selected: string[]) => void;
}

export function MultiSelectField({
  label,
  options,
  selected,
  onChange,
}: MultiSelectFieldProps) {
  const toggle = (val: string) => {
    if (selected.includes(val)) {
      onChange(selected.filter((s) => s !== val));
    } else {
      onChange([...selected, val]);
    }
  };

  return (
    <FieldWrapper label={label}>
      <div className="max-h-40 overflow-y-auto space-y-1 border border-[var(--border-color)] rounded p-2 bg-[var(--bg-primary)]">
        {options.length === 0 && (
          <span className="text-xs text-[var(--text-secondary)]">
            No items available
          </span>
        )}
        {options.map((opt) => (
          <label
            key={opt.value}
            className="flex items-center gap-2 text-sm text-[var(--text-primary)] cursor-pointer hover:bg-[var(--bg-secondary)] px-1 py-0.5 rounded"
          >
            <input
              type="checkbox"
              checked={selected.includes(opt.value)}
              onChange={() => toggle(opt.value)}
              className="accent-[var(--accent)]"
            />
            {opt.label}
          </label>
        ))}
      </div>
    </FieldWrapper>
  );
}
