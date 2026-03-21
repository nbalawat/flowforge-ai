/**
 * Execution API client — run generated code and download projects.
 *
 * For long-running operations (execution, download), we call the backend
 * directly to avoid the Next.js rewrite proxy timeout (~30s).
 */

import type { IRDocument, TargetFramework } from "../ir/types";

export interface ExecutionResult {
  success: boolean;
  stdout: string;
  stderr: string;
  exit_code: number;
  generated_files: string[];
  error: string;
  run_id: string;
}

// For long-running calls, bypass the Next.js proxy and call backend directly.
// In browser context, we detect if we're in Docker (backend at port 8000) or local dev (8010).
function getDirectBackendUrl(): string {
  if (typeof window === "undefined") return "/api/v1";

  // Use the same host but port 8010 (the published backend port)
  const host = window.location.hostname;
  return `http://${host}:8010/api/v1`;
}

const API_BASE = "/api/v1";

export async function executeWorkflow(
  irDocument: IRDocument,
  targetFramework: TargetFramework,
  testMessage: string = "I have a billing issue with my account.",
  projectName?: string
): Promise<ExecutionResult> {
  // Use direct backend URL to avoid Next.js proxy timeout
  const backendUrl = getDirectBackendUrl();

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 180_000); // 3 min timeout

    const response = await fetch(`${backendUrl}/execution/run`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ir_document: irDocument,
        target_framework: targetFramework,
        test_message: testMessage,
        project_name: projectName,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const detail = await response.text();
      return {
        success: false,
        stdout: "",
        stderr: `API error (${response.status}): ${detail}`,
        exit_code: -1,
        generated_files: [],
        error: detail,
        run_id: "",
      };
    }

    return response.json();
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      success: false,
      stdout: "",
      stderr: message.includes("abort")
        ? "Execution timed out after 3 minutes"
        : `Network error: ${message}`,
      exit_code: -1,
      generated_files: [],
      error: message,
      run_id: "",
    };
  }
}

export async function downloadProject(
  irDocument: IRDocument,
  targetFramework: TargetFramework,
  projectName?: string
): Promise<void> {
  const backendUrl = getDirectBackendUrl();

  const response = await fetch(`${backendUrl}/execution/download`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ir_document: irDocument,
      target_framework: targetFramework,
      project_name: projectName,
    }),
  });

  if (!response.ok) {
    throw new Error(`Download failed: ${response.status}`);
  }

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  const name = projectName || "project";
  a.download = `${name}_${targetFramework}.zip`;
  a.click();
  URL.revokeObjectURL(url);
}
