/**
 * IR Patch Applier — translates copilot IR patches into canvas store actions.
 *
 * When the copilot produces structured modifications via Claude tool-use,
 * this module applies them to the Zustand store, updating both the IR
 * document and the React Flow canvas.
 */

import { useCanvasStore } from "../store/canvasStore";
import type { IRPatchResponse } from "../api/copilot";

export function applyIRPatches(patches: IRPatchResponse[]): string[] {
  const store = useCanvasStore.getState();
  const descriptions: string[] = [];

  for (const patch of patches) {
    try {
      applyPatch(store, patch);
      descriptions.push(patch.description);
    } catch (err) {
      console.error(`Failed to apply patch ${patch.action}:`, err);
      descriptions.push(`[Failed] ${patch.description}`);
    }
  }

  return descriptions;
}

function applyPatch(
  store: ReturnType<typeof useCanvasStore.getState>,
  patch: IRPatchResponse
): void {
  const ir = store.irDocument;
  if (!ir) return;

  switch (patch.action) {
    case "add_agent": {
      const { agent, node } = patch.data as {
        agent: Record<string, unknown>;
        node: Record<string, unknown>;
      };

      // Add agent to IR
      store.addAgentNode(
        {
          id: agent.id as string,
          name: agent.name as string,
          role: (agent.role as string) || "",
          goal: (agent.goal as string) || "",
          backstory: (agent.backstory as string) || "",
          instructions: (agent.instructions as string) || "",
          description: (agent.description as string) || "",
          tools: (agent.tools as string[]) || [],
        },
        node.position as { x: number; y: number }
      );
      break;
    }

    case "add_tool": {
      const { tool } = patch.data as { tool: Record<string, unknown> };
      store.addTool({
        id: tool.id as string,
        name: tool.name as string,
        description: (tool.description as string) || "",
        type: (tool.type as string) as any || "function",
        parameters: (tool.parameters as any[]) || [],
      });
      break;
    }

    case "add_edge": {
      const { edge } = patch.data as { edge: Record<string, unknown> };
      store.addEdge({
        id: edge.id as string,
        source: edge.source as string,
        target: edge.target as string,
        type: (edge.type as string) as any || "default",
        condition: edge.condition as any,
      });
      break;
    }

    case "remove_node": {
      const { node_id } = patch.data as { node_id: string };
      store.removeNode(node_id);
      break;
    }

    case "modify_agent": {
      const { agent_id, updates } = patch.data as {
        agent_id: string;
        updates: Record<string, unknown>;
      };
      store.updateAgent(agent_id, updates as any);
      break;
    }

    case "add_human_in_the_loop": {
      const { node, after_node_id } = patch.data as {
        node: Record<string, unknown>;
        after_node_id: string;
      };

      // Add the HITL node
      store.addHumanInputNode(
        (node.config as any)?.human_input?.prompt_template || "Please review.",
        node.position as { x: number; y: number }
      );
      break;
    }

    case "add_condition": {
      const { node, edges } = patch.data as {
        node: Record<string, unknown>;
        edges?: Record<string, unknown>[];
      };

      store.addConditionNode(
        (node.config as any)?.condition?.condition_expression || "True",
        node.position as { x: number; y: number }
      );

      // Add conditional edges
      if (edges) {
        for (const edge of edges) {
          store.addEdge({
            id: edge.id as string,
            source: edge.source as string,
            target: edge.target as string,
            type: "conditional",
            condition: edge.condition as any,
          });
        }
      }
      break;
    }

    case "set_workflow_type": {
      const { workflow_type } = patch.data as { workflow_type: string };
      const currentIR = useCanvasStore.getState().irDocument;
      if (currentIR) {
        useCanvasStore.setState({
          irDocument: {
            ...currentIR,
            workflow: {
              ...currentIR.workflow,
              type: workflow_type as any,
            },
          },
        });
      }
      break;
    }

    case "add_state_field": {
      const { field } = patch.data as { field: Record<string, unknown> };
      const currentIR = useCanvasStore.getState().irDocument;
      if (currentIR) {
        useCanvasStore.setState({
          irDocument: {
            ...currentIR,
            workflow: {
              ...currentIR.workflow,
              state_schema: {
                ...currentIR.workflow.state_schema,
                fields: [
                  ...currentIR.workflow.state_schema.fields,
                  {
                    name: field.name as string,
                    type: (field.type as string) as any,
                    description: (field.description as string) || "",
                    reducer: (field.reducer as string) as any || "replace",
                    default: field.default,
                  },
                ],
              },
            },
          },
        });
      }
      break;
    }

    default:
      console.warn(`Unknown patch action: ${patch.action}`);
  }
}
