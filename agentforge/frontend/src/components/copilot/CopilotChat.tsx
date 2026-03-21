"use client";

import { useState, useRef, useEffect } from "react";
import { useCanvasStore } from "@/lib/store/canvasStore";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
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
        '- "Help me configure human-in-the-loop for the classifier"',
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
    if (!input.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: `msg_${Date.now()}`,
      role: "user",
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      // TODO: Connect to backend copilot API (Claude)
      // For now, provide a static response
      const assistantMessage: ChatMessage = {
        id: `msg_${Date.now() + 1}`,
        role: "assistant",
        content: getCopilotResponse(input.trim(), irDocument),
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        {
          id: `msg_${Date.now() + 1}`,
          role: "assistant",
          content: "Sorry, I encountered an error. Please try again.",
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-80 bg-[var(--bg-secondary)] border-l border-[var(--border-color)] flex flex-col shrink-0">
      {/* Header */}
      <div className="h-10 border-b border-[var(--border-color)] flex items-center px-3">
        <span className="text-sm font-semibold text-[var(--accent)]">
          AI Copilot
        </span>
        <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded bg-[var(--accent)]/20 text-[var(--accent)]">
          Claude
        </span>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`text-sm ${
              msg.role === "user"
                ? "bg-[var(--bg-primary)] rounded-lg p-2 ml-4"
                : "text-[var(--text-secondary)]"
            }`}
          >
            <div className="whitespace-pre-wrap">{msg.content}</div>
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
        <div className="mt-1 text-[10px] text-[var(--text-secondary)]">
          Target: {selectedFramework}
        </div>
      </div>
    </div>
  );
}

/**
 * Temporary static response generator.
 * Will be replaced with Claude API integration via backend.
 */
function getCopilotResponse(input: string, ir: any): string {
  const lower = input.toLowerCase();

  if (lower.includes("help") || lower.includes("what can")) {
    return (
      "I can help you with:\n\n" +
      "1. **Design workflows**: Describe what you need and I'll suggest an agent architecture\n" +
      "2. **Add agents**: Tell me about a new agent and I'll create it on the canvas\n" +
      "3. **Configure tools**: Help set up tools for your agents\n" +
      "4. **Refine prompts**: Help write effective system prompts\n" +
      "5. **Framework guidance**: Explain differences between LangGraph, ADK, CrewAI, AutoGen, Strands, and Claude SDK"
    );
  }

  if (lower.includes("framework") || lower.includes("difference")) {
    return (
      "Here's a quick comparison of the 6 supported frameworks:\n\n" +
      "- **LangGraph**: Graph-based, explicit state management, great for complex conditional workflows\n" +
      "- **Google ADK**: Hierarchical agents, LLM-based routing, Google ecosystem\n" +
      "- **Claude Agent SDK**: Subagent delegation, native MCP, skills, Anthropic ecosystem\n" +
      "- **CrewAI**: Role-based agents with tasks, simple sequential/hierarchical flows\n" +
      "- **AutoGen**: Conversation-driven, multi-agent group chats\n" +
      "- **AWS Strands**: Model+tools DNA, graph/swarm patterns, AWS native"
    );
  }

  const agentCount = ir?.agents?.length || 0;
  const toolCount = ir?.tools?.length || 0;

  return (
    `I understand you want to: "${input}"\n\n` +
    `Your current workflow has ${agentCount} agent(s) and ${toolCount} tool(s).\n\n` +
    "Once the copilot API is connected, I'll be able to directly modify your canvas. " +
    "For now, use the toolbar on the left to add nodes and configure them in the properties panel."
  );
}
