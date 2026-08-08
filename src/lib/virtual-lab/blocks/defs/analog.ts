/**
 * Analog pin bloklari (§5).
 *
 * Ikkitasi ataylab ASIMMETRIK:
 *   • `analogRead` faqat A0–A5 dan o'qiydi;
 *   • `analogWrite` esa faqat `~` belgili PWM pinlarga yozadi.
 *
 * Ro'yxatlar shuning uchun boshqa-boshqa (`ANALOG_PIN_OPTIONS` va
 * `PWM_PIN_OPTIONS`): bola PWM bo'lmagan pinni tanlay olmaydi, ya'ni
 * simulyator ogohlantirishiga umuman yo'l qo'yilmaydi.
 */

import { ANALOG_PIN_OPTIONS, PWM_PIN_OPTIONS } from "../pins";
import { PREC, type BlockDefinition } from "../types";

export const ANALOG_BLOCKS: BlockDefinition[] = [
  {
    type: "pin_analog_read",
    category: "pins",
    shape: "value",
    level: "advanced",
    output: "number",
    messageKey: "blocks.pins.analogRead",
    tooltipKey: "blocks.pins.analogRead.tip",
    slots: [{ kind: "dropdown", name: "pin", options: ANALOG_PIN_OPTIONS, default: "A0" }],
    generateValue: (block, api) => ({
      code: `analogRead(${api.field(block, "pin")})`,
      prec: PREC.ATOM,
    }),
  },
  {
    type: "pin_analog_write",
    category: "pins",
    shape: "statement",
    level: "advanced",
    messageKey: "blocks.pins.analogWrite",
    tooltipKey: "blocks.pins.analogWrite.tip",
    slots: [
      { kind: "dropdown", name: "pin", options: PWM_PIN_OPTIONS, default: "9" },
      {
        kind: "value",
        name: "VALUE",
        check: "number",
        inline: { kind: "number", default: 128 },
      },
    ],
    generateStatement: (block, api) => [
      `analogWrite(${api.field(block, "pin")}, ${api.value(block, "VALUE")});`,
    ],
  },
];
