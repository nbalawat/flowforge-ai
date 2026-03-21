"use client";

import { useEffect } from "react";
import { Canvas } from "@/components/canvas/Canvas";
import { Toolbar } from "@/components/canvas/Toolbar";
import { PropertiesPanel } from "@/components/panels/PropertiesPanel";
import { CopilotChat } from "@/components/copilot/CopilotChat";
import { useCanvasStore } from "@/lib/store/canvasStore";

export default function Home() {
  const { irDocument, createNewProject, isCopilotOpen, toggleCopilot } =
    useCanvasStore();

  useEffect(() => {
    if (!irDocument) {
      createNewProject("My Agent Workflow", "A new agentic workflow");
    }
  }, [irDocument, createNewProject]);

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <header className="h-12 bg-[var(--bg-secondary)] border-b border-[var(--border-color)] flex items-center px-4 justify-between shrink-0">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-semibold text-[var(--accent)]">
            AgentForge
          </h1>
          <span className="text-sm text-[var(--text-secondary)]">
            {irDocument?.metadata.name || "Untitled"}
          </span>
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
    </div>
  );
}
