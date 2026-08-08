/**
 * Vaqt bloklari (§6).
 *
 * Bolalar uchun asosiy blok — soniyada kutish: `1 soniya kut` → `delay(1000)`.
 * Millisekund va mikrosekund variantlari darslar chuqurlashganda kerak
 * bo'ladi (masalan HC-SR04 impulsi).
 *
 * Soniya uyasi kasr qabul qiladi (0.5 soniya), lekin `delay()` ga doim
 * BUTUN son beriladi: `delay(0.5)` haqiqiy Arduino'da ham 0 ms kutadi va
 * bola nima uchun kutmaganini tushunmasdi.
 */

import { PREC, type BlockDefinition } from "../types";

export const CONTROL_BLOCKS: BlockDefinition[] = [
  {
    type: "control_wait_seconds",
    category: "control",
    shape: "statement",
    level: "beginner",
    messageKey: "blocks.control.waitSeconds",
    tooltipKey: "blocks.control.waitSeconds.tip",
    slots: [
      { kind: "value", name: "seconds", check: "number", inline: { kind: "number", default: 1 } },
    ],
    generateStatement: (block, api) => {
      const raw = block.inputs.seconds ? null : block.fields.seconds;
      // Uyada oddiy son tursa — millisekundni O'ZIMIZ hisoblaymiz, shunda
      // kodda `delay(1 * 1000)` emas, toza `delay(1000)` chiqadi.
      if (raw !== null && raw !== undefined) {
        const seconds = Number(raw);
        if (Number.isFinite(seconds)) return [`delay(${Math.round(seconds * 1000)});`];
      }
      return [`delay(${api.value(block, "seconds", PREC.MUL)} * 1000);`];
    },
  },
  {
    type: "control_wait_millis",
    category: "control",
    shape: "statement",
    level: "advanced",
    messageKey: "blocks.control.waitMillis",
    tooltipKey: "blocks.control.waitMillis.tip",
    slots: [
      { kind: "value", name: "ms", check: "number", inline: { kind: "number", default: 500 } },
    ],
    generateStatement: (block, api) => [`delay(${api.value(block, "ms")});`],
  },
  {
    type: "control_wait_micros",
    category: "control",
    shape: "statement",
    level: "advanced",
    messageKey: "blocks.control.waitMicros",
    tooltipKey: "blocks.control.waitMicros.tip",
    slots: [
      { kind: "value", name: "us", check: "number", inline: { kind: "number", default: 10 } },
    ],
    generateStatement: (block, api) => [`delayMicroseconds(${api.value(block, "us")});`],
  },
];
