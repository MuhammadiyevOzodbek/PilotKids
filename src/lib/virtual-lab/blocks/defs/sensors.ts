/**
 * Sensor bloklari (§11).
 *
 * Hammasi `beginner` darajada: bola «yorug'lik qiymati» degan blokni oladi,
 * uning ortida `analogRead(A0)` turgani esa kod ko'rinishida ko'rinadi.
 * Xom `analogRead` bloki ham qoladi — u «Arduino pinlari» bo'limida,
 * `advanced` darajada (§32).
 *
 * Hisob-kitob talab qiladigan sensorlar (TMP36, HC-SR04) ifodani joyida
 * yozmaydi, YORDAMCHI FUNKSIYA chiqaradi. Ikki sababi bor: kod o'qilishi
 * oson qoladi va formula bir marta yoziladi — o'nta blok bitta funksiyani
 * chaqiradi.
 */

import { ANALOG_PIN_OPTIONS, DIGITAL_PIN_OPTIONS } from "../pins";
import { PREC, type BlockDefinition, type BlockNode, type GenApi } from "../types";

/** Tuproq namligi qanday o'lchanadi. */
const SOIL_MODES = [
  { value: "raw", label: "0–1023" },
  { value: "percent", label: "0–100 %" },
];

/**
 * Tugma qanday ulangan.
 *
 * INPUT_PULLUP — Arduino'ning ichki tortuvchi rezistori. Bunda tugma
 * bosilmaganda pin HIGH, BOSILGANDA LOW bo'ladi. Bu bolalar uchun eng
 * ko'p chalkashlik keltiradigan joy, shuning uchun blok mantiqning o'zini
 * teskarisiga o'giradi va bola «bosilganmi» degan savolga to'g'ri javob
 * oladi.
 */
const BUTTON_MODES = [
  { value: "INPUT_PULLUP", label: "INPUT_PULLUP" },
  { value: "INPUT", label: "INPUT" },
];

/* ─────────────────────────── Yordamchilar ─────────────────────────── */

/** TMP36 uchun harorat funksiyasi; nomi bir marta band qilinadi. */
function temperatureHelper(api: GenApi): string {
  return api.declareObject("helper:tmp36", "okuHarorat", (name) => ({
    helper: [
      `float ${name}(int pin) {`,
      // TMP36: 10 mV/°C, 500 mV siljish. 5 V / 1024 qadam — ADC qadami.
      "  return (analogRead(pin) * 5.0 / 1024.0 - 0.5) * 100;",
      "}",
    ],
  }));
}

/** HC-SR04 uchun masofa funksiyasi (sm). */
function distanceHelper(api: GenApi): string {
  return api.declareObject("helper:ultrasonic", "okuMasofa", (name) => ({
    helper: [
      `long ${name}(int trig, int echo) {`,
      "  digitalWrite(trig, LOW);",
      "  delayMicroseconds(2);",
      "  digitalWrite(trig, HIGH);",
      "  delayMicroseconds(10);",
      "  digitalWrite(trig, LOW);",
      // Tovush 340 m/s: sm ga aylantirish uchun 58 ga bo'linadi (borib-kelish).
      "  return pulseIn(echo, HIGH) / 58;",
      "}",
    ],
  }));
}

/** DHT11 obyekti — pin bo'yicha bitta. */
function dhtObject(block: BlockNode, api: GenApi): string {
  const pin = api.field(block, "pin");
  return api.declareObject(`dht:${pin}`, "dht", (name) => ({
    include: "DHT.h",
    global: `DHT ${name}(${pin}, DHT11);`,
    setup: `${name}.begin();`,
  }));
}

/** Kirish pinini `setup()` da sozlaydi (kalit pin bo'yicha — takrorlanmaydi). */
function inputMode(api: GenApi, pin: string, mode: "INPUT" | "INPUT_PULLUP"): void {
  api.setupLine(`pinMode:${pin}`, `pinMode(${pin}, ${mode});`);
}

export const SENSOR_BLOCKS: BlockDefinition[] = [
  {
    type: "sensor_ldr",
    category: "sensors",
    shape: "value",
    level: "beginner",
    output: "number",
    messageKey: "blocks.sensors.ldr",
    tooltipKey: "blocks.sensors.ldr.tip",
    slots: [{ kind: "dropdown", name: "pin", options: ANALOG_PIN_OPTIONS, default: "A0" }],
    generateValue: (block, api) => ({
      code: `analogRead(${api.field(block, "pin")})`,
      prec: PREC.ATOM,
    }),
  },
  {
    type: "sensor_pot",
    category: "sensors",
    shape: "value",
    level: "beginner",
    output: "number",
    messageKey: "blocks.sensors.pot",
    tooltipKey: "blocks.sensors.pot.tip",
    slots: [{ kind: "dropdown", name: "pin", options: ANALOG_PIN_OPTIONS, default: "A0" }],
    generateValue: (block, api) => ({
      code: `analogRead(${api.field(block, "pin")})`,
      prec: PREC.ATOM,
    }),
  },
  {
    type: "sensor_tmp36",
    category: "sensors",
    shape: "value",
    level: "beginner",
    output: "number",
    messageKey: "blocks.sensors.tmp36",
    tooltipKey: "blocks.sensors.tmp36.tip",
    slots: [{ kind: "dropdown", name: "pin", options: ANALOG_PIN_OPTIONS, default: "A0" }],
    generateValue: (block, api) => ({
      code: `${temperatureHelper(api)}(${api.field(block, "pin")})`,
      prec: PREC.ATOM,
    }),
  },
  {
    type: "sensor_soil",
    category: "sensors",
    shape: "value",
    level: "beginner",
    output: "number",
    messageKey: "blocks.sensors.soil",
    messageKeyBeginner: "blocks.sensors.soil.beginner",
    tooltipKey: "blocks.sensors.soil.tip",
    slots: [
      { kind: "dropdown", name: "pin", options: ANALOG_PIN_OPTIONS, default: "A0" },
      { kind: "dropdown", name: "MODE", options: SOIL_MODES, default: "percent" },
    ],
    generateValue: (block, api) => {
      const read = `analogRead(${api.field(block, "pin")})`;
      if (api.field(block, "MODE") === "raw") return { code: read, prec: PREC.ATOM };
      return { code: `map(${read}, 0, 1023, 0, 100)`, prec: PREC.ATOM };
    },
  },
  {
    type: "sensor_pir",
    category: "sensors",
    shape: "boolean",
    level: "beginner",
    output: "boolean",
    messageKey: "blocks.sensors.pir",
    tooltipKey: "blocks.sensors.pir.tip",
    slots: [{ kind: "dropdown", name: "pin", options: DIGITAL_PIN_OPTIONS, default: "2" }],
    generateValue: (block, api) => {
      const pin = api.field(block, "pin");
      inputMode(api, pin, "INPUT");
      return { code: `digitalRead(${pin}) == HIGH`, prec: PREC.EQ };
    },
  },
  {
    type: "sensor_button",
    category: "sensors",
    shape: "boolean",
    level: "beginner",
    output: "boolean",
    messageKey: "blocks.sensors.button",
    tooltipKey: "blocks.sensors.button.tip",
    slots: [
      { kind: "dropdown", name: "pin", options: DIGITAL_PIN_OPTIONS, default: "2" },
      { kind: "dropdown", name: "MODE", options: BUTTON_MODES, default: "INPUT_PULLUP" },
    ],
    generateValue: (block, api) => {
      const pin = api.field(block, "pin");
      const pullup = api.field(block, "MODE") !== "INPUT";
      inputMode(api, pin, pullup ? "INPUT_PULLUP" : "INPUT");
      // Pull-up bilan bosilgan tugma pinni YERGA tortadi, ya'ni LOW bo'ladi.
      return { code: `digitalRead(${pin}) == ${pullup ? "LOW" : "HIGH"}`, prec: PREC.EQ };
    },
  },
  {
    type: "sensor_dht_temp",
    category: "sensors",
    shape: "value",
    level: "beginner",
    output: "number",
    requiresLibrary: ["DHT"],
    messageKey: "blocks.sensors.dhtTemp",
    tooltipKey: "blocks.sensors.dhtTemp.tip",
    slots: [{ kind: "dropdown", name: "pin", options: DIGITAL_PIN_OPTIONS, default: "2" }],
    generateValue: (block, api) => ({
      code: `${dhtObject(block, api)}.readTemperature()`,
      prec: PREC.ATOM,
    }),
  },
  {
    type: "sensor_dht_hum",
    category: "sensors",
    shape: "value",
    level: "beginner",
    output: "number",
    requiresLibrary: ["DHT"],
    messageKey: "blocks.sensors.dhtHum",
    tooltipKey: "blocks.sensors.dhtHum.tip",
    slots: [{ kind: "dropdown", name: "pin", options: DIGITAL_PIN_OPTIONS, default: "2" }],
    generateValue: (block, api) => ({
      code: `${dhtObject(block, api)}.readHumidity()`,
      prec: PREC.ATOM,
    }),
  },
  {
    type: "sensor_ultrasonic",
    category: "sensors",
    shape: "value",
    level: "beginner",
    output: "number",
    messageKey: "blocks.sensors.ultrasonic",
    messageKeyBeginner: "blocks.sensors.ultrasonic.beginner",
    tooltipKey: "blocks.sensors.ultrasonic.tip",
    slots: [
      { kind: "dropdown", name: "TRIG", options: DIGITAL_PIN_OPTIONS, default: "9" },
      { kind: "dropdown", name: "ECHO", options: DIGITAL_PIN_OPTIONS, default: "10" },
    ],
    generateValue: (block, api) => {
      const trig = api.field(block, "TRIG");
      const echo = api.field(block, "ECHO");
      api.setupLine(`pinMode:${trig}`, `pinMode(${trig}, OUTPUT);`);
      api.setupLine(`pinMode:${echo}`, `pinMode(${echo}, INPUT);`);
      return { code: `${distanceHelper(api)}(${trig}, ${echo})`, prec: PREC.ATOM };
    },
  },
];
