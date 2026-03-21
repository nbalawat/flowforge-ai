"use client";

import { useEffect, useRef } from "react";
import { useCanvasStore } from "@/lib/store/canvasStore";

interface ContextMenuProps {
  x: number;
  y: number;
  nodeId?: string;
  edgeId?: string;
  onClose: () => void;
}

function MenuDivider() {
  return <div className="h-px bg-[var(--border-color)] my-1" />;
}

function MenuItem({
  label,
  onClick,
  danger,
}: {
  label: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-3 py-1.5 text-sm rounded transition-colors ${
        danger
          ? "text-red-400 hover:bg-red-400/10"
          : "text-[var(--text-primary)] hover:bg-[var(--bg-primary)]"
      }`}
    >
      {label}
    </button>
  );
}

export function ContextMenu({
  x,
  y,
  nodeId,
  edgeId,
  onClose,
}: ContextMenuProps) {
  const ref = useRef<HTMLDivElement>(null);
  const store = useCanvasStore();

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as HTMLElement)) {
        onClose();
      }
    };
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEsc);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEsc);
    };
  }, [onClose]);

  // Clamp position so menu doesn't go off screen
  const style: React.CSSProperties = {
    position: "fixed",
    left: x,
    top: y,
    zIndex: 100,
  };

  const handleAdd = (type: string) => {
    const ir = store.irDocument;
    if (!ir) return;

    const position = { x: x - 100, y: y - 50 };

    switch (type) {
      case "agent":
        store.addAgentNode({ name: "New Agent" }, position);
        break;
      case "tool":
        store.addToolNode(
          { name: "New Tool", description: "Tool description" },
          position
        );
        break;
      case "condition":
        store.addConditionNode("state.get('status') == 'approved'", position);
        break;
      case "human":
        store.addHumanInputNode("Please review the output.", position);
        break;
      case "loop": {
        const nodeId = `node_${crypto.randomUUID().slice(0, 8)}`;
        store.setIRDocument({
          ...ir,
          workflow: {
            ...ir.workflow,
            nodes: [
              ...ir.workflow.nodes,
              {
                id: nodeId,
                name: "Loop",
                type: "loop",
                config: { loop: { max_iterations: 10, exit_condition: "" } },
                position,
              },
            ],
          },
        });
        break;
      }
      case "parallel": {
        const fanOutId = `node_${crypto.randomUUID().slice(0, 8)}`;
        const fanInId = `node_${crypto.randomUUID().slice(0, 8)}`;
        store.setIRDocument({
          ...ir,
          workflow: {
            ...ir.workflow,
            nodes: [
              ...ir.workflow.nodes,
              {
                id: fanOutId,
                name: "Parallel",
                type: "parallel_fan_out",
                config: { parallel_fan_out: { fan_out_on: "items" } },
                position,
              },
              {
                id: fanInId,
                name: "Join",
                type: "parallel_fan_in",
                config: { parallel_fan_in: { aggregation_strategy: "merge" } },
                position: { x: position.x, y: position.y + 150 },
              },
            ],
          },
        });
        break;
      }
    }
    onClose();
  };

  // Node context menu
  if (nodeId) {
    const node = store.irDocument?.workflow.nodes.find(
      (n) => n.id === nodeId
    );
    const isProtected = node?.type === "entry" || node?.type === "exit";

    return (
      <div
        ref={ref}
        style={style}
        className="min-w-[160px] bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-lg shadow-xl p-1"
      >
        <MenuItem
          label="Edit"
          onClick={() => {
            store.setEditingNode(nodeId);
            onClose();
          }}
        />
        <MenuItem
          label="Duplicate"
          onClick={() => {
            store.duplicateNode(nodeId);
            onClose();
          }}
        />
        {!isProtected && (
          <>
            <MenuDivider />
            <MenuItem
              label="Delete"
              onClick={() => {
                store.removeNode(nodeId);
                onClose();
              }}
              danger
            />
          </>
        )}
      </div>
    );
  }

  // Edge context menu
  if (edgeId) {
    return (
      <div
        ref={ref}
        style={style}
        className="min-w-[160px] bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-lg shadow-xl p-1"
      >
        <MenuItem
          label="Edit Properties"
          onClick={() => {
            store.selectEdge(edgeId);
            onClose();
          }}
        />
        <MenuDivider />
        <MenuItem
          label="Delete"
          onClick={() => {
            store.removeEdge(edgeId);
            onClose();
          }}
          danger
        />
      </div>
    );
  }

  // Canvas (pane) context menu
  return (
    <div
      ref={ref}
      style={style}
      className="min-w-[180px] bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-lg shadow-xl p-1"
    >
      <MenuItem label="Add Agent" onClick={() => handleAdd("agent")} />
      <MenuItem label="Add Tool" onClick={() => handleAdd("tool")} />
      <MenuItem label="Add Condition" onClick={() => handleAdd("condition")} />
      <MenuItem
        label="Add Human Review"
        onClick={() => handleAdd("human")}
      />
      <MenuItem label="Add Loop" onClick={() => handleAdd("loop")} />
      <MenuItem label="Add Parallel" onClick={() => handleAdd("parallel")} />
      <MenuDivider />
      <MenuItem
        label="Auto Layout"
        onClick={() => {
          window.dispatchEvent(new CustomEvent("agentforge:auto-layout"));
          onClose();
        }}
      />
      <MenuItem
        label="Fit View"
        onClick={() => {
          window.dispatchEvent(new CustomEvent("agentforge:fit-view"));
          onClose();
        }}
      />
    </div>
  );
}
