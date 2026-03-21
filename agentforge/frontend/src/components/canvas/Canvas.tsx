"use client";

import { useCallback, useMemo } from "react";
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  type Node,
  type Edge,
  type OnNodesChange,
  type OnEdgesChange,
  type OnConnect,
  applyNodeChanges,
  applyEdgeChanges,
  addEdge,
  BackgroundVariant,
} from "reactflow";
import "reactflow/dist/style.css";

import { useCanvasStore } from "@/lib/store/canvasStore";
import { AgentNode } from "./nodes/AgentNode";
import { ToolNode } from "./nodes/ToolNode";
import { ConditionNode } from "./nodes/ConditionNode";
import { HumanInputNode } from "./nodes/HumanInputNode";
import { EntryExitNode } from "./nodes/EntryExitNode";

const nodeTypes = {
  agent: AgentNode,
  tool_call: ToolNode,
  condition: ConditionNode,
  human_input: HumanInputNode,
  entry: EntryExitNode,
  exit: EntryExitNode,
};

export function Canvas() {
  const { irDocument, selectNode, selectEdge, updateNode, addEdge: addIREdge } =
    useCanvasStore();

  // Convert IR nodes to React Flow nodes
  const nodes: Node[] = useMemo(() => {
    if (!irDocument) return [];

    return irDocument.workflow.nodes.map((node) => {
      let data: Record<string, unknown> = { label: node.name || node.type };

      if (node.type === "agent" && node.agent_ref) {
        const agent = irDocument.agents.find((a) => a.id === node.agent_ref);
        if (agent) {
          data = {
            label: agent.name,
            agentRef: agent.id,
            role: agent.role,
            toolCount: agent.tools.length,
          };
        }
      } else if (node.type === "tool_call" && node.tool_ref) {
        const tool = irDocument.tools.find((t) => t.id === node.tool_ref);
        if (tool) {
          data = {
            label: tool.name,
            toolRef: tool.id,
            description: tool.description,
          };
        }
      } else if (node.type === "condition") {
        data = {
          label: node.name || "Condition",
          expression: node.config.condition?.condition_expression,
        };
      } else if (node.type === "human_input") {
        data = {
          label: node.name || "Human Review",
          prompt: node.config.human_input?.prompt_template,
        };
      } else if (node.type === "entry" || node.type === "exit") {
        data = {
          label: node.name || (node.type === "entry" ? "Start" : "End"),
          nodeType: node.type,
        };
      }

      return {
        id: node.id,
        type: node.type,
        position: node.position,
        data,
        selected: false,
      };
    });
  }, [irDocument]);

  // Convert IR edges to React Flow edges
  const edges: Edge[] = useMemo(() => {
    if (!irDocument) return [];

    return irDocument.workflow.edges.map((edge) => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      type: edge.type === "conditional" ? "smoothstep" : "default",
      label: edge.condition?.label || undefined,
      animated: edge.type === "conditional",
      style: {
        stroke:
          edge.type === "conditional"
            ? "#f59e0b"
            : edge.type === "error"
            ? "#ef4444"
            : "#6366f1",
      },
    }));
  }, [irDocument]);

  const onNodesChange: OnNodesChange = useCallback(
    (changes) => {
      // Update positions in the IR when nodes are dragged
      for (const change of changes) {
        if (change.type === "position" && change.position) {
          updateNode(change.id, { position: change.position });
        }
      }
    },
    [updateNode]
  );

  const onEdgesChange: OnEdgesChange = useCallback((changes) => {
    // Handle edge removals etc.
  }, []);

  const onConnect: OnConnect = useCallback(
    (connection) => {
      if (connection.source && connection.target) {
        addIREdge({
          source: connection.source,
          target: connection.target,
          type: "default",
        });
      }
    },
    [addIREdge]
  );

  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      selectNode(node.id);
    },
    [selectNode]
  );

  const onEdgeClick = useCallback(
    (_: React.MouseEvent, edge: Edge) => {
      selectEdge(edge.id);
    },
    [selectEdge]
  );

  const onPaneClick = useCallback(() => {
    selectNode(null);
    selectEdge(null);
  }, [selectNode, selectEdge]);

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      nodeTypes={nodeTypes}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onConnect={onConnect}
      onNodeClick={onNodeClick}
      onEdgeClick={onEdgeClick}
      onPaneClick={onPaneClick}
      fitView
      snapToGrid
      snapGrid={[20, 20]}
      defaultEdgeOptions={{
        style: { stroke: "#6366f1", strokeWidth: 2 },
      }}
    >
      <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="#1e1e3a" />
      <Controls />
      <MiniMap
        nodeColor={(node) => {
          switch (node.type) {
            case "agent": return "#3b82f6";
            case "tool_call": return "#8b5cf6";
            case "condition": return "#f59e0b";
            case "human_input": return "#22c55e";
            case "entry": return "#10b981";
            case "exit": return "#f43f5e";
            default: return "#6366f1";
          }
        }}
      />
    </ReactFlow>
  );
}
