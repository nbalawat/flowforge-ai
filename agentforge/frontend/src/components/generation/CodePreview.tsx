"use client";

import { useState, useEffect } from "react";
import { useCanvasStore } from "@/lib/store/canvasStore";
import { generateCode, type GeneratedFile, type GenerateResponse } from "@/lib/api/generation";
import type { TargetFramework } from "@/lib/ir/types";

export function CodePreview() {
  const { irDocument, selectedFramework } = useCanvasStore();
  const [isOpen, setIsOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState<GenerateResponse | null>(null);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!irDocument) return;
    setIsGenerating(true);
    setError(null);

    try {
      const response = await generateCode(
        irDocument,
        selectedFramework as TargetFramework,
        irDocument.metadata.name.toLowerCase().replace(/\s+/g, "_")
      );
      setResult(response);
      if (response.files.length > 0) {
        setSelectedFile(response.files[0].path);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Generation failed");
    } finally {
      setIsGenerating(false);
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => {
          setIsOpen(true);
          handleGenerate();
        }}
        className="fixed bottom-4 left-20 px-4 py-2 bg-[var(--accent)] text-white rounded-lg shadow-lg text-sm font-medium hover:bg-[var(--accent)]/90 z-50"
      >
        Generate Code
      </button>
    );
  }

  const currentFile = result?.files.find((f) => f.path === selectedFile);

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-[var(--bg-secondary)] rounded-lg border border-[var(--border-color)] w-[90vw] h-[80vh] flex flex-col">
        {/* Header */}
        <div className="h-12 border-b border-[var(--border-color)] flex items-center justify-between px-4 shrink-0">
          <div className="flex items-center gap-3">
            <h2 className="text-sm font-semibold">Generated Code</h2>
            <span className="text-[10px] px-2 py-0.5 rounded bg-blue-600/20 text-blue-400">
              {selectedFramework}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleGenerate}
              disabled={isGenerating}
              className="px-3 py-1 text-xs border border-[var(--border-color)] rounded hover:border-[var(--accent)] disabled:opacity-50"
            >
              {isGenerating ? "Generating..." : "Regenerate"}
            </button>
            <button
              onClick={() => setIsOpen(false)}
              className="px-3 py-1 text-xs border border-[var(--border-color)] rounded hover:border-red-400"
            >
              Close
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 flex overflow-hidden">
          {error ? (
            <div className="flex-1 p-4 text-red-400 text-sm">{error}</div>
          ) : !result ? (
            <div className="flex-1 flex items-center justify-center text-[var(--text-secondary)]">
              {isGenerating ? "Generating..." : "Click Generate to create code"}
            </div>
          ) : (
            <>
              {/* File tree */}
              <div className="w-64 border-r border-[var(--border-color)] overflow-y-auto shrink-0">
                <div className="p-2 text-xs text-[var(--text-secondary)] uppercase font-semibold">
                  Files ({result.files.length})
                </div>
                {result.files.map((file) => (
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

                {result.requirements.length > 0 && (
                  <div className="mt-4 p-2">
                    <div className="text-xs text-[var(--text-secondary)] uppercase font-semibold mb-1">
                      Dependencies
                    </div>
                    {result.requirements.map((req) => (
                      <div key={req} className="text-[10px] text-[var(--text-secondary)] py-0.5">
                        {req}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Code viewer */}
              <div className="flex-1 overflow-auto">
                {currentFile ? (
                  <pre className="p-4 text-xs font-mono text-[var(--text-primary)] whitespace-pre-wrap">
                    {currentFile.content}
                  </pre>
                ) : (
                  <div className="p-4 text-sm text-[var(--text-secondary)]">
                    Select a file to view
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
