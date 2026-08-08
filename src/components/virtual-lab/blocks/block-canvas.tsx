"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { t, type BlockWorkspace } from "@/lib/virtual-lab/blocks";
import type { Circuit } from "@/lib/virtual-lab/types";
import { ZOOM_MAX, ZOOM_MIN, useBlocksStore } from "@/stores/blocks";
import { BlockEditorProvider, BlockView } from "./block-view";
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
}

/** Nuqta palitra ustidami — sudralgan blok shu yerga tashlansa o'chadi. */
function isOverPalette(clientX: number, clientY: number): boolean {
  return document.elementFromPoint(clientX, clientY)?.closest(".blk-palette") != null;
}

export function BlockCanvas({
  circuit,
  apiRef,
}: {
  circuit: Circuit;
  apiRef?: React.RefObject<BlockCanvasApi | null>;
}) {
  const workspace = useBlocksStore((s) => s.workspace);
  const zoom = useBlocksStore((s) => s.zoom);
  const pan = useBlocksStore((s) => s.pan);
  const selectedId = useBlocksStore((s) => s.selectedId);

  const select = useBlocksStore((s) => s.select);
  const setZoom = useBlocksStore((s) => s.setZoom);
  const setPan = useBlocksStore((s) => s.setPan);
  const addBlock = useBlocksStore((s) => s.addBlock);
  const beginDrag = useBlocksStore((s) => s.beginDrag);
  const endDrag = useBlocksStore((s) => s.endDrag);
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

  const [draggingId, setDraggingId] = useState<string | null>(null);
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
      setDraggingId(id);
    },
    [zoom, pan, addBlock, beginDrag, endDrag],
  );

  useEffect(() => {
    if (apiRef) apiRef.current = { startPaletteDrag };
  }, [apiRef, startPaletteDrag]);

  /* ─────────────────── Sudrash va tashlash ─────────────────── */

  useEffect(() => {
    const onMove = (event: PointerEvent) => {
      const surface = surfaceRef.current;
      if (!surface) return;

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
        setDraggingId(drag.id);
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
      setDraggingId(null);
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
    beginDrag,
    endDrag,
    detach,
    moveTop,
    attachAfter,
    attachIntoStatement,
    attachValue,
    remove,
    select,
  ]);

  /* ─────────────────── Surish va masshtab ─────────────────── */

  const startPan = useCallback(
    (event: React.PointerEvent) => {
      if (event.button !== 0) return;
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

  const editorContext = useMemo(
    () => ({
      workspace,
      circuit,
      selectedId,
      draggingId,
      onGrab: grab,
      onSelect: select,
      onFieldChange: changeField,
    }),
    [workspace, circuit, selectedId, draggingId, grab, select, changeField],
  );

  return (
    <div
      className={`blk-canvas${overTrash ? "blk-canvas-trash" : ""}`}
      ref={surfaceRef}
      onPointerDown={startPan}
      onWheel={onWheel}
    >
      <div
        className="blk-surface"
        style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})` }}
      >
        <BlockEditorProvider value={editorContext}>
          {topIds.map((id) => (
            <div
              key={id}
              className="blk-top"
              style={{ left: workspace.tops[id]!.x, top: workspace.tops[id]!.y }}
            >
              <BlockView id={id} />
            </div>
          ))}
        </BlockEditorProvider>

        {dropHint && (
          <div
            className="blk-drop-hint"
            style={{ left: dropHint.x, top: dropHint.y, width: dropHint.width }}
          />
        )}
      </div>

      {isEmpty(workspace) && <p className="blk-empty">{t("blocks.ui.emptyWorkspace")}</p>}
      {overTrash && <div className="blk-trash-hint">{t("blocks.ui.deleteHint")}</div>}
    </div>
  );
}

function isEmpty(workspace: BlockWorkspace): boolean {
  return Object.keys(workspace.blocks).length === 0;
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
