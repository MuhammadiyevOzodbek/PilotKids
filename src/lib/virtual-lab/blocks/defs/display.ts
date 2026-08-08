/**
 * LCD 1602 bloklari (§14).
 *
 * LCD oltita pinga ulanadi. Har bir blokka oltita ro'yxat qo'yish mumkin
 * emas edi — `lcd.clear()` bloki oltita ro'yxat bilan o'qib bo'lmaydigan
 * darajada shishib ketardi. Shuning uchun ulanish BITTA ro'yxat orqali
 * tanlanadi: darsliklarda uchraydigan tayyor variantlar.
 *
 * Faza 4 da bunga komponentga bog'langan variant qo'shiladi — u pinlarni
 * SXEMADAN o'qiydi va ro'yxat umuman kerak bo'lmaydi (§33).
 *
 * Obyekt kalit sifatida ulanishning o'zini oladi, ya'ni bir xil ulanishdagi
 * o'nta blok BITTA `LiquidCrystal lcd(...)` va BITTA `lcd.begin(16, 2);`
 * beradi.
 */

import { LCD_COLUMNS, LCD_ROWS } from "../../catalog";
import { type BlockDefinition, type BlockNode, type GenApi, type SlotDef } from "../types";

/**
 * Tayyor ulanishlar: `RS, E, D4, D5, D6, D7`.
 *
 * Birinchisi — Arduino'ning rasmiy «Hello World» darsidagi ulanish, LCD
 * bo'yicha internetdagi kodlarning aksariyati shunda.
 */
const LCD_WIRINGS = [
  { value: "12,11,5,4,3,2", label: "RS12 E11 · D5 D4 D3 D2" },
  { value: "7,6,5,4,3,2", label: "RS7 E6 · D5 D4 D3 D2" },
  { value: "8,9,4,5,6,7", label: "RS8 E9 · D4 D5 D6 D7" },
];

const WIRING_SLOT: SlotDef = {
  kind: "dropdown",
  name: "PINS",
  options: LCD_WIRINGS,
  default: LCD_WIRINGS[0]!.value,
};

/** Ulanish ro'yxatidagi qiymatni obyektga aylantiradi. */
function lcdObject(block: BlockNode, api: GenApi): string {
  const raw = api.field(block, "PINS");
  const wiring = LCD_WIRINGS.some((w) => w.value === raw) ? raw : LCD_WIRINGS[0]!.value;

  return api.declareObject(`lcd:${wiring}`, "lcd", (name) => ({
    include: "LiquidCrystal.h",
    global: `LiquidCrystal ${name}(${wiring.split(",").join(", ")});`,
    setup: `${name}.begin(${LCD_COLUMNS}, ${LCD_ROWS});`,
  }));
}

export const DISPLAY_BLOCKS: BlockDefinition[] = [
  {
    type: "display_lcd_print",
    category: "display",
    shape: "statement",
    level: "beginner",
    requiresLibrary: ["LiquidCrystal"],
    messageKey: "blocks.display.lcdPrint",
    tooltipKey: "blocks.display.lcdPrint.tip",
    slots: [
      { kind: "value", name: "TEXT", check: "any", inline: { kind: "text", default: "PilotKids" } },
      WIRING_SLOT,
    ],
    generateStatement: (block, api) => [
      `${lcdObject(block, api)}.print(${api.textValue(block, "TEXT")});`,
    ],
  },
  {
    type: "display_lcd_value",
    category: "display",
    shape: "statement",
    level: "beginner",
    requiresLibrary: ["LiquidCrystal"],
    messageKey: "blocks.display.lcdValue",
    tooltipKey: "blocks.display.lcdValue.tip",
    slots: [
      { kind: "value", name: "VALUE", check: "number", inline: { kind: "number", default: 0 } },
      WIRING_SLOT,
    ],
    generateStatement: (block, api) => [
      `${lcdObject(block, api)}.print(${api.value(block, "VALUE")});`,
    ],
  },
  {
    type: "display_lcd_cursor",
    category: "display",
    shape: "statement",
    level: "beginner",
    requiresLibrary: ["LiquidCrystal"],
    messageKey: "blocks.display.lcdCursor",
    tooltipKey: "blocks.display.lcdCursor.tip",
    slots: [
      { kind: "number", name: "COL", default: 0, min: 0, max: LCD_COLUMNS - 1, step: 1 },
      { kind: "number", name: "ROW", default: 0, min: 0, max: LCD_ROWS - 1, step: 1 },
      WIRING_SLOT,
    ],
    generateStatement: (block, api) => [
      `${lcdObject(block, api)}.setCursor(${api.field(block, "COL")}, ${api.field(block, "ROW")});`,
    ],
  },
  {
    type: "display_lcd_clear",
    category: "display",
    shape: "statement",
    level: "beginner",
    requiresLibrary: ["LiquidCrystal"],
    messageKey: "blocks.display.lcdClear",
    tooltipKey: "blocks.display.lcdClear.tip",
    slots: [WIRING_SLOT],
    generateStatement: (block, api) => [`${lcdObject(block, api)}.clear();`],
  },
];
