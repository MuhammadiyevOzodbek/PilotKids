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

function breadboardPins(): ComponentPin[] {
  const out: PinInput[] = [];
  for (let row = 0; row < 6; row++) {
    for (let col = 0; col < 24; col++) {
      const side = row < 3 ? "top" : "bottom";
      const rowInSide = row < 3 ? row + 1 : row - 2;
      const colLabel = col + 1;
      out.push({
        id: `${side[0]}${colLabel}-${rowInSide}`,
        label: `${side === "top" ? "Yuqori" : "Pastki"} ${colLabel}.${rowInSide}`,
        role: "passive",
        direction: "bidirectional",
        x: (14 + col * 11.5 + 2) / 300,
        y: ((row < 3 ? 18 + row * 11 : 60 + (row - 3) * 11) + 2) / 120,
        electricalGroupId: `breadboard:${side}:${colLabel}`,
      });
    }
  }
  return pins(out);
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
    // Pinlar chizmadan olinadi — silkscreen va ulanish nuqtasi doim mos keladi.
    pins: UNO_PINS.map((p) => ({
      ...pin({
        id: p.id,
        label: p.label,
        role: PIN_ROLE_OF[p.kind],
        ...pinRatio(p),
      }),
    })),
  },
  {
    type: "breadboard",
    name: "Breadboard",
    category: "board",
    description: "Komponentlarni lehimlamasdan ulash uchun taxta.",
    width: 300,
    height: 120,
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
    defaults: { ohms: 220 },
    settings: [
      {
        key: "ohms",
        label: "Qarshilik",
        kind: "number",
        min: 100,
        max: 10000,
        step: 10,
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
