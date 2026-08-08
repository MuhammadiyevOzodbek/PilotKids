/**
 * Serial monitor bloklari (§25).
 *
 * `Serial.begin()` ni unutish — eng ko'p uchraydigan xato, shuning uchun
 * generator uni O'ZI qo'shadi va ogohlantiradi (`ensureSerialBegin`,
 * `generator.ts`). Bu yerdagi bloklar shunchaki chaqiruv yozadi.
 *
 * Matn uyasi `any`: unga ham matn yozish, ham qiymat bloki (sensor o'qishi,
 * o'zgaruvchi) ulash mumkin. `api.textValue()` ikkalasini ham to'g'ri
 * chiqaradi — bo'sh uya qo'shtirnoqqa, ulangan blok esa ifodaga aylanadi.
 */

import type { BlockDefinition } from "../types";

/** Odatiy tezliklar — Arduino IDE monitoridagi ro'yxat bilan bir xil. */
const BAUD_RATES = [
  { value: "9600", label: "9600" },
  { value: "4800", label: "4800" },
  { value: "19200", label: "19200" },
  { value: "38400", label: "38400" },
  { value: "57600", label: "57600" },
  { value: "115200", label: "115200" },
];

export const SERIAL_BLOCKS: BlockDefinition[] = [
  {
    type: "serial_begin",
    category: "serial",
    shape: "statement",
    level: "advanced",
    messageKey: "blocks.serial.begin",
    tooltipKey: "blocks.serial.begin.tip",
    slots: [{ kind: "dropdown", name: "BAUD", options: BAUD_RATES, default: "9600" }],
    generateStatement: (block, api) => [`Serial.begin(${api.field(block, "BAUD")});`],
  },
  {
    type: "serial_print",
    category: "serial",
    shape: "statement",
    level: "advanced",
    messageKey: "blocks.serial.print",
    tooltipKey: "blocks.serial.print.tip",
    slots: [
      { kind: "value", name: "TEXT", check: "any", inline: { kind: "text", default: "Arduino" } },
    ],
    generateStatement: (block, api) => [`Serial.print(${api.textValue(block, "TEXT")});`],
  },
  {
    type: "serial_println",
    category: "serial",
    shape: "statement",
    level: "advanced",
    messageKey: "blocks.serial.println",
    tooltipKey: "blocks.serial.println.tip",
    slots: [
      { kind: "value", name: "TEXT", check: "any", inline: { kind: "text", default: "Arduino" } },
    ],
    generateStatement: (block, api) => [`Serial.println(${api.textValue(block, "TEXT")});`],
  },
];
