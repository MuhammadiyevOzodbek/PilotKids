"use client";

import { create } from "zustand";
import type { WireColor } from "@/lib/virtual-lab/types";

/**
 * 3D laboratoriyaning KO'RINISH holati.
 *
 * Sxemaning o'zi bu yerda YO'Q — u `useCircuitStore` da, 2D laboratoriya
 * bilan bitta joyda. Shu sababli undo/redo, sim ulash qoidalari va saqlash
 * ikkala laboratoriyada aynan bir xil ishlaydi va bitta loyihani ikkalasida
 * ham ochish mumkin (§42).
 *
 * Bu yerda faqat 3D ga xos narsalar: qaysi asbob tanlangan, qaysi pin
 * ustida sichqoncha turibdi, qaysi sozlamalar yoqilgan.
 */

/** Chap tugma nima qiladi. */
export type Lab3DTool = "select" | "wire";

/** Kamera tugmalari uchun tayyor ko'rinishlar (§4). */
export type CameraView = "perspective" | "top" | "front" | "left" | "right";

/** Pin tooltiplari qanchalik texnik bo'lsin (§39, §40). */
export type Lab3DMode = "beginner" | "advanced";

/** Sim boshlangan, lekin hali tugamagan uchi. */
export interface PendingWire {
  nodeId: string;
  pinId: string;
}

export interface Lab3DSettings {
  showGrid: boolean;
  snapToGrid: boolean;
  showLabels: boolean;
  /** Pin ustiga kelganda izoh chiqsinmi (§17). */
  showPinNames: boolean;
  /** Sim ichidagi zarrachalar (§24) — ataylab default O'CHIQ. */
  showCurrentFlow: boolean;
}

interface Lab3DState {
  tool: Lab3DTool;
  mode: Lab3DMode;
  wireColor: WireColor;
  settings: Lab3DSettings;

  pendingWire: PendingWire | null;
  /** `"nodeId:pinId"` — sichqoncha ostidagi pin. */
  hoveredPin: string | null;
  /** Inspektorda sim ko'rsatilishi uchun. */
  selectedWireId: string | null;

  /**
   * Kamera buyrug'i.
   *
   * Kamera holati React holatida SAQLANMAYDI — u har kadrda o'zgaradi va
   * store'ga yozilsa butun interfeys qayta chizilardi (§33). Shu bois bu
   * yerda faqat «buyruq» turadi: ko'rinish nomi va hisoblagich. Sahna
   * hisoblagich o'zgarganini ko'rib, kamerani o'zi harakatlantiradi.
   */
  cameraCommand: { view: CameraView | "fit" | "focus"; token: number };

  /*
   * DIQQAT: plataning RESET tugmasi bu yerda EMAS.
   *
   * U `useSimulationStore.requestReset()` / `resetToken` da — 2D
   * laboratoriya ham o'shani ishlatadi. Bu yerga ikkinchisini qo'yish
   * ikkita bir xil mexanizm hosil qilardi va biri ikkinchisidan bexabar
   * qolardi.
   */

  /** Boshlang'ich qo'llanma ko'rsatilganmi (§38). */
  onboardingSeen: boolean;

  setTool: (tool: Lab3DTool) => void;
  setMode: (mode: Lab3DMode) => void;
  setWireColor: (color: WireColor) => void;
  toggleSetting: (key: keyof Lab3DSettings) => void;

  startWire: (end: PendingWire) => void;
  cancelWire: () => void;
  setHoveredPin: (key: string | null) => void;
  selectWire: (id: string | null) => void;

  requestCamera: (view: CameraView | "fit" | "focus") => void;
  dismissOnboarding: () => void;
}

/** Toolbar'dagi sim ranglari — 2D dagi `WireColor` bilan bir xil ro'yxat. */
export const WIRE_COLORS: readonly WireColor[] = [
  "red",
  "black",
  "blue",
  "green",
  "yellow",
  "orange",
];

const DEFAULT_SETTINGS: Lab3DSettings = {
  showGrid: true,
  snapToGrid: true,
  showLabels: true,
  // Pin izohi — laboratoriyaning asosiy o'rgatuvchi vositasi, shuning
  // uchun boshidanoq yoqilgan.
  showPinNames: true,
  showCurrentFlow: false,
};

export const useLab3DStore = create<Lab3DState>((set) => ({
  tool: "select",
  mode: "beginner",
  wireColor: "red",
  settings: DEFAULT_SETTINGS,

  pendingWire: null,
  hoveredPin: null,
  selectedWireId: null,
  cameraCommand: { view: "perspective", token: 0 },
  onboardingSeen: false,

  setTool: (tool) =>
    // Asbob almashganda yarim qolgan sim bekor bo'ladi — aks holda u
    // «tanlash» rejimida ham osilib turardi.
    set((s) => (s.tool === tool ? s : { tool, pendingWire: null })),

  setMode: (mode) => set({ mode }),
  setWireColor: (wireColor) => set({ wireColor }),

  toggleSetting: (key) => set((s) => ({ settings: { ...s.settings, [key]: !s.settings[key] } })),

  startWire: (pendingWire) => set({ pendingWire }),
  cancelWire: () => set((s) => (s.pendingWire === null ? s : { pendingWire: null })),

  setHoveredPin: (hoveredPin) => set((s) => (s.hoveredPin === hoveredPin ? s : { hoveredPin })),

  selectWire: (selectedWireId) => set({ selectedWireId }),

  requestCamera: (view) =>
    set((s) => ({ cameraCommand: { view, token: s.cameraCommand.token + 1 } })),

  dismissOnboarding: () => set({ onboardingSeen: true }),
}));
