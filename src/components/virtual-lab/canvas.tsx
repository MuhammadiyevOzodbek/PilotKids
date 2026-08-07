"use client";

import { useCallback, useMemo, useRef } from "react";
import {
  Background,
  BackgroundVariant,
  ConnectionMode,
  Controls,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  useConnection,
  useReactFlow,
  type Connection,
  type Edge,
  type EdgeChange,
  type Node,
  type NodeChange,
} from "@xyflow/react";
import { MousePointerSquareDashed } from "lucide-react";
import { getDefinition } from "@/lib/virtual-lab/catalog";
import { canConnect } from "@/lib/virtual-lab/validator";
import type { CircuitIssue, WireColor } from "@/lib/virtual-lab/types";
import { useCircuitStore, useSimulationStore } from "@/stores/virtual-lab";
import { ComponentNode, type ComponentNodeData } from "./component-node";

/**
 * Sxema yig'ish maydoni.
 *
 * React Flow tanlash, ko'chirish, zoom va bir nechta elementni belgilashni
 * o'zi bajaradi — biz faqat uni store bilan bog'laymiz. Simlar `edge`,
 * komponentlar `node` sifatida ko'rsatiladi.
 */

/*
 * Sim ranglari mavzuga bog'liq emas — haqiqiy sim ranglarini bildiradi.
 * Faqat "qora" sim biroz yoritilgan: sof qora tungi mavzudagi to'q fonda
 * umuman ko'rinmay qolardi.
 */
const WIRE_STROKE: Record<WireColor, string> = {
  red: "#e5484d",
  black: "#64748b",
  blue: "#2f6bf3",
  green: "#0fa46e",
  yellow: "#f5a524",
  orange: "#ea6a0e",
};

/*
 * React Flow bu qiymatlarni har render'da store'ga yozadi va o'zgargan
 * bo'lsa qayta chizadi. Agar ular JSX ichida yozilsa, har render'da yangi
 * obyekt paydo bo'lardi — bu esa cheksiz yangilanish halqasiga olib keladi
 * ("Maximum update depth exceeded"). Shuning uchun barchasi modul darajasida.
 */
const NODE_TYPES = { component: ComponentNode };
const SNAP_GRID: [number, number] = [10, 10];
const PRO_OPTIONS = { hideAttribution: true };
const MINIMAP_STYLE = { width: 130, height: 92 };

function toCircuitPinId(handleId: string | null | undefined) {
  const id = handleId ?? "";
  if (id.endsWith("__source")) return id.slice(0, -"__source".length);
  if (id.endsWith("__target")) return id.slice(0, -"__target".length);
  return id;
}

function CanvasInner({
  issues,
  onConnectionRejected,
}: {
  issues: CircuitIssue[];
  onConnectionRejected?: (reason: string) => void;
}) {
  const circuit = useCircuitStore((s) => s.circuit);
  const selectedIds = useCircuitStore((s) => s.selectedIds);
  const moveNode = useCircuitStore((s) => s.moveNode);
  const commitMove = useCircuitStore((s) => s.commitMove);
  const setSelection = useCircuitStore((s) => s.setSelection);
  const addWire = useCircuitStore((s) => s.addWire);
  const removeWire = useCircuitStore((s) => s.removeWire);
  const addNode = useCircuitStore((s) => s.addNode);
  const runtime = useSimulationStore((s) => s.runtime);
  const running = useSimulationStore((s) => s.status === "running");

  /*
   * Sim tortilayotgan manba pin. `useConnection` har renderda yangi obyekt
   * qaytaradi, shuning uchun undan barqaror satr olamiz — aks holda quyidagi
   * `useMemo` hech qachon keshlanmasdi.
   */
  const connectingFrom = useConnection((c) =>
    c.inProgress && c.fromNode && c.fromHandle?.id
      ? `${c.fromNode.id}:${toCircuitPinId(c.fromHandle.id)}`
      : null,
  );

  const { screenToFlowPosition } = useReactFlow();
  const wrapper = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  /** Komponent → xato darajasi (eng og'iri ko'rsatiladi). */
  const issueByNode = useMemo(() => {
    const map = new Map<string, "error" | "warning">();
    for (const issue of issues) {
      for (const id of issue.nodeIds) {
        if (issue.severity === "error" || !map.has(id)) map.set(id, issue.severity);
      }
    }
    return map;
  }, [issues]);

  /**
   * Komponent → simi ulangan pinlar, va har bir pin uchun "nimaga ulangan"
   * matni (tooltip'da ko'rinadi: `D13 → LED · Anod`). Ikkalasi bitta o'tishda
   * hisoblanadi — simlar ro'yxati katta sxemada uzun bo'lishi mumkin.
   */
  const { connectedPins, connectedTo } = useMemo(() => {
    const pins = new Map<string, string[]>();
    const labels = new Map<string, Record<string, string>>();

    const nodeById = new Map(circuit.nodes.map((n) => [n.id, n]));
    const describe = (nodeId: string, pinId: string): string => {
      const node = nodeById.get(nodeId);
      const def = node && getDefinition(node.type);
      if (!def) return pinId;
      const pin = def.pins.find((p) => p.id === pinId);
      return `${def.name} · ${pin?.label ?? pinId}`;
    };

    const add = (nodeId: string, pinId: string, otherNode: string, otherPin: string) => {
      const list = pins.get(nodeId);
      if (list) list.push(pinId);
      else pins.set(nodeId, [pinId]);

      const record = labels.get(nodeId) ?? {};
      const text = describe(otherNode, otherPin);
      record[pinId] = record[pinId] ? `${record[pinId]}, ${text}` : text;
      labels.set(nodeId, record);
    };

    for (const w of circuit.wires) {
      const from = toCircuitPinId(w.from.pinId);
      const to = toCircuitPinId(w.to.pinId);
      add(w.from.nodeId, from, w.to.nodeId, to);
      add(w.to.nodeId, to, w.from.nodeId, from);
    }
    return { connectedPins: pins, connectedTo: labels };
  }, [circuit.wires, circuit.nodes]);

  /**
   * Sim tortilayotganda: qaysi pinga ulash mumkin. Bir marta hisoblanadi va
   * pinlar yashil (mumkin) yoki qizil (mumkin emas) bo'lib yonadi — bola
   * urinib ko'rmasdan turib javobni ko'radi.
   */
  const connectHints = useMemo(() => {
    if (!connectingFrom) return null;
    const [fromNodeId, ...rest] = connectingFrom.split(":");
    const from = { nodeId: fromNodeId ?? "", pinId: rest.join(":") };

    const map = new Map<string, Record<string, boolean>>();
    for (const n of circuit.nodes) {
      const def = getDefinition(n.type);
      if (!def) continue;
      const record: Record<string, boolean> = {};
      for (const pin of def.pins) {
        record[pin.id] = canConnect(circuit, from, { nodeId: n.id, pinId: pin.id }).ok;
      }
      map.set(n.id, record);
    }
    return map;
  }, [connectingFrom, circuit]);

  const nodes: Node<ComponentNodeData>[] = useMemo(
    () =>
      circuit.nodes.map((n) => ({
        id: n.id,
        type: "component",
        position: { x: n.x, y: n.y },
        selected: selectedIds.includes(n.id),
        data: {
          type: n.type,
          settings: n.settings,
          rotation: n.rotation,
          runtime: runtime[n.id],
          issue: issueByNode.get(n.id),
          running,
          connected: connectedPins.get(n.id),
          connectedTo: connectedTo.get(n.id),
          connectable: connectHints?.get(n.id),
        },
      })),
    [
      circuit.nodes,
      selectedIds,
      runtime,
      issueByNode,
      running,
      connectedPins,
      connectedTo,
      connectHints,
    ],
  );

  const edges: Edge[] = useMemo(
    () =>
      circuit.wires.map((wire) => ({
        id: wire.id,
        source: wire.from.nodeId,
        target: wire.to.nodeId,
        sourceHandle: toCircuitPinId(wire.from.pinId),
        targetHandle: toCircuitPinId(wire.to.pinId),
        type: "smoothstep",
        selected: selectedIds.includes(wire.id),
        selectable: true,
        interactionWidth: 18,
        style: {
          stroke: WIRE_STROKE[wire.color],
          strokeWidth: selectedIds.includes(wire.id) ? 5 : 3.5,
        },
      })),
    [circuit.wires, selectedIds],
  );

  const onNodesChange = useCallback(
    (changes: NodeChange[]) => {
      for (const change of changes) {
        if (change.type === "position" && change.position) {
          dragging.current = true;
          moveNode(change.id, change.position.x, change.position.y);
        }
        // Ko'chirish tugadi — endi tarixga bitta yozuv qo'shamiz.
        if (change.type === "position" && change.dragging === false && dragging.current) {
          dragging.current = false;
          commitMove();
        }
      }
    },
    [moveNode, commitMove],
  );

  const onConnect = useCallback(
    (connection: Connection) => {
      if (!connection.source || !connection.target) return;
      const result = addWire(
        { nodeId: connection.source, pinId: toCircuitPinId(connection.sourceHandle) },
        { nodeId: connection.target, pinId: toCircuitPinId(connection.targetHandle) },
      );
      if (!result.ok) onConnectionRejected?.(result.reason ?? "Bu pinlarni ulab bo'lmaydi.");
    },
    [addWire, onConnectionRejected],
  );

  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      for (const change of changes) {
        if (change.type === "remove") removeWire(change.id);
      }
    },
    [removeWire],
  );

  const onSelectionChange = useCallback(
    ({ nodes: selected, edges: selectedEdges }: { nodes: Node[]; edges: Edge[] }) => {
      setSelection([...selected.map((n) => n.id), ...selectedEdges.map((e) => e.id)]);
    },
    [setSelection],
  );

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
  }, []);

  // Chap paneldan sudrab kelingan komponentni qabul qilamiz.
  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      const type = event.dataTransfer.getData("application/pilotkids-component");
      if (!type || !getDefinition(type)) return;
      const position = screenToFlowPosition({ x: event.clientX, y: event.clientY });
      addNode(type, position.x, position.y);
    },
    [screenToFlowPosition, addNode],
  );

  return (
    <div ref={wrapper} style={{ width: "100%", height: "100%", position: "relative" }}>
      {circuit.nodes.length === 0 && (
        <div className="vlab-hint">
          <span className="vlab-hint-icon">
            <MousePointerSquareDashed size={26} />
          </span>
          <span className="vlab-hint-title">Sxemani shu yerda yig&apos;asiz</span>
          <span className="vlab-hint-text">
            Chapdagi ro&apos;yxatdan komponentni sudrab keling yoki ustiga bosing. Pinlarni
            bir-biriga ulash uchun ularni sichqoncha bilan tortib bog&apos;lang.
          </span>
        </div>
      )}

      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={NODE_TYPES}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        connectionMode={ConnectionMode.Loose}
        onDrop={onDrop}
        onDragOver={onDragOver}
        onSelectionChange={onSelectionChange}
        snapToGrid
        snapGrid={SNAP_GRID}
        minZoom={0.2}
        maxZoom={2.5}
        /*
         * `fitView` ni faqat ko'rsatadigan narsa bo'lganda so'raymiz.
         *
         * React Flow "fitView kutilmoqda" bayrog'ini node'lar o'lchangandan
         * keyingina tushiradi, bo'sh ro'yxatda esa `nodesInitialized` hech
         * qachon `true` bo'lmaydi — bayroq abadiy osilib qoladi va kutubxona
         * har safar `setNodes` ni qayta rejalashtiradi. Birinchi komponent
         * qo'yilganda bayroq qaytadan ko'tariladi, shuning uchun ko'rinish
         * avvalgidek o'zi moslashadi.
         */
        fitView={circuit.nodes.length > 0}
        proOptions={PRO_OPTIONS}
        // Delete tugmasini o'zimiz boshqaramiz (store tarixi bilan).
        deleteKeyCode={null}
      >
        <Background variant={BackgroundVariant.Dots} gap={20} size={1.5} color="var(--border)" />
        <Controls showInteractive={false} position="bottom-right" />
        {/* Katta sxemada qayerdaligini bilish uchun. */}
        {circuit.nodes.length > 3 && (
          <MiniMap
            pannable
            zoomable
            position="top-right"
            style={MINIMAP_STYLE}
            maskColor="color-mix(in srgb, var(--bg) 62%, transparent)"
            bgColor="var(--surface-2)"
            nodeColor={(n) =>
              (n.data as ComponentNodeData).issue === "error"
                ? "var(--danger)"
                : (n.data as ComponentNodeData).issue === "warning"
                  ? "var(--fun-amber)"
                  : "var(--text-3)"
            }
          />
        )}
      </ReactFlow>

      {/* Sim ranglarining ma'nosi — bolalar uchun eslatma. */}
      {circuit.wires.length > 0 && (
        <div className="vlab-legend">
          <span>
            <i style={{ background: WIRE_STROKE.red }} />
            Quvvat
          </span>
          <span>
            <i style={{ background: WIRE_STROKE.black }} />
            Yer (GND)
          </span>
          <span>
            <i style={{ background: WIRE_STROKE.blue }} />
            Signal
          </span>
        </div>
      )}
    </div>
  );
}

export function CircuitCanvas({
  issues,
  onConnectionRejected,
}: {
  issues: CircuitIssue[];
  onConnectionRejected?: (reason: string) => void;
}) {
  return (
    <ReactFlowProvider>
      <CanvasInner issues={issues} onConnectionRejected={onConnectionRejected} />
    </ReactFlowProvider>
  );
}
