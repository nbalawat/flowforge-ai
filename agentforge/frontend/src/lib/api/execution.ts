/**
 * Execution API client — run generated code and download projects.
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

const API_BASE = "/api/v1";

export async function executeWorkflow(
  irDocument: IRDocument,
  targetFramework: TargetFramework,
  testMessage: string = "I have a billing issue with my account.",
  projectName?: string
): Promise<ExecutionResult> {
  const response = await fetch(`${API_BASE}/execution/run`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ir_document: irDocument,
      target_framework: targetFramework,
      test_message: testMessage,
      project_name: projectName,
    }),
  });

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
}

export async function downloadProject(
  irDocument: IRDocument,
  targetFramework: TargetFramework,
  projectName?: string
): Promise<void> {
  const response = await fetch(`${API_BASE}/execution/download`, {
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
