"use client";

import { useState, useRef, useEffect } from "react";
import { useCanvasStore } from "@/lib/store/canvasStore";
import { sendCopilotMessage } from "@/lib/api/copilot";
import { applyIRPatches } from "@/lib/ir/patchApplier";
import { processLocally } from "@/lib/copilot/localCopilot";

interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: Date;
  patchDescriptions?: string[];
}

export function CopilotChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      content:
        "Hi! I'm your AgentForge copilot. I can help you design agent workflows. Try:\n\n" +
        '- "Build me a 3-agent customer support pipeline"\n' +
        '- "Add a data analyst agent with web search"\n' +
        '- "Help me configure human-in-the-loop for the classifier"\n' +
        '- "What are the differences between the frameworks?"',
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { irDocument, selectedFramework } = useCanvasStore();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || isLoading || !irDocument) return;

    const userMessage: ChatMessage = {
      id: `msg_${Date.now()}`,
      role: "user",
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    const userInput = input.trim();
    setInput("");
    setIsLoading(true);

    try {
      // Try the Claude API backend first
      const response = await sendCopilotMessage(
        irDocument.metadata.id,
        userInput,
        irDocument,
        selectedFramework
      );

      if (response.error) {
        // API unavailable — fall back to local copilot
        const localResult = processLocally(userInput, irDocument);
        setMessages((prev) => [
          ...prev,
          {
            id: `msg_${Date.now()}`,
            role: "assistant",
            content: localResult.text,
            timestamp: new Date(),
            patchDescriptions: localResult.actionsApplied,
          },
        ]);
        return;
      }

      // Apply IR patches to the canvas
      let patchDescriptions: string[] = [];
      if (response.patches.length > 0) {
        patchDescriptions = applyIRPatches(response.patches);
      }

      const assistantMessage: ChatMessage = {
        id: `msg_${Date.now()}`,
        role: "assistant",
        content: response.text || "(Applied changes to canvas)",
        timestamp: new Date(),
        patchDescriptions,
      };
      setMessages((prev) => [...prev, assistantMessage]);
    } catch {
      // Network error — fall back to local copilot
      const localResult = processLocally(userInput, irDocument);
      setMessages((prev) => [
        ...prev,
        {
          id: `msg_${Date.now()}`,
          role: "assistant",
          content: localResult.text,
          timestamp: new Date(),
          patchDescriptions: localResult.actionsApplied,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-80 bg-[var(--bg-secondary)] border-l border-[var(--border-color)] flex flex-col shrink-0">
      {/* Header */}
      <div className="h-10 border-b border-[var(--border-color)] flex items-center px-3 justify-between">
        <div className="flex items-center">
          <span className="text-sm font-semibold text-[var(--accent)]">
            AI Copilot
          </span>
          <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded bg-[var(--accent)]/20 text-[var(--accent)]">
            Claude
          </span>
        </div>
        <select
          value={selectedFramework}
          onChange={(e) =>
            useCanvasStore.getState().setFramework(e.target.value as any)
          }
          className="text-[10px] bg-[var(--bg-primary)] border border-[var(--border-color)] rounded px-1 py-0.5 text-[var(--text-secondary)]"
        >
          <option value="langgraph">LangGraph</option>
          <option value="google_adk">Google ADK</option>
          <option value="claude_agent_sdk">Claude SDK</option>
          <option value="crewai">CrewAI</option>
          <option value="autogen">AutoGen</option>
          <option value="strands">Strands</option>
        </select>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {messages.map((msg) => (
          <div key={msg.id}>
            <div
              className={`text-sm ${
                msg.role === "user"
                  ? "bg-[var(--bg-primary)] rounded-lg p-2 ml-4"
                  : msg.role === "system"
                  ? "text-[10px] text-[var(--text-secondary)] italic"
                  : "text-[var(--text-secondary)]"
              }`}
            >
              <div className="whitespace-pre-wrap">{msg.content}</div>
            </div>

            {/* Show applied patches */}
            {msg.patchDescriptions && msg.patchDescriptions.length > 0 && (
              <div className="mt-1 ml-2 space-y-0.5">
                {msg.patchDescriptions.map((desc, i) => (
                  <div
                    key={i}
                    className="text-[10px] text-emerald-400 flex items-center gap-1"
                  >
                    <span>+</span>
                    <span>{desc}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
        {isLoading && (
          <div className="text-sm text-[var(--text-secondary)] animate-pulse">
            Thinking...
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t border-[var(--border-color)] p-2">
        <div className="flex gap-2">
          <input
            className="flex-1 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[var(--accent)] focus:outline-none"
            placeholder="Describe your workflow..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage()}
            disabled={isLoading}
          />
          <button
            onClick={sendMessage}
            disabled={isLoading || !input.trim()}
            className="px-3 py-2 bg-[var(--accent)] text-white rounded text-sm font-medium hover:bg-[var(--accent)]/90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
