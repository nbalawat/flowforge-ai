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

const QUICK_ACTIONS = [
  { label: "Build a pipeline", prompt: "Build me a 3-agent pipeline with a classifier, processor, and responder" },
  { label: "Add an agent", prompt: "Add a new agent to my workflow" },
  { label: "Add HITL", prompt: "Add a human-in-the-loop review step" },
  { label: "Add condition", prompt: "Add a conditional routing node" },
  { label: "Explain workflow", prompt: "Explain what my current workflow does step by step" },
  { label: "Suggest improvements", prompt: "Analyze my workflow and suggest improvements" },
];

export function CopilotChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      content:
        "Hi! I'm your AgentForge copilot. Describe what you want to build, and I'll create it on the canvas.\n\nTry the quick actions below, or type your own request.",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { irDocument, selectedFramework } = useCanvasStore();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      textarea.style.height = Math.min(textarea.scrollHeight, 120) + "px";
    }
  }, [input]);

  const sendMessage = async (text?: string) => {
    const messageText = text || input.trim();
    if (!messageText || isLoading || !irDocument) return;

    const userMessage: ChatMessage = {
      id: `msg_${Date.now()}`,
      role: "user",
      content: messageText,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const response = await sendCopilotMessage(
        irDocument.metadata.id,
        messageText,
        irDocument,
        selectedFramework
      );

      if (response.error) {
        const localResult = processLocally(messageText, irDocument);
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

      let patchDescriptions: string[] = [];
      if (response.patches.length > 0) {
        patchDescriptions = applyIRPatches(response.patches);
      }

      setMessages((prev) => [
        ...prev,
        {
          id: `msg_${Date.now()}`,
          role: "assistant",
          content: response.text || "(Applied changes to canvas)",
          timestamp: new Date(),
          patchDescriptions,
        },
      ]);
    } catch {
      const localResult = processLocally(messageText, irDocument);
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

  const clearChat = () => {
    setMessages([
      {
        id: "welcome_new",
        role: "assistant",
        content: "Chat cleared. How can I help you with your workflow?",
        timestamp: new Date(),
      },
    ]);
  };

  return (
    <div className="w-96 bg-[var(--bg-secondary)] border-l border-[var(--border-color)] flex flex-col shrink-0">
      {/* Header */}
      <div className="h-11 border-b border-[var(--border-color)] flex items-center px-3 justify-between shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-[var(--accent)] flex items-center justify-center text-[10px] font-bold">
            ✦
          </div>
          <span className="text-sm font-semibold text-white">AI Copilot</span>
          <span className="text-[9px] px-1.5 py-0.5 rounded bg-[var(--accent)]/20 text-[var(--accent)]">
            Claude
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <select
            value={selectedFramework}
            onChange={(e) =>
              useCanvasStore.getState().setFramework(e.target.value as any)
            }
            className="text-[10px] bg-[var(--bg-primary)] border border-[var(--border-color)] rounded px-1.5 py-1 text-[var(--text-secondary)]"
          >
            <option value="langgraph">LangGraph</option>
            <option value="google_adk">Google ADK</option>
            <option value="claude_agent_sdk">Claude SDK</option>
            <option value="crewai">CrewAI</option>
            <option value="autogen">AutoGen</option>
            <option value="strands">Strands</option>
          </select>
          <button
            onClick={clearChat}
            className="text-[var(--text-secondary)] hover:text-white p-1 rounded hover:bg-[var(--bg-primary)]"
            title="Clear chat"
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        {messages.map((msg) => (
          <div key={msg.id} className={msg.role === "user" ? "flex justify-end" : ""}>
            {msg.role === "assistant" && (
              <div className="flex gap-2">
                <div className="w-6 h-6 rounded-lg bg-[var(--accent)]/20 flex items-center justify-center text-[10px] shrink-0 mt-0.5">
                  ✦
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-[var(--text-primary)] whitespace-pre-wrap leading-relaxed">
                    {msg.content}
                  </div>
                  {msg.patchDescriptions && msg.patchDescriptions.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {msg.patchDescriptions.map((desc, i) => (
                        <div
                          key={i}
                          className="text-[11px] text-emerald-400 flex items-center gap-1.5 bg-emerald-900/20 px-2 py-1 rounded"
                        >
                          <span className="text-emerald-500">✓</span>
                          <span>{desc}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {msg.role === "user" && (
              <div className="bg-[var(--accent)]/10 border border-[var(--accent)]/20 rounded-xl rounded-tr-sm px-3 py-2 max-w-[85%]">
                <div className="text-sm text-white whitespace-pre-wrap">
                  {msg.content}
                </div>
              </div>
            )}
          </div>
        ))}

        {isLoading && (
          <div className="flex gap-2">
            <div className="w-6 h-6 rounded-lg bg-[var(--accent)]/20 flex items-center justify-center text-[10px] shrink-0">
              ✦
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-[var(--accent)] animate-bounce" style={{ animationDelay: "0ms" }}></div>
              <div className="w-2 h-2 rounded-full bg-[var(--accent)] animate-bounce" style={{ animationDelay: "150ms" }}></div>
              <div className="w-2 h-2 rounded-full bg-[var(--accent)] animate-bounce" style={{ animationDelay: "300ms" }}></div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Quick Actions — show when few messages */}
      {messages.length <= 2 && !isLoading && (
        <div className="px-3 pb-2 shrink-0">
          <p className="text-[10px] text-[var(--text-secondary)] mb-1.5 uppercase font-semibold">Quick Actions</p>
          <div className="flex flex-wrap gap-1.5">
            {QUICK_ACTIONS.map((action) => (
              <button
                key={action.label}
                onClick={() => sendMessage(action.prompt)}
                className="px-2.5 py-1 text-[11px] rounded-full border border-[var(--border-color)] text-[var(--text-secondary)] hover:border-[var(--accent)] hover:text-[var(--accent)] transition-colors"
              >
                {action.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input area */}
      <div className="border-t border-[var(--border-color)] p-3 shrink-0">
        <div className="bg-[var(--bg-primary)] rounded-xl border border-[var(--border-color)] focus-within:border-[var(--accent)] transition-colors">
          <textarea
            ref={textareaRef}
            className="w-full bg-transparent px-3 py-2.5 text-sm text-[var(--text-primary)] focus:outline-none resize-none placeholder-[var(--text-secondary)]"
            placeholder="Describe what you want to build..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
              }
            }}
            disabled={isLoading}
            rows={1}
            style={{ minHeight: "40px", maxHeight: "120px" }}
          />
          <div className="flex items-center justify-between px-3 pb-2">
            <span className="text-[9px] text-[var(--text-secondary)]">
              Shift+Enter for new line
            </span>
            <button
              onClick={() => sendMessage()}
              disabled={isLoading || !input.trim()}
              className="px-3 py-1 bg-[var(--accent)] text-white rounded-lg text-xs font-medium hover:bg-[var(--accent)]/90 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
            >
              Send
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
