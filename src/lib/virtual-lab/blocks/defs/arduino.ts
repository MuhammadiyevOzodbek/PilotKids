/**
 * Arduino pin bloklari (§4).
 *
 * Pin ro'yxati platadan olinadi — dropdownda faqat Arduino Uno'da mavjud
 * pinlar chiqadi. Hosil bo'lgan kod darslikdagi bilan bir xil:
 *
 *   pinMode(13, OUTPUT);
 *   digitalWrite(13, HIGH);
 *   digitalRead(2)
 */

import { DIGITAL_PIN_OPTIONS } from "../pins";
import { PREC, type BlockDefinition } from "../types";

/** `pinMode` rejimlari — bular C++ konstantalari, tarjima qilinmaydi. */
const PIN_MODES = [
  { value: "OUTPUT", label: "OUTPUT" },
  { value: "INPUT", label: "INPUT" },
  { value: "INPUT_PULLUP", label: "INPUT_PULLUP" },
];

const PIN_LEVELS = [
  { value: "HIGH", label: "HIGH" },
  { value: "LOW", label: "LOW" },
];

export const ARDUINO_BLOCKS: BlockDefinition[] = [
  {
    type: "pin_mode",
    category: "pins",
    shape: "statement",
    level: "advanced",
    messageKey: "blocks.pins.pinMode",
    tooltipKey: "blocks.pins.pinMode.tip",
    slots: [
      { kind: "dropdown", name: "pin", options: DIGITAL_PIN_OPTIONS, default: "13" },
      { kind: "dropdown", name: "mode", options: PIN_MODES, default: "OUTPUT" },
    ],
    generateStatement: (block, api) => [
      `pinMode(${api.field(block, "pin")}, ${api.field(block, "mode")});`,
    ],
  },
  {
    type: "pin_digital_write",
    category: "pins",
    shape: "statement",
    level: "advanced",
    messageKey: "blocks.pins.digitalWrite",
    tooltipKey: "blocks.pins.digitalWrite.tip",
    slots: [
      { kind: "dropdown", name: "pin", options: DIGITAL_PIN_OPTIONS, default: "13" },
      { kind: "dropdown", name: "level", options: PIN_LEVELS, default: "HIGH" },
    ],
    generateStatement: (block, api) => [
      `digitalWrite(${api.field(block, "pin")}, ${api.field(block, "level")});`,
    ],
  },
  {
    type: "pin_digital_read",
    category: "pins",
    shape: "value",
    level: "advanced",
    output: "number",
    messageKey: "blocks.pins.digitalRead",
    tooltipKey: "blocks.pins.digitalRead.tip",
    slots: [{ kind: "dropdown", name: "pin", options: DIGITAL_PIN_OPTIONS, default: "2" }],
    generateValue: (block, api) => ({
      code: `digitalRead(${api.field(block, "pin")})`,
      prec: PREC.ATOM,
    }),
  },
];
