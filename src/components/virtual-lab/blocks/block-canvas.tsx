"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { t, type BlockIssueSeverity } from "@/lib/virtual-lab/blocks";
import type { Circuit } from "@/lib/virtual-lab/types";
import { ZOOM_MAX, ZOOM_MIN, useBlocksStore } from "@/stores/blocks";
import { BlockEditorProvider, BlockStateProvider, BlockView } from "./block-view";
import { elementOf, findDropTarget, toWorkspacePoint, type DropTarget } from "./block-dnd";

/**
 * Blok ish maydoni: sudrash, ulash, masshtab va surish.
 *
 * Ulanish nuqtalari DOM'dan o'lchanadi (`block-dnd.ts`), shuning uchun bu
 * yerda faqat hodisalar boshqariladi.
 *
 * Bitta sudrash — bitta undo qadam: `beginDrag` boshida bir marta surat
 * oladi, oradagi o'nlab siljish tarixga tushmaydi.
 */

/** Sudrash boshlanishi uchun kerakli eng kichik siljish (px). */
const DRAG_THRESHOLD = 4;
/** Palitradan tashlanganda blok kursorning shu nuqtasida ushlanadi. */
const PALETTE_GRAB = { x: 24, y: 14 };
/** «Sig'dirish» dan keyin bloklar atrofida qoladigan bo'sh joy (px). */
const FIT_PADDING = 40;

interface DragState {
  id: string;
  pointerId: number;
  /** Sichqoncha blokning qaysi nuqtasidan ushlagani (ish maydoni birligida). */
  offsetX: number;
  offsetY: number;
  startClientX: number;
  startClientY: number;
  started: boolean;
}

export interface BlockCanvasApi {
  /** Palitradan yangi blok sudralib chiqarilganda chaqiriladi. */
  startPaletteDrag: (type: string, event: React.PointerEvent) => void;
  /** Hamma blok ekranga sig'adigan masshtab va surilishni tanlaydi (§31). */
  fitToBlocks: () => void;
}

/** Nuqta palitra ustidami — sudralgan blok shu yerga tashlansa o'chadi. */
function isOverPalette(clientX: number, clientY: number): boolean {
  return document.elementFromPoint(clientX, clientY)?.closest(".blk-palette") != null;
}

export function BlockCanvas({
  circuit,
  apiRef,
  issues,
}: {
  circuit: Circuit;
  apiRef?: React.RefObject<BlockCanvasApi | null>;
  /** Blok id → eng jiddiy muammo darajasi (§34). */
  issues: Map<string, BlockIssueSeverity>;
}) {
  const workspace = useBlocksStore((s) => s.workspace);
  const zoom = useBlocksStore((s) => s.zoom);
  const pan = useBlocksStore((s) => s.pan);
  const selectedId = useBlocksStore((s) => s.selectedId);
  const locale = useBlocksStore((s) => s.locale);
  const level = useBlocksStore((s) => s.level);

  const select = useBlocksStore((s) => s.select);
  const setZoom = useBlocksStore((s) => s.setZoom);
  const setPan = useBlocksStore((s) => s.setPan);
  const addBlock = useBlocksStore((s) => s.addBlock);
  const beginDrag = useBlocksStore((s) => s.beginDrag);
  const endDrag = useBlocksStore((s) => s.endDrag);
  const setDragging = useBlocksStore((s) => s.setDragging);
  const detach = useBlocksStore((s) => s.detach);
  const moveTop = useBlocksStore((s) => s.moveTop);
  const attachAfter = useBlocksStore((s) => s.attachAfter);
  const attachIntoStatement = useBlocksStore((s) => s.attachIntoStatement);
  const attachValue = useBlocksStore((s) => s.attachValue);
  const remove = useBlocksStore((s) => s.remove);
  const changeField = useBlocksStore((s) => s.changeField);

  const surfaceRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<DragState | null>(null);
  const panRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    origin: { x: number; y: number };
  } | null>(null);
  /**
   * Ekranga tekkan barmoqlar.
   *
   * Ikki barmoq bo'lganda ular orasidagi masofa masshtabga aylanadi
   * (§31). Bitta barmoq — oddiy surish, ya'ni alohida kod kerak emas.
   */
  const touchRef = useRef(new Map<number, { x: number; y: number }>());
  const pinchRef = useRef<{ distance: number; zoom: number } | null>(null);

  /**
   * Ulanish joyi ko'rsatkichi — TAYYOR koordinatalarda.
   *
   * Uni render paytida hisoblab bo'lmaydi: o'lchov DOM'dan olinadi, render
   * esa hali joylashtirilmagan holatni ko'radi. Shuning uchun sudrash
   * hodisasida hisoblanadi va shu yerda saqlanadi.
   */
  const [dropHint, setDropHint] = useState<{ x: number; y: number; width: number } | null>(null);
  const [overTrash, setOverTrash] = useState(false);

  const topIds = useMemo(
    () => Object.keys(workspace.tops).filter((id) => workspace.blocks[id]),
    [workspace],
  );

  /* ─────────────────── Sudrashni boshlash ─────────────────── */

  const grab = useCallback(
    (blockId: string, event: React.PointerEvent) => {
      if (event.button !== 0) return;
      const surface = surfaceRef.current;
      const element = elementOf("block", blockId);
      if (!surface || !element) return;

      // Fon surilib ketmasin: blok ustidagi bosish faqat blokka tegishli.
      event.stopPropagation();

      const pointer = toWorkspacePoint(surface, event.clientX, event.clientY, zoom, pan);
      const rect = element.getBoundingClientRect();
      const corner = toWorkspacePoint(surface, rect.left, rect.top, zoom, pan);

      dragRef.current = {
        id: blockId,
        pointerId: event.pointerId,
        offsetX: pointer.x - corner.x,
        offsetY: pointer.y - corner.y,
        startClientX: event.clientX,
        startClientY: event.clientY,
        started: false,
      };
    },
    [zoom, pan],
  );

  const startPaletteDrag = useCallback(
    (type: string, event: React.PointerEvent) => {
      if (event.button !== 0) return;
      const surface = surfaceRef.current;
      if (!surface) return;

      const point = toWorkspacePoint(surface, event.clientX, event.clientY, zoom, pan);

      /*
       * Tarix suratini blok QO'SHILISHIDAN OLDIN olamiz: shunda bitta undo
       * yangi blokni butunlay olib tashlaydi, "qo'shdim, keyin ko'chirdim"
       * degan ikki qadam qolmaydi.
       */
      beginDrag();
      const id = addBlock(type, point.x - PALETTE_GRAB.x, point.y - PALETTE_GRAB.y);
      if (!id) {
        endDrag();
        return;
      }

      dragRef.current = {
        id,
        pointerId: event.pointerId,
        offsetX: PALETTE_GRAB.x,
        offsetY: PALETTE_GRAB.y,
        startClientX: event.clientX,
        startClientY: event.clientY,
        started: true,
      };
      setDragging(id);
    },
    [zoom, pan, addBlock, beginDrag, endDrag, setDragging],
  );

  /* ─────────────────── Bloklarga sig'dirish (§31) ─────────────────── */

  /**
   * Ildiz bloklarning DOM o'lchamlaridan chegara to'rtburchagini hisoblaydi.
   *
   * O'lchamni oldindan bilib bo'lmaydi: blokning kengligi yorliq matniga,
   * ya'ni tilga bog'liq (§41). Shuning uchun brauzerdan so'raladi va
   * joriy masshtabga bo'linadi — natija ish maydoni birligida chiqadi.
   */
  const fitToBlocks = useCallback(() => {
    const surface = surfaceRef.current;
    const state = useBlocksStore.getState();
    const ids = Object.keys(state.workspace.tops).filter((id) => state.workspace.blocks[id]);
    if (!surface || ids.length === 0) {
      setZoom(1);
      setPan({ x: 0, y: 0 });
      return;
    }

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    for (const id of ids) {
      const at = state.workspace.tops[id]!;
      const element = elementOf("block", id);
      const rect = element?.getBoundingClientRect();
      const width = rect ? rect.width / state.zoom : 160;
      const height = rect ? rect.height / state.zoom : 40;
      minX = Math.min(minX, at.x);
      minY = Math.min(minY, at.y);
      maxX = Math.max(maxX, at.x + width);
      maxY = Math.max(maxY, at.y + height);
    }

    const view = surface.getBoundingClientRect();
    const boundsWidth = Math.max(1, maxX - minX);
    const boundsHeight = Math.max(1, maxY - minY);

    // 1 dan katta masshtab qilinmaydi: bitta blokni ekranga cho'zish
    // «sig'dirish» emas, kattalashtirish bo'lardi.
    const nextZoom = Math.min(
      1,
      Math.max(
        ZOOM_MIN,
        Math.min(
          (view.width - FIT_PADDING * 2) / boundsWidth,
          (view.height - FIT_PADDING * 2) / boundsHeight,
        ),
      ),
    );

    setZoom(nextZoom);
    setPan({
      x: (view.width - boundsWidth * nextZoom) / 2 - minX * nextZoom,
      y: (view.height - boundsHeight * nextZoom) / 2 - minY * nextZoom,
    });
  }, [setZoom, setPan]);

  useEffect(() => {
    if (apiRef) apiRef.current = { startPaletteDrag, fitToBlocks };
  }, [apiRef, startPaletteDrag, fitToBlocks]);

  /* ─────────────────── Sudrash va tashlash ─────────────────── */

  useEffect(() => {
    const onMove = (event: PointerEvent) => {
      const surface = surfaceRef.current;
      if (!surface) return;

      // Ikki barmoq — masshtab (§31).
      const touches = touchRef.current;
      if (touches.has(event.pointerId)) {
        touches.set(event.pointerId, { x: event.clientX, y: event.clientY });
        if (touches.size === 2) {
          applyPinch(surface, touches, pinchRef, setZoom, setPan);
          return;
        }
      }

      const panning = panRef.current;
      if (panning && panning.pointerId === event.pointerId) {
        setPan({
          x: panning.origin.x + (event.clientX - panning.startX),
          y: panning.origin.y + (event.clientY - panning.startY),
        });
        return;
      }

      const drag = dragRef.current;
      if (!drag || drag.pointerId !== event.pointerId) return;

      if (!drag.started) {
        const moved = Math.hypot(
          event.clientX - drag.startClientX,
          event.clientY - drag.startClientY,
        );
        // Kichik titrash sudrash emas, oddiy bosish bo'lib qolsin.
        if (moved < DRAG_THRESHOLD) return;
        drag.started = true;
        beginDrag();
        setDragging(drag.id);
      }

      const pointer = toWorkspacePoint(surface, event.clientX, event.clientY, zoom, pan);
      const x = pointer.x - drag.offsetX;
      const y = pointer.y - drag.offsetY;

      // Ota-blokdan uzamiz — shundan keyin blok mustaqil ildiz bo'ladi.
      if (!useBlocksStore.getState().workspace.tops[drag.id]) detach(drag.id, x, y);
      else moveTop(drag.id, x, y, false);

      const state = useBlocksStore.getState();
      const target = findDropTarget(state.workspace, drag.id, state.zoom);
      setDropHint(dropHintFor(target, surface, state.zoom, state.pan));
      setOverTrash(isOverPalette(event.clientX, event.clientY));
    };

    const onUp = (event: PointerEvent) => {
      touchRef.current.delete(event.pointerId);
      if (touchRef.current.size < 2) pinchRef.current = null;
      if (panRef.current?.pointerId === event.pointerId) panRef.current = null;

      const drag = dragRef.current;
      if (!drag || drag.pointerId !== event.pointerId) return;
      dragRef.current = null;

      // Sudralmagan bosish — tanlash.
      if (!drag.started) {
        select(drag.id);
        return;
      }

      if (isOverPalette(event.clientX, event.clientY)) {
        remove(drag.id);
      } else {
        const state = useBlocksStore.getState();
        const target = findDropTarget(state.workspace, drag.id, state.zoom);
        if (target?.kind === "after") {
          attachAfter(drag.id, target.targetId);
        } else if (target?.kind === "statement") {
          attachIntoStatement(drag.id, target.parentId, target.slot);
        } else if (target?.kind === "input") {
          // Uyadan siqib chiqarilgan blok yonginasida paydo bo'lsin.
          const at = state.workspace.tops[drag.id] ?? { x: 40, y: 40 };
          attachValue(drag.id, target.parentId, target.slot, { x: at.x + 24, y: at.y + 48 });
        }
      }

      endDrag();
      setDragging(null);
      setDropHint(null);
      setOverTrash(false);
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
  }, [
    zoom,
    pan,
    setPan,
    setZoom,
    beginDrag,
    endDrag,
    detach,
    moveTop,
    attachAfter,
    attachIntoStatement,
    attachValue,
    remove,
    select,
    setDragging,
  ]);

  /* ─────────────────── Surish va masshtab ─────────────────── */

  const startPan = useCallback(
    (event: React.PointerEvent) => {
      if (event.pointerType === "touch") {
        touchRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
        // Ikkinchi barmoq tushdi — surish to'xtaydi, masshtab boshlanadi.
        if (touchRef.current.size >= 2) {
          panRef.current = null;
          pinchRef.current = null;
          return;
        }
      } else if (event.button !== 0) {
        return;
      }

      select(null);
      panRef.current = {
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        origin: { ...pan },
      };
    },
    [pan, select],
  );

  const onWheel = useCallback(
    (event: React.WheelEvent) => {
      const surface = surfaceRef.current;
      if (!surface) return;

      // Ctrl/⌘ bilan — masshtab, aks holda ish maydonini surish.
      if (event.ctrlKey || event.metaKey) {
        const rect = surface.getBoundingClientRect();
        const nextZoom = Math.max(
          ZOOM_MIN,
          Math.min(ZOOM_MAX, zoom * (event.deltaY > 0 ? 0.9 : 1.1)),
        );
        // Kursor ostidagi nuqta joyida qolsin — shunda masshtab "sakramaydi".
        const cx = event.clientX - rect.left;
        const cy = event.clientY - rect.top;
        setPan({
          x: cx - ((cx - pan.x) / zoom) * nextZoom,
          y: cy - ((cy - pan.y) / zoom) * nextZoom,
        });
        setZoom(nextZoom);
        return;
      }

      setPan({ x: pan.x - event.deltaX, y: pan.y - event.deltaY });
    },
    [zoom, pan, setPan, setZoom],
  );

  /* ─────────────────── Klaviatura bilan ko'chirish (§40) ─────────────────── */

  const onKeyDown = useCallback((event: React.KeyboardEvent) => {
    const state = useBlocksStore.getState();
    const id = state.selectedId;
    if (!id) return;

    const at = state.workspace.tops[id];
    if (!at) return;

    // Shift bilan — yirik qadam: katta ish maydonida tez ko'chirish uchun.
    const step = event.shiftKey ? 40 : 8;
    const delta: Record<string, [number, number]> = {
      ArrowUp: [0, -step],
      ArrowDown: [0, step],
      ArrowLeft: [-step, 0],
      ArrowRight: [step, 0],
    };
    const move = delta[event.key];
    if (!move) return;

    event.preventDefault();
    state.moveTop(id, at.x + move[0], at.y + move[1], true);
  }, []);

  const editorContext = useMemo(
    () => ({
      circuit,
      locale,
      level,
      onGrab: grab,
      onSelect: select,
      onFieldChange: changeField,
    }),
    [circuit, locale, level, grab, select, changeField],
  );

  const blockState = useMemo(
    () => ({ workspace, selectedId, issues }),
    [workspace, selectedId, issues],
  );

  return (
    <div
      className={["blk-canvas", overTrash && "blk-canvas-trash"].filter(Boolean).join(" ")}
      ref={surfaceRef}
      onPointerDown={startPan}
      onWheel={onWheel}
      onKeyDown={onKeyDown}
      // Ish maydoni fokus oladi — o'q tugmalari bilan blok ko'chirish uchun.
      tabIndex={0}
      role="application"
      aria-label={t("blocks.ui.canvas", undefined, locale)}
    >
      <div
        className="blk-surface"
        style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})` }}
      >
        <BlockEditorProvider value={editorContext}>
          <BlockStateProvider value={blockState}>
            {topIds.map((id) => (
              <div
                key={id}
                className="blk-top"
                style={{ left: workspace.tops[id]!.x, top: workspace.tops[id]!.y }}
              >
                <BlockView id={id} />
              </div>
            ))}
          </BlockStateProvider>
        </BlockEditorProvider>

        {dropHint && (
          <div
            className="blk-drop-hint"
            style={{ left: dropHint.x, top: dropHint.y, width: dropHint.width }}
          />
        )}
      </div>

      {topIds.length === 0 && (
        <p className="blk-empty">{t("blocks.ui.emptyWorkspace", undefined, locale)}</p>
      )}
      {overTrash && (
        <div className="blk-trash-hint">{t("blocks.ui.deleteHint", undefined, locale)}</div>
      )}
    </div>
  );
}

/* ─────────────────────────── Masshtab (ikki barmoq) ─────────────────────────── */

function applyPinch(
  surface: HTMLDivElement,
  touches: Map<number, { x: number; y: number }>,
  pinchRef: React.RefObject<{ distance: number; zoom: number } | null>,
  setZoom: (zoom: number) => void,
  setPan: (pan: { x: number; y: number }) => void,
): void {
  const [a, b] = [...touches.values()];
  if (!a || !b) return;

  const distance = Math.hypot(a.x - b.x, a.y - b.y);
  const state = useBlocksStore.getState();

  // Birinchi kadr — faqat boshlang'ich masofani eslab qolamiz.
  if (!pinchRef.current) {
    pinchRef.current = { distance, zoom: state.zoom };
    return;
  }
  if (pinchRef.current.distance < 1) return;

  const nextZoom = Math.max(
    ZOOM_MIN,
    Math.min(ZOOM_MAX, (pinchRef.current.zoom * distance) / pinchRef.current.distance),
  );

  // Barmoqlar orasidagi nuqta joyida qolsin.
  const rect = surface.getBoundingClientRect();
  const cx = (a.x + b.x) / 2 - rect.left;
  const cy = (a.y + b.y) / 2 - rect.top;
  setPan({
    x: cx - ((cx - state.pan.x) / state.zoom) * nextZoom,
    y: cy - ((cy - state.pan.y) / state.zoom) * nextZoom,
  });
  setZoom(nextZoom);
}

/** Ulanish joyi ko'rsatkichining ish maydonidagi o'rni (DOM o'lchamlaridan). */
function dropHintFor(
  target: DropTarget | null,
  surface: HTMLDivElement | null,
  zoom: number,
  pan: { x: number; y: number },
): { x: number; y: number; width: number } | null {
  if (!target || !surface) return null;

  const element =
    target.kind === "after"
      ? elementOf("block", target.targetId)
      : target.kind === "statement"
        ? elementOf("statement", target.parentId, target.slot)
        : elementOf("input", target.parentId, target.slot);
  if (!element) return null;

  const rect = element.getBoundingClientRect();
  const point = toWorkspacePoint(
    surface,
    rect.left,
    target.kind === "after" ? rect.bottom : rect.top,
    zoom,
    pan,
  );
  return { x: point.x, y: point.y - 2, width: Math.max(48, rect.width / zoom) };
}
