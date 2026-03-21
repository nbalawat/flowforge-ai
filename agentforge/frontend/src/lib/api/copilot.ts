/**
 * Copilot API client — sends messages to the backend copilot service
 * and receives text + IR patches from Claude.
 */

import type { IRDocument } from "../ir/types";

export interface IRPatchResponse {
  action: string;
  data: Record<string, unknown>;
  description: string;
}

export interface CopilotChatResponse {
  text: string;
  patches: IRPatchResponse[];
  error: string | null;
}

const API_BASE = "/api/v1";

export async function sendCopilotMessage(
  projectId: string,
  message: string,
  irDocument: IRDocument,
  targetFramework: string
): Promise<CopilotChatResponse> {
  const response = await fetch(`${API_BASE}/copilot/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      project_id: projectId,
      message,
      ir_document: irDocument,
      target_framework: targetFramework,
    }),
  });

  if (!response.ok) {
    const detail = await response.text();
    return {
      text: "",
      patches: [],
      error: `API error (${response.status}): ${detail}`,
    };
  }

  return response.json();
}
