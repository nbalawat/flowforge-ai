/**
 * Code generation API client.
 */

import type { IRDocument, TargetFramework } from "../ir/types";

export interface GeneratedFile {
  path: string;
  content: string;
}

export interface GenerateResponse {
  framework: string;
  files: GeneratedFile[];
  requirements: string[];
  errors: string[];
}

export interface FrameworkInfo {
  id: string;
  name: string;
  version: string;
  description: string;
}

const API_BASE = "/api/v1";

export async function generateCode(
  irDocument: IRDocument,
  targetFramework: TargetFramework,
  projectName?: string
): Promise<GenerateResponse> {
  const response = await fetch(`${API_BASE}/generation/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ir_document: irDocument,
      target_framework: targetFramework,
      project_name: projectName,
    }),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Generation failed (${response.status}): ${detail}`);
  }

  return response.json();
}

export async function listFrameworks(): Promise<FrameworkInfo[]> {
  const response = await fetch(`${API_BASE}/generation/frameworks`);
  if (!response.ok) throw new Error("Failed to fetch frameworks");
  const data = await response.json();
  return data.frameworks;
}
