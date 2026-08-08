"use client";

import { create } from "zustand";
import { getDefinition } from "@/lib/virtual-lab/catalog";
import { canConnect, suggestWireColor } from "@/lib/virtual-lab/validator";
import {
  createProject,
  loadProjects,
  sanitizeCircuit,
  saveProjects,
} from "@/lib/virtual-lab/storage";
import type { BlockWorkspace } from "@/lib/virtual-lab/blocks";
import type {
  Circuit,
  CircuitNode,
  CodeError,
  ComponentRuntimeState,
  SavedProject,
  SerialLogEntry,
  SimulationSpeed,
  SimulationStatus,
  WireColor,
  WireConnection,
  WireFlow,
} from "@/lib/virtual-lab/types";

/**
 * Virtual laboratoriya holati.
 *
 * Store'lar vazifasiga qarab ajratilgan — sxema, kod, simulyatsiya va
 * loyihalar bir-biriga bog'lanib qolmasin. Simulyator natijasi (jonli
 * holatlar) `simulationStore` da, hujjat esa `circuitStore`/`editorStore` da.
 */

/* ─────────────────────────── Sxema + tarix ─────────────────────────── */

/** Undo/redo uchun saqlanadigan eng ko'p qadam. */
const HISTORY_LIMIT = 50;

/*
 * Sxema hajmi chegaralari.
 *
 * Import qilinadigan JSON `storage.ts` da allaqachon cheklangan, lekin
 * foydalanuvchi paneldan bosib ham cheksiz komponent qo'sha olardi — katta
 * sxemada React Flow va validator sekinlashadi. Ikkala yo'l bir xil chegarada
 * turishi uchun shu yerda ham cheklaymiz.
 */
const MAX_NODES = 200;
const MAX_WIRES = 400;

let idSeq = 0;
function nextId(prefix: string) {
  idSeq += 1;
  return `${prefix}-${Date.now().toString(36)}-${idSeq}`;
}

interface CircuitState {
  circuit: Circuit;
  selectedIds: string[];
  past: Circuit[];
  future: Circuit[];
  clipboard: CircuitNode[];
  movingNodeId: string | null;

  addNode: (type: string, x: number, y: number) => void;
  moveNode: (id: string, x: number, y: number) => void;
  /** Ko'chirish tugagach chaqiriladi — tarixga bitta yozuv tushadi. */
  commitMove: () => void;
  rotateNode: (id: string) => void;
  updateSetting: (id: string, key: string, value: string | number | boolean) => void;
  removeSelected: () => void;
  setSelection: (ids: string[]) => void;
  copySelection: () => void;
  pasteClipboard: () => void;
  addWire: (
    from: { nodeId: string; pinId: string },
    to: { nodeId: string; pinId: string },
  ) => { ok: boolean; reason?: string };
  setWireColor: (id: string, color: WireColor) => void;
  removeWire: (id: string) => void;
  clear: () => void;
  replaceCircuit: (circuit: Circuit) => void;
  undo: () => void;
  redo: () => void;
}

/** Tarixga joriy holatni yozadi (o'zgarishdan OLDIN chaqiriladi). */
function pushHistory(state: CircuitState): Pick<CircuitState, "past" | "future"> {
  const past = [...state.past, structuredClone(state.circuit)];
  if (past.length > HISTORY_LIMIT) past.shift();
  return { past, future: [] };
}

function normalizeSettingValue(
  type: string,
  key: string,
  value: string | number | boolean,
): string | number | boolean | undefined {
  const def = getDefinition(type);
  const setting = def?.settings.find((s) => s.key === key);
  if (!setting) return undefined;

  if (setting.kind === "boolean") return value === true;
  if (setting.kind === "select") {
    return setting.options.some((option) => option.value === value) ? String(value) : undefined;
  }
  if (typeof value !== "number" || !Number.isFinite(value)) return undefined;
  return Math.max(setting.min, Math.min(setting.max, value));
}

/** Komponentlar orasidagi eng kichik bo'shliq (px) — simlar sig'ishi uchun. */
const NODE_GAP = 24;

/**
 * Bo'sh joy topadi.
 *
 * Kutubxonadan bosib qo'shilgan komponentlar bir xil nuqtaga tushardi va
 * bir-birining ustiga yig'ilib qolardi: pastdagisining pinlariga umuman
 * yetib bo'lmasdi. Endi band joy o'ngga, keyin pastga siljitiladi —
 * xuddi stol ustiga detal qo'yayotgandek.
 */
function freeSpot(
  nodes: readonly CircuitNode[],
  def: { width: number; height: number },
  x: number,
  y: number,
): { x: number; y: number } {
  const overlaps = (px: number, py: number) =>
    nodes.some((n) => {
      const other = getDefinition(n.type);
      if (!other) return false;
      return (
        px < n.x + other.width + NODE_GAP &&
        px + def.width + NODE_GAP > n.x &&
        py < n.y + other.height + NODE_GAP &&
        py + def.height + NODE_GAP > n.y
      );
    });

  let px = Math.round(x);
  let py = Math.round(y);
  // Cheklov: juda ko'p komponentda qidiruv cheksiz davom etmasin.
  for (let step = 0; step < 60 && overlaps(px, py); step++) {
    px += def.width + NODE_GAP;
    if (px > Math.round(x) + 1600) {
      px = Math.round(x);
      py += def.height + NODE_GAP;
    }
  }
  return { x: px, y: py };
}

export const useCircuitStore = create<CircuitState>((set, get) => ({
  circuit: { nodes: [], wires: [] },
  selectedIds: [],
  past: [],
  future: [],
  clipboard: [],
  movingNodeId: null,

  addNode: (type, x, y) => {
    const def = getDefinition(type);
    if (!def) return;
    if (get().circuit.nodes.length >= MAX_NODES) return;
    const spot = freeSpot(get().circuit.nodes, def, x, y);
    set((s) => ({
      ...pushHistory(s),
      circuit: {
        ...s.circuit,
        nodes: [
          ...s.circuit.nodes,
          {
            id: nextId(type),
            type,
            x: spot.x,
            y: spot.y,
            rotation: 0,
            settings: { ...def.defaults },
          },
        ],
      },
    }));
  },

  // Ko'chirishning birinchi real qadamida tarixga yozamiz; keyingi piksel
  // o'zgarishlari bitta undo qadam bo'lib qoladi.
  moveNode: (id, x, y) =>
    set((s) => {
      const nextX = Math.round(x);
      const nextY = Math.round(y);
      const current = s.circuit.nodes.find((n) => n.id === id);
      if (!current || (current.x === nextX && current.y === nextY)) return s;

      return {
        ...(s.movingNodeId === id ? {} : pushHistory(s)),
        movingNodeId: id,
        circuit: {
          ...s.circuit,
          nodes: s.circuit.nodes.map((n) => (n.id === id ? { ...n, x: nextX, y: nextY } : n)),
        },
      };
    }),

  commitMove: () => set({ movingNodeId: null }),

  rotateNode: (id) =>
    set((s) => ({
      ...pushHistory(s),
      circuit: {
        ...s.circuit,
        nodes: s.circuit.nodes.map((n) =>
          n.id === id ? { ...n, rotation: (n.rotation + 90) % 360 } : n,
        ),
      },
    })),

  updateSetting: (id, key, value) =>
    set((s) => {
      const current = s.circuit.nodes.find((n) => n.id === id);
      if (!current) return s;
      const nextValue = normalizeSettingValue(current.type, key, value);
      if (nextValue === undefined || current.settings[key] === nextValue) return s;
      return {
        ...pushHistory(s),
        circuit: {
          ...s.circuit,
          nodes: s.circuit.nodes.map((n) =>
            n.id === id ? { ...n, settings: { ...n.settings, [key]: nextValue } } : n,
          ),
        },
      };
    }),

  removeSelected: () => {
    const ids = new Set(get().selectedIds);
    if (ids.size === 0) return;
    set((s) => ({
      ...pushHistory(s),
      selectedIds: [],
      movingNodeId: null,
      circuit: {
        nodes: s.circuit.nodes.filter((n) => !ids.has(n.id)),
        // Komponent o'chsa, unga ulangan simlar ham ketadi.
        wires: s.circuit.wires.filter(
          (w) => !ids.has(w.from.nodeId) && !ids.has(w.to.nodeId) && !ids.has(w.id),
        ),
      },
    }));
  },

  /*
   * Tanlov ro'yxati MAZMUNAN o'zgargandagina yoziladi.
   *
   * React Flow `onSelectionChange` ni har renderda yangi massiv bilan
   * chaqiradi. Uni shartsiz saqlasak: yangi massiv → store yangilanadi →
   * tugunlar qayta hisoblanadi → React Flow qayta render bo'ladi →
   * `onSelectionChange` yana ishlaydi… Natijada "Maximum update depth
   * exceeded" xatosi chiqardi. Solishtirish shu halqani uzadi.
   */
  /**
   * Tanlovni yozadi.
   *
   * Taqqoslash TARTIBGA BOG'LIQ EMAS. Bu muhim: React Flow tanlovni
   * o'zgarishlar to'plami sifatida beradi, ular esa bir xil to'plamni
   * boshqa tartibda hosil qilishi mumkin (masalan element avval olib
   * tashlanib, keyin qayta qo'shilsa). Tartib bo'yicha solishtirilsa,
   * mazmuni o'zgarmagan tanlov ham yangi massiv hosil qilardi — undan
   * sxema qayta chizilardi, React Flow yana o'zgarish yuborardi va halqa
   * yopilardi ("Maximum update depth exceeded").
   */
  setSelection: (ids) => {
    const current = get().selectedIds;
    if (current.length === ids.length) {
      const currentSet = new Set(current);
      if (ids.every((id) => currentSet.has(id))) return;
    }
    set({ selectedIds: ids });
  },

  copySelection: () => {
    const ids = new Set(get().selectedIds);
    set({
      clipboard: get()
        .circuit.nodes.filter((n) => ids.has(n.id))
        .map((n) => ({ ...n })),
    });
  },

  pasteClipboard: () => {
    const clip = get().clipboard;
    if (clip.length === 0) return;
    if (get().circuit.nodes.length + clip.length > MAX_NODES) return;
    const copies = clip.map((n) => ({
      ...n,
      id: nextId(n.type),
      x: n.x + 40,
      y: n.y + 40,
      settings: { ...n.settings },
    }));
    set((s) => ({
      ...pushHistory(s),
      circuit: { ...s.circuit, nodes: [...s.circuit.nodes, ...copies] },
      selectedIds: copies.map((c) => c.id),
      movingNodeId: null,
    }));
  },

  addWire: (from, to) => {
    const circuit = get().circuit;
    if (circuit.wires.length >= MAX_WIRES) {
      return { ok: false, reason: "Sxemada juda ko'p sim bor." };
    }
    const verdict = canConnect(circuit, from, to);
    if (!verdict.ok) return { ok: false, reason: verdict.reason };

    const wire: WireConnection = {
      id: nextId("wire"),
      from,
      to,
      color: suggestWireColor(circuit, from, to),
    };
    set((s) => ({
      ...pushHistory(s),
      circuit: { ...s.circuit, wires: [...s.circuit.wires, wire] },
    }));
    return { ok: true };
  },

  setWireColor: (id, color) =>
    set((s) => {
      const current = s.circuit.wires.find((w) => w.id === id);
      if (!current || current.color === color) return s;
      return {
        ...pushHistory(s),
        circuit: {
          ...s.circuit,
          wires: s.circuit.wires.map((w) => (w.id === id ? { ...w, color } : w)),
        },
      };
    }),

  removeWire: (id) =>
    set((s) => ({
      ...pushHistory(s),
      circuit: { ...s.circuit, wires: s.circuit.wires.filter((w) => w.id !== id) },
    })),

  clear: () =>
    set((s) => ({
      ...pushHistory(s),
      circuit: { nodes: [], wires: [] },
      selectedIds: [],
      movingNodeId: null,
    })),

  replaceCircuit: (circuit) =>
    set(() => ({
      circuit: sanitizeCircuit(structuredClone(circuit)),
      selectedIds: [],
      past: [],
      future: [],
      movingNodeId: null,
    })),

  undo: () => {
    const { past, circuit, future } = get();
    const prev = past[past.length - 1];
    if (!prev) return;
    set({
      circuit: prev,
      past: past.slice(0, -1),
      future: [structuredClone(circuit), ...future].slice(0, HISTORY_LIMIT),
      selectedIds: [],
      movingNodeId: null,
    });
  },

  redo: () => {
    const { past, circuit, future } = get();
    const next = future[0];
    if (!next) return;
    set({
      circuit: next,
      past: [...past, structuredClone(circuit)].slice(-HISTORY_LIMIT),
      future: future.slice(1),
      selectedIds: [],
      movingNodeId: null,
    });
  },
}));

/* ─────────────────────────── Kod muharriri ─────────────────────────── */

const DEFAULT_CODE = `void setup() {
  // Boshlang'ich sozlamalar
}

void loop() {
  // Takrorlanuvchi kod
}
`;

interface EditorState {
  code: string;
  fontSize: number;
  errors: CodeError[];
  setCode: (code: string) => void;
  setFontSize: (size: number) => void;
  setErrors: (errors: CodeError[]) => void;
  resetCode: () => void;
}

export const useEditorStore = create<EditorState>((set) => ({
  code: DEFAULT_CODE,
  fontSize: 14,
  errors: [],
  setCode: (code) => set({ code }),
  setFontSize: (fontSize) => set({ fontSize: Math.max(10, Math.min(24, fontSize)) }),
  setErrors: (errors) => set({ errors }),
  resetCode: () => set({ code: DEFAULT_CODE, errors: [] }),
}));

/* ─────────────────────────── Simulyatsiya ─────────────────────────── */

interface SimulationState {
  status: SimulationStatus;
  speed: SimulationSpeed;
  time: number;
  logs: SerialLogEntry[];
  runtime: Record<string, ComponentRuntimeState>;
  /**
   * Sim → undagi tok va yo'nalish.
   *
   * Sxemada jonli chiziq bilan ko'rsatiladi: bola zanjir yopilganini
   * "LED yondi" degan bitta belgidan emas, butun yo'l bo'ylab ko'radi.
   */
  wireFlow: Record<string, WireFlow>;
  /** Foydalanuvchi boshqaradigan sensor qiymatlari: node id → qiymat. */
  sensors: Record<string, number>;
  errors: string[];

  setStatus: (status: SimulationStatus) => void;
  setSpeed: (speed: SimulationSpeed) => void;
  setSensor: (nodeId: string, value: number) => void;
  setSensors: (sensors: Record<string, number>) => void;
  /** Simulyator har kadrda shu orqali holatni beradi. */
  publish: (payload: {
    time: number;
    logs: SerialLogEntry[];
    runtime: SimulationState["runtime"];
    wireFlow: Record<string, WireFlow>;
  }) => void;
  setErrors: (errors: string[]) => void;
  clearLogs: () => void;
  reset: () => void;
  /**
   * Plataning RESET tugmasi bosildi.
   *
   * Simulyatsiya sikli (requestAnimationFrame) `workbench` ichida yashaydi,
   * store undan bexabar — shuning uchun bu yerda faqat "so'rov" hisoblagichi
   * o'sadi, to'xtatishni esa siklni boshqaradigan joy uddalaydi.
   */
  requestReset: () => void;
  /** Har bir RESET bosilishida ortadigan hisoblagich. */
  resetToken: number;
}

/* ─────────────────────────── Tugun ajratish ─────────────────────────── */

interface HighlightState {
  /**
   * Sichqoncha ostidagi elektr tuguni.
   *
   * Bu — Faza B ning o'zagi: bola breadboarddagi bitta teshikka tegsa,
   * u bilan ELEKTR JIHATDAN bir xil bo'lgan hamma nuqta yonadi. "Nega bu
   * ikki teshik ulangan?" degan savolga javob ekranda ko'rinadi.
   *
   * Alohida store — sichqoncha harakatida sxema store'i o'zgarmasin va
   * undan oziqlanadigan hamma narsa qayta chizilmasin.
   */
  hoveredNet: string | null;
  setHoveredNet: (net: string | null) => void;
}

export const useHighlightStore = create<HighlightState>((set) => ({
  hoveredNet: null,
  setHoveredNet: (hoveredNet) => set((s) => (s.hoveredNet === hoveredNet ? s : { hoveredNet })),
}));

/**
 * Ikki oqim jadvali amalda bir xilmi.
 *
 * Tok kuchi doim bir oz tebranadi (PWM, sensor), shuning uchun aniq
 * tenglik emas, ko'rinadigan farq tekshiriladi: 0.1 mA dan kichik
 * o'zgarish ekranda umuman sezilmaydi.
 */
function sameWireFlow(a: Record<string, WireFlow>, b: Record<string, WireFlow>): boolean {
  const keys = Object.keys(a);
  if (keys.length !== Object.keys(b).length) return false;
  for (const key of keys) {
    const x = a[key];
    const y = b[key];
    if (!y || !x) return false;
    if (x.direction !== y.direction) return false;
    if (Math.abs(x.milliamps - y.milliamps) > 0.1) return false;
  }
  return true;
}

export const useSimulationStore = create<SimulationState>((set) => ({
  status: "stopped",
  speed: 1,
  time: 0,
  logs: [],
  runtime: {},
  wireFlow: {},
  sensors: {},
  errors: [],
  resetToken: 0,

  setStatus: (status) => set({ status }),
  setSpeed: (speed) => set({ speed }),
  setSensor: (nodeId, value) => set((s) => ({ sensors: { ...s.sensors, [nodeId]: value } })),
  setSensors: (sensors) => set({ sensors: { ...sensors } }),
  publish: ({ time, logs, runtime, wireFlow }) =>
    set((s) => ({
      time,
      logs,
      runtime,
      // Odatda oqim o'zgarmaydi — havolani saqlab qolsak, sxema har
      // kadrda qayta chizilmaydi.
      wireFlow: sameWireFlow(s.wireFlow, wireFlow) ? s.wireFlow : wireFlow,
    })),
  setErrors: (errors) => set({ errors }),
  clearLogs: () => set({ logs: [] }),
  reset: () => set({ status: "stopped", time: 0, logs: [], runtime: {}, wireFlow: {}, errors: [] }),
  requestReset: () => set((s) => ({ resetToken: s.resetToken + 1 })),
}));

/* ─────────────────────────── Loyihalar ─────────────────────────── */

interface ProjectState {
  projects: SavedProject[];
  currentId: string | null;
  name: string;
  lessonSlug: string | null;
  /** Saqlanmagan o'zgarish bormi. */
  dirty: boolean;
  lastError: string | null;

  hydrate: () => void;
  setName: (name: string, dirty?: boolean) => void;
  markDirty: () => void;
  newProject: (name?: string) => void;
  /** `blocks` ixtiyoriy: kod rejimida ishlayotgan loyihada ish maydoni bo'sh bo'lishi mumkin (§29). */
  save: (
    circuit: Circuit,
    code: string,
    sensors: Record<string, number>,
    blocks?: BlockWorkspace,
  ) => void;
  open: (id: string) => SavedProject | null;
  duplicate: (id: string) => void;
  rename: (id: string, name: string) => void;
  remove: (id: string) => void;
  addImported: (project: SavedProject) => SavedProject;
  setLesson: (slug: string | null) => void;
}

export const useProjectStore = create<ProjectState>((set, get) => ({
  projects: [],
  currentId: null,
  name: "Yangi loyiha",
  lessonSlug: null,
  dirty: false,
  lastError: null,

  hydrate: () => set({ projects: loadProjects() }),

  setName: (name, dirty = true) => set({ name, dirty, lastError: dirty ? get().lastError : null }),
  markDirty: () => set({ dirty: true }),
  setLesson: (lessonSlug) => set({ lessonSlug }),

  newProject: (name = "Yangi loyiha") =>
    set({ currentId: null, name, lessonSlug: null, dirty: false, lastError: null }),

  save: (circuit, code, sensors, blocks) => {
    const { projects, currentId, name, lessonSlug } = get();
    const now = new Date().toISOString();

    let next: SavedProject[];
    let id = currentId;

    if (currentId && projects.some((p) => p.id === currentId)) {
      next = projects.map((p) =>
        p.id === currentId
          ? {
              ...p,
              name,
              circuit: sanitizeCircuit(circuit),
              code,
              sensors,
              lessonSlug,
              blocks,
              updatedAt: now,
            }
          : p,
      );
    } else {
      const created = {
        ...createProject(name, lessonSlug),
        circuit: sanitizeCircuit(circuit),
        code,
        sensors,
        blocks,
      };
      id = created.id;
      next = [created, ...projects];
    }

    const result = saveProjects(next);
    set({
      projects: next,
      currentId: id,
      dirty: !result.ok,
      lastError: result.ok ? null : (result.error ?? null),
    });
  },

  open: (id) => {
    const project = get().projects.find((p) => p.id === id) ?? null;
    if (project) {
      set({
        currentId: project.id,
        name: project.name,
        lessonSlug: project.lessonSlug,
        dirty: false,
        lastError: null,
      });
    }
    return project;
  },

  duplicate: (id) => {
    const source = get().projects.find((p) => p.id === id);
    if (!source) return;
    const copy: SavedProject = {
      ...structuredClone(source),
      id: `p-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
      name: `${source.name} (nusxa)`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const next = [copy, ...get().projects];
    const result = saveProjects(next);
    set({
      projects: next,
      lastError: result.ok ? null : (result.error ?? null),
      dirty: result.ok ? get().dirty : true,
    });
  },

  rename: (id, name) => {
    const next = get().projects.map((p) =>
      p.id === id ? { ...p, name, updatedAt: new Date().toISOString() } : p,
    );
    const result = saveProjects(next);
    set({
      projects: next,
      name: get().currentId === id ? name : get().name,
      lastError: result.ok ? null : (result.error ?? null),
      dirty: result.ok ? get().dirty : true,
    });
  },

  remove: (id) => {
    const next = get().projects.filter((p) => p.id !== id);
    const result = saveProjects(next);
    set({
      projects: next,
      currentId: get().currentId === id ? null : get().currentId,
      lastError: result.ok ? null : (result.error ?? null),
      dirty: result.ok ? get().dirty : true,
    });
  },

  addImported: (project) => {
    // Import qilingan loyihaga yangi ID beramiz — mavjudini bosib ketmasin.
    const fresh: SavedProject = {
      ...project,
      id: `p-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
      updatedAt: new Date().toISOString(),
    };
    const next = [fresh, ...get().projects];
    const result = saveProjects(next);
    set({
      projects: next,
      currentId: fresh.id,
      name: fresh.name,
      lessonSlug: fresh.lessonSlug,
      lastError: result.ok ? null : (result.error ?? null),
      dirty: !result.ok,
    });
    return fresh;
  },
}));
