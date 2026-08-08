/**
 * Sxemadagi komponentga bog'langan bloklar (§33).
 *
 * Bu bloklar Faza 2–3 dagi xom pinli bloklarni ALMASHTIRMAYDI — ikkalasi
 * yonma-yon yashaydi:
 *   • `beginner` — «LED #1 ni yoq» (pin sxemadan topiladi);
 *   • `advanced` — «13 ni HIGH qil» (pinni bola o'zi tanlaydi).
 * Shu sababli dars boshida sxema bilan ishlash oson, keyinroq esa haqiqiy
 * Arduino kodiga o'tish uzluksiz bo'ladi (§32).
 *
 * Har bir blok ikki mustaqil vazifani bajaradi:
 *   `generate*` — pinni topib kod yozadi (topilmasa ogohlantiradi va
 *                 xavfsiz qiymatga tushadi);
 *   `validate`  — sxema to'g'ri ulanganmi (kod bilan umuman ishlamaydi).
 */

import { LCD_COLUMNS, LCD_ROWS } from "../../catalog";
import { isPowered } from "../../netlist";
import {
  componentPin,
  componentSlot,
  netlistFor,
  referencedNode,
  validateComponentBlock,
} from "../components";
import { PREC, type BlockDefinition, type BlockNode, type GenApi } from "../types";

/* ─────────────────────────── Umumiy yordamchilar ─────────────────────────── */

/** Xavfsiz zaxira pinlar — komponent topilmasa kod baribir yaroqli qolsin. */
const SAFE_DIGITAL = "13";
const SAFE_ANALOG = "A0";
const SAFE_PWM = "9";

/** Chiqish pinini `setup()` da sozlaydi. */
function outputMode(api: GenApi, pin: string): void {
  api.setupLine(`pinMode:${pin}`, `pinMode(${pin}, OUTPUT);`);
}

/** «Komponentdagi pinni topib, chiqishga o'girib, qaytar» — eng ko'p uchraydigan yo'l. */
function outputPin(block: BlockNode, api: GenApi, pinId: string, fallback: string): string {
  const { code } = componentPin(block, api, pinId, fallback);
  outputMode(api, code);
  return code;
}

/* ─────────────────────────── Chiroqlar ─────────────────────────── */

/**
 * LED anodi orqali qidiriladi.
 *
 * LED deyarli doim rezistor orqali ulanadi, `boardPinFor` esa rezistordan
 * o'ta oladi — shuning uchun «D9 → rezistor → LED» ulanishi ham topiladi.
 */
const LED_CHECK = { types: ["led"], signalPins: ["anode"] } as const;

function ledBlock(type: string, level: "HIGH" | "LOW", messageKey: string): BlockDefinition {
  return {
    type,
    category: "output",
    shape: "statement",
    level: "beginner",
    messageKey,
    tooltipKey: `${messageKey}.tip`,
    slots: [componentSlot(LED_CHECK.types)],
    generateStatement: (block, api) => [
      `digitalWrite(${outputPin(block, api, "anode", SAFE_DIGITAL)}, ${level});`,
    ],
    validate: (block, ctx) => validateComponentBlock(block, ctx, LED_CHECK),
  };
}

/* ─────────────────────────── Bloklar ─────────────────────────── */

export const COMPONENT_BLOCKS: BlockDefinition[] = [
  ledBlock("component_led_on", "HIGH", "blocks.component.ledOn"),
  ledBlock("component_led_off", "LOW", "blocks.component.ledOff"),
  {
    type: "component_led_brightness",
    category: "output",
    shape: "statement",
    level: "beginner",
    messageKey: "blocks.component.ledBrightness",
    tooltipKey: "blocks.component.ledBrightness.tip",
    slots: [
      componentSlot(["led"]),
      { kind: "value", name: "VALUE", check: "number", inline: { kind: "number", default: 128 } },
    ],
    generateStatement: (block, api) => [
      `analogWrite(${outputPin(block, api, "anode", SAFE_PWM)}, ${api.value(block, "VALUE")});`,
    ],
    validate: (block, ctx) =>
      validateComponentBlock(block, ctx, { types: ["led"], pwmPins: ["anode"] }),
  },
  {
    type: "component_rgb_color",
    category: "output",
    shape: "statement",
    level: "beginner",
    messageKey: "blocks.component.rgbColor",
    tooltipKey: "blocks.component.rgbColor.tip",
    slots: [
      componentSlot(["rgb-led"]),
      { kind: "value", name: "R", check: "number", inline: { kind: "number", default: 255 } },
      { kind: "value", name: "G", check: "number", inline: { kind: "number", default: 0 } },
      { kind: "value", name: "B", check: "number", inline: { kind: "number", default: 0 } },
    ],
    generateStatement: (block, api) =>
      (
        [
          ["r", "R"],
          ["g", "G"],
          ["b", "B"],
        ] as const
      ).map(
        ([pinId, slot]) =>
          `analogWrite(${outputPin(block, api, pinId, SAFE_PWM)}, ${api.value(block, slot)});`,
      ),
    validate: (block, ctx) =>
      validateComponentBlock(block, ctx, { types: ["rgb-led"], pwmPins: ["r", "g", "b"] }),
  },
  {
    type: "component_buzzer_tone",
    category: "output",
    shape: "statement",
    level: "beginner",
    messageKey: "blocks.component.buzzerTone",
    tooltipKey: "blocks.component.buzzerTone.tip",
    slots: [
      componentSlot(["buzzer"]),
      { kind: "value", name: "FREQ", check: "number", inline: { kind: "number", default: 1000 } },
    ],
    generateStatement: (block, api) => [
      `tone(${componentPin(block, api, "plus", "8").code}, ${api.value(block, "FREQ")});`,
    ],
    validate: (block, ctx) =>
      validateComponentBlock(block, ctx, { types: ["buzzer"], signalPins: ["plus"] }),
  },
  {
    type: "component_buzzer_off",
    category: "output",
    shape: "statement",
    level: "beginner",
    messageKey: "blocks.component.buzzerOff",
    tooltipKey: "blocks.component.buzzerOff.tip",
    slots: [componentSlot(["buzzer"])],
    generateStatement: (block, api) => [`noTone(${componentPin(block, api, "plus", "8").code});`],
    validate: (block, ctx) =>
      validateComponentBlock(block, ctx, { types: ["buzzer"], signalPins: ["plus"] }),
  },
  {
    type: "component_relay_on",
    category: "output",
    shape: "statement",
    level: "beginner",
    messageKey: "blocks.component.relayOn",
    tooltipKey: "blocks.component.relayOn.tip",
    slots: [componentSlot(["relay"])],
    generateStatement: (block, api) => [`digitalWrite(${outputPin(block, api, "in", "7")}, HIGH);`],
    validate: (block, ctx) =>
      validateComponentBlock(block, ctx, {
        types: ["relay"],
        signalPins: ["in"],
        needsPower: { vcc: "vcc", gnd: "gnd" },
      }),
  },
  {
    type: "component_relay_off",
    category: "output",
    shape: "statement",
    level: "beginner",
    messageKey: "blocks.component.relayOff",
    tooltipKey: "blocks.component.relayOff.tip",
    slots: [componentSlot(["relay"])],
    generateStatement: (block, api) => [`digitalWrite(${outputPin(block, api, "in", "7")}, LOW);`],
    validate: (block, ctx) =>
      validateComponentBlock(block, ctx, {
        types: ["relay"],
        signalPins: ["in"],
        needsPower: { vcc: "vcc", gnd: "gnd" },
      }),
  },

  /* ─────────────── Sensorlar ─────────────── */

  {
    type: "component_light",
    category: "sensors",
    shape: "value",
    level: "beginner",
    output: "number",
    messageKey: "blocks.component.light",
    tooltipKey: "blocks.component.light.tip",
    slots: [componentSlot(["ldr", "potentiometer", "soil-moisture"])],
    generateValue: (block, api) => ({
      code: `analogRead(${componentPin(block, api, signalPinOf(block, api), SAFE_ANALOG).code})`,
      prec: PREC.ATOM,
    }),
    validate: (block, ctx) =>
      validateComponentBlock(block, ctx, {
        types: ["ldr", "potentiometer", "soil-moisture"],
        needsPower: { vcc: "vcc", gnd: "gnd" },
      }),
  },
  {
    type: "component_tmp36",
    category: "sensors",
    shape: "value",
    level: "beginner",
    output: "number",
    messageKey: "blocks.component.tmp36",
    tooltipKey: "blocks.component.tmp36.tip",
    slots: [componentSlot(["tmp36"])],
    generateValue: (block, api) => {
      const helper = api.declareObject("helper:tmp36", "okuHarorat", (name) => ({
        helper: [
          `float ${name}(int pin) {`,
          "  return (analogRead(pin) * 5.0 / 1024.0 - 0.5) * 100;",
          "}",
        ],
      }));
      return {
        code: `${helper}(${componentPin(block, api, "signal", SAFE_ANALOG).code})`,
        prec: PREC.ATOM,
      };
    },
    validate: (block, ctx) =>
      validateComponentBlock(block, ctx, {
        types: ["tmp36"],
        signalPins: ["signal"],
        needsPower: { vcc: "vcc", gnd: "gnd" },
      }),
  },
  {
    type: "component_pir",
    category: "sensors",
    shape: "boolean",
    level: "beginner",
    output: "boolean",
    messageKey: "blocks.component.pir",
    tooltipKey: "blocks.component.pir.tip",
    slots: [componentSlot(["pir"])],
    generateValue: (block, api) => {
      const pin = componentPin(block, api, "out", "2").code;
      api.setupLine(`pinMode:${pin}`, `pinMode(${pin}, INPUT);`);
      return { code: `digitalRead(${pin}) == HIGH`, prec: PREC.EQ };
    },
    validate: (block, ctx) =>
      validateComponentBlock(block, ctx, {
        types: ["pir"],
        signalPins: ["out"],
        needsPower: { vcc: "vcc", gnd: "gnd" },
      }),
  },
  {
    type: "component_button",
    category: "sensors",
    shape: "boolean",
    level: "beginner",
    output: "boolean",
    messageKey: "blocks.component.button",
    tooltipKey: "blocks.component.button.tip",
    slots: [componentSlot(["push-button"])],
    generateValue: (block, api) => {
      /*
       * Tugmaning ikkinchi oyog'i qayerga ulangan? Yerga ulangan bo'lsa
       * ichki pull-up ishlatiladi va BOSILGAN tugma LOW beradi. 5V ga
       * ulangan bo'lsa teskarisi. Sxemadan o'qish shuning uchun kerak:
       * bola ulanishni o'zgartirsa, kod ham o'zgaradi.
       */
      const { pin, pullup } = buttonWiring(block, api);
      api.setupLine(`pinMode:${pin}`, `pinMode(${pin}, ${pullup ? "INPUT_PULLUP" : "INPUT"});`);
      return { code: `digitalRead(${pin}) == ${pullup ? "LOW" : "HIGH"}`, prec: PREC.EQ };
    },
    validate: (block, ctx) => validateComponentBlock(block, ctx, { types: ["push-button"] }),
  },
  {
    type: "component_dht_temp",
    category: "sensors",
    shape: "value",
    level: "beginner",
    output: "number",
    requiresLibrary: ["DHT"],
    messageKey: "blocks.component.dhtTemp",
    tooltipKey: "blocks.component.dhtTemp.tip",
    slots: [componentSlot(["dht11"])],
    generateValue: (block, api) => ({
      code: `${componentDht(block, api)}.readTemperature()`,
      prec: PREC.ATOM,
    }),
    validate: (block, ctx) => validateComponentBlock(block, ctx, DHT_CHECK),
  },
  {
    type: "component_dht_hum",
    category: "sensors",
    shape: "value",
    level: "beginner",
    output: "number",
    requiresLibrary: ["DHT"],
    messageKey: "blocks.component.dhtHum",
    tooltipKey: "blocks.component.dhtHum.tip",
    slots: [componentSlot(["dht11"])],
    generateValue: (block, api) => ({
      code: `${componentDht(block, api)}.readHumidity()`,
      prec: PREC.ATOM,
    }),
    validate: (block, ctx) => validateComponentBlock(block, ctx, DHT_CHECK),
  },
  {
    type: "component_ultrasonic",
    category: "sensors",
    shape: "value",
    level: "beginner",
    output: "number",
    messageKey: "blocks.component.ultrasonic",
    tooltipKey: "blocks.component.ultrasonic.tip",
    slots: [componentSlot(["ultrasonic"])],
    generateValue: (block, api) => {
      const trig = componentPin(block, api, "trig", SAFE_PWM).code;
      const echo = componentPin(block, api, "echo", "10").code;
      api.setupLine(`pinMode:${trig}`, `pinMode(${trig}, OUTPUT);`);
      api.setupLine(`pinMode:${echo}`, `pinMode(${echo}, INPUT);`);

      const helper = api.declareObject("helper:ultrasonic", "okuMasofa", (name) => ({
        helper: [
          `long ${name}(int trig, int echo) {`,
          "  digitalWrite(trig, LOW);",
          "  delayMicroseconds(2);",
          "  digitalWrite(trig, HIGH);",
          "  delayMicroseconds(10);",
          "  digitalWrite(trig, LOW);",
          "  return pulseIn(echo, HIGH) / 58;",
          "}",
        ],
      }));
      return { code: `${helper}(${trig}, ${echo})`, prec: PREC.ATOM };
    },
    validate: (block, ctx) =>
      validateComponentBlock(block, ctx, {
        types: ["ultrasonic"],
        signalPins: ["trig", "echo"],
        needsPower: { vcc: "vcc", gnd: "gnd" },
      }),
  },

  /* ─────────────── Motorlar ─────────────── */

  {
    type: "component_servo_write",
    category: "motors",
    shape: "statement",
    level: "beginner",
    requiresLibrary: ["Servo"],
    messageKey: "blocks.component.servoWrite",
    tooltipKey: "blocks.component.servoWrite.tip",
    slots: [
      componentSlot(["servo"]),
      { kind: "value", name: "ANGLE", check: "number", inline: { kind: "number", default: 90 } },
    ],
    generateStatement: (block, api) => {
      const pin = componentPin(block, api, "signal", SAFE_PWM).code;
      const name = api.declareObject(
        `servo:${pin}`,
        "servo",
        (objectName) => ({
          include: "Servo.h",
          global: `Servo ${objectName};`,
          setup: `${objectName}.attach(${pin});`,
        }),
        { numbered: true },
      );
      return [`${name}.write(${api.value(block, "ANGLE")});`];
    },
    validate: (block, ctx) =>
      validateComponentBlock(block, ctx, {
        types: ["servo"],
        signalPins: ["signal"],
        needsPower: { vcc: "vcc", gnd: "gnd" },
      }),
  },

  /* ─────────────── Ekran ─────────────── */

  {
    type: "component_lcd_print",
    category: "display",
    shape: "statement",
    level: "beginner",
    requiresLibrary: ["LiquidCrystal"],
    messageKey: "blocks.component.lcdPrint",
    tooltipKey: "blocks.component.lcdPrint.tip",
    slots: [
      componentSlot(["lcd1602"]),
      { kind: "value", name: "TEXT", check: "any", inline: { kind: "text", default: "PilotKids" } },
    ],
    generateStatement: (block, api) => [
      `${componentLcd(block, api)}.print(${api.textValue(block, "TEXT")});`,
    ],
    validate: (block, ctx) => validateComponentBlock(block, ctx, LCD_CHECK),
  },
  {
    type: "component_lcd_value",
    category: "display",
    shape: "statement",
    level: "beginner",
    requiresLibrary: ["LiquidCrystal"],
    messageKey: "blocks.component.lcdValue",
    tooltipKey: "blocks.component.lcdValue.tip",
    slots: [
      componentSlot(["lcd1602"]),
      { kind: "value", name: "VALUE", check: "number", inline: { kind: "number", default: 0 } },
    ],
    generateStatement: (block, api) => [
      `${componentLcd(block, api)}.print(${api.value(block, "VALUE")});`,
    ],
    validate: (block, ctx) => validateComponentBlock(block, ctx, LCD_CHECK),
  },
  {
    type: "component_lcd_cursor",
    category: "display",
    shape: "statement",
    level: "beginner",
    requiresLibrary: ["LiquidCrystal"],
    messageKey: "blocks.component.lcdCursor",
    tooltipKey: "blocks.component.lcdCursor.tip",
    slots: [
      componentSlot(["lcd1602"]),
      { kind: "number", name: "COL", default: 0, min: 0, max: LCD_COLUMNS - 1, step: 1 },
      { kind: "number", name: "ROW", default: 0, min: 0, max: LCD_ROWS - 1, step: 1 },
    ],
    generateStatement: (block, api) => [
      `${componentLcd(block, api)}.setCursor(${api.field(block, "COL")}, ${api.field(block, "ROW")});`,
    ],
    validate: (block, ctx) => validateComponentBlock(block, ctx, LCD_CHECK),
  },
  {
    type: "component_lcd_clear",
    category: "display",
    shape: "statement",
    level: "beginner",
    requiresLibrary: ["LiquidCrystal"],
    messageKey: "blocks.component.lcdClear",
    tooltipKey: "blocks.component.lcdClear.tip",
    slots: [componentSlot(["lcd1602"])],
    generateStatement: (block, api) => [`${componentLcd(block, api)}.clear();`],
    validate: (block, ctx) => validateComponentBlock(block, ctx, LCD_CHECK),
  },
];

/* ─────────────────────────── Ichki yordamchilar ─────────────────────────── */

const DHT_CHECK = {
  types: ["dht11"],
  signalPins: ["data"],
  needsPower: { vcc: "vcc", gnd: "gnd" },
} as const;

const LCD_CHECK = {
  types: ["lcd1602"],
  signalPins: ["rs", "e", "d4", "d5", "d6", "d7"],
  needsPower: { vcc: "vcc", gnd: "gnd" },
} as const;

/** Potensiometrda signal `wiper`, qolgan analog sensorlarda `signal`. */
function signalPinOf(block: BlockNode, api: GenApi): string {
  return referencedNode(block, api.circuit)?.type === "potentiometer" ? "wiper" : "signal";
}

/**
 * Tugma ulanishi: qaysi pin va ichki pull-up kerakmi.
 *
 * Tugmaning ikkinchi oyog'i 5V ga ulangan bo'lsa, bosilganda pin HIGH
 * bo'ladi va tashqi pastga tortuvchi rezistor ishlaydi. Yerga ulangan
 * bo'lsa — ichki pull-up kerak va bosilgan tugma LOW beradi. Sxemadan
 * o'qish shuning uchun kerak: bola ulanishni o'zgartirsa kod ham
 * o'zgaradi, blokka tegilmaydi.
 */
function buttonWiring(block: BlockNode, api: GenApi): { pin: string; pullup: boolean } {
  const { code, number } = componentPin(block, api, "a", "2");
  const node = referencedNode(block, api.circuit);
  if (number === null || !node) return { pin: code, pullup: true };

  const netlist = netlistFor(api.circuit);
  const powered = isPowered(netlist, node.id, "a") || isPowered(netlist, node.id, "b");
  return { pin: code, pullup: !powered };
}

/** DHT obyekti — sxemadagi pin bo'yicha. */
function componentDht(block: BlockNode, api: GenApi): string {
  const pin = componentPin(block, api, "data", "2").code;
  return api.declareObject(`dht:${pin}`, "dht", (name) => ({
    include: "DHT.h",
    global: `DHT ${name}(${pin}, DHT11);`,
    setup: `${name}.begin();`,
  }));
}

/** LCD obyekti — oltala pin sxemadan o'qiladi. */
function componentLcd(block: BlockNode, api: GenApi): string {
  const order = ["rs", "e", "d4", "d5", "d6", "d7"] as const;
  const fallback = ["12", "11", "5", "4", "3", "2"];
  const pins = order.map((pinId, index) => componentPin(block, api, pinId, fallback[index]!).code);

  return api.declareObject(`lcd:${pins.join(",")}`, "lcd", (name) => ({
    include: "LiquidCrystal.h",
    global: `LiquidCrystal ${name}(${pins.join(", ")});`,
    setup: `${name}.begin(${LCD_COLUMNS}, ${LCD_ROWS});`,
  }));
}
