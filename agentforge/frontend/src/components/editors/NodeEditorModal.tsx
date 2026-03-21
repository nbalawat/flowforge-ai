"use client";

import { Modal } from "@/components/ui/Modal";
import { useCanvasStore } from "@/lib/store/canvasStore";
import { AgentEditor } from "./AgentEditor";
import { ToolEditor } from "./ToolEditor";
import { ConditionEditor } from "./ConditionEditor";
import { HumanInputEditor } from "./HumanInputEditor";
import { LoopEditor } from "./LoopEditor";
import { ParallelEditor } from "./ParallelEditor";

export function NodeEditorModal() {
  const {
    editingNodeId,
    setEditingNode,
    irDocument,
    updateAgent,
    updateTool,
    updateNode,
  } = useCanvasStore();

  if (!editingNodeId || !irDocument) return null;

  const node = irDocument.workflow.nodes.find((n) => n.id === editingNodeId);
  if (!node) return null;

  const handleClose = () => setEditingNode(null);

  // Determine title
  const typeLabels: Record<string, string> = {
    agent: "Agent",
    tool_call: "Tool",
    condition: "Condition",
    human_input: "Human Input",
    loop: "Loop",
    parallel_fan_out: "Parallel Fan-Out",
    parallel_fan_in: "Parallel Fan-In",
  };
  const typeLabel = typeLabels[node.type] || node.type;
  const title = `Edit ${typeLabel}: ${node.name}`;

  // Render editor based on node type
  let editor: React.ReactNode = null;

  if (node.type === "agent" && node.agent_ref) {
    const agent = irDocument.agents.find((a) => a.id === node.agent_ref);
    if (agent) {
      editor = (
        <AgentEditor
          agent={agent}
          onUpdate={(updates) => {
            updateAgent(agent.id, updates);
            // Sync node name if agent name changed
            if (updates.name) {
              updateNode(node.id, { name: updates.name });
            }
          }}
        />
      );
    }
  } else if (node.type === "tool_call" && node.tool_ref) {
    const tool = irDocument.tools.find((t) => t.id === node.tool_ref);
    if (tool) {
      editor = (
        <ToolEditor
          tool={tool}
          onUpdate={(updates) => {
            updateTool(tool.id, updates);
            if (updates.name) {
              updateNode(node.id, { name: updates.name });
            }
          }}
        />
      );
    }
  } else if (node.type === "condition") {
    editor = (
      <ConditionEditor
        node={node}
        onUpdate={(updates) => updateNode(node.id, updates)}
      />
    );
  } else if (node.type === "human_input") {
    editor = (
      <HumanInputEditor
        node={node}
        onUpdate={(updates) => updateNode(node.id, updates)}
      />
    );
  } else if (node.type === "loop") {
    editor = (
      <LoopEditor
        node={node}
        onUpdate={(updates) => updateNode(node.id, updates)}
      />
    );
  } else if (
    node.type === "parallel_fan_out" ||
    node.type === "parallel_fan_in"
  ) {
    editor = (
      <ParallelEditor
        node={node}
        onUpdate={(updates) => updateNode(node.id, updates)}
      />
    );
  }

  if (!editor) return null;

  return (
    <Modal isOpen={true} onClose={handleClose} title={title}>
      {editor}
    </Modal>
  );
}
