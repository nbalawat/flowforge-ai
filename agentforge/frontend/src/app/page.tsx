"use client";

import { useEffect, useCallback } from "react";
import { Canvas } from "@/components/canvas/Canvas";
import { Toolbar } from "@/components/canvas/Toolbar";
import { PropertiesPanel } from "@/components/panels/PropertiesPanel";
import { CopilotChat } from "@/components/copilot/CopilotChat";
import { TestRunner } from "@/components/generation/TestRunner";
import { HeaderActions } from "@/components/common/HeaderActions";
import { useCanvasStore } from "@/lib/store/canvasStore";

export default function Home() {
  const {
    irDocument,
    createNewProject,
    isCopilotOpen,
    toggleCopilot,
    undo,
    redo,
    saveProject,
    selectedNodeId,
    removeNode,
  } = useCanvasStore();

  // Initialize project on first load
  useEffect(() => {
    if (!irDocument) {
      createNewProject("My Agent Workflow", "A new agentic workflow");
    }
  }, [irDocument, createNewProject]);

  // Keyboard shortcuts
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      const isCmd = e.metaKey || e.ctrlKey;

      // Ctrl+Z — Undo
      if (isCmd && !e.shiftKey && e.key === "z") {
        e.preventDefault();
        undo();
      }

      // Ctrl+Shift+Z — Redo
      if (isCmd && e.shiftKey && e.key === "z") {
        e.preventDefault();
        redo();
      }

      // Ctrl+S — Save
      if (isCmd && e.key === "s") {
        e.preventDefault();
        saveProject();
      }

      // Delete / Backspace — Remove selected node
      if ((e.key === "Delete" || e.key === "Backspace") && selectedNodeId) {
        // Don't delete if focused on an input
        const target = e.target as HTMLElement;
        if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") return;

        const node = irDocument?.workflow.nodes.find((n) => n.id === selectedNodeId);
        if (node && node.type !== "entry" && node.type !== "exit") {
          e.preventDefault();
          removeNode(selectedNodeId);
        }
      }
    },
    [undo, redo, saveProject, selectedNodeId, removeNode, irDocument]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <header className="h-12 bg-[var(--bg-secondary)] border-b border-[var(--border-color)] flex items-center px-4 justify-between shrink-0">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-semibold text-[var(--accent)]">
            AgentForge
          </h1>
          <HeaderActions />
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={toggleCopilot}
            className={`px-3 py-1 text-sm rounded border ${
              isCopilotOpen
                ? "bg-[var(--accent)] border-[var(--accent)] text-white"
                : "border-[var(--border-color)] text-[var(--text-secondary)] hover:text-white"
            }`}
          >
            AI Copilot
          </button>
        </div>
      </header>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Toolbar */}
        <Toolbar />

        {/* Canvas */}
        <div className="flex-1 relative">
          <Canvas />
        </div>

        {/* Properties Panel */}
        <PropertiesPanel />

        {/* Copilot Chat */}
        {isCopilotOpen && <CopilotChat />}
      </div>

      {/* Test Runner & Code Generation */}
      <TestRunner />
    </div>
  );
}
