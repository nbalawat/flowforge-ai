"use client";

import { useCallback, useMemo, useEffect, useState } from "react";
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  ReactFlowProvider,
  useReactFlow,
  type Node,
  type Edge,
  type OnNodesChange,
  type OnEdgesChange,
  type OnConnect,
  BackgroundVariant,
} from "reactflow";
import "reactflow/dist/style.css";

import { useCanvasStore } from "@/lib/store/canvasStore";
import { computeAutoLayout } from "@/lib/layout/autoLayout";
import { AgentNode } from "./nodes/AgentNode";
import { ToolNode } from "./nodes/ToolNode";
import { ConditionNode } from "./nodes/ConditionNode";
import { HumanInputNode } from "./nodes/HumanInputNode";
import { EntryExitNode } from "./nodes/EntryExitNode";
import { LoopNode } from "./nodes/LoopNode";
import { ParallelNode } from "./nodes/ParallelNode";
import { SubworkflowNode } from "./nodes/SubworkflowNode";
import { ContextMenu } from "./ContextMenu";

const nodeTypes = {
  agent: AgentNode,
  tool_call: ToolNode,
  condition: ConditionNode,
  human_input: HumanInputNode,
  entry: EntryExitNode,
  exit: EntryExitNode,
  loop: LoopNode,
  parallel_fan_out: ParallelNode,
  parallel_fan_in: ParallelNode,
  subworkflow: SubworkflowNode,
};

function CanvasInner() {
  const { irDocument, selectNode, selectEdge, updateNode, addEdge: addIREdge, pushUndo, setEditingNode } =
    useCanvasStore();
  const reactFlow = useReactFlow();

  // Context menu state
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    nodeId?: string;
    edgeId?: string;
  } | null>(null);

  // Expose auto-layout and fitView via custom events
  useEffect(() => {
    const handleAutoLayout = () => {
      if (!irDocument) return;
      pushUndo();

      const { positions } = computeAutoLayout(
        irDocument.workflow.nodes,
        irDocument.workflow.edges,
        irDocument.workflow.entry_node || undefined,
        irDocument.workflow.exit_nodes
      );

      // Apply positions
      const store = useCanvasStore.getState();
      const updatedNodes = irDocument.workflow.nodes.map((node) => {
        const pos = positions.get(node.id);
        return pos ? { ...node, position: pos } : node;
      });

      store.setIRDocument({
        ...irDocument,
        workflow: { ...irDocument.workflow, nodes: updatedNodes },
      });

      // Fit view after layout
      setTimeout(() => reactFlow.fitView({ padding: 0.2, duration: 300 }), 50);
    };

    const handleFitView = () => {
      reactFlow.fitView({ padding: 0.2, duration: 300 });
    };

    window.addEventListener("agentforge:auto-layout", handleAutoLayout);
    window.addEventListener("agentforge:fit-view", handleFitView);
    return () => {
      window.removeEventListener("agentforge:auto-layout", handleAutoLayout);
      window.removeEventListener("agentforge:fit-view", handleFitView);
    };
  }, [irDocument, reactFlow, pushUndo]);

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
            instructions: agent.instructions,
            toolCount: agent.tools.length,
            toolNames: agent.tools.map((tid) => irDocument.tools.find((t) => t.id === tid)?.name || tid),
            modelName: agent.llm_config?.model || irDocument.config.default_llm.model,
            hasMemory: agent.memory_config?.long_term_enabled,
            canDelegate: agent.delegation?.can_delegate,
            capabilityFlags: {
              code: agent.capabilities?.code_execution,
              web: agent.capabilities?.web_browsing,
              file: agent.capabilities?.file_access,
            },
          };
        }
      } else if (node.type === "tool_call" && node.tool_ref) {
        const tool = irDocument.tools.find((t) => t.id === node.tool_ref);
        if (tool) {
          data = {
            label: tool.name,
            toolRef: tool.id,
            description: tool.description,
            paramCount: tool.parameters.length,
            toolType: tool.type,
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
          inputType: node.config.human_input?.input_type,
        };
      } else if (node.type === "entry" || node.type === "exit") {
        data = {
          label: node.name || (node.type === "entry" ? "Start" : "End"),
          nodeType: node.type,
        };
      } else if (node.type === "loop") {
        data = {
          label: node.name || "Loop",
          maxIterations: node.config.loop?.max_iterations,
          exitCondition: node.config.loop?.exit_condition,
        };
      } else if (node.type === "parallel_fan_out") {
        data = {
          label: node.name || "Parallel",
          nodeSubtype: "fan_out",
          fanOutOn: node.config.parallel_fan_out?.fan_out_on,
        };
      } else if (node.type === "parallel_fan_in") {
        data = {
          label: node.name || "Join",
          nodeSubtype: "fan_in",
          strategy: node.config.parallel_fan_in?.aggregation_strategy,
        };
      } else if (node.type === "subworkflow") {
        data = {
          label: node.name || "Subworkflow",
          subworkflowRef: node.config.subworkflow?.subworkflow_ref,
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

    return irDocument.workflow.edges.map((edge) => {
      // Color coding by edge type
      const edgeColors: Record<string, { stroke: string; label: string }> = {
        default: { stroke: "#6366f1", label: "" },
        conditional: { stroke: "#f59e0b", label: edge.condition?.label || "if" },
        error: { stroke: "#ef4444", label: "error" },
        timeout: { stroke: "#f97316", label: "timeout" },
      };
      const colors = edgeColors[edge.type] || edgeColors.default;

      return {
        id: edge.id,
        source: edge.source,
        target: edge.target,
        type: edge.type === "conditional" ? "smoothstep" : "default",
        label: colors.label || undefined,
        animated: edge.type === "conditional" || edge.type === "error",
        style: {
          stroke: colors.stroke,
          strokeWidth: edge.type === "conditional" ? 2.5 : 2,
          strokeDasharray: edge.type === "error" ? "5 3" : undefined,
        },
        labelStyle: {
          fill: colors.stroke,
          fontSize: 10,
          fontWeight: 600,
        },
        labelBgStyle: {
          fill: "#0f0f1a",
          fillOpacity: 0.9,
        },
        labelBgPadding: [6, 3] as [number, number],
        labelBgBorderRadius: 4,
      };
    });
  }, [irDocument]);

  const onNodesChange: OnNodesChange = useCallback(
    (changes) => {
      for (const change of changes) {
        if (change.type === "position" && change.position) {
          updateNode(change.id, { position: change.position });
        }
      }
    },
    [updateNode]
  );

  const onEdgesChange: OnEdgesChange = useCallback(() => {}, []);

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
    (_: React.MouseEvent, node: Node) => selectNode(node.id),
    [selectNode]
  );

  const onEdgeClick = useCallback(
    (_: React.MouseEvent, edge: Edge) => selectEdge(edge.id),
    [selectEdge]
  );

  const onPaneClick = useCallback(() => {
    selectNode(null);
    selectEdge(null);
    setContextMenu(null);
  }, [selectNode, selectEdge]);

  const onNodeDoubleClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      setEditingNode(node.id);
    },
    [setEditingNode]
  );

  const onNodeContextMenu = useCallback(
    (event: React.MouseEvent, node: Node) => {
      event.preventDefault();
      setContextMenu({ x: event.clientX, y: event.clientY, nodeId: node.id });
    },
    []
  );

  const onEdgeContextMenu = useCallback(
    (event: React.MouseEvent, edge: Edge) => {
      event.preventDefault();
      setContextMenu({ x: event.clientX, y: event.clientY, edgeId: edge.id });
    },
    []
  );

  const onPaneContextMenu = useCallback(
    (event: React.MouseEvent) => {
      event.preventDefault();
      setContextMenu({ x: event.clientX, y: event.clientY });
    },
    []
  );

  return (
    <>
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
        onNodeDoubleClick={onNodeDoubleClick}
        onNodeContextMenu={onNodeContextMenu}
        onEdgeContextMenu={onEdgeContextMenu}
        onPaneContextMenu={onPaneContextMenu}
        fitView
        snapToGrid
        snapGrid={[20, 20]}
        defaultEdgeOptions={{
          style: { stroke: "#6366f1", strokeWidth: 2 },
        }}
      >
        <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="#2a2a4a" />
        <Controls
          showZoom={true}
          showFitView={true}
          showInteractive={true}
          position="bottom-left"
        />
        <MiniMap
          pannable
          zoomable
          nodeStrokeWidth={3}
          nodeColor={(node) => {
            switch (node.type) {
              case "agent": return "#3b82f6";
              case "tool_call": return "#8b5cf6";
              case "condition": return "#f59e0b";
              case "human_input": return "#22c55e";
              case "entry": return "#10b981";
              case "exit": return "#f43f5e";
              case "loop": return "#ec4899";
              case "parallel_fan_out": return "#06b6d4";
              case "parallel_fan_in": return "#06b6d4";
              case "subworkflow": return "#f97316";
              default: return "#6366f1";
            }
          }}
          maskColor="rgba(15, 15, 30, 0.7)"
          style={{
            backgroundColor: "#16162a",
            border: "1px solid #3a3a6a",
            borderRadius: "8px",
          }}
        />
      </ReactFlow>
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          nodeId={contextMenu.nodeId}
          edgeId={contextMenu.edgeId}
          onClose={() => setContextMenu(null)}
        />
      )}
    </>
  );
}

// Wrap with ReactFlowProvider so useReactFlow() works
export function Canvas() {
  return (
    <ReactFlowProvider>
      <CanvasInner />
    </ReactFlowProvider>
  );
}
