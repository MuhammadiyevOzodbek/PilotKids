/**
 * Blok registri (§35).
 *
 * Bloklar bitta ulkan `switch` ichida emas — har biri o'z modulida
 * ta'riflanadi va shu yerga ro'yxatdan o'tadi. Yangi blok qo'shish =
 * `defs/` ga bitta obyekt qo'shish; boshqa hech qayerga tegilmaydi.
 *
 * Registr modul darajasida bir marta to'ldiriladi. Takroriy `type` —
 * dasturchi xatosi: jim yozib ketish o'rniga darhol xato beriladi, aks
 * holda ikki xil blok bir xil ID bilan saqlanib, loyihalar buzilardi.
 */

import type { BlockCategoryId, BlockDefinition, BlockLevel } from "./types";

const REGISTRY = new Map<string, BlockDefinition>();
/** Ro'yxatga qo'shilish tartibi — palitrada shu tartib ko'rinadi. */
const ORDER: string[] = [];

export function registerBlocks(definitions: readonly BlockDefinition[]): void {
  for (const def of definitions) {
    if (REGISTRY.has(def.type)) {
      throw new Error(`Blok turi takrorlandi: ${def.type}`);
    }
    REGISTRY.set(def.type, def);
    ORDER.push(def.type);
  }
}

export function getBlockDefinition(type: string): BlockDefinition | null {
  return REGISTRY.get(type) ?? null;
}

export function allBlockDefinitions(): BlockDefinition[] {
  return ORDER.map((type) => REGISTRY.get(type)!);
}

/** Kategoriya bo'yicha bloklar — palitra shu ro'yxatdan quriladi. */
export function blocksInCategory(category: BlockCategoryId, level?: BlockLevel): BlockDefinition[] {
  return allBlockDefinitions().filter(
    (def) =>
      def.category === category &&
      // "Kengaytirilgan" rejimda IKKALA daraja ko'rinadi: advanced foydalanuvchi
      // ham "LEDni yoq" blokidan foydalanishi mumkin.
      (level === undefined || level === "advanced" || def.level === "beginner"),
  );
}

/** Faqat testlar uchun: registrni bo'shatadi. */
export function resetRegistryForTests(): void {
  REGISTRY.clear();
  ORDER.length = 0;
}
