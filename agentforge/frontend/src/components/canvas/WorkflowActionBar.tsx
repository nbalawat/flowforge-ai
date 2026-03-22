"use client";

import { useMemo, useState } from "react";
import { useCanvasStore } from "@/lib/store/canvasStore";

type Framework = "langgraph" | "google_adk" | "claude_agent_sdk" | "crewai" | "autogen" | "strands";

const FRAMEWORK_INFO: Record<Framework, { label: string; color: string; icon: string }> = {
  langgraph: { label: "LangGraph", color: "bg-blue-600", icon: "🔗" },
  google_adk: { label: "Google ADK", color: "bg-emerald-600", icon: "🟢" },
  claude_agent_sdk: { label: "Claude SDK", color: "bg-orange-600", icon: "🟠" },
  crewai: { label: "CrewAI", color: "bg-purple-600", icon: "🟣" },
  autogen: { label: "AutoGen", color: "bg-cyan-600", icon: "🔵" },
  strands: { label: "Strands", color: "bg-amber-600", icon: "🟡" },
};

export function WorkflowActionBar() {
  const { irDocument, selectedFramework, setFramework } = useCanvasStore();
  const [showFrameworkPicker, setShowFrameworkPicker] = useState(false);

  const workflowStatus = useMemo(() => {
    if (!irDocument) return null;

    const nodes = irDocument.workflow.nodes;
    const edges = irDocument.workflow.edges;
    const agents = irDocument.agents;

    const agentNodes = nodes.filter((n) => n.type === "agent");
    const hasEntry = nodes.some((n) => n.type === "entry");
    const hasExit = nodes.some((n) => n.type === "exit");
    const connectedNodeIds = new Set([...edges.map((e) => e.source), ...edges.map((e) => e.target)]);
    const disconnectedAgents = agentNodes.filter((n) => !connectedNodeIds.has(n.id));

    // Determine the workflow readiness
    if (agents.length === 0) {
      return {
        phase: "empty" as const,
        message: "Add agents to get started",
        hint: "Drag an Agent node from the toolbar, use a template, or describe your workflow to the AI Copilot.",
        progress: 0,
      };
    }

    if (disconnectedAgents.length > 0) {
      return {
        phase: "connecting" as const,
        message: `${disconnectedAgents.length} agent${disconnectedAgents.length > 1 ? "s" : ""} not connected`,
        hint: "Connect agents by dragging from the bottom handle of one node to the top handle of another.",
        progress: 25,
      };
    }

    const entryEdges = edges.filter((e) => {
      const sourceNode = nodes.find((n) => n.id === e.source);
      return sourceNode?.type === "entry";
    });
    if (hasEntry && entryEdges.length === 0 && agents.length > 0) {
      return {
        phase: "connecting" as const,
        message: "Start node is not connected",
        hint: "Connect the Start node to your first agent by dragging from Start's bottom handle.",
        progress: 30,
      };
    }

    const exitEdges = edges.filter((e) => {
      const targetNode = nodes.find((n) => n.id === e.target);
      return targetNode?.type === "exit";
    });
    if (hasExit && exitEdges.length === 0) {
      return {
        phase: "connecting" as const,
        message: "No path to End node",
        hint: "Connect your last agent to the End node to complete the workflow.",
        progress: 50,
      };
    }

    // Check if agents have instructions
    const agentsWithoutInstructions = agents.filter(
      (a) => !a.instructions || a.instructions.trim().length < 10
    );
    if (agentsWithoutInstructions.length > 0) {
      return {
        phase: "configuring" as const,
        message: `${agentsWithoutInstructions.length} agent${agentsWithoutInstructions.length > 1 ? "s" : ""} need${agentsWithoutInstructions.length === 1 ? "s" : ""} instructions`,
        hint: `Click on "${agentsWithoutInstructions[0].name}" to add a system prompt in the Instructions section.`,
        progress: 65,
      };
    }

    // Workflow is complete — ready to generate
    return {
      phase: "ready" as const,
      message: `${agents.length} agent${agents.length > 1 ? "s" : ""}, ${edges.length} connection${edges.length > 1 ? "s" : ""} — Ready to generate`,
      hint: "Choose a framework and click Generate & Test to create executable code.",
      progress: 100,
    };
  }, [irDocument]);

  if (!workflowStatus || !irDocument) return null;

  // Don't show on truly empty canvas (empty state handles that)
  const agents = irDocument.agents;
  if (agents.length === 0) return null;

  const fw = FRAMEWORK_INFO[selectedFramework as Framework] || FRAMEWORK_INFO.langgraph;

  return (
    <div className="absolute top-3 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2">
      {/* Status pill */}
      <div className="flex items-center gap-2 bg-[#1a1a2e]/95 backdrop-blur-sm border border-[var(--border-color)] rounded-xl px-4 py-2 shadow-xl">
        {/* Progress indicator */}
        <div className="relative w-6 h-6 shrink-0">
          <svg className="w-6 h-6 -rotate-90" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="10" fill="none" stroke="#2a2a4a" strokeWidth="2" />
            <circle
              cx="12"
              cy="12"
              r="10"
              fill="none"
              stroke={workflowStatus.progress === 100 ? "#10b981" : "#6366f1"}
              strokeWidth="2"
              strokeDasharray={`${(workflowStatus.progress / 100) * 62.83} 62.83`}
              strokeLinecap="round"
            />
          </svg>
          {workflowStatus.progress === 100 && (
            <span className="absolute inset-0 flex items-center justify-center text-[8px] text-emerald-400">✓</span>
          )}
        </div>

        {/* Message */}
        <div>
          <p className="text-xs font-medium text-white">{workflowStatus.message}</p>
          <p className="text-[10px] text-[var(--text-secondary)] max-w-[300px]">
            {workflowStatus.hint}
          </p>
        </div>
      </div>

      {/* Framework picker + Generate button — shown when workflow has agents */}
      {workflowStatus.phase === "ready" && (
        <div className="relative">
          <div className="flex items-center bg-[#1a1a2e]/95 backdrop-blur-sm border border-[var(--border-color)] rounded-xl overflow-hidden shadow-xl">
            {/* Framework selector */}
            <button
              onClick={() => setShowFrameworkPicker(!showFrameworkPicker)}
              className="flex items-center gap-1.5 px-3 py-2 hover:bg-[var(--bg-primary)] transition-colors border-r border-[var(--border-color)]"
            >
              <span className="text-xs">{fw.icon}</span>
              <span className="text-xs text-white font-medium">{fw.label}</span>
              <svg className="w-3 h-3 text-[var(--text-secondary)]" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>

            {/* Generate button */}
            <button
              onClick={() => {
                // Trigger the TestRunner to open
                const testBtn = document.querySelector('[data-test-runner-trigger]') as HTMLButtonElement;
                if (testBtn) testBtn.click();
              }}
              className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white transition-colors"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
              </svg>
              <span className="text-xs font-medium">Generate & Test</span>
            </button>
          </div>

          {/* Framework dropdown */}
          {showFrameworkPicker && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowFrameworkPicker(false)} />
              <div className="absolute top-full mt-1 left-0 bg-[#1a1a2e] border border-[var(--border-color)] rounded-lg shadow-2xl overflow-hidden z-50 min-w-[200px]">
                {(Object.entries(FRAMEWORK_INFO) as [Framework, typeof FRAMEWORK_INFO[Framework]][]).map(([key, info]) => (
                  <button
                    key={key}
                    onClick={() => {
                      setFramework(key);
                      setShowFrameworkPicker(false);
                    }}
                    className={`w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-[var(--bg-primary)] transition-colors ${
                      selectedFramework === key ? "text-white bg-[var(--accent)]/10" : "text-[var(--text-secondary)]"
                    }`}
                  >
                    <span>{info.icon}</span>
                    <span className="font-medium">{info.label}</span>
                    {selectedFramework === key && (
                      <span className="ml-auto text-[var(--accent)]">✓</span>
                    )}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
