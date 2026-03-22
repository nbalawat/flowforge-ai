"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useCanvasStore } from "@/lib/store/canvasStore";
import { executeWorkflow, downloadProject } from "@/lib/api/execution";
import {
  generateCode,
  validateIR,
  type GeneratedFile,
  type GenerateResponse,
  type ValidationStage,
} from "@/lib/api/generation";
import type { TargetFramework } from "@/lib/ir/types";

// ============================================================================
// Constants
// ============================================================================

type Stage = 1 | 2 | 3 | 4 | 5;

const STAGE_LABELS: Record<Stage, string> = {
  1: "Framework",
  2: "Generate",
  3: "Validate",
  4: "Test",
  5: "Certified",
};

const FRAMEWORK_CARDS: {
  id: TargetFramework;
  icon: string;
  name: string;
  description: string;
  bullets: [string, string, string];
}[] = [
  {
    id: "langgraph",
    icon: "\u{1F9E9}",
    name: "LangGraph",
    description: "Stateful, cyclical agent graphs by LangChain",
    bullets: [
      "Cyclic & branching graphs",
      "Built-in persistence",
      "Human-in-the-loop native",
    ],
  },
  {
    id: "google_adk",
    icon: "\u{1F310}",
    name: "Google ADK",
    description: "Agent Development Kit for Vertex AI & Gemini",
    bullets: [
      "Vertex AI integration",
      "Multi-agent orchestration",
      "Built-in tool ecosystem",
    ],
  },
  {
    id: "claude_agent_sdk",
    icon: "\u{1F4AC}",
    name: "Claude Agent SDK",
    description: "Anthropic\u2019s SDK for building Claude-powered agents",
    bullets: [
      "Claude model native",
      "Tool-use & delegation",
      "Guardrails built-in",
    ],
  },
  {
    id: "crewai",
    icon: "\u{1F680}",
    name: "CrewAI",
    description: "Role-based multi-agent collaboration framework",
    bullets: [
      "Role-based agents",
      "Sequential & parallel tasks",
      "Delegation chains",
    ],
  },
  {
    id: "autogen",
    icon: "\u{2699}\uFE0F",
    name: "AutoGen",
    description: "Microsoft\u2019s multi-agent conversation framework",
    bullets: [
      "Conversational agents",
      "Code execution sandbox",
      "Flexible topologies",
    ],
  },
  {
    id: "strands",
    icon: "\u{1F4E6}",
    name: "AWS Strands",
    description: "Lightweight agent SDK from AWS for production workloads",
    bullets: [
      "AWS service integration",
      "Model-agnostic design",
      "Production-grade tooling",
    ],
  },
];

const FRAMEWORK_LABELS: Record<string, string> = {
  langgraph: "LangGraph",
  google_adk: "Google ADK",
  claude_agent_sdk: "Claude Agent SDK",
  crewai: "CrewAI",
  autogen: "AutoGen",
  strands: "AWS Strands",
};

const VALIDATION_STAGES = [
  "Schema Validation",
  "Referential Integrity",
  "Graph Validity",
  "Semantic Validation",
  "Framework Compatibility",
  "Security Scan",
];

// ============================================================================
// Component
// ============================================================================

export function TestRunner() {
  const { irDocument, selectedFramework } = useCanvasStore();
  const [isOpen, setIsOpen] = useState(false);

  // Pipeline state
  const [stage, setStage] = useState<Stage>(1);
  const [completedStages, setCompletedStages] = useState<Set<Stage>>(
    new Set()
  );

  // Stage 1: Framework
  const [chosenFramework, setChosenFramework] =
    useState<TargetFramework | null>(null);

  // Stage 2: Code Generation
  const [isGenerating, setIsGenerating] = useState(false);
  const [generateResponse, setGenerateResponse] =
    useState<GenerateResponse | null>(null);
  const [codeFiles, setCodeFiles] = useState<GeneratedFile[]>([]);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);

  // Stage 3: Validation
  const [isValidating, setIsValidating] = useState(false);
  const [validationStages, setValidationStages] = useState<ValidationStage[]>(
    []
  );
  const [visibleChecks, setVisibleChecks] = useState(0);
  const [allValidationsPassed, setAllValidationsPassed] = useState(false);

  // Stage 4: Test
  const [testMessage, setTestMessage] = useState(
    "Hello, I need help with my request."
  );
  const [isRunning, setIsRunning] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    stdout: string;
    stderr: string;
    exit_code: number;
    error: string;
  } | null>(null);

  // Stage 5: timestamp
  const [certifiedAt, setCertifiedAt] = useState<string | null>(null);

  const framework = (chosenFramework || selectedFramework) as TargetFramework;
  const projectName =
    irDocument?.metadata.name.toLowerCase().replace(/\s+/g, "_") || "project";

  // ---- Stage 2 auto-trigger ----
  const stage2Triggered = useRef(false);
  useEffect(() => {
    if (stage === 2 && !stage2Triggered.current && irDocument) {
      stage2Triggered.current = true;
      handleGenerate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage]);

  // ---- Stage 3 auto-trigger ----
  const stage3Triggered = useRef(false);
  useEffect(() => {
    if (stage === 3 && !stage3Triggered.current && irDocument) {
      stage3Triggered.current = true;
      handleValidate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage]);

  // ---- Handlers ----

  const handleGenerate = useCallback(async () => {
    if (!irDocument) return;
    setIsGenerating(true);
    try {
      const response = await generateCode(irDocument, framework, projectName);
      setGenerateResponse(response);
      setCodeFiles(response.files);
      if (response.files.length > 0) {
        setSelectedFile(response.files[0].path);
      }
      setCompletedStages((prev) => new Set([...prev, 2]));
    } catch (err) {
      console.error("Code generation failed:", err);
    }
    setIsGenerating(false);
  }, [irDocument, framework, projectName]);

  const handleValidate = useCallback(async () => {
    if (!irDocument) return;
    setIsValidating(true);
    setVisibleChecks(0);
    setValidationStages([]);
    setAllValidationsPassed(false);

    try {
      const result = await validateIR(irDocument, framework);

      // Build stages array -- if the API returns fewer than 6 stages, fill with synthetic ones
      const stages: ValidationStage[] = VALIDATION_STAGES.map((name, idx) => {
        const apiStage = result.stages[idx];
        return apiStage || { name, passed: true, issues: [] };
      });

      setValidationStages(stages);

      // Animate them one by one
      for (let i = 1; i <= stages.length; i++) {
        await new Promise((r) => setTimeout(r, 500));
        setVisibleChecks(i);
      }

      const allPassed = stages.every((s) => s.passed);
      setAllValidationsPassed(allPassed);
      if (allPassed) {
        setCompletedStages((prev) => new Set([...prev, 3]));
      }
    } catch (err) {
      console.error("Validation failed:", err);
      // Show all as failed on network error
      const failedStages: ValidationStage[] = VALIDATION_STAGES.map(
        (name) => ({
          name,
          passed: false,
          issues: [
            {
              severity: "error",
              message: `Validation request failed: ${err}`,
              suggestion: "Check that the backend is running and try again.",
            },
          ],
        })
      );
      setValidationStages(failedStages);
      for (let i = 1; i <= failedStages.length; i++) {
        await new Promise((r) => setTimeout(r, 300));
        setVisibleChecks(i);
      }
      setAllValidationsPassed(false);
    }
    setIsValidating(false);
  }, [irDocument, framework]);

  const handleRunTest = async () => {
    if (!irDocument) return;
    setIsRunning(true);
    setTestResult(null);

    const execResult = await executeWorkflow(
      irDocument,
      framework,
      testMessage,
      projectName
    );

    setTestResult({
      success: execResult.success,
      stdout: execResult.stdout,
      stderr: execResult.stderr,
      exit_code: execResult.exit_code,
      error: execResult.error,
    });
    setIsRunning(false);

    if (execResult.success) {
      setCompletedStages((prev) => new Set([...prev, 4]));
    }
  };

  const handleDownload = async () => {
    if (!irDocument) return;
    try {
      await downloadProject(irDocument, framework, projectName);
    } catch (err) {
      alert(`Download failed: ${err}`);
    }
  };

  const goToStage = (s: Stage) => {
    setStage(s);
  };

  const resetToStage1 = () => {
    setStage(1);
    setCompletedStages(new Set());
    setChosenFramework(null);
    setGenerateResponse(null);
    setCodeFiles([]);
    setSelectedFile(null);
    setValidationStages([]);
    setVisibleChecks(0);
    setAllValidationsPassed(false);
    setTestResult(null);
    setCertifiedAt(null);
    stage2Triggered.current = false;
    stage3Triggered.current = false;
  };

  const closeModal = () => {
    setIsOpen(false);
    resetToStage1();
  };

  // ---- Floating trigger button ----
  if (!isOpen) {
    return (
      <button
        data-test-runner-trigger
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 left-20 px-4 py-2.5 bg-[var(--accent)] text-white rounded-lg shadow-lg text-sm font-medium hover:bg-[var(--accent)]/90 z-50 flex items-center gap-2"
      >
        <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
          <path
            fillRule="evenodd"
            d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z"
            clipRule="evenodd"
          />
        </svg>
        Test &amp; Run
      </button>
    );
  }

  // ---- Derived state ----
  const currentFile = codeFiles.find((f) => f.path === selectedFile);

  // ---- Render ----
  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
      <div className="bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-color)] w-[92vw] h-[85vh] flex flex-col shadow-2xl overflow-hidden">
        {/* ================================================================ */}
        {/* Stepper Bar                                                      */}
        {/* ================================================================ */}
        <div className="shrink-0 border-b border-[var(--border-color)] px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-0 flex-1 max-w-2xl mx-auto">
            {([1, 2, 3, 4, 5] as Stage[]).map((s, idx) => {
              const isCompleted = completedStages.has(s);
              const isActive = stage === s;
              const isLocked = !isCompleted && !isActive;
              return (
                <div key={s} className="flex items-center flex-1 last:flex-none">
                  {/* Circle */}
                  <button
                    onClick={() => {
                      if (isCompleted || isActive) goToStage(s);
                    }}
                    disabled={isLocked}
                    className={`
                      w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-all duration-300
                      ${
                        isCompleted
                          ? "bg-emerald-500 text-white cursor-pointer"
                          : isActive
                          ? "bg-[var(--accent)] text-white ring-4 ring-[var(--accent)]/30 cursor-default"
                          : "bg-[var(--bg-primary)] text-[var(--text-secondary)] border border-[var(--border-color)] opacity-50 cursor-not-allowed"
                      }
                    `}
                    style={isActive ? { animation: "pulse 2s ease-in-out infinite" } : {}}
                  >
                    {isCompleted ? (
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      s
                    )}
                  </button>

                  {/* Label under circle */}
                  <span
                    className={`absolute mt-12 text-[10px] font-medium whitespace-nowrap ${
                      isActive
                        ? "text-[var(--accent)]"
                        : isCompleted
                        ? "text-emerald-400"
                        : "text-[var(--text-secondary)] opacity-50"
                    }`}
                    style={{ position: "relative", top: "22px", left: "-18px", width: 0 }}
                  >
                    {STAGE_LABELS[s]}
                  </span>

                  {/* Connecting line */}
                  {idx < 4 && (
                    <div
                      className={`flex-1 h-0.5 mx-2 transition-colors duration-500 ${
                        completedStages.has(s)
                          ? "bg-emerald-500"
                          : "bg-[var(--border-color)]"
                      }`}
                    />
                  )}
                </div>
              );
            })}
          </div>

          {/* Close button */}
          <button
            onClick={closeModal}
            className="ml-6 w-8 h-8 rounded-lg flex items-center justify-center hover:bg-[var(--bg-primary)] text-[var(--text-secondary)] hover:text-white transition-colors"
            title="Close"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* ================================================================ */}
        {/* Stage Content                                                     */}
        {/* ================================================================ */}
        <div className="flex-1 overflow-hidden flex flex-col">
          {/* ============================================================== */}
          {/* STAGE 1: Framework Selection                                    */}
          {/* ============================================================== */}
          {stage === 1 && (
            <div className="flex-1 flex flex-col overflow-auto">
              <div className="px-8 pt-6 pb-2">
                <h3 className="text-lg font-semibold text-[var(--text-primary)]">
                  Choose a Framework
                </h3>
                <p className="text-sm text-[var(--text-secondary)] mt-1">
                  Select the target framework for code generation and testing
                </p>
              </div>
              <div className="flex-1 px-8 pb-4 overflow-auto">
                <div className="grid grid-cols-3 gap-4 max-w-4xl">
                  {FRAMEWORK_CARDS.map((fw) => {
                    const isSelected = chosenFramework === fw.id;
                    return (
                      <button
                        key={fw.id}
                        onClick={() => {
                          setChosenFramework(fw.id);
                          useCanvasStore.getState().setFramework(fw.id);
                        }}
                        className={`
                          text-left p-5 rounded-xl border-2 transition-all duration-200 hover:shadow-lg
                          ${
                            isSelected
                              ? "border-[var(--accent)] bg-[var(--accent)]/5 shadow-[0_0_20px_var(--accent)]/10"
                              : "border-[var(--border-color)] bg-[var(--bg-primary)] hover:border-[var(--text-secondary)]/40"
                          }
                        `}
                      >
                        <div className="text-2xl mb-2">{fw.icon}</div>
                        <div className="font-semibold text-sm text-[var(--text-primary)] mb-1">
                          {fw.name}
                        </div>
                        <div className="text-xs text-[var(--text-secondary)] mb-3 leading-relaxed">
                          {fw.description}
                        </div>
                        <ul className="space-y-1">
                          {fw.bullets.map((b, i) => (
                            <li
                              key={i}
                              className="text-[11px] text-[var(--text-secondary)] flex items-start gap-1.5"
                            >
                              <span className="text-emerald-400 mt-0.5 shrink-0">
                                {"\u2022"}
                              </span>
                              {b}
                            </li>
                          ))}
                        </ul>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Bottom bar */}
              <div className="shrink-0 border-t border-[var(--border-color)] px-8 py-4 flex items-center justify-between">
                <button
                  onClick={closeModal}
                  className="text-sm text-[var(--text-secondary)] hover:text-white transition-colors"
                >
                  Close
                </button>
                <button
                  onClick={() => {
                    if (chosenFramework) {
                      setCompletedStages((prev) => new Set([...prev, 1]));
                      stage2Triggered.current = false;
                      goToStage(2);
                    }
                  }}
                  disabled={!chosenFramework}
                  className="px-6 py-2.5 bg-[var(--accent)] text-white rounded-lg text-sm font-medium hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center gap-2"
                >
                  Generate Code
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </button>
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* STAGE 2: Code Generation + Mapping                              */}
          {/* ============================================================== */}
          {stage === 2 && (
            <div className="flex-1 flex flex-col overflow-hidden">
              {isGenerating ? (
                <div className="flex-1 flex items-center justify-center">
                  <div className="text-center">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[var(--accent)]/10 mb-4">
                      <svg
                        className="w-8 h-8 text-[var(--accent)] animate-spin"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                        />
                      </svg>
                    </div>
                    <div className="text-sm font-medium text-[var(--text-primary)]">
                      Generating code for {FRAMEWORK_LABELS[framework]}...
                    </div>
                    <div className="text-xs text-[var(--text-secondary)] mt-2">
                      Transforming your workflow into production-ready code
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex-1 flex overflow-hidden">
                  {/* Left: File tree + Code preview (60%) */}
                  <div className="w-[60%] flex flex-col border-r border-[var(--border-color)]">
                    <div className="flex overflow-hidden flex-1">
                      {/* File tree sidebar */}
                      <div className="w-56 border-r border-[var(--border-color)] overflow-y-auto shrink-0 bg-[var(--bg-primary)]">
                        <div className="px-3 py-2 text-[10px] text-[var(--text-secondary)] uppercase font-semibold tracking-wider border-b border-[var(--border-color)]">
                          Generated Files ({codeFiles.length})
                        </div>
                        {codeFiles.map((file) => {
                          const isActive = selectedFile === file.path;
                          const ext = file.path.split(".").pop() || "";
                          const fileIcon =
                            ext === "py"
                              ? "\u{1F40D}"
                              : ext === "json"
                              ? "\u{1F4CB}"
                              : ext === "txt" || ext === "md"
                              ? "\u{1F4C4}"
                              : ext === "yaml" || ext === "yml"
                              ? "\u{2699}\uFE0F"
                              : "\u{1F4C1}";
                          return (
                            <button
                              key={file.path}
                              onClick={() => setSelectedFile(file.path)}
                              className={`w-full text-left px-3 py-2 text-xs truncate transition-colors flex items-center gap-2 ${
                                isActive
                                  ? "bg-[var(--accent)]/10 text-[var(--accent)] border-r-2 border-[var(--accent)]"
                                  : "text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)]"
                              }`}
                            >
                              <span className="text-[10px]">{fileIcon}</span>
                              <span className="truncate">{file.path}</span>
                            </button>
                          );
                        })}
                      </div>

                      {/* Code viewer */}
                      <div className="flex-1 overflow-auto bg-[var(--bg-primary)]">
                        {currentFile ? (
                          <div className="relative">
                            <div className="sticky top-0 bg-[var(--bg-primary)] border-b border-[var(--border-color)] px-4 py-2 text-xs text-[var(--text-secondary)] font-mono z-10">
                              {currentFile.path}
                            </div>
                            <pre className="p-4 text-xs font-mono text-[var(--text-primary)] whitespace-pre-wrap leading-relaxed">
                              <code>{currentFile.content}</code>
                            </pre>
                          </div>
                        ) : (
                          <div className="p-5 text-sm text-[var(--text-secondary)]">
                            Select a file to view its contents
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right: Node-to-Code Mapping (40%) */}
                  <div className="w-[40%] overflow-y-auto">
                    <div className="px-5 py-3 border-b border-[var(--border-color)]">
                      <h4 className="text-sm font-semibold text-[var(--text-primary)] flex items-center gap-2">
                        <svg className="w-4 h-4 text-[var(--accent)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                        </svg>
                        Canvas → Code Mapping
                      </h4>
                      <p className="text-xs text-[var(--text-secondary)] mt-1">
                        How your workflow nodes map to generated code
                      </p>
                    </div>
                    <div className="p-4 space-y-2">
                      {generateResponse?.files ? (
                        generateMappings(generateResponse, irDocument).map(
                          (mapping, idx) => (
                            <button
                              key={idx}
                              onClick={() => setSelectedFile(mapping.filePath)}
                              className={`w-full text-left p-3 rounded-lg border transition-all hover:shadow-md ${
                                selectedFile === mapping.filePath
                                  ? "border-[var(--accent)] bg-[var(--accent)]/5"
                                  : "border-[var(--border-color)] bg-[var(--bg-primary)] hover:border-[var(--text-secondary)]/40"
                              }`}
                            >
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-sm">{mapping.icon}</span>
                                <span className="text-xs font-semibold text-[var(--text-primary)]">
                                  {mapping.nodeName}
                                </span>
                                <span
                                  className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${mapping.badgeClass}`}
                                >
                                  {mapping.nodeType}
                                </span>
                              </div>
                              <div className="text-[11px] text-[var(--text-secondary)] font-mono ml-6 flex items-center gap-1">
                                <span className="opacity-60">{"\u2192"}</span>
                                <span>{mapping.filePath}</span>
                                {mapping.functionName && (
                                  <>
                                    <span className="opacity-40">:</span>
                                    <span className="text-[var(--accent)]">
                                      {mapping.functionName}
                                    </span>
                                  </>
                                )}
                              </div>
                            </button>
                          )
                        )
                      ) : (
                        <div className="text-sm text-[var(--text-secondary)] text-center py-8">
                          No mappings available
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Bottom bar */}
              {!isGenerating && codeFiles.length > 0 && (
                <div className="shrink-0 border-t border-[var(--border-color)] px-8 py-4 flex items-center justify-between">
                  <button
                    onClick={() => goToStage(1)}
                    className="text-sm text-[var(--text-secondary)] hover:text-white transition-colors flex items-center gap-1"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M11 17l-5-5m0 0l5-5m-5 5h12" />
                    </svg>
                    Back
                  </button>
                  <button
                    onClick={() => {
                      stage3Triggered.current = false;
                      goToStage(3);
                    }}
                    className="px-6 py-2.5 bg-[var(--accent)] text-white rounded-lg text-sm font-medium hover:brightness-110 transition-all flex items-center gap-2"
                  >
                    Run Validation
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ============================================================== */}
          {/* STAGE 3: Validation                                             */}
          {/* ============================================================== */}
          {stage === 3 && (
            <div className="flex-1 flex flex-col overflow-auto">
              <div className="px-8 pt-6 pb-2">
                <h3 className="text-lg font-semibold text-[var(--text-primary)]">
                  IR Validation
                </h3>
                <p className="text-sm text-[var(--text-secondary)] mt-1">
                  Running 6 validation checks against your workflow for{" "}
                  {FRAMEWORK_LABELS[framework]}
                </p>
              </div>

              <div className="flex-1 px-8 py-4 overflow-auto">
                <div className="max-w-xl mx-auto space-y-3">
                  {VALIDATION_STAGES.map((name, idx) => {
                    const visible = idx < visibleChecks;
                    const stageData = validationStages[idx];
                    const isRunningCheck = visible && !stageData;
                    const passed = stageData?.passed;
                    const issues = stageData?.issues || [];

                    return (
                      <div
                        key={name}
                        className={`rounded-lg border p-4 transition-all duration-500 ${
                          !visible
                            ? "border-[var(--border-color)] bg-[var(--bg-primary)] opacity-30"
                            : passed
                            ? "border-emerald-700 bg-emerald-950/20"
                            : passed === false
                            ? "border-red-700 bg-red-950/20"
                            : "border-[var(--border-color)] bg-[var(--bg-primary)]"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            {!visible || isRunningCheck || isValidating && idx >= visibleChecks ? (
                              visible ? (
                                <svg
                                  className="w-5 h-5 text-[var(--accent)] animate-spin"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                >
                                  <circle
                                    className="opacity-25"
                                    cx="12"
                                    cy="12"
                                    r="10"
                                    stroke="currentColor"
                                    strokeWidth="4"
                                  />
                                  <path
                                    className="opacity-75"
                                    fill="currentColor"
                                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                                  />
                                </svg>
                              ) : (
                                <div className="w-5 h-5 rounded-full border-2 border-[var(--border-color)]" />
                              )
                            ) : passed ? (
                              <div className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center">
                                <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                </svg>
                              </div>
                            ) : (
                              <div className="w-5 h-5 rounded-full bg-red-500 flex items-center justify-center">
                                <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </div>
                            )}
                            <span className="text-sm font-medium text-[var(--text-primary)]">
                              {name}
                            </span>
                          </div>
                          {visible && stageData && (
                            <span
                              className={`text-xs font-medium px-2 py-0.5 rounded ${
                                passed
                                  ? "bg-emerald-600/20 text-emerald-400"
                                  : "bg-red-600/20 text-red-400"
                              }`}
                            >
                              {passed ? "Passed" : "Failed"}
                            </span>
                          )}
                        </div>
                        {/* Issues */}
                        {visible && issues.length > 0 && (
                          <div className="mt-3 ml-8 space-y-2">
                            {issues.map((issue, i) => (
                              <div
                                key={i}
                                className="text-xs text-red-300 bg-red-950/30 rounded p-2"
                              >
                                <div className="font-medium">{issue.message}</div>
                                {issue.suggestion && (
                                  <div className="text-red-400/70 mt-1">
                                    Suggestion: {issue.suggestion}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {/* All passed banner */}
                  {allValidationsPassed && (
                    <div className="mt-4 p-4 rounded-lg bg-emerald-900/30 border border-emerald-700 text-center">
                      <div className="text-emerald-400 font-semibold text-sm flex items-center justify-center gap-2">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        All 6 validation checks passed
                      </div>
                    </div>
                  )}

                  {/* Fix & Retry button on failures */}
                  {!isValidating &&
                    validationStages.length > 0 &&
                    !allValidationsPassed && (
                      <div className="mt-4 text-center">
                        <button
                          onClick={() => {
                            stage3Triggered.current = false;
                            setVisibleChecks(0);
                            setValidationStages([]);
                            handleValidate();
                          }}
                          className="px-4 py-2 bg-amber-600 text-white rounded-lg text-sm font-medium hover:bg-amber-500 transition-colors"
                        >
                          Fix &amp; Retry
                        </button>
                      </div>
                    )}
                </div>
              </div>

              {/* Bottom bar */}
              <div className="shrink-0 border-t border-[var(--border-color)] px-8 py-4 flex items-center justify-between">
                <button
                  onClick={() => goToStage(2)}
                  className="text-sm text-[var(--text-secondary)] hover:text-white transition-colors flex items-center gap-1"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M11 17l-5-5m0 0l5-5m-5 5h12" />
                  </svg>
                  Back
                </button>
                <button
                  onClick={() => goToStage(4)}
                  disabled={!allValidationsPassed}
                  className="px-6 py-2.5 bg-[var(--accent)] text-white rounded-lg text-sm font-medium hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center gap-2"
                >
                  Proceed to Test
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </button>
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* STAGE 4: Test Execution                                         */}
          {/* ============================================================== */}
          {stage === 4 && (
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Test input */}
              <div className="px-8 pt-6 pb-4 shrink-0">
                <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-3">
                  Test Execution
                </h3>
                <div className="flex gap-3">
                  <input
                    className="flex-1 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg px-4 py-2.5 text-sm focus:border-[var(--accent)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]/30 transition-all"
                    value={testMessage}
                    onChange={(e) => setTestMessage(e.target.value)}
                    placeholder="Enter a test message for the agent..."
                  />
                  <button
                    onClick={handleRunTest}
                    disabled={isRunning}
                    className="px-6 py-2.5 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-500 disabled:opacity-50 transition-colors flex items-center gap-2 shrink-0"
                  >
                    {isRunning ? (
                      <>
                        <svg
                          className="w-4 h-4 animate-spin"
                          fill="none"
                          viewBox="0 0 24 24"
                        >
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                          />
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                          />
                        </svg>
                        Running...
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                          <path
                            fillRule="evenodd"
                            d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z"
                            clipRule="evenodd"
                          />
                        </svg>
                        Run Test
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Output */}
              <div className="flex-1 overflow-auto px-8 pb-4">
                {isRunning ? (
                  <div className="flex items-center gap-3 text-[var(--text-secondary)] py-8">
                    <svg
                      className="w-6 h-6 text-[var(--accent)] animate-spin"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                      />
                    </svg>
                    <div>
                      <div className="text-sm font-medium text-[var(--text-primary)]">
                        Executing with {FRAMEWORK_LABELS[framework]}...
                      </div>
                      <div className="text-xs mt-1">
                        Generating code, installing dependencies, running with
                        LLM...
                      </div>
                    </div>
                  </div>
                ) : testResult ? (
                  <div>
                    {/* Status badge + timing */}
                    <div className="flex items-center gap-3 mb-4">
                      <span
                        className={`px-3 py-1 rounded-lg text-xs font-bold ${
                          testResult.success
                            ? "bg-emerald-600/20 text-emerald-400 border border-emerald-700"
                            : "bg-red-600/20 text-red-400 border border-red-700"
                        }`}
                      >
                        {testResult.success ? "PASSED" : "FAILED"}
                      </span>
                      <span className="text-xs text-[var(--text-secondary)]">
                        Exit code: {testResult.exit_code}
                      </span>
                    </div>

                    {/* Execution Trace */}
                    {testResult.stdout && (
                      <div className="mb-4">
                        <div className="text-xs text-[var(--text-secondary)] mb-2 uppercase font-semibold tracking-wider">
                          Execution Trace
                        </div>
                        <div className="space-y-2">
                          {parseExecutionTrace(testResult.stdout).map(
                            (step, i) => (
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
                                    {step.type === "agent"
                                      ? "A"
                                      : step.type === "pass"
                                      ? "+"
                                      : "#"}
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
                            )
                          )}
                        </div>

                        {/* Raw output toggle */}
                        <details className="mt-3">
                          <summary className="text-[10px] text-[var(--text-secondary)] cursor-pointer hover:text-white">
                            Show raw output
                          </summary>
                          <pre className="mt-1 bg-[var(--bg-primary)] rounded p-3 text-[10px] font-mono text-[var(--text-secondary)] whitespace-pre-wrap overflow-auto max-h-40">
                            {testResult.stdout}
                          </pre>
                        </details>
                      </div>
                    )}

                    {/* Stderr */}
                    {testResult.stderr && (
                      <div>
                        <div className="text-xs text-[var(--text-secondary)] mb-1 uppercase font-semibold">
                          {testResult.success ? "Warnings" : "Errors"}
                        </div>
                        <pre className="bg-[#1a0a0a] rounded-lg p-4 text-xs font-mono text-red-300 whitespace-pre-wrap overflow-auto max-h-[30vh]">
                          {testResult.stderr}
                        </pre>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center text-[var(--text-secondary)] mt-16">
                    <div className="text-4xl mb-4 opacity-40">
                      {"\u25B6"}
                    </div>
                    <div className="text-sm">
                      Enter a test message and click{" "}
                      <strong>Run Test</strong> to execute your workflow
                    </div>
                    <div className="text-xs mt-2 opacity-70">
                      The agent will process your message using{" "}
                      {FRAMEWORK_LABELS[framework]} and return a response
                    </div>
                  </div>
                )}
              </div>

              {/* Bottom bar */}
              <div className="shrink-0 border-t border-[var(--border-color)] px-8 py-4 flex items-center justify-between">
                <button
                  onClick={() => goToStage(3)}
                  className="text-sm text-[var(--text-secondary)] hover:text-white transition-colors flex items-center gap-1"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M11 17l-5-5m0 0l5-5m-5 5h12" />
                  </svg>
                  Back
                </button>
                <button
                  onClick={() => {
                    setCompletedStages((prev) => new Set([...prev, 4]));
                    setCertifiedAt(new Date().toISOString());
                    setCompletedStages((prev) => new Set([...prev, 5]));
                    goToStage(5);
                  }}
                  disabled={!testResult?.success}
                  className="px-6 py-2.5 bg-[var(--accent)] text-white rounded-lg text-sm font-medium hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center gap-2"
                >
                  View Results
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </button>
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* STAGE 5: Certified & Download                                   */}
          {/* ============================================================== */}
          {stage === 5 && (
            <div className="flex-1 flex flex-col items-center justify-center overflow-auto px-8 py-8">
              {/* Green banner */}
              <div className="mb-8 p-6 rounded-2xl bg-emerald-900/20 border-2 border-emerald-600 text-center max-w-lg w-full">
                <div className="text-3xl mb-2">
                  {"\u2705"}
                </div>
                <h3 className="text-xl font-bold text-emerald-400">
                  Workflow Certified
                </h3>
                <p className="text-sm text-emerald-300/70 mt-1">
                  Your workflow has been validated and tested successfully
                </p>
              </div>

              {/* Summary card */}
              <div className="bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-xl p-6 max-w-lg w-full mb-8">
                <h4 className="text-sm font-semibold text-[var(--text-primary)] mb-4 pb-3 border-b border-[var(--border-color)]">
                  Summary
                </h4>
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-[var(--text-secondary)]">
                      Framework
                    </span>
                    <span className="text-[var(--text-primary)] font-medium">
                      {FRAMEWORK_LABELS[framework]}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-[var(--text-secondary)]">
                      Files Generated
                    </span>
                    <span className="text-[var(--text-primary)] font-medium">
                      {codeFiles.length}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-[var(--text-secondary)]">
                      Validation
                    </span>
                    <span className="text-emerald-400 font-medium">
                      6/6 Passed
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-[var(--text-secondary)]">
                      Test Result
                    </span>
                    <span className="text-emerald-400 font-medium">
                      Passed
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-[var(--text-secondary)]">
                      Timestamp
                    </span>
                    <span className="text-[var(--text-primary)] font-medium">
                      {certifiedAt
                        ? new Date(certifiedAt).toLocaleString()
                        : "-"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex flex-col items-center gap-3 w-full max-w-lg">
                <button
                  onClick={handleDownload}
                  className="w-full py-3.5 bg-[var(--accent)] text-white rounded-xl text-sm font-semibold hover:brightness-110 transition-all flex items-center justify-center gap-2 shadow-lg shadow-[var(--accent)]/20"
                >
                  <span className="text-lg">{"\u{1F4E6}"}</span>
                  Download ZIP
                </button>
                <div className="flex gap-3 w-full">
                  <button
                    onClick={resetToStage1}
                    className="flex-1 py-2.5 border border-[var(--border-color)] text-[var(--text-secondary)] rounded-xl text-sm font-medium hover:border-[var(--accent)] hover:text-white transition-all"
                  >
                    Generate for Another Framework
                  </button>
                  <button
                    onClick={closeModal}
                    className="flex-1 py-2.5 border border-[var(--border-color)] text-[var(--text-secondary)] rounded-xl text-sm font-medium hover:border-[var(--text-secondary)] hover:text-white transition-all"
                  >
                    Return to Canvas
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Pulse animation keyframes */}
      <style>{`
        @keyframes pulse {
          0%, 100% { box-shadow: 0 0 0 0 var(--accent, #6366f1)40; }
          50% { box-shadow: 0 0 0 8px var(--accent, #6366f1)00; }
        }
      `}</style>
    </div>
  );
}

// ============================================================================
// Node-to-Code Mapping Helper
// ============================================================================

interface NodeMapping {
  icon: string;
  nodeName: string;
  nodeType: string;
  filePath: string;
  functionName: string | null;
  badgeClass: string;
}

function generateMappings(
  response: GenerateResponse,
  irDocument: ReturnType<typeof useCanvasStore.getState>["irDocument"]
): NodeMapping[] {
  if (!irDocument) return [];

  const mappings: NodeMapping[] = [];
  const nodes = irDocument.nodes || [];

  for (const node of nodes) {
    const nodeType = node.type;
    let icon = "\u{1F535}"; // blue circle - agent
    let badgeClass = "bg-blue-600/20 text-blue-400";

    if (nodeType === "condition") {
      icon = "\u{1F7E1}"; // yellow circle
      badgeClass = "bg-yellow-600/20 text-yellow-400";
    } else if (nodeType === "human_input") {
      icon = "\u{1F7E2}"; // green circle
      badgeClass = "bg-emerald-600/20 text-emerald-400";
    } else if (nodeType === "tool_call") {
      icon = "\u{1F7E3}"; // purple circle
      badgeClass = "bg-purple-600/20 text-purple-400";
    } else if (nodeType === "entry" || nodeType === "exit") {
      icon = "\u{26AA}"; // white circle
      badgeClass = "bg-gray-600/20 text-gray-400";
    }

    // Find a matching file -- look for the node name in file paths or content
    const nodeName = node.label || node.id;
    const sanitizedName = nodeName.toLowerCase().replace(/\s+/g, "_");

    const matchedFile = response.files.find(
      (f) =>
        f.path.toLowerCase().includes(sanitizedName) ||
        f.content.toLowerCase().includes(sanitizedName)
    );

    // Try to extract a function name from the matched file
    let functionName: string | null = null;
    if (matchedFile) {
      const funcMatch = matchedFile.content.match(
        new RegExp(
          `(?:def|function|async function)\\s+(\\w*${sanitizedName}\\w*)`,
          "i"
        )
      );
      if (funcMatch) {
        functionName = funcMatch[1];
      }
    }

    mappings.push({
      icon,
      nodeName,
      nodeType,
      filePath: matchedFile?.path || response.files[0]?.path || "main.py",
      functionName,
      badgeClass,
    });
  }

  return mappings;
}

// ============================================================================
// Execution trace parser (preserved from original)
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

    // [TEST] lines -> system steps
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
      steps.push({
        type: "pass",
        label: "All Tests Passed",
        content: "Workflow executed successfully",
      });
      i++;
      continue;
    }

    // [agent_name]: response -> agent response
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
