"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useCanvasStore } from "@/lib/store/canvasStore";
import {
  workflowTemplates,
  type TemplateMeta,
  type Difficulty,
} from "@/lib/templates/workflowTemplates";

// ============================================================================
// Sub-components
// ============================================================================

const difficultyColors: Record<Difficulty, { bg: string; text: string; border: string }> = {
  Beginner: { bg: "bg-emerald-500/15", text: "text-emerald-400", border: "border-emerald-500/30" },
  Intermediate: { bg: "bg-blue-500/15", text: "text-blue-400", border: "border-blue-500/30" },
  Advanced: { bg: "bg-amber-500/15", text: "text-amber-400", border: "border-amber-500/30" },
  Expert: { bg: "bg-red-500/15", text: "text-red-400", border: "border-red-500/30" },
};

const featureColors: Record<string, string> = {
  HITL: "text-green-400 bg-green-500/10 border-green-500/30",
  Conditions: "text-amber-400 bg-amber-500/10 border-amber-500/30",
  Loops: "text-pink-400 bg-pink-500/10 border-pink-500/30",
  Parallel: "text-cyan-400 bg-cyan-500/10 border-cyan-500/30",
  Tools: "text-purple-400 bg-purple-500/10 border-purple-500/30",
};

function DifficultyBadge({ difficulty }: { difficulty: Difficulty }) {
  const c = difficultyColors[difficulty];
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${c.bg} ${c.text} ${c.border}`}>
      {difficulty}
    </span>
  );
}

function FeatureBadge({ label }: { label: string }) {
  const cls = featureColors[label] || "text-gray-400 bg-gray-500/10 border-gray-500/30";
  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-medium border ${cls}`}>
      {label}
    </span>
  );
}

function StatBadge({ label, value }: { label: string; value: number }) {
  if (value === 0) return null;
  return (
    <span className="inline-flex items-center gap-1 text-[10px] text-[var(--text-secondary)]">
      <span className="font-semibold text-[var(--text-primary)]">{value}</span>
      {label}
    </span>
  );
}

// ============================================================================
// Template Card
// ============================================================================

function TemplateCard({
  template,
  onUse,
  isSelected,
  onSelect,
}: {
  template: TemplateMeta;
  onUse: () => void;
  isSelected: boolean;
  onSelect: () => void;
}) {
  return (
    <div
      onClick={onSelect}
      className={`relative group rounded-xl border p-4 cursor-pointer transition-all duration-200 ${
        isSelected
          ? "border-[var(--accent)] bg-[var(--accent)]/5 shadow-lg shadow-[var(--accent)]/10"
          : "border-[var(--border-color)] bg-[var(--bg-secondary)] hover:border-[var(--accent)]/50 hover:bg-[var(--bg-secondary)]/80"
      }`}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <h3 className="text-sm font-semibold text-[var(--text-primary)] leading-tight">
          {template.name}
        </h3>
        <DifficultyBadge difficulty={template.difficulty} />
      </div>

      {/* Description */}
      <p className="text-xs text-[var(--text-secondary)] leading-relaxed mb-3 line-clamp-2">
        {template.description}
      </p>

      {/* Stats row */}
      <div className="flex items-center gap-3 mb-3">
        <StatBadge label="agents" value={template.agentCount} />
        <StatBadge label="nodes" value={template.nodeCount} />
        <StatBadge label="tools" value={template.toolCount} />
      </div>

      {/* Features */}
      {template.features.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {template.features.map((f) => (
            <FeatureBadge key={f} label={f} />
          ))}
        </div>
      )}

      {/* Use Template button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onUse();
        }}
        className="w-full mt-1 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 border border-[var(--accent)]/50 text-[var(--accent)] hover:bg-[var(--accent)] hover:text-white hover:border-[var(--accent)]"
      >
        Use Template
      </button>
    </div>
  );
}

// ============================================================================
// Template Preview Panel
// ============================================================================

function TemplatePreview({ template }: { template: TemplateMeta }) {
  // Generate a preview by calling the factory
  const preview = useMemo(() => {
    const ir = template.factory();
    return {
      agents: ir.agents.map((a) => ({ name: a.name, role: a.role })),
      tools: ir.tools.map((t) => ({ name: t.name, description: t.description })),
      stateFields: ir.workflow.state_schema.fields.map((f) => f.name),
      workflowType: ir.workflow.type,
    };
  }, [template]);

  return (
    <div className="bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-xl p-4 h-full overflow-y-auto">
      <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-1">
        {template.name}
      </h3>
      <p className="text-xs text-[var(--text-secondary)] mb-4">
        {template.description}
      </p>

      {/* Workflow type */}
      <div className="mb-4">
        <div className="text-[10px] uppercase font-semibold text-[var(--text-secondary)] mb-1.5">
          Workflow Type
        </div>
        <span className="text-xs text-[var(--accent)] font-medium">
          {preview.workflowType.replace("_", " ")}
        </span>
      </div>

      {/* Feature badges */}
      {template.features.length > 0 && (
        <div className="mb-4">
          <div className="text-[10px] uppercase font-semibold text-[var(--text-secondary)] mb-1.5">
            Features Used
          </div>
          <div className="flex flex-wrap gap-1">
            {template.features.map((f) => (
              <FeatureBadge key={f} label={f} />
            ))}
          </div>
        </div>
      )}

      {/* Agents */}
      <div className="mb-4">
        <div className="text-[10px] uppercase font-semibold text-[var(--text-secondary)] mb-1.5">
          Agents ({preview.agents.length})
        </div>
        <div className="space-y-1.5">
          {preview.agents.map((a) => (
            <div key={a.name} className="flex items-start gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-1.5 shrink-0" />
              <div>
                <div className="text-xs text-[var(--text-primary)] font-medium">{a.name}</div>
                {a.role && (
                  <div className="text-[10px] text-[var(--text-secondary)]">{a.role}</div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Tools */}
      {preview.tools.length > 0 && (
        <div className="mb-4">
          <div className="text-[10px] uppercase font-semibold text-[var(--text-secondary)] mb-1.5">
            Tools ({preview.tools.length})
          </div>
          <div className="space-y-1.5">
            {preview.tools.map((t) => (
              <div key={t.name} className="flex items-start gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-purple-400 mt-1.5 shrink-0" />
                <div>
                  <div className="text-xs text-[var(--text-primary)] font-medium">{t.name}</div>
                  {t.description && (
                    <div className="text-[10px] text-[var(--text-secondary)] line-clamp-1">{t.description}</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* State fields */}
      {preview.stateFields.length > 0 && (
        <div>
          <div className="text-[10px] uppercase font-semibold text-[var(--text-secondary)] mb-1.5">
            State Fields ({preview.stateFields.length})
          </div>
          <div className="flex flex-wrap gap-1">
            {preview.stateFields.map((f) => (
              <span
                key={f}
                className="inline-flex px-1.5 py-0.5 rounded text-[10px] font-mono text-[var(--text-secondary)] bg-[var(--bg-secondary)] border border-[var(--border-color)]"
              >
                {f}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Main Gallery Component
// ============================================================================

const TABS: Array<{ label: string; filter: Difficulty | "All" }> = [
  { label: "All", filter: "All" },
  { label: "Beginner", filter: "Beginner" },
  { label: "Intermediate", filter: "Intermediate" },
  { label: "Advanced", filter: "Advanced" },
  { label: "Expert", filter: "Expert" },
];

export function TemplateGallery() {
  const { isTemplateGalleryOpen, closeTemplateGallery, setIRDocument } = useCanvasStore();
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<Difficulty | "All">("All");
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);

  // Reset state on open
  useEffect(() => {
    if (isTemplateGalleryOpen) {
      setSearch("");
      setActiveTab("All");
      setSelectedTemplateId(null);
    }
  }, [isTemplateGalleryOpen]);

  // Escape to close
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isTemplateGalleryOpen) {
        closeTemplateGallery();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isTemplateGalleryOpen, closeTemplateGallery]);

  const filtered = useMemo(() => {
    return workflowTemplates.filter((t) => {
      const matchesTab = activeTab === "All" || t.difficulty === activeTab;
      const matchesSearch =
        !search ||
        t.name.toLowerCase().includes(search.toLowerCase()) ||
        t.description.toLowerCase().includes(search.toLowerCase()) ||
        t.features.some((f) => f.toLowerCase().includes(search.toLowerCase()));
      return matchesTab && matchesSearch;
    });
  }, [activeTab, search]);

  const selectedTemplate = useMemo(
    () => workflowTemplates.find((t) => t.id === selectedTemplateId) || null,
    [selectedTemplateId]
  );

  const handleUseTemplate = useCallback(
    (template: TemplateMeta) => {
      const ir = template.factory();
      setIRDocument(ir);
      closeTemplateGallery();
      // Trigger auto-layout after a tick so React Flow can mount the nodes
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent("agentforge:fit-view"));
      }, 100);
    },
    [setIRDocument, closeTemplateGallery]
  );

  if (!isTemplateGalleryOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200]"
        onClick={closeTemplateGallery}
      />

      {/* Gallery modal */}
      <div className="fixed inset-4 md:inset-8 lg:inset-12 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-2xl shadow-2xl z-[201] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border-color)] shrink-0">
          <div>
            <h2 className="text-lg font-semibold text-[var(--text-primary)]">
              Workflow Templates
            </h2>
            <p className="text-xs text-[var(--text-secondary)] mt-0.5">
              Start with a pre-built workflow and customize it to your needs
            </p>
          </div>
          <button
            onClick={closeTemplateGallery}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--text-secondary)] hover:text-white hover:bg-[var(--bg-secondary)] transition-colors"
          >
            <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>

        {/* Toolbar: search + tabs */}
        <div className="flex items-center gap-4 px-6 py-3 border-b border-[var(--border-color)] shrink-0">
          {/* Search */}
          <div className="relative flex-1 max-w-xs">
            <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--text-secondary)]" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
            </svg>
            <input
              className="w-full bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-lg pl-8 pr-3 py-1.5 text-xs text-[var(--text-primary)] placeholder-[var(--text-secondary)] focus:outline-none focus:border-[var(--accent)]"
              placeholder="Search templates..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {/* Tabs */}
          <div className="flex items-center gap-1">
            {TABS.map((tab) => (
              <button
                key={tab.filter}
                onClick={() => setActiveTab(tab.filter)}
                className={`px-3 py-1 text-xs rounded-lg font-medium transition-colors ${
                  activeTab === tab.filter
                    ? "bg-[var(--accent)] text-white"
                    : "text-[var(--text-secondary)] hover:text-white hover:bg-[var(--bg-secondary)]"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content area */}
        <div className="flex-1 flex overflow-hidden">
          {/* Grid */}
          <div className="flex-1 overflow-y-auto p-6">
            {filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-[var(--text-secondary)]">
                <svg className="w-12 h-12 mb-3 opacity-40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                </svg>
                <p className="text-sm">No templates match your search</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {filtered.map((t) => (
                  <TemplateCard
                    key={t.id}
                    template={t}
                    isSelected={selectedTemplateId === t.id}
                    onSelect={() => setSelectedTemplateId(t.id)}
                    onUse={() => handleUseTemplate(t)}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Preview panel */}
          {selectedTemplate && (
            <div className="w-72 xl:w-80 border-l border-[var(--border-color)] p-4 shrink-0 overflow-hidden">
              <TemplatePreview template={selectedTemplate} />
            </div>
          )}
        </div>
      </div>
    </>
  );
}
