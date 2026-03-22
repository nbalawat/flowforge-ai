"use client";

import { useState } from "react";
import { useCanvasStore } from "@/lib/store/canvasStore";
import { executeWorkflow, downloadProject } from "@/lib/api/execution";
import { generateCode, type GeneratedFile } from "@/lib/api/generation";
import type { TargetFramework } from "@/lib/ir/types";

type Tab = "output" | "code" | "files";

export function TestRunner() {
  const { irDocument, selectedFramework } = useCanvasStore();
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>("output");

  // Execution state
  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    stdout: string;
    stderr: string;
    exit_code: number;
    error: string;
  } | null>(null);

  // Code preview state
  const [codeFiles, setCodeFiles] = useState<GeneratedFile[]>([]);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  // Test message
  const [testMessage, setTestMessage] = useState(
    "I have a billing issue with my account. My last charge of $49.99 was incorrect."
  );

  const framework = selectedFramework as TargetFramework;
  const projectName = irDocument?.metadata.name.toLowerCase().replace(/\s+/g, "_") || "project";

  const handleRun = async () => {
    if (!irDocument) return;
    setIsRunning(true);
    setResult(null);
    setActiveTab("output");

    const execResult = await executeWorkflow(
      irDocument,
      framework,
      testMessage,
      projectName
    );

    setResult({
      success: execResult.success,
      stdout: execResult.stdout,
      stderr: execResult.stderr,
      exit_code: execResult.exit_code,
      error: execResult.error,
    });
    setIsRunning(false);
  };

  const handlePreviewCode = async () => {
    if (!irDocument) return;
    setIsGenerating(true);
    setActiveTab("code");

    try {
      const response = await generateCode(irDocument, framework, projectName);
      setCodeFiles(response.files);
      if (response.files.length > 0) {
        setSelectedFile(response.files[0].path);
      }
    } catch (err) {
      console.error("Code generation failed:", err);
    }
    setIsGenerating(false);
  };

  const handleDownload = async () => {
    if (!irDocument) return;
    try {
      await downloadProject(irDocument, framework, projectName);
    } catch (err) {
      alert(`Download failed: ${err}`);
    }
  };

  if (!isOpen) {
    return (
      <button
        data-test-runner-trigger
        onClick={() => {
          setIsOpen(true);
          handlePreviewCode();
        }}
        className="fixed bottom-4 left-20 px-4 py-2.5 bg-[var(--accent)] text-white rounded-lg shadow-lg text-sm font-medium hover:bg-[var(--accent)]/90 z-50 flex items-center gap-2"
      >
        <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
        </svg>
        Test &amp; Run
      </button>
    );
  }

  const currentFile = codeFiles.find((f) => f.path === selectedFile);

  const FRAMEWORK_LABELS: Record<string, string> = {
    langgraph: "LangGraph",
    google_adk: "Google ADK",
    claude_agent_sdk: "Claude Agent SDK",
    crewai: "CrewAI",
    autogen: "AutoGen",
    strands: "AWS Strands",
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
      <div className="bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-color)] w-[92vw] h-[85vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="h-14 border-b border-[var(--border-color)] flex items-center justify-between px-5 shrink-0">
          <div className="flex items-center gap-4">
            <h2 className="text-base font-semibold">Test &amp; Run</h2>
            <select
              value={framework}
              onChange={(e) =>
                useCanvasStore.getState().setFramework(e.target.value as TargetFramework)
              }
              className="bg-[var(--bg-primary)] border border-[var(--border-color)] rounded px-2 py-1 text-sm"
            >
              <option value="google_adk">Google ADK</option>
              <option value="langgraph">LangGraph</option>
              <option value="claude_agent_sdk">Claude Agent SDK</option>
            </select>
            <span className="text-xs text-[var(--text-secondary)]">
              {FRAMEWORK_LABELS[framework] || framework}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleRun}
              disabled={isRunning || !irDocument}
              className="px-4 py-1.5 bg-emerald-600 text-white rounded text-sm font-medium hover:bg-emerald-500 disabled:opacity-50 flex items-center gap-1.5"
            >
              {isRunning ? (
                <>
                  <span className="animate-spin">&#9696;</span> Running...
                </>
              ) : (
                <>
                  <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                  </svg>
                  Run Test
                </>
              )}
            </button>
            <button
              onClick={handlePreviewCode}
              disabled={isGenerating}
              className="px-3 py-1.5 border border-[var(--border-color)] text-sm rounded hover:border-blue-400 text-[var(--text-secondary)] hover:text-white"
            >
              Preview Code
            </button>
            <button
              onClick={handleDownload}
              className="px-3 py-1.5 border border-[var(--border-color)] text-sm rounded hover:border-[var(--accent)] text-[var(--text-secondary)] hover:text-white"
            >
              Download ZIP
            </button>
            <button
              onClick={() => setIsOpen(false)}
              className="px-3 py-1.5 border border-[var(--border-color)] text-sm rounded hover:border-red-400 text-[var(--text-secondary)]"
            >
              Close
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-[var(--border-color)] px-5 shrink-0">
          {(["output", "code", "files"] as Tab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => {
                setActiveTab(tab);
                if (tab === "code" && codeFiles.length === 0) handlePreviewCode();
              }}
              className={`px-4 py-2 text-sm border-b-2 transition-colors ${
                activeTab === tab
                  ? "border-[var(--accent)] text-white"
                  : "border-transparent text-[var(--text-secondary)] hover:text-white"
              }`}
            >
              {tab === "output" ? "Execution Output" : tab === "code" ? "Generated Code" : "Files"}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 flex overflow-hidden">
          {activeTab === "output" && (
            <div className="flex-1 flex flex-col">
              {/* Test message input */}
              <div className="px-5 py-3 border-b border-[var(--border-color)] shrink-0">
                <label className="text-xs text-[var(--text-secondary)] mb-1 block">
                  Test Input Message
                </label>
                <input
                  className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded px-3 py-2 text-sm focus:border-[var(--accent)] focus:outline-none"
                  value={testMessage}
                  onChange={(e) => setTestMessage(e.target.value)}
                  placeholder="Enter a test message for the agent..."
                />
              </div>

              {/* Output */}
              <div className="flex-1 overflow-auto p-5">
                {isRunning ? (
                  <div className="flex items-center gap-3 text-[var(--text-secondary)]">
                    <span className="animate-spin text-lg">&#9696;</span>
                    <div>
                      <div className="text-sm font-medium text-white">
                        Executing with {FRAMEWORK_LABELS[framework]}...
                      </div>
                      <div className="text-xs mt-1">
                        Generating code, installing dependencies, running with LLM...
                      </div>
                    </div>
                  </div>
                ) : result ? (
                  <div>
                    {/* Status badge */}
                    <div className="flex items-center gap-2 mb-4">
                      <span
                        className={`px-2 py-0.5 rounded text-xs font-medium ${
                          result.success
                            ? "bg-emerald-600/20 text-emerald-400"
                            : "bg-red-600/20 text-red-400"
                        }`}
                      >
                        {result.success ? "PASSED" : "FAILED"}
                      </span>
                      <span className="text-xs text-[var(--text-secondary)]">
                        Exit code: {result.exit_code}
                      </span>
                    </div>

                    {/* Execution Trace */}
                    {result.stdout && (
                      <div className="mb-4">
                        <div className="text-xs text-[var(--text-secondary)] mb-2 uppercase font-semibold">
                          Execution Trace
                        </div>
                        <div className="space-y-2">
                          {parseExecutionTrace(result.stdout).map((step, i) => (
                            <div
                              key={i}
                              className={`rounded-lg border p-3 ${
                                step.type === "system"
                                  ? "border-[var(--border-color)] bg-[var(--bg-primary)]"
                                  : step.type === "agent"
                                  ? "border-blue-800 bg-blue-950/30"
                                  : step.type === "pass"
                                  ? "border-emerald-800 bg-emerald-950/30"
                                  : "border-[var(--border-color)] bg-[var(--bg-primary)]"
                              }`}
                            >
                              <div className="flex items-center gap-2 mb-1">
                                <span
                                  className={`w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold ${
                                    step.type === "agent"
                                      ? "bg-blue-600"
                                      : step.type === "pass"
                                      ? "bg-emerald-600"
                                      : "bg-[#3a3a6a]"
                                  }`}
                                >
                                  {step.type === "agent" ? "A" : step.type === "pass" ? "+" : "#"}
                                </span>
                                <span className="text-xs font-semibold text-white">
                                  {step.label}
                                </span>
                                {step.type === "agent" && (
                                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-600/20 text-blue-400">
                                    Agent Response
                                  </span>
                                )}
                              </div>
                              <div className="text-xs text-[var(--text-secondary)] ml-7 whitespace-pre-wrap">
                                {step.content}
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Raw output toggle */}
                        <details className="mt-3">
                          <summary className="text-[10px] text-[var(--text-secondary)] cursor-pointer hover:text-white">
                            Show raw output
                          </summary>
                          <pre className="mt-1 bg-[var(--bg-primary)] rounded p-3 text-[10px] font-mono text-[var(--text-secondary)] whitespace-pre-wrap overflow-auto max-h-40">
                            {result.stdout}
                          </pre>
                        </details>
                      </div>
                    )}

                    {/* Stderr */}
                    {result.stderr && (
                      <div>
                        <div className="text-xs text-[var(--text-secondary)] mb-1 uppercase font-semibold">
                          {result.success ? "Warnings" : "Errors"}
                        </div>
                        <pre className="bg-[#1a0a0a] rounded-lg p-4 text-xs font-mono text-red-300 whitespace-pre-wrap overflow-auto max-h-[30vh]">
                          {result.stderr}
                        </pre>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center text-[var(--text-secondary)] mt-20">
                    <div className="text-4xl mb-4">&#9654;</div>
                    <div className="text-sm">
                      Click <strong>Run Test</strong> to generate{" "}
                      {FRAMEWORK_LABELS[framework]} code and execute it with a real LLM
                    </div>
                    <div className="text-xs mt-2">
                      The agent will process your test message and return a response
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === "code" && (
            <div className="flex-1 flex">
              {/* File tree */}
              <div className="w-64 border-r border-[var(--border-color)] overflow-y-auto shrink-0">
                <div className="p-2 text-xs text-[var(--text-secondary)] uppercase font-semibold">
                  Generated Files ({codeFiles.length})
                </div>
                {codeFiles.map((file) => (
                  <button
                    key={file.path}
                    onClick={() => setSelectedFile(file.path)}
                    className={`w-full text-left px-3 py-1.5 text-xs truncate hover:bg-[var(--bg-primary)] ${
                      selectedFile === file.path
                        ? "bg-[var(--bg-primary)] text-[var(--accent)]"
                        : "text-[var(--text-secondary)]"
                    }`}
                  >
                    {file.path}
                  </button>
                ))}
              </div>

              {/* Code viewer */}
              <div className="flex-1 overflow-auto">
                {isGenerating ? (
                  <div className="p-5 text-sm text-[var(--text-secondary)]">Generating...</div>
                ) : currentFile ? (
                  <pre className="p-5 text-xs font-mono text-[var(--text-primary)] whitespace-pre-wrap">
                    {currentFile.content}
                  </pre>
                ) : (
                  <div className="p-5 text-sm text-[var(--text-secondary)]">
                    Select a file to view
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === "files" && (
            <div className="flex-1 p-5 overflow-auto">
              <div className="text-sm mb-4">
                Generated project structure for{" "}
                <strong>{FRAMEWORK_LABELS[framework]}</strong>:
              </div>
              <div className="bg-[var(--bg-primary)] rounded-lg p-4 font-mono text-xs">
                {codeFiles.length > 0
                  ? codeFiles.map((f) => (
                      <div key={f.path} className="py-0.5 text-[var(--text-secondary)]">
                        {f.path}
                      </div>
                    ))
                  : "Click 'Preview Code' to generate the project structure."}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Execution trace parser
// ============================================================================

interface TraceStep {
  type: "system" | "agent" | "pass" | "info";
  label: string;
  content: string;
}

function parseExecutionTrace(stdout: string): TraceStep[] {
  const steps: TraceStep[] = [];
  const lines = stdout.split("\n");

  let i = 0;
  while (i < lines.length) {
    const line = lines[i].trim();

    // [TEST] lines → system steps
    if (line.startsWith("[TEST]")) {
      const msg = line.replace("[TEST]", "").trim();
      if (msg.includes("PASS")) {
        steps.push({ type: "pass", label: "Test Passed", content: msg });
      } else {
        steps.push({ type: "system", label: "System", content: msg });
      }
      i++;
      continue;
    }

    // [ALL TESTS PASSED]
    if (line.includes("[ALL TESTS PASSED]")) {
      steps.push({ type: "pass", label: "All Tests Passed", content: "Workflow executed successfully" });
      i++;
      continue;
    }

    // [agent_name]: response → agent response
    const agentMatch = line.match(/^\s*\[(.+?)\]:\s*(.*)$/);
    if (agentMatch) {
      const agentName = agentMatch[1];
      let content = agentMatch[2];

      // Collect multi-line agent responses
      i++;
      while (i < lines.length) {
        const nextLine = lines[i];
        if (
          nextLine.trim().startsWith("[") ||
          nextLine.trim().startsWith("---") ||
          nextLine.trim() === ""
        ) {
          break;
        }
        content += "\n" + nextLine;
        i++;
      }

      steps.push({
        type: "agent",
        label: agentName,
        content: content.trim(),
      });
      continue;
    }

    // sub_agent: lines from import test
    const subAgentMatch = line.match(/^\s*sub_agent:\s*(.+)$/);
    if (subAgentMatch) {
      steps.push({
        type: "info",
        label: "Agent Hierarchy",
        content: subAgentMatch[1],
      });
      i++;
      continue;
    }

    // root_agent lines
    const rootMatch = line.match(/^\s*root_agent:\s*(.+)$/);
    if (rootMatch) {
      steps.push({
        type: "system",
        label: "Root Agent",
        content: rootMatch[1],
      });
      i++;
      continue;
    }

    // Input line
    const inputMatch = line.match(/^\s*Input:\s*(.+)$/);
    if (inputMatch) {
      steps.push({
        type: "system",
        label: "Test Input",
        content: inputMatch[1],
      });
      i++;
      continue;
    }

    // Skip separator lines and empty lines
    if (line === "" || line.match(/^-+$/) || line.match(/^=+$/)) {
      i++;
      continue;
    }

    // type: line
    const typeMatch = line.match(/^\s*type:\s*(.+)$/);
    if (typeMatch) {
      steps.push({ type: "info", label: "Type", content: typeMatch[1] });
      i++;
      continue;
    }

    i++;
  }

  return steps;
}
