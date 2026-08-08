/**
 * Boshlanish bloklari (§3).
 *
 * Bu ikkalasi generator uchun ALOHIDA: ular kod hosil qilmaydi, faqat
 * `setup()` va `loop()` ning ichiga nima tushishini belgilaydi. Shu sababli
 * `generateStatement` ular uchun yozilmagan — `generator.ts` ularni to'g'ridan
 * to'g'ri o'qiydi.
 */

import type { BlockDefinition } from "../types";

export const EVENT_BLOCKS: BlockDefinition[] = [
  {
    type: "event_on_start",
    category: "events",
    shape: "hat",
    level: "beginner",
    messageKey: "blocks.events.onStart",
    tooltipKey: "blocks.events.onStart.tip",
    slots: [{ kind: "statement", name: "DO" }],
  },
  {
    type: "event_forever",
    category: "events",
    shape: "hat",
    level: "beginner",
    messageKey: "blocks.events.forever",
    tooltipKey: "blocks.events.forever.tip",
    slots: [{ kind: "statement", name: "DO" }],
  },
];
