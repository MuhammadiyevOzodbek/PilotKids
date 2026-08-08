/**
 * Chiqish qurilmalari: LED, buzzer, RGB va rele (§12).
 *
 * Bu bloklar `pinMode(..., OUTPUT)` ni O'ZI `setup()` ga qo'shadi. Sabab
 * amaliy: «LEDni yoq» bloki bolaga pin rejimi degan tushunchani hali
 * o'rgatmagan bo'ladi, uni unutgani uchun esa simulyator ogohlantirish
 * beradi va LED yonmaydi. Kalit pin bo'yicha olinadi, shuning uchun o'nta
 * blok bitta `pinMode` qatorini beradi.
 *
 * Xom `digitalWrite` bloki `advanced` darajada qoladi — u yerda pin rejimi
 * bolaning o'z zimmasida (§32).
 */

import { DIGITAL_PIN_OPTIONS, PWM_PIN_OPTIONS } from "../pins";
import { numberLiteral } from "../generator";
import { PREC, type BlockDefinition, type BlockNode, type GenApi } from "../types";

/**
 * RGB LED qanday ulangan.
 *
 * Umumiy KATOD: qiymat qancha katta bo'lsa, shuncha yorug'.
 * Umumiy ANOD: teskarisi — 0 eng yorug'. Shuning uchun anodda qiymat
 * `255 - x` ga aylantiriladi, aks holda bola «255 qizil» deb yozib,
 * qorong'i LED oladi. Katalogdagi `rgb-led` umumiy katodli.
 */
const RGB_TYPES = [
  { value: "cathode", label: "K (−)" },
  { value: "anode", label: "A (+)" },
];

/** Chiqish pinini `setup()` da sozlaydi. */
function outputMode(api: GenApi, pin: string): void {
  api.setupLine(`pinMode:${pin}`, `pinMode(${pin}, OUTPUT);`);
}

/**
 * RGB kanalining qiymati.
 *
 * Uyada oddiy son tursa, teskarilash O'SHA YERDA hisoblanadi — kodda
 * `255 - 200` emas, toza `55` chiqadi.
 */
function channel(block: BlockNode, api: GenApi, name: string, anode: boolean): string {
  if (!anode) return api.value(block, name);

  const hasChild = block.inputs[name] != null;
  if (!hasChild) {
    const raw = Number(numberLiteral(api.field(block, name)));
    if (Number.isFinite(raw)) return String(Math.max(0, Math.min(255, 255 - raw)));
  }
  return `255 - ${api.value(block, name, PREC.MUL)}`;
}

export const OUTPUT_BLOCKS: BlockDefinition[] = [
  {
    type: "output_led_on",
    category: "output",
    shape: "statement",
    level: "beginner",
    messageKey: "blocks.output.ledOn",
    tooltipKey: "blocks.output.ledOn.tip",
    slots: [{ kind: "dropdown", name: "pin", options: DIGITAL_PIN_OPTIONS, default: "13" }],
    generateStatement: (block, api) => {
      const pin = api.field(block, "pin");
      outputMode(api, pin);
      return [`digitalWrite(${pin}, HIGH);`];
    },
  },
  {
    type: "output_led_off",
    category: "output",
    shape: "statement",
    level: "beginner",
    messageKey: "blocks.output.ledOff",
    tooltipKey: "blocks.output.ledOff.tip",
    slots: [{ kind: "dropdown", name: "pin", options: DIGITAL_PIN_OPTIONS, default: "13" }],
    generateStatement: (block, api) => {
      const pin = api.field(block, "pin");
      outputMode(api, pin);
      return [`digitalWrite(${pin}, LOW);`];
    },
  },
  {
    type: "output_led_brightness",
    category: "output",
    shape: "statement",
    level: "beginner",
    messageKey: "blocks.output.ledBrightness",
    tooltipKey: "blocks.output.ledBrightness.tip",
    slots: [
      { kind: "dropdown", name: "pin", options: PWM_PIN_OPTIONS, default: "9" },
      { kind: "value", name: "VALUE", check: "number", inline: { kind: "number", default: 128 } },
    ],
    generateStatement: (block, api) => {
      const pin = api.field(block, "pin");
      outputMode(api, pin);
      return [`analogWrite(${pin}, ${api.value(block, "VALUE")});`];
    },
  },
  {
    type: "output_rgb_color",
    category: "output",
    shape: "statement",
    level: "beginner",
    messageKey: "blocks.output.rgbColor",
    messageKeyBeginner: "blocks.output.rgbColor.beginner",
    tooltipKey: "blocks.output.rgbColor.tip",
    slots: [
      { kind: "dropdown", name: "RPIN", options: PWM_PIN_OPTIONS, default: "9" },
      { kind: "dropdown", name: "GPIN", options: PWM_PIN_OPTIONS, default: "10" },
      { kind: "dropdown", name: "BPIN", options: PWM_PIN_OPTIONS, default: "11" },
      { kind: "value", name: "R", check: "number", inline: { kind: "number", default: 255 } },
      { kind: "value", name: "G", check: "number", inline: { kind: "number", default: 0 } },
      { kind: "value", name: "B", check: "number", inline: { kind: "number", default: 0 } },
      { kind: "dropdown", name: "COMMON", options: RGB_TYPES, default: "cathode" },
    ],
    generateStatement: (block, api) => {
      const anode = api.field(block, "COMMON") === "anode";
      return (
        [
          ["RPIN", "R"],
          ["GPIN", "G"],
          ["BPIN", "B"],
        ] as const
      ).map(([pinSlot, valueSlot]) => {
        const pin = api.field(block, pinSlot);
        outputMode(api, pin);
        return `analogWrite(${pin}, ${channel(block, api, valueSlot, anode)});`;
      });
    },
  },
  {
    type: "output_buzzer_tone",
    category: "output",
    shape: "statement",
    level: "beginner",
    messageKey: "blocks.output.buzzerTone",
    tooltipKey: "blocks.output.buzzerTone.tip",
    slots: [
      { kind: "dropdown", name: "pin", options: DIGITAL_PIN_OPTIONS, default: "8" },
      { kind: "value", name: "FREQ", check: "number", inline: { kind: "number", default: 1000 } },
    ],
    generateStatement: (block, api) => [
      `tone(${api.field(block, "pin")}, ${api.value(block, "FREQ")});`,
    ],
  },
  {
    type: "output_buzzer_off",
    category: "output",
    shape: "statement",
    level: "beginner",
    messageKey: "blocks.output.buzzerOff",
    tooltipKey: "blocks.output.buzzerOff.tip",
    slots: [{ kind: "dropdown", name: "pin", options: DIGITAL_PIN_OPTIONS, default: "8" }],
    generateStatement: (block, api) => [`noTone(${api.field(block, "pin")});`],
  },
  {
    type: "output_buzzer_beep",
    category: "output",
    shape: "statement",
    level: "beginner",
    messageKey: "blocks.output.buzzerBeep",
    tooltipKey: "blocks.output.buzzerBeep.tip",
    slots: [
      { kind: "dropdown", name: "pin", options: DIGITAL_PIN_OPTIONS, default: "8" },
      { kind: "value", name: "FREQ", check: "number", inline: { kind: "number", default: 1000 } },
      { kind: "value", name: "MS", check: "number", inline: { kind: "number", default: 200 } },
    ],
    generateStatement: (block, api) => {
      const pin = api.field(block, "pin");
      return [
        `tone(${pin}, ${api.value(block, "FREQ")});`,
        `delay(${api.value(block, "MS")});`,
        `noTone(${pin});`,
      ];
    },
  },
  {
    type: "output_relay_on",
    category: "output",
    shape: "statement",
    level: "beginner",
    messageKey: "blocks.output.relayOn",
    tooltipKey: "blocks.output.relayOn.tip",
    slots: [{ kind: "dropdown", name: "pin", options: DIGITAL_PIN_OPTIONS, default: "7" }],
    generateStatement: (block, api) => {
      const pin = api.field(block, "pin");
      outputMode(api, pin);
      return [`digitalWrite(${pin}, HIGH);`];
    },
  },
  {
    type: "output_relay_off",
    category: "output",
    shape: "statement",
    level: "beginner",
    messageKey: "blocks.output.relayOff",
    tooltipKey: "blocks.output.relayOff.tip",
    slots: [{ kind: "dropdown", name: "pin", options: DIGITAL_PIN_OPTIONS, default: "7" }],
    generateStatement: (block, api) => {
      const pin = api.field(block, "pin");
      outputMode(api, pin);
      return [`digitalWrite(${pin}, LOW);`];
    },
  },
];
