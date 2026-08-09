import { bbRatio, BB_VIEWBOX, breadboardHoles } from "./breadboard-layout";
import type { ComponentDefinition, ComponentPin, PinDirection, PinKind, PinRole } from "./types";
import { pinRatio, UNO_PINS, UNO_VIEWBOX, type UnoPinKind } from "./uno-layout";

/**
 * Komponentlar katalogi.
 *
 * Har bir komponent — sof ma'lumot: o'lchami, pinlari va sozlamalari.
 * Ko'rinishi (SVG) alohida, `@/components/virtual-lab/symbols` da; shunda
 * simulyator va validator UI'ga bog'lanib qolmaydi.
 *
 * Pin koordinatalari 0–1 nisbatda: komponent kattalashsa ham joyida qoladi.
 */

/** PWM (~) qo'llab-quvvatlaydigan pinlar. */
export const PWM_PINS = new Set([3, 5, 6, 9, 10, 11]);
/** Analog kirishlar A0–A5 → simulyatorda 14–19 raqamlari. */
export const ANALOG_PIN_BASE = 14;

type PinInput = {
  id: string;
  label: string;
  role: PinRole;
  x: number;
  y: number;
  polarity?: "positive" | "negative";
  direction?: PinDirection;
  connectable?: boolean;
  electricalGroupId?: string;
};

function kindOf(role: PinRole): PinKind {
  return role === "pwm" ? "digital" : role;
}

function directionOf(role: PinRole): PinDirection {
  if (role === "power") return "output";
  if (role === "digital" || role === "pwm") return "bidirectional";
  if (role === "analog") return "input";
  return "passive";
}

function pin(input: PinInput): ComponentPin {
  return {
    ...input,
    kind: kindOf(input.role),
    direction: input.direction ?? directionOf(input.role),
    connectable: input.connectable ?? true,
  };
}

function pins(items: PinInput[]): ComponentPin[] {
  return items.map(pin);
}

/**
 * Breadboard teshiklari chizma bilan bitta manbadan olinadi
 * (`breadboard-layout`), shuning uchun sim aynan ko'rinib turgan teshikka
 * tushadi.
 */
function breadboardPins(): ComponentPin[] {
  return pins(
    breadboardHoles().map((hole) => ({
      id: hole.id,
      label: hole.label,
      role: "passive" as const,
      direction: "bidirectional" as const,
      electricalGroupId: hole.group,
      ...bbRatio(hole),
    })),
  );
}

/**
 * Chizmadagi pin turini elektr roliga o'giradi.
 *
 * `special` (AREF, RESET) — yo'nalishsiz: ularni quvvat yoki yer deb belgilash
 * validatorda noto'g'ri "qisqa tutashuv" xabarini keltirib chiqarardi.
 */
const PIN_ROLE_OF: Record<UnoPinKind, PinRole> = {
  digital: "digital",
  pwm: "pwm",
  analog: "analog",
  power: "power",
  ground: "ground",
  special: "passive",
};

/**
 * Rezistor qarshiligi uchun oraliq.
 *
 * Pastki chegara 10 Ω: shunda "rezistor juda kichik — LED kuyadi" darsini
 * amalda ko'rsatish mumkin. Yuqorisi 100 kΩ — undan kattasi o'quv
 * sxemalarida uchramaydi.
 */
export const RESISTOR_RANGE = { min: 10, max: 100000, step: 10 } as const;

/** Ko'p ishlatiladigan nominal qiymatlar — inspektorda bir bosishda tanlanadi. */
export const RESISTOR_PRESETS = [100, 220, 330, 470, 1000, 4700, 10000] as const;

export const RESISTOR_DEFAULT_OHMS = 220;

/** Sxemadagi rezistorning qarshiligi (Ω), chegaralar ichida. */
export function resistorOhms(settings: Record<string, string | number | boolean>): number {
  const raw = typeof settings.ohms === "number" ? settings.ohms : RESISTOR_DEFAULT_OHMS;
  if (!Number.isFinite(raw)) return RESISTOR_DEFAULT_OHMS;
  return Math.max(RESISTOR_RANGE.min, Math.min(RESISTOR_RANGE.max, raw));
}

/** Qarshilikni o'qishga qulay ko'rinishda yozadi: 220 Ω, 4.7 kΩ, 10 kΩ. */
export function formatOhms(ohms: number): string {
  if (ohms >= 1000) {
    const k = ohms / 1000;
    return `${Number.isInteger(k) ? k : Number(k.toFixed(1))} kΩ`;
  }
  return `${ohms} Ω`;
}

/** Kuchlanish yozuvi: 9 → "9V", 1.5 → "1.5V". */
export function formatVolts(volts: number): string {
  return `${Number.isInteger(volts) ? volts : volts.toFixed(1)}V`;
}

/**
 * Batareya kuchlanishi uchun ruxsat etilgan oraliq.
 * 24 V — o'quv sxemalari uchun xavfsiz yuqori chegara.
 */
export const BATTERY_VOLTAGE_RANGE = { min: 1, max: 24, step: 0.5 } as const;

/** Tayyor batareya turlari — inspektorda bir bosishda tanlanadi. */
export const BATTERY_PRESETS = [1.5, 3, 5, 9, 12] as const;

/** Yangi batareya shu kuchlanish bilan qo'yiladi (eng ko'p uchraydigani). */
export const BATTERY_DEFAULT_VOLTAGE = 9;

/**
 * Sxemadagi batareyaning haqiqiy kuchlanishi.
 *
 * O'chirilgan batareya — 0 V. Teskari solingani manfiy qiymat qaytaradi:
 * shunda zanjirda tok teskari yo'nalishda bo'ladi va LED yonmaydi.
 */
export function batteryVoltage(settings: Record<string, string | number | boolean>): number {
  if (settings.enabled === false) return 0;
  const raw = typeof settings.voltage === "number" ? settings.voltage : BATTERY_DEFAULT_VOLTAGE;
  const volts = Math.max(BATTERY_VOLTAGE_RANGE.min, Math.min(BATTERY_VOLTAGE_RANGE.max, raw));
  return settings.polarity === "reversed" ? -volts : volts;
}

/**
 * DHT11 ning haqiqiy o'lchov chegaralari (datasheet bo'yicha).
 *
 * Chegaralar aynan shu sensornikidan olingan: bola "−40 °C" qo'yib
 * ko'rsatkichni buzmasin, chunki haqiqiy DHT11 ham bunday qiymat bermaydi.
 */
export const DHT11_RANGE = {
  temperature: { min: 0, max: 50 },
  humidity: { min: 20, max: 90 },
} as const;

export const DHT11_DEFAULTS = { temperature: 22, humidity: 55 } as const;

/** LCD 16×2 — bir qatorda 16 belgi, ikkita qator. */
export const LCD_COLUMNS = 16;
export const LCD_ROWS = 2;

/* ───────── Faza B: yarimo'tkazgichlar va modullar ───────── */

/** Keypad tugmalari — qatorlar bo'yicha (R1…R4 × C1…C4). */
export const KEYPAD_KEYS: readonly (readonly string[])[] = [
  ["1", "2", "3", "A"],
  ["4", "5", "6", "B"],
  ["7", "8", "9", "C"],
  ["*", "0", "#", "D"],
] as const;

/** Keypad tugmasi qaysi qator/ustunda ekanini beradi. */
export function keypadPosition(key: string): { row: number; col: number } | null {
  for (let r = 0; r < KEYPAD_KEYS.length; r++) {
    const col = KEYPAD_KEYS[r]!.indexOf(key);
    if (col >= 0) return { row: r, col };
  }
  return null;
}

/** 7-segment raqamlari — qaysi segmentlar yonishi kerak. */
export const SEGMENT_DIGITS: Record<string, string> = {
  "0": "abcdef",
  "1": "bc",
  "2": "abdeg",
  "3": "abcdg",
  "4": "bcfg",
  "5": "acdfg",
  "6": "acdefg",
  "7": "abc",
  "8": "abcdefg",
  "9": "abcdfg",
};

/** Yonayotgan segmentlar naqshi qaysi raqamga mos kelishini topadi. */
export function digitForSegments(on: Record<string, boolean>): string | null {
  const lit = "abcdefg"
    .split("")
    .filter((s) => on[s] === true)
    .join("");
  for (const [digit, pattern] of Object.entries(SEGMENT_DIGITS)) {
    if (pattern === lit) return digit;
  }
  return null;
}

/** 74HC595 chiqishlari soni. */
export const SHIFT_REGISTER_BITS = 8;

export const CATALOG: ComponentDefinition[] = [
  /* ───────── Platalar ───────── */
  {
    type: "arduino-uno",
    name: "Arduino Uno",
    category: "board",
    description: "Sxemaning miyasi — kod shu platada bajariladi.",
    width: UNO_VIEWBOX.width,
    height: UNO_VIEWBOX.height,
    isBoard: true,
    defaults: {},
    settings: [],
    /*
     * Pinlar chizmadan olinadi — silkscreen va ulanish nuqtasi doim mos
     * keladi.
     *
     * Uchala GND pini bitta elektr guruhida: haqiqiy platada ular mis
     * qatlam orqali ichkaridan ulangan. Usiz "GND1 ga ulandim, GND2 esa
     * boshqa tugun" degan noto'g'ri holat chiqardi.
     */
    pins: UNO_PINS.map((p) =>
      pin({
        id: p.id,
        label: p.label,
        role: PIN_ROLE_OF[p.kind],
        electricalGroupId: p.kind === "ground" ? "uno:gnd" : undefined,
        ...pinRatio(p),
      }),
    ),
  },
  {
    type: "breadboard",
    name: "Breadboard",
    category: "board",
    description:
      "Komponentlarni lehimlamasdan ulash uchun taxta. Ustundagi besh teshik o'zaro ulangan, relslar esa butun uzunligi bo'ylab.",
    width: BB_VIEWBOX.width,
    height: BB_VIEWBOX.height,
    defaults: {},
    settings: [],
    pins: breadboardPins(),
  },

  /* ───────── Chiroqlar ───────── */
  {
    type: "led",
    name: "LED",
    category: "light",
    description: "Yorug'lik chiqaruvchi diod. Uzun oyoq — musbat (anod).",
    width: 60,
    height: 80,
    defaults: { color: "red" },
    settings: [
      {
        key: "color",
        label: "Rangi",
        kind: "select",
        options: [
          { value: "red", label: "Qizil" },
          { value: "green", label: "Yashil" },
          { value: "blue", label: "Ko'k" },
          { value: "yellow", label: "Sariq" },
        ],
      },
    ],
    pins: pins([
      { id: "anode", label: "Anod (+)", role: "passive", polarity: "positive", x: 0.32, y: 0.95 },
      {
        id: "cathode",
        label: "Katod (−)",
        role: "passive",
        polarity: "negative",
        x: 0.68,
        y: 0.95,
      },
    ]),
  },
  {
    type: "rgb-led",
    name: "RGB LED",
    category: "light",
    description: "Uchta rangni aralashtiradigan LED.",
    width: 70,
    height: 90,
    defaults: {},
    settings: [],
    pins: pins([
      { id: "r", label: "Qizil", role: "passive", x: 0.2, y: 0.95 },
      { id: "common", label: "Umumiy (−)", role: "passive", polarity: "negative", x: 0.4, y: 0.95 },
      { id: "g", label: "Yashil", role: "passive", x: 0.6, y: 0.95 },
      { id: "b", label: "Ko'k", role: "passive", x: 0.8, y: 0.95 },
    ]),
  },

  /* ───────── Boshqaruv ───────── */
  {
    type: "resistor",
    name: "Rezistor",
    category: "control",
    description: "Tokni cheklaydi. LED uchun odatda 220 Ω.",
    width: 90,
    height: 40,
    defaults: { ohms: RESISTOR_DEFAULT_OHMS },
    settings: [
      {
        key: "ohms",
        label: "Qarshilik",
        kind: "number",
        min: RESISTOR_RANGE.min,
        max: RESISTOR_RANGE.max,
        step: RESISTOR_RANGE.step,
        unit: "Ω",
      },
    ],
    pins: pins([
      { id: "a", label: "1-oyoq", role: "passive", x: 0.04, y: 0.5 },
      { id: "b", label: "2-oyoq", role: "passive", x: 0.96, y: 0.5 },
    ]),
  },
  {
    type: "push-button",
    name: "Tugma",
    category: "control",
    description: "Bosilganda ikki oyoqni ulaydi.",
    width: 70,
    height: 70,
    defaults: { pressed: false },
    settings: [{ key: "pressed", label: "Bosilgan", kind: "boolean" }],
    pins: pins([
      { id: "a", label: "1-oyoq", role: "passive", x: 0.1, y: 0.85 },
      { id: "b", label: "2-oyoq", role: "passive", x: 0.9, y: 0.85 },
    ]),
  },
  {
    type: "potentiometer",
    name: "Potensiometr",
    category: "control",
    description: "Buralganda 0–1023 oralig'ida qiymat beradi.",
    width: 80,
    height: 80,
    defaults: { value: 512 },
    settings: [{ key: "value", label: "Qiymat", kind: "number", min: 0, max: 1023, step: 1 }],
    pins: pins([
      { id: "vcc", label: "5V", role: "power", polarity: "positive", x: 0.15, y: 0.9 },
      { id: "wiper", label: "Signal", role: "analog", x: 0.5, y: 0.9 },
      { id: "gnd", label: "GND", role: "ground", polarity: "negative", x: 0.85, y: 0.9 },
    ]),
  },

  /* ───────── Sensorlar ───────── */
  {
    type: "ldr",
    name: "Yorug'lik sensori (LDR)",
    category: "sensor",
    description: "Yorug'lik kuchini o'lchaydi — 0 (qorong'i) dan 1023 gacha.",
    width: 70,
    height: 70,
    defaults: { light: 700 },
    settings: [{ key: "light", label: "Yorug'lik", kind: "number", min: 0, max: 1023, step: 1 }],
    pins: pins([
      { id: "vcc", label: "5V", role: "power", polarity: "positive", x: 0.2, y: 0.9 },
      { id: "signal", label: "Signal", role: "analog", x: 0.5, y: 0.9 },
      { id: "gnd", label: "GND", role: "ground", polarity: "negative", x: 0.8, y: 0.9 },
    ]),
  },
  {
    type: "tmp36",
    name: "Harorat sensori (TMP36)",
    category: "sensor",
    description: "Havo haroratini o'lchaydi. Analog chiqish: harorat oshsa kuchlanish ortadi.",
    width: 70,
    height: 70,
    defaults: { temperature: 25 },
    settings: [
      {
        key: "temperature",
        label: "Harorat",
        kind: "number",
        min: -40,
        max: 125,
        step: 1,
        unit: "°C",
      },
    ],
    pins: pins([
      { id: "vcc", label: "5V", role: "power", polarity: "positive", x: 0.2, y: 0.9 },
      { id: "signal", label: "Signal", role: "analog", x: 0.5, y: 0.9 },
      { id: "gnd", label: "GND", role: "ground", polarity: "negative", x: 0.8, y: 0.9 },
    ]),
  },
  {
    type: "soil-moisture",
    name: "Tuproq namligi sensori",
    category: "sensor",
    description: "Tuproqdagi namlikni 0% (quruq) dan 100% (nam) gacha o'lchaydi.",
    width: 70,
    height: 80,
    defaults: { moisture: 40 },
    settings: [
      { key: "moisture", label: "Namlik", kind: "number", min: 0, max: 100, step: 1, unit: "%" },
    ],
    pins: pins([
      { id: "vcc", label: "5V", role: "power", polarity: "positive", x: 0.2, y: 0.12 },
      { id: "signal", label: "Signal", role: "analog", x: 0.5, y: 0.12 },
      { id: "gnd", label: "GND", role: "ground", polarity: "negative", x: 0.8, y: 0.12 },
    ]),
  },
  {
    type: "pir",
    name: "Harakat sensori (PIR)",
    category: "sensor",
    description: "Harakatni sezadi. Harakat bo'lsa chiqish pini HIGH bo'ladi.",
    width: 80,
    height: 80,
    defaults: { motion: false },
    settings: [{ key: "motion", label: "Harakat bor", kind: "boolean" }],
    pins: pins([
      { id: "vcc", label: "5V", role: "power", polarity: "positive", x: 0.2, y: 0.9 },
      { id: "out", label: "Signal", role: "digital", x: 0.5, y: 0.9 },
      { id: "gnd", label: "GND", role: "ground", polarity: "negative", x: 0.8, y: 0.9 },
    ]),
  },
  {
    type: "ultrasonic",
    name: "Masofa sensori (HC-SR04)",
    category: "sensor",
    description: "To'siqqacha bo'lgan masofani o'lchaydi (2–400 sm).",
    width: 120,
    height: 70,
    defaults: { distance: 30 },
    settings: [
      { key: "distance", label: "Masofa", kind: "number", min: 2, max: 400, step: 1, unit: "sm" },
    ],
    pins: pins([
      { id: "vcc", label: "5V", role: "power", polarity: "positive", x: 0.14, y: 0.92 },
      { id: "trig", label: "Trig", role: "digital", x: 0.38, y: 0.92 },
      { id: "echo", label: "Echo", role: "digital", x: 0.62, y: 0.92 },
      { id: "gnd", label: "GND", role: "ground", polarity: "negative", x: 0.86, y: 0.92 },
    ]),
  },

  {
    type: "dht11",
    name: "Harorat va namlik sensori (DHT11)",
    category: "sensor",
    description:
      "Bir vaqtning o'zida harorat va havo namligini o'lchaydi. Kodda `DHT` kutubxonasi orqali o'qiladi.",
    width: 80,
    height: 90,
    defaults: { temperature: DHT11_DEFAULTS.temperature, humidity: DHT11_DEFAULTS.humidity },
    settings: [
      {
        key: "temperature",
        label: "Harorat",
        kind: "number",
        min: DHT11_RANGE.temperature.min,
        max: DHT11_RANGE.temperature.max,
        step: 1,
        unit: "°C",
      },
      {
        key: "humidity",
        label: "Namlik",
        kind: "number",
        min: DHT11_RANGE.humidity.min,
        max: DHT11_RANGE.humidity.max,
        step: 1,
        unit: "%",
      },
    ],
    pins: pins([
      { id: "vcc", label: "5V", role: "power", polarity: "positive", x: 0.2, y: 0.95 },
      { id: "data", label: "DATA", role: "digital", x: 0.5, y: 0.95 },
      { id: "gnd", label: "GND", role: "ground", polarity: "negative", x: 0.8, y: 0.95 },
    ]),
  },

  /* ───────── Motorlar ───────── */
  {
    type: "servo",
    name: "Servo motor",
    category: "motor",
    description: "0–180 gradus oralig'ida buriladi.",
    width: 110,
    height: 90,
    defaults: { angle: 90 },
    settings: [
      { key: "angle", label: "Burchak", kind: "number", min: 0, max: 180, step: 1, unit: "°" },
    ],
    pins: pins([
      { id: "vcc", label: "5V", role: "power", polarity: "positive", x: 0.2, y: 0.95 },
      { id: "signal", label: "Signal", role: "digital", x: 0.5, y: 0.95 },
      { id: "gnd", label: "GND", role: "ground", polarity: "negative", x: 0.8, y: 0.95 },
    ]),
  },

  {
    type: "dc-motor",
    name: "DC motor",
    category: "motor",
    description:
      "Tok berilganda aylanadi. Kuchlanish qutbini almashtirsangiz yo'nalishi o'zgaradi.",
    width: 90,
    height: 80,
    /*
     * Nominal kuchlanish — motorning pasportidagi qiymat. Usiz 6 V va 12 V
     * bir xil "to'liq tezlik" bo'lib ko'rinardi: tezlik 5 V ga nisbatan
     * hisoblanib, undan yuqorisi qirqilardi. Motor drayveri qo'shilgach bu
     * sezilarli bo'ldi — 12 V motorni 6 V bilan aylantirish sekinroq
     * bo'lishi kerak.
     */
    defaults: { nominalVoltage: 5 },
    settings: [
      {
        key: "nominalVoltage",
        label: "Nominal kuchlanish",
        kind: "number",
        min: 3,
        max: 24,
        step: 0.5,
        unit: "V",
      },
    ],
    pins: pins([
      {
        id: "t1",
        label: "1-terminal (+)",
        role: "passive",
        polarity: "positive",
        x: 0.28,
        y: 0.95,
      },
      {
        id: "t2",
        label: "2-terminal (−)",
        role: "passive",
        polarity: "negative",
        x: 0.72,
        y: 0.95,
      },
    ]),
  },

  /* ───────── Chiqish ───────── */
  {
    type: "buzzer",
    name: "Buzzer",
    category: "output",
    description: "Tok berilganda ovoz chiqaradi.",
    width: 80,
    height: 80,
    defaults: {},
    settings: [],
    pins: pins([
      { id: "plus", label: "+", role: "passive", polarity: "positive", x: 0.3, y: 0.92 },
      { id: "minus", label: "−", role: "passive", polarity: "negative", x: 0.7, y: 0.92 },
    ]),
  },

  {
    type: "lcd1602",
    name: "LCD displey (16×2)",
    category: "output",
    description:
      "Ikki qatorli, har qatorda 16 belgi ko'rsatadigan ekran. Kodda `LiquidCrystal` kutubxonasi orqali boshqariladi.",
    width: 240,
    height: 120,
    defaults: { backlight: true },
    settings: [{ key: "backlight", label: "Orqa yoritish", kind: "boolean" }],
    /*
     * HAQIQIY moduldagi o'n olti oyoq, o'sha tartibda: VSS, VDD, VO, RS,
     * RW, E, D0…D7, A, K.
     *
     * ── Nega D0–D3 ham bor ──────────────────────────────────────────────
     * Darsliklarda 4-bitli ulanish ishlatiladi va ular bo'sh qoladi, lekin
     * haqiqiy modulda ular mavjud. Ilgari ro'yxatda yo'q edi va bola
     * "modulda 16 oyoq bor, bu yerda 8 ta — nega?" degan savolga javob
     * topolmasdi. Ulanmagan oyoq hech narsani buzmaydi: simulyator
     * 4-bitli rejimda faqat D4–D7 ni o'qiydi.
     *
     * ── Nega birinchi ikkitasining ID'si `gnd`/`vcc` ────────────────────
     * Yorlig'i VSS/VDD, lekin ID ATAYLAB o'zgartirilmagan: saqlangan
     * loyihalardagi simlar `lcd:gnd` va `lcd:vcc` ga ishora qiladi va ID
     * almashtirilsa eski sxemalarning quvvat simlari yo'qolardi (§29).
     * Elektr jihatdan ular ayni bir narsa.
     *
     * ── Qadam ───────────────────────────────────────────────────────────
     * Oyoqlar plataning butun eni bo'ylab tarqatilgan, haqiqiy 2.54 mm
     * qadamda emas: 2D chizmada 16 ta nuqta 7 pikselda turib qolardi va
     * ularga sim ulash imkonsiz bo'lardi (§17 — bosish sohasi).
     */
    pins: pins(
      (
        [
          ["gnd", "VSS (GND)", "ground"],
          ["vcc", "VDD (+5V)", "power"],
          ["vo", "VO (kontrast)", "analog"],
          ["rs", "RS", "digital"],
          ["rw", "RW", "digital"],
          ["e", "E", "digital"],
          ["d0", "D0", "digital"],
          ["d1", "D1", "digital"],
          ["d2", "D2", "digital"],
          ["d3", "D3", "digital"],
          ["d4", "D4", "digital"],
          ["d5", "D5", "digital"],
          ["d6", "D6", "digital"],
          ["d7", "D7", "digital"],
          ["a", "A (yoritish +)", "power"],
          ["k", "K (yoritish −)", "ground"],
        ] as const
      ).map(([id, label, role], i) => ({
        id,
        label,
        role,
        x: 0.06 + i * (0.88 / 15),
        y: 0.94,
        ...(role === "power" ? { polarity: "positive" as const } : {}),
        ...(role === "ground" ? { polarity: "negative" as const } : {}),
      })),
    ),
  },
  {
    type: "relay",
    name: "Rele",
    category: "output",
    description:
      "Kichik signal bilan katta zanjirni yoqadigan kalit. Chulg'amga kuchlanish berilsa, COM kontakti NC dan NO ga o'tadi.",
    width: 140,
    height: 110,
    defaults: {},
    settings: [],
    /*
     * Boshqaruv pinlari pastda, kommutatsiya kontaktlari tepada: shunda
     * "past kuchlanishli tomon" bilan "yuk tomoni" chizmada ham ajralib
     * turadi — haqiqiy rele modulidagidek.
     */
    pins: pins([
      { id: "vcc", label: "5V", role: "power", polarity: "positive", x: 0.14, y: 0.95 },
      { id: "gnd", label: "GND", role: "ground", polarity: "negative", x: 0.36, y: 0.95 },
      { id: "in", label: "IN (boshqaruv)", role: "digital", x: 0.58, y: 0.95 },
      { id: "nc", label: "NC (odatda ulangan)", role: "passive", x: 0.2, y: 0.06 },
      { id: "com", label: "COM (umumiy)", role: "passive", x: 0.5, y: 0.06 },
      { id: "no", label: "NO (odatda uzilgan)", role: "passive", x: 0.8, y: 0.06 },
    ]),
  },

  /* ───────── Quvvat ───────── */
  {
    type: "battery",
    name: "Batareya",
    category: "power",
    description: "Elektr sxemaga doimiy kuchlanish beruvchi quvvat manbai.",
    width: 130,
    height: 64,
    defaults: {
      voltage: BATTERY_DEFAULT_VOLTAGE,
      enabled: true,
      polarity: "normal",
    },
    settings: [
      {
        key: "voltage",
        label: "Kuchlanish",
        kind: "number",
        min: BATTERY_VOLTAGE_RANGE.min,
        max: BATTERY_VOLTAGE_RANGE.max,
        step: BATTERY_VOLTAGE_RANGE.step,
        unit: "V",
      },
      { key: "enabled", label: "Yoqilgan", kind: "boolean" },
      {
        key: "polarity",
        label: "Qutblanishi",
        kind: "select",
        options: [
          { value: "normal", label: "To'g'ri (+ o'ngda)" },
          { value: "reversed", label: "Teskari solingan" },
        ],
      },
    ],
    /*
     * Terminallar — ushlagichning kontaktlari, shuning uchun ular gorizontal
     * chetlarda va aynan o'rta chiziqda turadi: `component-node` shunda simni
     * chapga/o'ngga chiqaradi, xuddi haqiqiy batareya ushlagichidagidek.
     */
    pins: pins([
      {
        id: "minus",
        label: "Manfiy (−)",
        role: "ground",
        polarity: "negative",
        x: 0.046,
        y: 0.5,
      },
      {
        id: "plus",
        label: "Musbat (+)",
        role: "power",
        polarity: "positive",
        x: 0.954,
        y: 0.5,
      },
    ]),
  },
  {
    type: "power-5v",
    name: "5V quvvat",
    category: "power",
    description: "Musbat quvvat manbai.",
    width: 70,
    height: 50,
    defaults: {},
    settings: [],
    pins: pins([{ id: "out", label: "5V", role: "power", polarity: "positive", x: 0.5, y: 0.9 }]),
  },
  {
    type: "ground",
    name: "GND (yer)",
    category: "power",
    description: "Zanjirning manfiy uchi.",
    width: 70,
    height: 50,
    defaults: {},
    settings: [],
    pins: pins([{ id: "out", label: "GND", role: "ground", polarity: "negative", x: 0.5, y: 0.1 }]),
  },

  /* ───────── Faza B: yarimo'tkazgichlar ───────── */
  {
    type: "diode",
    name: "Diod",
    category: "control",
    description: "Tokni faqat bir tomonga o'tkazadi. Motorga teskari kuchlanishdan himoya.",
    width: 90,
    height: 40,
    defaults: { vf: 0.7 },
    settings: [
      {
        key: "vf",
        label: "Ochilish kuchlanishi",
        kind: "number",
        min: 0.2,
        max: 1.2,
        step: 0.05,
        unit: "V",
      },
    ],
    pins: pins([
      { id: "a", label: "Anod (+)", role: "passive", polarity: "positive", x: 0.04, y: 0.5 },
      { id: "k", label: "Katod (−)", role: "passive", polarity: "negative", x: 0.96, y: 0.5 },
    ]),
  },
  {
    type: "capacitor",
    name: "Kondensator",
    category: "control",
    description: "Zaryad to'playdi. Elektrolit turi qutbli — teskari ulanmasin.",
    width: 60,
    height: 84,
    defaults: { microfarads: 100, polarized: true },
    settings: [
      {
        key: "microfarads",
        label: "Sig'im",
        kind: "number",
        min: 0.1,
        max: 4700,
        step: 0.1,
        unit: "µF",
      },
      { key: "polarized", label: "Elektrolit (qutbli)", kind: "boolean" },
    ],
    pins: pins([
      { id: "plus", label: "+", role: "passive", polarity: "positive", x: 0.3, y: 0.97 },
      { id: "minus", label: "−", role: "passive", polarity: "negative", x: 0.7, y: 0.97 },
    ]),
  },
  {
    type: "npn-transistor",
    name: "NPN tranzistor",
    category: "control",
    description: "Kichik baza toki bilan katta yukni yoqadi (kalit sifatida).",
    width: 76,
    height: 80,
    defaults: { beta: 100, vbe: 0.7 },
    settings: [
      { key: "beta", label: "Kuchaytirish (β)", kind: "number", min: 20, max: 500, step: 10 },
      {
        key: "vbe",
        label: "Baza ochilish kuchlanishi",
        kind: "number",
        min: 0.4,
        max: 1,
        step: 0.05,
        unit: "V",
      },
    ],
    pins: pins([
      { id: "c", label: "Kollektor (C)", role: "passive", x: 0.72, y: 0.04 },
      { id: "b", label: "Baza (B)", role: "passive", x: 0.03, y: 0.5 },
      { id: "e", label: "Emitter (E)", role: "passive", polarity: "negative", x: 0.72, y: 0.96 },
    ]),
  },

  /* ───────── Faza B: modullar ───────── */
  {
    type: "joystick",
    name: "Joystik moduli",
    category: "control",
    description: "Ikki o'q bo'yicha analog qiymat va bosiladigan tugma.",
    width: 110,
    height: 118,
    defaults: { x: 0, y: 0, pressed: false },
    settings: [
      { key: "x", label: "X o'qi", kind: "number", min: -100, max: 100, step: 1 },
      { key: "y", label: "Y o'qi", kind: "number", min: -100, max: 100, step: 1 },
      { key: "pressed", label: "Tugma bosilgan", kind: "boolean" },
    ],
    pins: pins([
      { id: "vcc", label: "5V", role: "power", polarity: "positive", x: 0.1, y: 0.97 },
      { id: "gnd", label: "GND", role: "ground", polarity: "negative", x: 0.3, y: 0.97 },
      { id: "vrx", label: "VRx", role: "analog", x: 0.5, y: 0.97 },
      { id: "vry", label: "VRy", role: "analog", x: 0.7, y: 0.97 },
      { id: "sw", label: "SW (tugma)", role: "digital", x: 0.9, y: 0.97 },
    ]),
  },
  {
    type: "seven-segment",
    name: "7-segmentli indikator",
    category: "output",
    description: "Bitta raqam ko'rsatadi. Har bir segment — alohida LED.",
    width: 84,
    height: 116,
    defaults: { common: "cathode" },
    settings: [
      {
        key: "common",
        label: "Umumiy uch",
        kind: "select",
        options: [
          { value: "cathode", label: "Umumiy katod (COM → GND)" },
          { value: "anode", label: "Umumiy anod (COM → 5V)" },
        ],
      },
    ],
    pins: pins([
      { id: "a", label: "a", role: "passive", x: 0.08, y: 0.04 },
      { id: "b", label: "b", role: "passive", x: 0.3, y: 0.04 },
      { id: "c", label: "c", role: "passive", x: 0.52, y: 0.04 },
      { id: "d", label: "d", role: "passive", x: 0.74, y: 0.04 },
      { id: "e", label: "e", role: "passive", x: 0.08, y: 0.96 },
      { id: "f", label: "f", role: "passive", x: 0.3, y: 0.96 },
      { id: "g", label: "g", role: "passive", x: 0.52, y: 0.96 },
      { id: "dp", label: "dp (nuqta)", role: "passive", x: 0.74, y: 0.96 },
      { id: "com", label: "COM (umumiy)", role: "passive", x: 0.94, y: 0.5 },
    ]),
  },
  {
    type: "shift-register",
    name: "74HC595 siljitish registri",
    category: "output",
    description: "3 ta pin bilan 8 ta chiqishni boshqaradi. shiftOut() bilan ishlaydi.",
    width: 150,
    height: 118,
    defaults: {},
    settings: [],
    pins: pins([
      { id: "q0", label: "Q0", role: "digital", direction: "output", x: 0.06, y: 0.04 },
      { id: "q1", label: "Q1", role: "digital", direction: "output", x: 0.19, y: 0.04 },
      { id: "q2", label: "Q2", role: "digital", direction: "output", x: 0.32, y: 0.04 },
      { id: "q3", label: "Q3", role: "digital", direction: "output", x: 0.45, y: 0.04 },
      { id: "q4", label: "Q4", role: "digital", direction: "output", x: 0.58, y: 0.04 },
      { id: "q5", label: "Q5", role: "digital", direction: "output", x: 0.71, y: 0.04 },
      { id: "q6", label: "Q6", role: "digital", direction: "output", x: 0.84, y: 0.04 },
      { id: "q7", label: "Q7", role: "digital", direction: "output", x: 0.96, y: 0.04 },
      { id: "ser", label: "SER (DS) — ma'lumot", role: "digital", x: 0.06, y: 0.96 },
      { id: "srclk", label: "SRCLK (SH_CP) — takt", role: "digital", x: 0.19, y: 0.96 },
      { id: "rclk", label: "RCLK (ST_CP) — latch", role: "digital", x: 0.32, y: 0.96 },
      { id: "oe", label: "OE (chiqishni yoqish, 0 = yoniq)", role: "digital", x: 0.45, y: 0.96 },
      {
        id: "srclr",
        label: "SRCLR (MR) — tozalash, 0 = tozala",
        role: "digital",
        x: 0.58,
        y: 0.96,
      },
      {
        id: "q7s",
        label: "Q7' (keyingi chipga)",
        role: "digital",
        direction: "output",
        x: 0.71,
        y: 0.96,
      },
      { id: "vcc", label: "5V", role: "power", polarity: "positive", x: 0.84, y: 0.96 },
      { id: "gnd", label: "GND", role: "ground", polarity: "negative", x: 0.96, y: 0.96 },
    ]),
  },
  {
    type: "l298n",
    name: "L298N motor drayveri",
    category: "motor",
    description: "Ikkita DC motorni yo'nalish va tezlik bilan boshqaradi.",
    width: 168,
    height: 132,
    defaults: { supplyVoltage: 12 },
    settings: [
      {
        key: "supplyVoltage",
        label: "Motor kuchlanishi",
        kind: "number",
        min: 5,
        max: 24,
        step: 0.5,
        unit: "V",
      },
    ],
    pins: pins([
      { id: "out1", label: "OUT1 (motor A)", role: "passive", x: 0.06, y: 0.04 },
      { id: "out2", label: "OUT2 (motor A)", role: "passive", x: 0.22, y: 0.04 },
      { id: "out3", label: "OUT3 (motor B)", role: "passive", x: 0.78, y: 0.04 },
      { id: "out4", label: "OUT4 (motor B)", role: "passive", x: 0.94, y: 0.04 },
      {
        id: "vin",
        label: "VIN (motor quvvati)",
        role: "power",
        polarity: "positive",
        x: 0.06,
        y: 0.5,
      },
      { id: "gnd", label: "GND", role: "ground", polarity: "negative", x: 0.06, y: 0.78 },
      { id: "v5", label: "5V (mantiq)", role: "power", polarity: "positive", x: 0.94, y: 0.5 },
      { id: "ena", label: "ENA (A tezligi, PWM)", role: "digital", x: 0.12, y: 0.96 },
      { id: "in1", label: "IN1 (A yo'nalishi)", role: "digital", x: 0.28, y: 0.96 },
      { id: "in2", label: "IN2 (A yo'nalishi)", role: "digital", x: 0.44, y: 0.96 },
      { id: "in3", label: "IN3 (B yo'nalishi)", role: "digital", x: 0.6, y: 0.96 },
      { id: "in4", label: "IN4 (B yo'nalishi)", role: "digital", x: 0.76, y: 0.96 },
      { id: "enb", label: "ENB (B tezligi, PWM)", role: "digital", x: 0.92, y: 0.96 },
    ]),
  },
  {
    type: "keypad-4x4",
    name: "4×4 klaviatura",
    category: "control",
    description: "16 ta tugma. Qator va ustun skanerlash orqali o'qiladi.",
    width: 148,
    height: 158,
    defaults: { key: "" },
    settings: [
      {
        key: "key",
        label: "Bosilgan tugma",
        kind: "select",
        options: [
          { value: "", label: "Hech qaysi" },
          ...KEYPAD_KEYS.flat().map((k) => ({ value: k, label: k })),
        ],
      },
    ],
    pins: pins([
      { id: "r1", label: "R1 (1-qator)", role: "passive", x: 0.1, y: 0.97 },
      { id: "r2", label: "R2 (2-qator)", role: "passive", x: 0.22, y: 0.97 },
      { id: "r3", label: "R3 (3-qator)", role: "passive", x: 0.34, y: 0.97 },
      { id: "r4", label: "R4 (4-qator)", role: "passive", x: 0.46, y: 0.97 },
      { id: "c1", label: "C1 (1-ustun)", role: "passive", x: 0.58, y: 0.97 },
      { id: "c2", label: "C2 (2-ustun)", role: "passive", x: 0.7, y: 0.97 },
      { id: "c3", label: "C3 (3-ustun)", role: "passive", x: 0.82, y: 0.97 },
      { id: "c4", label: "C4 (4-ustun)", role: "passive", x: 0.94, y: 0.97 },
    ]),
  },

  /* ───────── Boshqa ───────── */
  {
    type: "multimeter",
    name: "Multimetr",
    category: "other",
    description: "Ikki nuqta orasidagi kuchlanishni ko'rsatadi.",
    width: 110,
    height: 90,
    defaults: {},
    settings: [],
    pins: pins([
      { id: "probe-plus", label: "Qizil uchi", role: "passive", x: 0.3, y: 0.95 },
      { id: "probe-minus", label: "Qora uchi", role: "passive", x: 0.7, y: 0.95 },
    ]),
  },
];

const BY_TYPE = new Map(CATALOG.map((c) => [c.type, c]));

/** Katalogdan komponent ta'rifini oladi (topilmasa `null`). */
export function getDefinition(type: string): ComponentDefinition | null {
  return BY_TYPE.get(type) ?? null;
}

/** Ta'rifdagi pinni topadi. */
export function getPin(type: string, pinId: string) {
  return getDefinition(type)?.pins.find((p) => p.id === pinId) ?? null;
}

export const CATEGORY_LABELS: Record<string, string> = {
  board: "Platalar",
  light: "Chiroqlar",
  control: "Boshqaruv elementlari",
  sensor: "Sensorlar",
  motor: "Motorlar",
  output: "Chiqish qurilmalari",
  power: "Quvvat manbalari",
  other: "Boshqa komponentlar",
};

/**
 * Arduino pin nomini raqamga aylantiradi.
 * "D13" → 13, "A0" → 14 (ANALOG_PIN_BASE), "13" → 13.
 */
export function pinIdToNumber(pinId: string): number | null {
  if (/^D\d+$/.test(pinId)) return Number(pinId.slice(1));
  if (/^A\d+$/.test(pinId)) return ANALOG_PIN_BASE + Number(pinId.slice(1));
  if (/^\d+$/.test(pinId)) return Number(pinId);
  return null;
}
