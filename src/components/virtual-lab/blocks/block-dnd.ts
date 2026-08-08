"use client";

import { getBlockDefinition, subtreeIds, type BlockWorkspace } from "@/lib/virtual-lab/blocks";

/**
 * Bloklarni sudrab ulash geometriyasi.
 *
 * Bloklarning o'lchami OLDINDAN hisoblanmaydi — ular oddiy DOM elementlari
 * va brauzerning o'zi joylashtiradi. Sabab pedagogik emas, amaliy: yorliqlar
 * tarjima qilinadi (§41), ya'ni matn uzunligi tilga qarab o'zgaradi. O'z
 * layout dvigatelimiz bo'lsa, har til uchun uni qayta sozlash kerak bo'lardi.
 *
 * Shuning uchun ulanish nuqtalari sudrash paytida DOM'dan o'lchanadi.
 * Elementlar shu yerdagi ro'yxatga o'zini yozadi.
 */

type ElementKind = "block" | "statement" | "input";

const REGISTRY = new Map<string, HTMLElement>();

function key(kind: ElementKind, blockId: string, slot?: string): string {
  return slot === undefined ? `${kind}:${blockId}` : `${kind}:${blockId}:${slot}`;
}

/** React `ref` uchun: element paydo bo'lganda yozadi, yo'qolganda o'chiradi. */
export function registerElement(
  kind: ElementKind,
  blockId: string,
  slot: string | undefined,
  element: HTMLElement | null,
): void {
  const id = key(kind, blockId, slot);
  if (element) REGISTRY.set(id, element);
  else REGISTRY.delete(id);
}

export function elementOf(kind: ElementKind, blockId: string, slot?: string): HTMLElement | null {
  return REGISTRY.get(key(kind, blockId, slot)) ?? null;
}

/* ─────────────────────────── Ulanish nuqtalari ─────────────────────────── */

export type DropTarget =
  | { kind: "after"; targetId: string }
  | { kind: "statement"; parentId: string; slot: string }
  | { kind: "input"; parentId: string; slot: string };

interface Candidate {
  target: DropTarget;
  /** Ekran koordinatalaridagi ulanish nuqtasi. */
  x: number;
  y: number;
}

/** Sudralayotgan blok ulanishi mumkin bo'lgan joylarni yig'adi. */
function collectCandidates(ws: BlockWorkspace, movingId: string): Candidate[] {
  const moving = ws.blocks[movingId];
  const movingDef = moving ? getBlockDefinition(moving.type) : null;
  if (!moving || !movingDef) return [];

  // O'zining ichiga ulash mumkin emas.
  const forbidden = new Set(subtreeIds(ws, movingId));
  const candidates: Candidate[] = [];

  const isValue = movingDef.shape === "value" || movingDef.shape === "boolean";

  for (const block of Object.values(ws.blocks)) {
    if (forbidden.has(block.id)) continue;
    const def = getBlockDefinition(block.type);
    if (!def) continue;

    if (isValue) {
      // Qiymat bloki faqat qiymat uyasiga tushadi.
      for (const slot of def.slots) {
        if (slot.kind !== "value") continue;
        const element = elementOf("input", block.id, slot.name);
        if (!element) continue;
        const rect = element.getBoundingClientRect();
        candidates.push({
          target: { kind: "input", parentId: block.id, slot: slot.name },
          x: rect.left,
          y: rect.top + rect.height / 2,
        });
      }
      continue;
    }

    // Buyruq bloki: ichki stek boshiga yoki mavjud blokdan keyin.
    for (const slot of def.slots) {
      if (slot.kind !== "statement") continue;
      const element = elementOf("statement", block.id, slot.name);
      if (!element) continue;
      const rect = element.getBoundingClientRect();
      candidates.push({
        target: { kind: "statement", parentId: block.id, slot: slot.name },
        x: rect.left,
        y: rect.top,
      });
    }

    // Qiymat blokining ostiga buyruq ulanmaydi.
    if (def.shape === "value" || def.shape === "boolean") continue;

    const element = elementOf("block", block.id);
    if (!element) continue;
    const rect = element.getBoundingClientRect();
    candidates.push({
      target: { kind: "after", targetId: block.id },
      x: rect.left,
      y: rect.bottom,
    });
  }

  return candidates;
}

/**
 * Sudralayotgan blokning ulanish nuqtasiga eng yaqin joyni topadi.
 *
 * `zoom` hisobga olinadi: kichraytirilgan ish maydonida bloklar ham kichik
 * bo'ladi, shuning uchun "yaqin" masofa ham kichrayadi — aks holda 40%
 * masshtabda blok butunlay boshqa joyga yopishib qolardi.
 */
export function findDropTarget(
  ws: BlockWorkspace,
  movingId: string,
  zoom: number,
): DropTarget | null {
  const element = elementOf("block", movingId);
  if (!element) return null;

  const rect = element.getBoundingClientRect();
  const moving = ws.blocks[movingId];
  const def = moving ? getBlockDefinition(moving.type) : null;
  const isValue = def?.shape === "value" || def?.shape === "boolean";

  // Buyruq bloki tepa chetidan, qiymat bloki chap qirrasining o'rtasidan ulanadi.
  const anchorX = rect.left;
  const anchorY = isValue ? rect.top + rect.height / 2 : rect.top;
  const threshold = 64 * zoom;

  let best: { target: DropTarget; distance: number } | null = null;
  for (const candidate of collectCandidates(ws, movingId)) {
    const dx = candidate.x - anchorX;
    const dy = candidate.y - anchorY;
    const distance = Math.hypot(dx, dy);
    if (distance > threshold) continue;
    if (!best || distance < best.distance) best = { target: candidate.target, distance };
  }

  return best?.target ?? null;
}

/** Ekran nuqtasini ish maydoni koordinatalariga o'giradi. */
export function toWorkspacePoint(
  surface: HTMLElement,
  clientX: number,
  clientY: number,
  zoom: number,
  pan: { x: number; y: number },
): { x: number; y: number } {
  const rect = surface.getBoundingClientRect();
  return {
    x: (clientX - rect.left - pan.x) / zoom,
    y: (clientY - rect.top - pan.y) / zoom,
  };
}
