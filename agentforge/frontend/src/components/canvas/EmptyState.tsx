"use client";

import { useState } from "react";
import { useCanvasStore } from "@/lib/store/canvasStore";

/**
 * Non-blocking suggestion shown on a fresh canvas (only Start + End nodes).
 * Can be dismissed — it's a hint, not a gate.
 */
export function EmptyState() {
  const [dismissed, setDismissed] = useState(false);
  const { irDocument, openTemplateGallery, toggleCopilot, isCopilotOpen } =
    useCanvasStore();

  if (dismissed) return null;
  if (!irDocument) return null;

  const workflowNodes = irDocument.workflow.nodes;
  const hasOnlyEntryExit =
    workflowNodes.length === 2 &&
    workflowNodes.every((n) => n.type === "entry" || n.type === "exit") &&
    irDocument.agents.length === 0;

  if (!hasOnlyEntryExit) return null;

  return (
    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
      <div className="relative bg-[var(--bg-secondary)]/95 backdrop-blur-sm border border-[var(--border-color)] rounded-2xl p-8 max-w-md text-center shadow-2xl">
        {/* Close / Dismiss button */}
        <button
          onClick={() => setDismissed(true)}
          className="absolute top-3 right-3 w-6 h-6 rounded-full flex items-center justify-center text-[var(--text-secondary)] hover:text-white hover:bg-[var(--bg-primary)] transition-colors"
          title="Dismiss"
        >
          ✕
        </button>

        {/* Icon */}
        <div className="w-14 h-14 mx-auto mb-4 rounded-xl bg-[var(--accent)]/10 border border-[var(--accent)]/20 flex items-center justify-center">
          <svg
            className="w-7 h-7 text-[var(--accent)]"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z"
            />
          </svg>
        </div>

        <h3 className="text-base font-semibold text-[var(--text-primary)] mb-2">
          Build Your Agent Workflow
        </h3>
        <p className="text-sm text-[var(--text-secondary)] mb-6 leading-relaxed">
          Start from a pre-built template or describe your workflow to the AI
          Copilot and watch it come to life.
        </p>

        {/* Primary CTA */}
        <button
          onClick={() => {
            setDismissed(true);
            openTemplateGallery();
          }}
          className="w-full py-2.5 rounded-lg text-sm font-medium bg-[var(--accent)] text-white hover:brightness-110 transition-all mb-3"
        >
          Start from a Template
        </button>

        {/* Secondary CTA */}
        <button
          onClick={() => {
            setDismissed(true);
            if (!isCopilotOpen) toggleCopilot();
          }}
          className="w-full py-2 rounded-lg text-xs font-medium border border-[var(--border-color)] text-[var(--text-secondary)] hover:text-white hover:border-[var(--accent)]/50 transition-all"
        >
          Or describe your workflow to the AI Copilot &rarr;
        </button>

        {/* Hint */}
        <p className="text-[10px] text-[var(--text-secondary)]/60 mt-4">
          You can also drag nodes from the toolbar on the left, or press{" "}
          <kbd className="px-1 py-0.5 rounded bg-[var(--bg-primary)] text-[var(--text-secondary)] font-mono text-[9px]">
            Ctrl+K
          </kbd>{" "}
          for the command palette
        </p>
      </div>
    </div>
  );
}
