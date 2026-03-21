/**
 * Local Copilot — parses user intent and produces canvas actions
 * when the backend Claude API is unavailable.
 *
 * This provides a functional copilot experience even without ANTHROPIC_API_KEY.
 * It handles common commands like adding agents, tools, and edges.
 */

import { useCanvasStore } from "../store/canvasStore";
import type { IRDocument } from "../ir/types";

export interface LocalCopilotResult {
  text: string;
  actionsApplied: string[];
}

export function processLocally(
  userMessage: string,
  ir: IRDocument
): LocalCopilotResult {
  const msg = userMessage.toLowerCase().trim();
  const store = useCanvasStore.getState();
  const actions: string[] = [];

  // Calculate auto-layout position
  const maxY = Math.max(...ir.workflow.nodes.map((n) => n.position.y), 50);
  const nextPos = { x: 250, y: maxY + 120 };

  // ── Add agent ──────────────────────────────────────────────
  const addAgentMatch = msg.match(
    /add (?:a |an )?(?:new )?agent (?:called |named )?["""]?([^"""]+?)["""]?$/i
  ) || msg.match(
    /create (?:a |an )?(?:new )?agent (?:called |named )?["""]?([^"""]+?)["""]?$/i
  ) || msg.match(
    /add (?:a |an )?([a-z\s]+?) agent/i
  );

  if (addAgentMatch) {
    const name = addAgentMatch[1].trim().replace(/^(a |an )/, "");
    const capitalName = name.split(" ").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
    store.addAgentNode(
      { name: capitalName, role: `You are a ${capitalName}.`, goal: `Handle ${capitalName.toLowerCase()} tasks` },
      nextPos
    );
    actions.push(`Added agent "${capitalName}"`);
    return {
      text: `I've added a **${capitalName}** agent to the canvas. Click on it to configure its role, goal, and instructions in the properties panel.`,
      actionsApplied: actions,
    };
  }

  // ── Add tool ───────────────────────────────────────────────
  const addToolMatch = msg.match(
    /add (?:a |an )?(?:new )?tool (?:called |named )?["""]?([^"""]+?)["""]?$/i
  ) || msg.match(
    /create (?:a |an )?(?:new )?tool (?:called |named )?["""]?([^"""]+?)["""]?$/i
  );

  if (addToolMatch) {
    const name = addToolMatch[1].trim();
    const snakeName = name.toLowerCase().replace(/\s+/g, "_");
    store.addToolNode(
      { name: snakeName, description: `${name} tool` },
      nextPos
    );
    actions.push(`Added tool "${snakeName}"`);
    return {
      text: `I've added a **${snakeName}** tool to the canvas. You can assign it to agents in the properties panel.`,
      actionsApplied: actions,
    };
  }

  // ── Add human review ───────────────────────────────────────
  if (msg.includes("human") && (msg.includes("review") || msg.includes("loop") || msg.includes("approval"))) {
    store.addHumanInputNode("Please review and approve before proceeding.", nextPos);
    actions.push("Added human review node");
    return {
      text: "I've added a **Human Review** node. Connect it between agents where you want a human to approve or provide feedback before the workflow continues.",
      actionsApplied: actions,
    };
  }

  // ── Add condition ──────────────────────────────────────────
  if (msg.includes("condition") || msg.includes("branch") || msg.includes("if ")) {
    store.addConditionNode("state.get('status') == 'approved'", nextPos);
    actions.push("Added condition node");
    return {
      text: "I've added a **Condition** node. Click on it to set the branching expression. Connect it to two different paths for the true/false branches.",
      actionsApplied: actions,
    };
  }

  // ── Build a pipeline / workflow description ────────────────
  const pipelineMatch = msg.match(/build (?:me )?(?:a )?(\d+)[- ]agent/i) ||
    msg.match(/create (?:a )?(\d+)[- ]agent/i);

  if (pipelineMatch) {
    const count = Math.min(parseInt(pipelineMatch[1]), 5);
    const agentNames = generateAgentNames(msg, count);

    for (let i = 0; i < count; i++) {
      store.addAgentNode(
        {
          name: agentNames[i],
          role: `You are the ${agentNames[i]}.`,
          goal: `Handle ${agentNames[i].toLowerCase()} responsibilities`,
        },
        { x: 250, y: 150 + i * 130 }
      );
      actions.push(`Added agent "${agentNames[i]}"`);
    }

    // Connect them: Start → Agent1 → Agent2 → ... → End
    const nodes = useCanvasStore.getState().irDocument!.workflow.nodes;
    const entryNode = nodes.find(n => n.type === "entry");
    const exitNode = nodes.find(n => n.type === "exit");
    const agentNodes = nodes.filter(n => n.type === "agent").slice(-count);

    if (entryNode && agentNodes.length > 0) {
      store.addEdge({ source: entryNode.id, target: agentNodes[0].id, type: "default" });
      actions.push(`Connected Start → ${agentNames[0]}`);
    }
    for (let i = 0; i < agentNodes.length - 1; i++) {
      store.addEdge({ source: agentNodes[i].id, target: agentNodes[i + 1].id, type: "default" });
      actions.push(`Connected ${agentNames[i]} → ${agentNames[i + 1]}`);
    }
    if (exitNode && agentNodes.length > 0) {
      store.addEdge({ source: agentNodes[agentNodes.length - 1].id, target: exitNode.id, type: "default" });
      actions.push(`Connected ${agentNames[agentNames.length - 1]} → End`);
    }

    // Auto-layout and fit view after building
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent("agentforge:auto-layout"));
    }, 100);

    return {
      text: `I've built a **${count}-agent pipeline** with: ${agentNames.join(", ")}. They're connected sequentially from Start to End.\n\nClick on each agent to customize its role, instructions, and tools.`,
      actionsApplied: actions,
    };
  }

  // ── Connect nodes ──────────────────────────────────────────
  const connectMatch = msg.match(/connect ["""]?(.+?)["""]? to ["""]?(.+?)["""]?$/i);
  if (connectMatch) {
    const sourceName = connectMatch[1].trim().toLowerCase();
    const targetName = connectMatch[2].trim().toLowerCase();
    const nodes = ir.workflow.nodes;
    const source = nodes.find(n => n.name.toLowerCase() === sourceName);
    const target = nodes.find(n => n.name.toLowerCase() === targetName);

    if (source && target) {
      store.addEdge({ source: source.id, target: target.id, type: "default" });
      actions.push(`Connected ${source.name} → ${target.name}`);
      return {
        text: `Connected **${source.name}** to **${target.name}**.`,
        actionsApplied: actions,
      };
    }
  }

  // ── Help ───────────────────────────────────────────────────
  if (msg.includes("help") || msg.includes("what can")) {
    return {
      text: "I can help you build workflows! Try:\n\n" +
        '- **"Add an agent called Data Analyst"** — creates an agent node\n' +
        '- **"Add a tool called web_search"** — creates a tool\n' +
        '- **"Build me a 3-agent customer support pipeline"** — creates a full pipeline\n' +
        '- **"Add a human review"** — adds a HITL approval step\n' +
        '- **"Add a condition"** — adds a branching node\n' +
        '- **"Connect Classifier to Router"** — links two nodes\n\n' +
        "For the full AI-powered experience with architecture suggestions and prompt refinement, " +
        "set your `ANTHROPIC_API_KEY` in the `.env` file.",
      actionsApplied: [],
    };
  }

  // ── Framework info ─────────────────────────────────────────
  if (msg.includes("framework") || msg.includes("difference")) {
    return {
      text: "**6 supported frameworks:**\n\n" +
        "- **LangGraph** — Graph-based, StateGraph with conditional edges, checkpointing, interrupts for HITL\n" +
        "- **Google ADK** — Hierarchical agents (LlmAgent, SequentialAgent, ParallelAgent), LLM-based routing\n" +
        "- **Claude Agent SDK** — Subagent delegation, native MCP, skills system, hooks\n" +
        "- **CrewAI** — Role-based Agents + Tasks + Crews, sequential/hierarchical processes\n" +
        "- **AutoGen** — Multi-agent conversation, async GroupChat, SelectorGroupChat\n" +
        "- **AWS Strands** — Model+Tools, GraphBuilder, swarm patterns, agent-as-tool\n\n" +
        "Select your target framework in the copilot header dropdown.",
      actionsApplied: [],
    };
  }

  // ── Fallback ───────────────────────────────────────────────
  const agentCount = ir.agents.length;
  const nodeCount = ir.workflow.nodes.length;

  return {
    text: `I understand you want to: "${userMessage}"\n\n` +
      `Your workflow currently has **${agentCount} agent(s)** and **${nodeCount} node(s)**.\n\n` +
      "Try specific commands like:\n" +
      '- **"Add an agent called Classifier"**\n' +
      '- **"Build me a 3-agent pipeline"**\n' +
      '- **"Add a human review"**\n\n' +
      "For full natural language understanding, set `ANTHROPIC_API_KEY` in your `.env` file.",
    actionsApplied: [],
  };
}

function generateAgentNames(msg: string, count: number): string[] {
  // Try to extract domain from message
  if (msg.includes("customer support") || msg.includes("support")) {
    return ["Intake Agent", "Classifier", "Response Drafter", "Quality Reviewer", "Escalation Handler"].slice(0, count);
  }
  if (msg.includes("data") || msg.includes("analysis") || msg.includes("analytics")) {
    return ["Data Collector", "Analyzer", "Insight Generator", "Report Writer", "Validator"].slice(0, count);
  }
  if (msg.includes("research")) {
    return ["Researcher", "Summarizer", "Fact Checker", "Writer", "Editor"].slice(0, count);
  }
  if (msg.includes("rag") || msg.includes("retrieval")) {
    return ["Query Processor", "Retriever", "Context Ranker", "Answer Generator", "Validator"].slice(0, count);
  }
  // Generic
  return Array.from({ length: count }, (_, i) => `Agent ${i + 1}`);
}
