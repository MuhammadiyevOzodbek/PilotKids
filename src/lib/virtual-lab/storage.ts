import { z } from "zod";
import { getDefinition, getPin } from "./catalog";
import type { Circuit, SavedProject, WireColor } from "./types";

/**
 * Loyihalarni saqlash (`localStorage` + JSON import/eksport).
 *
 * Import qilinadigan JSON HAR DOIM Zod bilan tekshiriladi: begona yoki buzuq
 * fayl ilovaning holatini buzmasligi kerak. `localStorage` xatolari
 * (kvota to'lgan, brauzer bloklagan) ham yutiladi — ular ilovani yiqitmaydi.
 */

const STORAGE_KEY = "pilotkids-virtual-lab-projects";
/** Bitta loyihaning maksimal hajmi — juda katta import qabul qilinmasin. */
const MAX_JSON_BYTES = 512 * 1024;

const settingValue = z.union([z.string().max(200), z.number().finite(), z.boolean()]);

const circuitNodeSchema = z.object({
  id: z.string().min(1).max(64),
  type: z.string().min(1).max(64),
  x: z.number().finite(),
  y: z.number().finite(),
  rotation: z.number().finite(),
  settings: z.record(z.string().max(64), settingValue),
});

const wireEndpointSchema = z.object({
  nodeId: z.string().min(1).max(64),
  pinId: z.string().min(1).max(64),
});

const wireSchema = z.object({
  id: z.string().min(1).max(64),
  from: wireEndpointSchema,
  to: wireEndpointSchema,
  color: z.enum(["red", "black", "blue", "green", "yellow", "orange"]),
});

const circuitSchema = z.object({
  // Juda katta sxema brauzerni qotirmasin.
  nodes: z.array(circuitNodeSchema).max(200),
  wires: z.array(wireSchema).max(400),
});

export const savedProjectSchema = z.object({
  id: z.string().min(1).max(64),
  name: z.string().min(1).max(80),
  createdAt: z.string().max(40),
  updatedAt: z.string().max(40),
  circuit: circuitSchema,
  code: z.string().max(50_000),
  lessonSlug: z.string().max(64).nullable(),
  sensors: z.record(z.string().max(64), z.number().finite()),
});

const WIRE_COLORS = new Set<WireColor>(["red", "black", "blue", "green", "yellow", "orange"]);

function normalizePinId(pinId: string): string {
  if (pinId.endsWith("__source")) return pinId.slice(0, -"__source".length);
  if (pinId.endsWith("__target")) return pinId.slice(0, -"__target".length);
  return pinId;
}

function sanitizeSettings(
  type: string,
  settings: Record<string, string | number | boolean>,
): Record<string, string | number | boolean> {
  const def = getDefinition(type);
  if (!def) return {};

  const out: Record<string, string | number | boolean> = { ...def.defaults };
  for (const setting of def.settings) {
    const value = settings[setting.key];
    if (value === undefined) continue;

    if (setting.kind === "boolean") {
      out[setting.key] = value === true;
      continue;
    }

    if (setting.kind === "select") {
      out[setting.key] = setting.options.some((o) => o.value === value)
        ? String(value)
        : def.defaults[setting.key];
      continue;
    }

    if (typeof value === "number" && Number.isFinite(value)) {
      out[setting.key] = Math.max(setting.min, Math.min(setting.max, value));
    }
  }
  return out;
}

export function sanitizeCircuit(circuit: Circuit): Circuit {
  const seenNodeIds = new Set<string>();
  const nodes = circuit.nodes
    .filter((node) => getDefinition(node.type))
    .filter((node) => {
      if (seenNodeIds.has(node.id)) return false;
      seenNodeIds.add(node.id);
      return true;
    })
    .map((node) => ({
      ...node,
      x: Math.round(node.x),
      y: Math.round(node.y),
      rotation: (((Math.round(node.rotation / 90) * 90) % 360) + 360) % 360,
      settings: sanitizeSettings(node.type, node.settings),
    }));

  const typeById = new Map(nodes.map((node) => [node.id, node.type]));
  const seenWires = new Set<string>();
  const seenWireIds = new Set<string>();
  const wires = circuit.wires.flatMap((wire) => {
    const fromType = typeById.get(wire.from.nodeId);
    const toType = typeById.get(wire.to.nodeId);
    const fromPinId = normalizePinId(wire.from.pinId);
    const toPinId = normalizePinId(wire.to.pinId);
    if (!fromType || !toType) return [];
    if (!getPin(fromType, fromPinId) || !getPin(toType, toPinId)) return [];
    if (wire.from.nodeId === wire.to.nodeId && fromPinId === toPinId) return [];

    const a = `${wire.from.nodeId}:${fromPinId}`;
    const b = `${wire.to.nodeId}:${toPinId}`;
    const key = a < b ? `${a}|${b}` : `${b}|${a}`;
    if (seenWires.has(key)) return [];
    seenWires.add(key);

    let id = wire.id;
    let i = 2;
    while (seenWireIds.has(id)) {
      id = `${wire.id}-${i}`;
      i += 1;
    }
    seenWireIds.add(id);

    return [
      {
        ...wire,
        id,
        from: { nodeId: wire.from.nodeId, pinId: fromPinId },
        to: { nodeId: wire.to.nodeId, pinId: toPinId },
        color: WIRE_COLORS.has(wire.color) ? wire.color : "blue",
      },
    ];
  });

  return { nodes, wires };
}

function sanitizeProject(project: SavedProject): SavedProject {
  return {
    ...project,
    name: project.name.trim() || "Yangi loyiha",
    circuit: sanitizeCircuit(project.circuit),
    sensors: Object.fromEntries(
      Object.entries(project.sensors).filter(([, value]) => Number.isFinite(value)),
    ),
  };
}

function sanitizeProjectList(projects: SavedProject[]): SavedProject[] {
  const seen = new Set<string>();
  return projects.flatMap((project) => {
    if (seen.has(project.id)) return [];
    seen.add(project.id);
    return [sanitizeProject(project)];
  });
}

/* ─────────────────────────── O'qish / yozish ─────────────────────────── */

export function loadProjects(): SavedProject[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const data = JSON.parse(raw);
    if (!Array.isArray(data)) return [];
    /*
     * HAR BIR loyihani alohida tekshiramiz. Ilgari butun ro'yxat bitta sxema
     * bilan tekshirilardi: bitta buzuq yozuv (masalan eski versiyada `sensors`
     * yo'q loyiha) butun ro'yxatni yiqitardi va keyingi saqlash bo'sh ro'yxatni
     * yozib, barcha to'g'ri loyihalarni butunlay yo'qotardi. Endi zarar
     * faqat buzuq yozuv bilan cheklanadi.
     */
    const valid: SavedProject[] = [];
    for (const item of data.slice(0, 100)) {
      const parsed = savedProjectSchema.safeParse(item);
      if (parsed.success) valid.push(parsed.data);
    }
    return sanitizeProjectList(valid);
  } catch {
    return [];
  }
}

export function saveProjects(projects: SavedProject[]): { ok: boolean; error?: string } {
  if (typeof window === "undefined") return { ok: false, error: "Brauzer emas" };
  try {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(sanitizeProjectList(projects).slice(0, 100)),
    );
    return { ok: true };
  } catch {
    return { ok: false, error: "Saqlab bo'lmadi — brauzer xotirasi to'lgan bo'lishi mumkin." };
  }
}

/* ─────────────────────────── Import / eksport ─────────────────────────── */

export function exportProject(project: SavedProject): string {
  return JSON.stringify(sanitizeProject(project), null, 2);
}

export type ImportResult = { ok: true; project: SavedProject } | { ok: false; error: string };

/** Tashqi JSON'ni tekshirib qabul qiladi. Ishonchsiz manbaga ishonilmaydi. */
export function importProject(json: string): ImportResult {
  if (json.length > MAX_JSON_BYTES) {
    return { ok: false, error: "Fayl juda katta (512 KB dan oshmasligi kerak)." };
  }

  let data: unknown;
  try {
    data = JSON.parse(json);
  } catch {
    return { ok: false, error: "Bu to'g'ri JSON fayl emas." };
  }

  const parsed = savedProjectSchema.safeParse(data);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return {
      ok: false,
      error: `Fayl tuzilishi noto'g'ri${first ? `: ${first.path.join(".")}` : ""}.`,
    };
  }

  // Simlar mavjud komponentlarga ishora qilishini tekshiramiz — aks holda
  // sxema "yetim" simlar bilan ochilib, simulyator chalkashardi.
  const ids = new Set<string>();
  for (const node of parsed.data.circuit.nodes) {
    if (ids.has(node.id)) return { ok: false, error: "Faylda takrorlangan komponent ID bor." };
    ids.add(node.id);
    if (!getDefinition(node.type)) {
      return { ok: false, error: `Faylda noma'lum komponent turi bor: ${node.type}.` };
    }
  }

  const wireIds = new Set<string>();
  for (const wire of parsed.data.circuit.wires) {
    if (wireIds.has(wire.id)) return { ok: false, error: "Faylda takrorlangan sim ID bor." };
    wireIds.add(wire.id);
  }

  const orphan = parsed.data.circuit.wires.find(
    (w) => !ids.has(w.from.nodeId) || !ids.has(w.to.nodeId),
  );
  if (orphan) {
    return { ok: false, error: "Faylda mavjud bo'lmagan komponentga ulangan sim bor." };
  }

  for (const wire of parsed.data.circuit.wires) {
    const fromNode = parsed.data.circuit.nodes.find((n) => n.id === wire.from.nodeId);
    const toNode = parsed.data.circuit.nodes.find((n) => n.id === wire.to.nodeId);
    const fromPin = normalizePinId(wire.from.pinId);
    const toPin = normalizePinId(wire.to.pinId);
    if (!fromNode || !toNode) continue;
    if (!getPin(fromNode.type, fromPin) || !getPin(toNode.type, toPin)) {
      return { ok: false, error: "Faylda mavjud bo'lmagan pinga ulangan sim bor." };
    }
    if (wire.from.nodeId === wire.to.nodeId && fromPin === toPin) {
      return { ok: false, error: "Faylda o'ziga ulangan pin bor." };
    }
  }

  return { ok: true, project: sanitizeProject(parsed.data) };
}

/** Yangi bo'sh loyiha. */
export function createProject(name: string, lessonSlug: string | null = null): SavedProject {
  const now = new Date().toISOString();
  return {
    id: `p-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    name,
    createdAt: now,
    updatedAt: now,
    circuit: { nodes: [], wires: [] },
    code: "void setup() {\n  // Boshlang'ich sozlamalar\n}\n\nvoid loop() {\n  // Takrorlanuvchi kod\n}\n",
    lessonSlug,
    sensors: {},
  };
}
