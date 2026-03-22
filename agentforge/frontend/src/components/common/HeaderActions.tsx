"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import { useCanvasStore } from "@/lib/store/canvasStore";

export function HeaderActions() {
  const store = useCanvasStore();
  const {
    irDocument,
    saveProject,
    loadProject,
    listSavedProjects,
    deleteSavedProject,
    clearCanvas,
    createNewProject,
    renameProject,
    openTemplateGallery,
    undo,
    redo,
    undoStack,
    redoStack,
    exportIR,
    importIR,
  } = store;

  const [showProjectMenu, setShowProjectMenu] = useState(false);
  const [showRenameInput, setShowRenameInput] = useState(false);
  const [renameValue, setRenameValue] = useState("");
  const [saveMessage, setSaveMessage] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSave = () => {
    saveProject();
    setSaveMessage("Saved!");
    setTimeout(() => setSaveMessage(""), 2000);
  };

  const handleNew = () => {
    if (irDocument && irDocument.agents.length > 0) {
      if (!confirm("Create a new workflow? Unsaved changes will be lost.")) return;
    }
    const name = prompt("Workflow name:", "New Workflow");
    if (name) createNewProject(name);
  };

  const handleClear = () => {
    if (!confirm("Clear the entire canvas? This can be undone with Ctrl+Z.")) return;
    clearCanvas();
  };

  const handleExport = () => {
    const json = exportIR();
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${irDocument?.metadata.name || "workflow"}.agentforge.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = () => {
    fileInputRef.current?.click();
  };

  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const json = ev.target?.result as string;
      const success = importIR(json);
      if (!success) alert("Invalid workflow file. Please check the format.");
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const handleRename = () => {
    setRenameValue(irDocument?.metadata.name || "");
    setShowRenameInput(true);
  };

  const submitRename = () => {
    if (renameValue.trim()) {
      renameProject(renameValue.trim());
    }
    setShowRenameInput(false);
  };

  const savedProjects = showProjectMenu ? listSavedProjects() : [];

  return (
    <>
      {/* Hidden file input for import */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".json,.agentforge.json"
        className="hidden"
        onChange={handleFileImport}
      />

      <div className="flex items-center gap-1">
        {/* Project name (click to rename) */}
        {showRenameInput ? (
          <input
            className="bg-[var(--bg-primary)] border border-[var(--accent)] rounded px-2 py-0.5 text-sm w-48 focus:outline-none"
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            onBlur={submitRename}
            onKeyDown={(e) => {
              if (e.key === "Enter") submitRename();
              if (e.key === "Escape") setShowRenameInput(false);
            }}
            autoFocus
          />
        ) : (
          <button
            onClick={handleRename}
            className="text-sm text-[var(--text-secondary)] hover:text-white px-1 truncate max-w-[200px]"
            title="Click to rename"
          >
            {irDocument?.metadata.name || "Untitled"}
          </button>
        )}

        <div className="w-px h-5 bg-[var(--border-color)] mx-1" />

        {/* Save */}
        <ActionButton onClick={handleSave} title="Save project (Ctrl+S)" shortcut="S">
          {saveMessage || "Save"}
        </ActionButton>

        {/* New */}
        <ActionButton onClick={handleNew} title="New workflow">
          New
        </ActionButton>

        {/* Templates */}
        <ActionButton onClick={openTemplateGallery} title="Browse workflow templates">
          Templates
        </ActionButton>

        {/* Open saved */}
        <div className="relative">
          <ActionButton
            onClick={() => setShowProjectMenu(!showProjectMenu)}
            title="Open saved workflow"
          >
            Open
          </ActionButton>

          {showProjectMenu && (
            <div className="absolute top-full left-0 mt-1 w-64 bg-[#1e1e3a] border border-[var(--border-color)] rounded-lg shadow-xl z-50">
              <div className="px-3 py-2 text-[10px] text-[var(--text-secondary)] uppercase font-semibold border-b border-[var(--border-color)]">
                Saved Workflows ({savedProjects.length})
              </div>
              {savedProjects.length === 0 ? (
                <div className="px-3 py-4 text-xs text-[var(--text-secondary)] text-center">
                  No saved workflows yet
                </div>
              ) : (
                <div className="max-h-64 overflow-y-auto">
                  {savedProjects.map((p) => (
                    <div
                      key={p.id}
                      className="flex items-center justify-between px-3 py-2 hover:bg-[var(--bg-primary)] group"
                    >
                      <button
                        className="flex-1 text-left"
                        onClick={() => {
                          loadProject(p.id);
                          setShowProjectMenu(false);
                        }}
                      >
                        <div className="text-xs text-white">{p.name}</div>
                        <div className="text-[10px] text-[var(--text-secondary)]">
                          {new Date(p.savedAt).toLocaleString()}
                        </div>
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm(`Delete "${p.name}"?`)) {
                            deleteSavedProject(p.id);
                            setShowProjectMenu(false);
                            setTimeout(() => setShowProjectMenu(true), 50);
                          }
                        }}
                        className="text-[10px] text-red-400 opacity-0 group-hover:opacity-100 ml-2"
                        title="Delete"
                      >
                        x
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="w-px h-5 bg-[var(--border-color)] mx-1" />

        {/* Undo / Redo */}
        <ActionButton
          onClick={undo}
          disabled={undoStack.length === 0}
          title="Undo (Ctrl+Z)"
        >
          Undo
        </ActionButton>
        <ActionButton
          onClick={redo}
          disabled={redoStack.length === 0}
          title="Redo (Ctrl+Shift+Z)"
        >
          Redo
        </ActionButton>

        <div className="w-px h-5 bg-[var(--border-color)] mx-1" />

        {/* Clear */}
        <ActionButton onClick={handleClear} title="Clear canvas" variant="danger">
          Clear
        </ActionButton>

        <div className="w-px h-5 bg-[var(--border-color)] mx-1" />

        {/* Export / Import */}
        <ActionButton onClick={handleExport} title="Export workflow as JSON">
          Export
        </ActionButton>
        <ActionButton onClick={handleImport} title="Import workflow from JSON">
          Import
        </ActionButton>

        <div className="w-px h-5 bg-[var(--border-color)] mx-1" />

        {/* About */}
        <Link
          href="/about"
          title="About AgentForge"
          className="px-2 py-1 text-xs rounded border border-[var(--border-color)] text-[var(--text-secondary)] hover:border-[var(--accent)] hover:text-white transition-colors flex items-center gap-1"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-3.5 h-3.5">
            <circle cx="12" cy="12" r="10" />
            <path d="M12 16v-4M12 8h.01" />
          </svg>
          About
        </Link>
      </div>

      {/* Click outside to close project menu */}
      {showProjectMenu && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setShowProjectMenu(false)}
        />
      )}
    </>
  );
}

function ActionButton({
  onClick,
  children,
  title,
  disabled,
  shortcut,
  variant,
}: {
  onClick: () => void;
  children: React.ReactNode;
  title?: string;
  disabled?: boolean;
  shortcut?: string;
  variant?: "danger";
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`px-2 py-1 text-xs rounded border transition-colors ${
        disabled
          ? "border-transparent text-[var(--text-secondary)]/40 cursor-not-allowed"
          : variant === "danger"
          ? "border-[var(--border-color)] text-red-400 hover:border-red-400 hover:bg-red-400/10"
          : "border-[var(--border-color)] text-[var(--text-secondary)] hover:border-[var(--accent)] hover:text-white"
      }`}
    >
      {children}
    </button>
  );
}
