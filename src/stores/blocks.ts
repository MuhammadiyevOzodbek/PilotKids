"use client";

import { create } from "zustand";
import {
  addSubtree,
  addTopBlock,
  addVariable,
  connectAfter,
  connectIntoStatement,
  connectValue,
  createBlock,
  detachBlock,
  duplicateSubtree,
  emptyWorkspace,
  moveTopBlock,
  remapSubtree,
  removeBlock,
  removeVariable,
  renameVariable,
  sanitizeWorkspace,
  setField,
  type BlockLevel,
  type BlockLocale,
  type BlockNode,
  type BlockWorkspace,
  type WorkspaceVariable,
} from "@/lib/virtual-lab/blocks";

/**
 * Blok muharririning holati.
 *
 * Sxema store'idagi qoidalar shu yerda ham amal qiladi: tarix o'zgarishdan
 * OLDIN yoziladi, ko'chirish esa bitta qadam bo'lib qoladi (har piksel
 * uchun alohida undo bo'lmasin).
 *
 * Simulyatsiya holati bu yerda YO'Q: blok muharriri o'zgarganda
 * simulyator qayta chizilmasligi kerak (§39).
 */

const HISTORY_LIMIT = 50;

/** Dasturlash paneli qaysi ko'rinishda (§1). */
export type ProgrammingMode = "block" | "code" | "split";

interface BlocksState {
  workspace: BlockWorkspace;
  past: BlockWorkspace[];
  future: BlockWorkspace[];

  mode: ProgrammingMode;
  level: BlockLevel;
  /**
   * Blok matnlarining tili (§41).
   *
   * Ish maydonining O'ZIDA saqlanmaydi: til — foydalanuvchining ko'rinish
   * sozlamasi, loyihaning bir qismi emas. Shu sababli boshqa tilda
   * saqlangan loyiha ochilganda til o'zgarib ketmaydi.
   */
  locale: BlockLocale;
  selectedId: string | null;
  /** Ochiq kategoriya — palitrada. */
  category: string;
  zoom: number;
  pan: { x: number; y: number };
  /**
   * Kod rejimida qo'lda o'zgartirish qilinganmi (§28).
   *
   * Shu bayroq yoqilgach blok muharriri kodni bosib yozmaydi: bolaning
   * qo'lda yozgani jim yo'qolib ketmasligi kerak.
   */
  codeDirty: boolean;
  /**
   * Hozir blok sudralayaptimi.
   *
   * Sudrash BITTA undo qadam bo'lishi kerak: uzish, o'nlab siljish va
   * oxirida ulash — bolaning ko'zida bu bitta harakat. Shu sababli
   * sudrash boshlanishida bitta suratga olinadi, keyin tarixga
   * yozilmaydi.
   */
  dragActive: boolean;
  /**
   * Hozir sudralayotgan blok.
   *
   * Store'da, komponent holatida emas: `BlockView` uni ID bo'yicha
   * selektor bilan oladi va shu sababli sudrash paytida faqat AYNAN
   * sudralayotgan blok qayta chiziladi (§39).
   */
  draggingId: string | null;
  /**
   * Nusxa olingan blok daraxti (§30).
   *
   * Ish maydonida emas, store'da yashaydi: ish maydoni tozalansa ham
   * nusxa qoladi va boshqa loyihaga joylash mumkin bo'ladi.
   */
  clipboard: { blocks: BlockNode[]; rootId: string } | null;

  beginDrag: () => void;
  endDrag: () => void;
  setDragging: (id: string | null) => void;

  setMode: (mode: ProgrammingMode) => void;
  setLevel: (level: BlockLevel) => void;
  setLocale: (locale: BlockLocale) => void;
  setCategory: (category: string) => void;
  select: (id: string | null) => void;
  setZoom: (zoom: number) => void;
  setPan: (pan: { x: number; y: number }) => void;
  markCodeDirty: (dirty: boolean) => void;

  /** Palitradan ish maydoniga yangi blok tashlanadi. */
  addBlock: (type: string, x: number, y: number) => string | null;
  moveTop: (id: string, x: number, y: number, commit: boolean) => void;
  detach: (id: string, x: number, y: number) => void;
  attachAfter: (movingId: string, targetId: string) => void;
  attachIntoStatement: (movingId: string, parentId: string, slot: string) => void;
  attachValue: (
    movingId: string,
    parentId: string,
    slot: string,
    at: { x: number; y: number },
  ) => void;
  remove: (id: string) => void;
  duplicate: (id: string) => void;
  changeField: (id: string, name: string, value: string) => void;

  copy: (id: string) => void;
  paste: () => void;
  canPaste: () => boolean;

  addVar: (name: string, type?: WorkspaceVariable["type"]) => void;
  renameVar: (id: string, name: string) => void;
  removeVar: (id: string) => void;

  replaceWorkspace: (workspace: BlockWorkspace) => void;
  clear: () => void;
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
}

function pushHistory(state: BlocksState): Partial<Pick<BlocksState, "past" | "future">> {
  // Sudrash davomida tarix qotib turadi — surat allaqachon `beginDrag` da olingan.
  if (state.dragActive) return {};
  const past = [...state.past, state.workspace];
  if (past.length > HISTORY_LIMIT) past.shift();
  return { past, future: [] };
}

export const ZOOM_MIN = 0.4;
export const ZOOM_MAX = 2;

export const useBlocksStore = create<BlocksState>((set, get) => ({
  workspace: emptyWorkspace(),
  past: [],
  future: [],

  mode: "block",
  level: "beginner",
  locale: "uz",
  selectedId: null,
  category: "events",
  zoom: 1,
  pan: { x: 0, y: 0 },
  codeDirty: false,
  dragActive: false,
  draggingId: null,
  clipboard: null,

  beginDrag: () => set((s) => (s.dragActive ? s : { ...pushHistory(s), dragActive: true })),
  endDrag: () => set({ dragActive: false, draggingId: null }),
  setDragging: (draggingId) => set((s) => (s.draggingId === draggingId ? s : { draggingId })),

  setMode: (mode) => set({ mode }),
  setLevel: (level) => set({ level }),
  setLocale: (locale) => set({ locale }),
  setCategory: (category) => set({ category }),
  select: (selectedId) => set((s) => (s.selectedId === selectedId ? s : { selectedId })),
  setZoom: (zoom) => set({ zoom: Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, zoom)) }),
  setPan: (pan) => set({ pan }),
  markCodeDirty: (codeDirty) => set({ codeDirty }),

  addBlock: (type, x, y) => {
    const block = createBlock(type);
    if (!block) return null;
    set((s) => ({ ...pushHistory(s), workspace: addTopBlock(s.workspace, block, x, y) }));
    // Chegaraga yetgan bo'lsa blok qo'shilmaydi — shuni bildiramiz.
    return get().workspace.blocks[block.id] ? block.id : null;
  },

  /*
   * Sudrash paytida tarix yozilmaydi (`dragActive`), klaviatura yoki
   * boshqa yo'l bilan ko'chirilganda esa `commit` bilan bitta qadam.
   */
  moveTop: (id, x, y, commit) =>
    set((s) => ({
      ...(commit ? pushHistory(s) : {}),
      workspace: moveTopBlock(s.workspace, id, x, y),
    })),

  detach: (id, x, y) =>
    set((s) => ({ ...pushHistory(s), workspace: detachBlock(s.workspace, id, x, y) })),

  attachAfter: (movingId, targetId) =>
    set((s) => ({ ...pushHistory(s), workspace: connectAfter(s.workspace, movingId, targetId) })),

  attachIntoStatement: (movingId, parentId, slot) =>
    set((s) => ({
      ...pushHistory(s),
      workspace: connectIntoStatement(s.workspace, movingId, parentId, slot),
    })),

  attachValue: (movingId, parentId, slot, at) =>
    set((s) => ({
      ...pushHistory(s),
      workspace: connectValue(s.workspace, movingId, parentId, slot, at),
    })),

  remove: (id) =>
    set((s) => ({
      ...pushHistory(s),
      workspace: removeBlock(s.workspace, id),
      selectedId: s.selectedId === id ? null : s.selectedId,
    })),

  duplicate: (id) => {
    const { workspace } = get();
    const copy = duplicateSubtree(workspace, id);
    if (!copy) return;
    const at = workspace.tops[id] ?? { x: 40, y: 40 };
    set((s) => ({
      ...pushHistory(s),
      workspace: addSubtree(s.workspace, copy.blocks, copy.rootId, at.x + 32, at.y + 32),
      selectedId: copy.rootId,
    }));
  },

  changeField: (id, name, value) =>
    set((s) => {
      const workspace = setField(s.workspace, id, name, value);
      if (workspace === s.workspace) return s;
      return { ...pushHistory(s), workspace };
    }),

  /*
   * Nusxa olishda daraxt DARHOL yangi ID'lar bilan ko'chiriladi.
   * Shunda manba blok o'chirilsa ham nusxa yaroqli qoladi — buferda
   * "yo'q blokka havola" qolib ketmaydi.
   */
  copy: (id) => {
    const copy = duplicateSubtree(get().workspace, id);
    if (copy) set({ clipboard: copy });
  },

  paste: () => {
    const { clipboard, workspace } = get();
    if (!clipboard) return;

    // Har joylashda yangi ID kerak: bitta nusxani ikki marta joylash mumkin.
    const fresh = remapSubtree(clipboard.blocks, clipboard.rootId);
    const at = workspace.tops[get().selectedId ?? ""] ?? { x: 40, y: 40 };
    set((s) => ({
      ...pushHistory(s),
      workspace: addSubtree(s.workspace, fresh.blocks, fresh.rootId, at.x + 32, at.y + 32),
      selectedId: fresh.rootId,
    }));
  },

  canPaste: () => get().clipboard !== null,

  addVar: (name, type = "int") =>
    set((s) => {
      const workspace = addVariable(s.workspace, name, type);
      if (workspace === s.workspace) return s;
      return { ...pushHistory(s), workspace };
    }),

  renameVar: (id, name) =>
    set((s) => {
      const workspace = renameVariable(s.workspace, id, name);
      if (workspace === s.workspace) return s;
      return { ...pushHistory(s), workspace };
    }),

  removeVar: (id) =>
    set((s) => ({ ...pushHistory(s), workspace: removeVariable(s.workspace, id) })),

  replaceWorkspace: (workspace) =>
    set({
      workspace: sanitizeWorkspace(workspace),
      past: [],
      future: [],
      selectedId: null,
      codeDirty: false,
    }),

  clear: () => set((s) => ({ ...pushHistory(s), workspace: emptyWorkspace(), selectedId: null })),

  undo: () => {
    const { past, workspace, future } = get();
    const previous = past[past.length - 1];
    if (!previous) return;
    set({
      workspace: previous,
      past: past.slice(0, -1),
      future: [workspace, ...future].slice(0, HISTORY_LIMIT),
      selectedId: null,
    });
  },

  redo: () => {
    const { past, workspace, future } = get();
    const next = future[0];
    if (!next) return;
    set({
      workspace: next,
      past: [...past, workspace].slice(-HISTORY_LIMIT),
      future: future.slice(1),
      selectedId: null,
    });
  },

  canUndo: () => get().past.length > 0,
  canRedo: () => get().future.length > 0,
}));
