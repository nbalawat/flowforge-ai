/**
 * Auto-layout algorithm for the workflow graph.
 *
 * Uses a layered/hierarchical layout (Sugiyama-style):
 * 1. Topological sort to determine layers
 * 2. Assign each node to a layer (depth from entry)
 * 3. Order nodes within each layer to minimize edge crossings
 * 4. Assign x,y coordinates with even spacing
 */

import type { WorkflowNode, WorkflowEdge } from "../ir/types";

const LAYER_GAP_Y = 140;  // vertical gap between layers
const NODE_GAP_X = 220;   // horizontal gap between nodes in same layer
const START_X = 300;
const START_Y = 60;

interface LayoutResult {
  positions: Map<string, { x: number; y: number }>;
}

export function computeAutoLayout(
  nodes: WorkflowNode[],
  edges: WorkflowEdge[],
  entryNodeId?: string,
  exitNodeIds?: string[]
): LayoutResult {
  if (nodes.length === 0) return { positions: new Map() };

  // Build adjacency list
  const adj = new Map<string, string[]>();
  const inDegree = new Map<string, number>();
  for (const node of nodes) {
    adj.set(node.id, []);
    inDegree.set(node.id, 0);
  }
  for (const edge of edges) {
    if (adj.has(edge.source)) {
      adj.get(edge.source)!.push(edge.target);
    }
    inDegree.set(edge.target, (inDegree.get(edge.target) || 0) + 1);
  }

  // Assign layers via BFS from entry node (or nodes with in-degree 0)
  const layers = new Map<string, number>();
  const queue: string[] = [];

  if (entryNodeId && adj.has(entryNodeId)) {
    queue.push(entryNodeId);
    layers.set(entryNodeId, 0);
  } else {
    // Start from nodes with no incoming edges
    for (const node of nodes) {
      if ((inDegree.get(node.id) || 0) === 0) {
        queue.push(node.id);
        layers.set(node.id, 0);
      }
    }
  }

  // BFS to assign layers
  while (queue.length > 0) {
    const current = queue.shift()!;
    const currentLayer = layers.get(current)!;
    for (const neighbor of adj.get(current) || []) {
      const existingLayer = layers.get(neighbor);
      const newLayer = currentLayer + 1;
      // Always take the maximum depth (longest path)
      if (existingLayer === undefined || newLayer > existingLayer) {
        layers.set(neighbor, newLayer);
        queue.push(neighbor);
      }
    }
  }

  // Handle any disconnected nodes (not reachable from entry)
  let maxLayer = 0;
  for (const layer of layers.values()) {
    maxLayer = Math.max(maxLayer, layer);
  }
  for (const node of nodes) {
    if (!layers.has(node.id)) {
      maxLayer++;
      layers.set(node.id, maxLayer);
    }
  }

  // Group nodes by layer
  const layerGroups = new Map<number, string[]>();
  for (const [nodeId, layer] of layers) {
    if (!layerGroups.has(layer)) layerGroups.set(layer, []);
    layerGroups.get(layer)!.push(nodeId);
  }

  // Sort layers
  const sortedLayers = Array.from(layerGroups.keys()).sort((a, b) => a - b);

  // Compute positions — center each layer horizontally
  const positions = new Map<string, { x: number; y: number }>();

  for (const layerIdx of sortedLayers) {
    const nodesInLayer = layerGroups.get(layerIdx)!;
    const layerWidth = (nodesInLayer.length - 1) * NODE_GAP_X;
    const startX = START_X - layerWidth / 2;

    for (let i = 0; i < nodesInLayer.length; i++) {
      positions.set(nodesInLayer[i], {
        x: startX + i * NODE_GAP_X,
        y: START_Y + layerIdx * LAYER_GAP_Y,
      });
    }
  }

  return { positions };
}

/**
 * Get the center of the current viewport for placing new nodes.
 */
export function getViewportCenter(
  viewportX: number,
  viewportY: number,
  zoom: number,
  containerWidth: number,
  containerHeight: number
): { x: number; y: number } {
  return {
    x: (-viewportX + containerWidth / 2) / zoom,
    y: (-viewportY + containerHeight / 2) / zoom,
  };
}
