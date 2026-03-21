"use client";

import { useState, useRef, useEffect } from "react";

interface PromptPlaygroundProps {
  agentName: string;
  systemPrompt: string;
  onPromptChange: (prompt: string) => void;
}

interface TestMessage {
  role: "user" | "assistant";
  content: string;
}

export function PromptPlayground({ agentName, systemPrompt, onPromptChange }: PromptPlaygroundProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [testInput, setTestInput] = useState("");
  const [messages, setMessages] = useState<TestMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [editingPrompt, setEditingPrompt] = useState(systemPrompt);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setEditingPrompt(systemPrompt);
  }, [systemPrompt]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleTest = async () => {
    if (!testInput.trim() || isLoading) return;

    const userMsg: TestMessage = { role: "user", content: testInput.trim() };
    setMessages((prev) => [...prev, userMsg]);
    setTestInput("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/v1/copilot/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          project_id: `playground_${agentName}`,
          message: `You are testing an agent with this system prompt:\n\n---\n${editingPrompt}\n---\n\nRespond as that agent would to this user message: "${testInput.trim()}"`,
          ir_document: {
            ir_version: "1.0",
            metadata: { id: "test", name: "Playground" },
            agents: [], tools: [], skills: [],
            workflow: { id: "w", name: "", type: "sequential", state_schema: { fields: [], initial_state: {} }, nodes: [], edges: [], exit_nodes: [] },
            human_in_the_loop: [], hooks: [],
            guardrails: { validators: [] },
            observability: { tracing: { enabled: false, provider: "opentelemetry", sample_rate: 1 }, logging: { level: "info", structured: true }, metrics: { enabled: false, custom_metrics: [] } },
            mcp_servers: [], extensions: {},
          },
          target_framework: "langgraph",
        }),
      });

      const data = await response.json();
      const assistantMsg: TestMessage = {
        role: "assistant",
        content: data.text || data.error || "No response",
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Could not reach the API. Make sure the backend is running." },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSavePrompt = () => {
    onPromptChange(editingPrompt);
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="w-full mt-2 py-1.5 text-xs border border-dashed border-[var(--border-color)] rounded hover:border-[var(--accent)] text-[var(--text-secondary)] hover:text-[var(--accent)] transition-colors"
      >
        Open Prompt Playground
      </button>
    );
  }

  return (
    <div className="mt-2 border border-[var(--border-color)] rounded-lg overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[var(--bg-primary)] border-b border-[var(--border-color)]">
        <span className="text-[10px] font-semibold text-[var(--accent)] uppercase">
          Prompt Playground — {agentName}
        </span>
        <button
          onClick={() => setIsOpen(false)}
          className="text-[10px] text-[var(--text-secondary)] hover:text-white"
        >
          Collapse
        </button>
      </div>

      {/* Prompt editor */}
      <div className="p-2 border-b border-[var(--border-color)]">
        <label className="text-[10px] text-[var(--text-secondary)] mb-1 block">System Prompt</label>
        <textarea
          className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded px-2 py-1.5 text-xs font-mono text-[var(--text-primary)] focus:border-[var(--accent)] focus:outline-none resize-y"
          rows={4}
          value={editingPrompt}
          onChange={(e) => setEditingPrompt(e.target.value)}
        />
        {editingPrompt !== systemPrompt && (
          <button
            onClick={handleSavePrompt}
            className="mt-1 px-2 py-0.5 text-[10px] bg-[var(--accent)] text-white rounded"
          >
            Save Changes
          </button>
        )}
      </div>

      {/* Test chat */}
      <div className="h-40 overflow-y-auto p-2 space-y-2">
        {messages.length === 0 && (
          <p className="text-[10px] text-[var(--text-secondary)] text-center mt-4">
            Type a message to test how this agent responds
          </p>
        )}
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`text-xs ${
              msg.role === "user"
                ? "bg-[var(--bg-primary)] rounded p-1.5 ml-4"
                : "text-[var(--text-secondary)] p-1.5"
            }`}
          >
            {msg.content}
          </div>
        ))}
        {isLoading && (
          <div className="text-xs text-[var(--text-secondary)] animate-pulse p-1.5">
            Responding...
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="flex gap-1 p-2 border-t border-[var(--border-color)]">
        <input
          className="flex-1 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded px-2 py-1 text-xs focus:border-[var(--accent)] focus:outline-none"
          placeholder="Test message..."
          value={testInput}
          onChange={(e) => setTestInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleTest()}
          disabled={isLoading}
        />
        <button
          onClick={handleTest}
          disabled={isLoading || !testInput.trim()}
          className="px-2 py-1 bg-[var(--accent)] text-white rounded text-xs disabled:opacity-50"
        >
          Test
        </button>
        <button
          onClick={() => setMessages([])}
          className="px-2 py-1 border border-[var(--border-color)] text-[var(--text-secondary)] rounded text-xs hover:text-white"
        >
          Clear
        </button>
      </div>
    </div>
  );
}
