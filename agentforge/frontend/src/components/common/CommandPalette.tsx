"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { useCanvasStore } from "@/lib/store/canvasStore";

interface Command {
  id: string;
  label: string;
  category: string;
  shortcut?: string;
  action: () => void;
}

export function CommandPalette() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const store = useCanvasStore();

  // Register Cmd+K listener
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setIsOpen((prev) => !prev);
        setQuery("");
      }
      if (e.key === "Escape" && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) inputRef.current?.focus();
  }, [isOpen]);

  const commands: Command[] = useMemo(
    () => [
      // Node creation
      { id: "add-agent", label: "Add Agent Node", category: "Create", action: () => { store.addAgentNode({ name: "New Agent" }, { x: 300, y: 300 }); setIsOpen(false); } },
      { id: "add-tool", label: "Add Tool Node", category: "Create", action: () => { store.addToolNode({ name: "New Tool", description: "" }, { x: 300, y: 300 }); setIsOpen(false); } },
      { id: "add-condition", label: "Add Condition Node", category: "Create", action: () => { store.addConditionNode("state.get('key') == 'value'", { x: 300, y: 300 }); setIsOpen(false); } },
      { id: "add-human", label: "Add Human Review Node", category: "Create", action: () => { store.addHumanInputNode("Please review.", { x: 300, y: 300 }); setIsOpen(false); } },

      // Layout
      { id: "auto-layout", label: "Auto Layout", category: "Layout", shortcut: "", action: () => { window.dispatchEvent(new CustomEvent("agentforge:auto-layout")); setIsOpen(false); } },
      { id: "fit-view", label: "Fit View", category: "Layout", action: () => { window.dispatchEvent(new CustomEvent("agentforge:fit-view")); setIsOpen(false); } },

      // Project
      { id: "save", label: "Save Project", category: "Project", shortcut: "Ctrl+S", action: () => { store.saveProject(); setIsOpen(false); } },
      { id: "new", label: "New Workflow", category: "Project", action: () => { const name = prompt("Workflow name:"); if (name) { store.createNewProject(name); } setIsOpen(false); } },
      { id: "clear", label: "Clear Canvas", category: "Project", action: () => { if (confirm("Clear canvas?")) store.clearCanvas(); setIsOpen(false); } },
      { id: "export", label: "Export as JSON", category: "Project", action: () => { const json = store.exportIR(); const blob = new Blob([json], { type: "application/json" }); const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "workflow.agentforge.json"; a.click(); setIsOpen(false); } },

      // Edit
      { id: "undo", label: "Undo", category: "Edit", shortcut: "Ctrl+Z", action: () => { store.undo(); setIsOpen(false); } },
      { id: "redo", label: "Redo", category: "Edit", shortcut: "Ctrl+Shift+Z", action: () => { store.redo(); setIsOpen(false); } },

      // UI
      { id: "toggle-copilot", label: "Toggle AI Copilot", category: "View", action: () => { store.toggleCopilot(); setIsOpen(false); } },
      { id: "framework-langgraph", label: "Switch to LangGraph", category: "Framework", action: () => { store.setFramework("langgraph"); setIsOpen(false); } },
      { id: "framework-adk", label: "Switch to Google ADK", category: "Framework", action: () => { store.setFramework("google_adk"); setIsOpen(false); } },
      { id: "framework-claude", label: "Switch to Claude Agent SDK", category: "Framework", action: () => { store.setFramework("claude_agent_sdk"); setIsOpen(false); } },
    ],
    [store]
  );

  const filtered = query
    ? commands.filter(
        (c) =>
          c.label.toLowerCase().includes(query.toLowerCase()) ||
          c.category.toLowerCase().includes(query.toLowerCase())
      )
    : commands;

  // Group by category
  const grouped = filtered.reduce<Record<string, Command[]>>((acc, cmd) => {
    (acc[cmd.category] = acc[cmd.category] || []).push(cmd);
    return acc;
  }, {});

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50 z-[100]" onClick={() => setIsOpen(false)} />

      {/* Palette */}
      <div className="fixed top-[20%] left-1/2 -translate-x-1/2 w-[500px] bg-[#1e1e3a] border border-[var(--border-color)] rounded-xl shadow-2xl z-[101] overflow-hidden">
        {/* Search input */}
        <div className="flex items-center px-4 py-3 border-b border-[var(--border-color)]">
          <svg className="w-4 h-4 text-[var(--text-secondary)] mr-2" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
          </svg>
          <input
            ref={inputRef}
            className="flex-1 bg-transparent text-sm text-white focus:outline-none placeholder-[var(--text-secondary)]"
            placeholder="Search commands..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && filtered.length > 0) {
                filtered[0].action();
              }
            }}
          />
          <span className="text-[10px] text-[var(--text-secondary)] px-1.5 py-0.5 rounded bg-[var(--bg-primary)]">
            ESC
          </span>
        </div>

        {/* Commands */}
        <div className="max-h-[400px] overflow-y-auto py-2">
          {Object.entries(grouped).map(([category, cmds]) => (
            <div key={category}>
              <div className="px-4 py-1 text-[10px] text-[var(--text-secondary)] uppercase font-semibold">
                {category}
              </div>
              {cmds.map((cmd) => (
                <button
                  key={cmd.id}
                  onClick={cmd.action}
                  className="w-full flex items-center justify-between px-4 py-2 text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-primary)] hover:text-white transition-colors"
                >
                  <span>{cmd.label}</span>
                  {cmd.shortcut && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--bg-primary)] text-[var(--text-secondary)]">
                      {cmd.shortcut}
                    </span>
                  )}
                </button>
              ))}
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="px-4 py-6 text-sm text-[var(--text-secondary)] text-center">
              No commands found
            </div>
          )}
        </div>
      </div>
    </>
  );
}
