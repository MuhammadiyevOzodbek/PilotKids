/**
 * Blok registri (§35).
 *
 * Bloklar bitta ulkan `switch` ichida emas — har biri o'z modulida
 * ta'riflanadi va shu yerga ro'yxatdan o'tadi. Yangi blok qo'shish =
 * `defs/` ga bitta obyekt qo'shish; boshqa hech qayerga tegilmaydi.
 *
 * Registr modul darajasida bir marta to'ldiriladi. BITTA to'ldirish
 * ichida takroriy `type` — dasturchi xatosi: jim yozib ketish o'rniga
 * darhol xato beriladi, aks holda ikki xil blok bir xil ID bilan
 * saqlanib, loyihalar buzilardi.
 *
 * Butun ro'yxatni QAYTA to'ldirish esa xato emas: `index.ts` har safar
 * `resetRegistry()` dan boshlaydi. Bu ataylab — dasturlash muhitida
 * (HMR) yoki modul grafi ikki nusxaga bo'linganda `blocks/index.ts`
 * qayta baholanishi mumkin, registr moduli esa eskisicha qolib ketadi.
 * Ilgari bunday holatda butun laboratoriya «Blok turi takrorlandi»
 * xatosi bilan yiqilardi.
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

/**
 * Registrni bo'shatadi — ro'yxatga olish har safar toza holatdan boshlanadi.
 *
 * Buni `registerAll()` chaqiradi. Modul qayta baholanganda eski yozuvlar
 * qolib ketmasligi kerak: aks holda o'chirilgan blok registrda «tirik»
 * bo'lib qolardi yoki takroriy tur xatosi chiqardi.
 */
export function resetRegistry(): void {
  REGISTRY.clear();
  ORDER.length = 0;
}
