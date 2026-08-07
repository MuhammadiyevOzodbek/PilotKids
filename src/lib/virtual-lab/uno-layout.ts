/**
 * PilotKids UNO o'quv platasining o'lchov chizmasi.
 *
 * Bu fayl — plataning YAGONA geometriya manbai. Katalog (pin koordinatalari)
 * ham, SVG chizma (header uyalari, komponentlar, yozuvlar) ham shu yerdan
 * oziqlanadi. Ilgari pin joylashuvi katalogda qo'lda yozilgan, silkscreen esa
 * SVG'da alohida chizilgandi — ikkalasi bir-biridan uzilib qolar va sim pin
 * ustiga tushmay qolardi.
 *
 * Koordinatalar SVG `viewBox` birliklarida. Katalog ularni 0–1 nisbatga
 * o'giradi (`pinRatio`), shunda plata o'lchami o'zgarsa ham simlar joyida
 * qoladi.
 *
 * ── Masshtab ────────────────────────────────────────────────────────────
 * Haqiqiy Arduino Uno gabariti 68.58 × 53.34 mm. Shu nisbat saqlangan:
 * plata 320 × 250 birlik (320 / 250 = 1.28 ≈ 68.58 / 53.34).
 * Demak 1 mm ≈ 4.67 birlik, ya'ni 2.54 mm qadam ≈ 12 birlik — `UNO_PITCH`.
 * Avvalgi chizmada plata eni atigi 20 qadam edi (haqiqatda 27), shuning
 * uchun o'ng chekka siqilib, yozuvlar bir-biriga urilardi.
 *
 * Brend: chizma to'liq original — Arduino logotipi yoki brend elementlari
 * ko'chirilmagan, markazda "PilotKids UNO" turadi.
 */

export const UNO_VIEWBOX = { width: 344, height: 286 } as const;

/** Plata gabariti (viewBox birliklarida). 320 : 250 = 1.28 — haqiqiy nisbat. */
export const UNO_BOARD = { x: 12, y: 16, w: 320, h: 250 } as const;

/** Qo'shni pinlar orasidagi masofa — haqiqiy plataning 2.54 mm qadamiga mos. */
export const UNO_PITCH = 12;

/** Header uyalarining markaz balandligi. */
const TOP_Y = 28;
const BOTTOM_Y = 254;

/** Silkscreen yozuvlari uchun umumiy chiziqlar (bir joyda — bir xil bo'lsin). */
export const UNO_TEXT = {
  /** Yuqori qator pin yozuvlarining tayanch chizig'i. */
  topPinLabelY: 44,
  /** Pastki qator pin yozuvlarining tayanch chizig'i. */
  bottomPinLabelY: 244,
} as const;

/**
 * O'ng chekkadagi o'yiq — haqiqiy Uno konturining tanilgan belgisi.
 * Shu oraliqda plata cheti `inset` birlikka ichkariga kiradi.
 */
export const UNO_NOTCH = { from: 108, to: 150, inset: 8 } as const;

/** Pin nima uchun ishlatilishini foydalanuvchiga tushuntirish uchun. */
export type UnoPinKind = "digital" | "pwm" | "analog" | "power" | "ground" | "special";

export interface UnoPinSpec {
  /** Sxemadagi identifikator. Mavjud loyihalar buzilmasligi uchun o'zgarmaydi. */
  id: string;
  /** Plataga bosib chiqarilgan yozuv (silkscreen). */
  silk: string;
  /** Tooltip va inspektorda ko'rinadigan to'liq nom. */
  label: string;
  kind: UnoPinKind;
  x: number;
  y: number;
}

/** Yuqori qatordagi raqamli pinlar; `~` — PWM. */
const DIGITAL_SILK: Record<number, string> = {
  3: "~3",
  5: "~5",
  6: "~6",
  9: "~9",
  10: "~10",
  11: "~11",
};

/**
 * Header bloklari — haqiqiy plataning to'rt qismi.
 * Korpus uyalardan 1 birlikka kengroq, shunda chekka uya qirraga tegmaydi.
 */
export const UNO_HEADERS = [
  { id: "digital-low", x: 125, y: 21, w: 98, h: 14, slots: 8 },
  { id: "digital-high", x: 229, y: 21, w: 98, h: 14, slots: 8 },
  { id: "power", x: 157, y: 247, w: 86, h: 14, slots: 7 },
  { id: "analog", x: 253, y: 247, w: 74, h: 14, slots: 6 },
] as const;

function digitalPin(n: number, x: number): UnoPinSpec {
  return {
    id: `D${n}`,
    silk: DIGITAL_SILK[n] ?? String(n),
    label: n === 0 ? "D0 (RX)" : n === 1 ? "D1 (TX)" : `D${n}`,
    kind: DIGITAL_SILK[n] ? "pwm" : "digital",
    x,
    y: TOP_Y,
  };
}

/**
 * Yuqori qator: chap blokda D0–D7, o'ng blokda D8–D13 + GND + AREF.
 * Ikki blok orasida haqiqiy platadagidek kengaytirilgan tirqish bor.
 */
const TOP_PINS: UnoPinSpec[] = [
  ...[0, 1, 2, 3, 4, 5, 6, 7].map((n) => digitalPin(n, 132 + n * UNO_PITCH)),
  ...[8, 9, 10, 11, 12, 13].map((n) => digitalPin(n, 236 + (n - 8) * UNO_PITCH)),
  { id: "GND3", silk: "GND", label: "GND (yer)", kind: "ground", x: 308, y: TOP_Y },
  {
    id: "AREF",
    silk: "AREF",
    label: "AREF (tayanch kuchlanish)",
    kind: "special",
    x: 320,
    y: TOP_Y,
  },
];

/**
 * Pastki chap blok — POWER.
 *
 * Haqiqiy Uno'da bu blokda 8 uya bor, lekin eng chapdagisi hech qayerga
 * ulanmagan (NC). O'quv platasida u faqat chalkashtirardi — "nega bu port
 * ishlamayapti?" degan savol tug'dirardi — shuning uchun blok 7 uyaga
 * qisqartirildi: chizmadagi har bir uyaga sim ulash mumkin.
 */
const POWER_PINS: UnoPinSpec[] = [
  {
    id: "IOREF",
    silk: "IOREF",
    label: "IOREF (mantiq kuchlanishi)",
    kind: "power",
    x: 164,
    y: BOTTOM_Y,
  },
  {
    id: "RESET",
    silk: "RESET",
    label: "RESET (qayta ishga tushirish)",
    kind: "special",
    x: 176,
    y: BOTTOM_Y,
  },
  { id: "3V3", silk: "3V3", label: "3.3V quvvat", kind: "power", x: 188, y: BOTTOM_Y },
  { id: "5V", silk: "5V", label: "5V quvvat", kind: "power", x: 200, y: BOTTOM_Y },
  { id: "GND1", silk: "GND", label: "GND (yer)", kind: "ground", x: 212, y: BOTTOM_Y },
  { id: "GND2", silk: "GND", label: "GND (yer)", kind: "ground", x: 224, y: BOTTOM_Y },
  {
    id: "VIN",
    silk: "VIN",
    label: "VIN (tashqi quvvat kirishi)",
    kind: "power",
    x: 236,
    y: BOTTOM_Y,
  },
];

/** Pastki o'ng blok — ANALOG IN. */
const ANALOG_PINS: UnoPinSpec[] = [0, 1, 2, 3, 4, 5].map((n) => ({
  id: `A${n}`,
  silk: `A${n}`,
  label: `A${n} (analog kirish)`,
  kind: "analog" as const,
  x: 260 + n * UNO_PITCH,
  y: BOTTOM_Y,
}));

/** Plataning barcha ulanadigan pinlari — chizma va katalog uchun bitta ro'yxat. */
export const UNO_PINS: UnoPinSpec[] = [...TOP_PINS, ...POWER_PINS, ...ANALOG_PINS];

/**
 * Blok ustidagi guruh yozuvlari.
 * `y` pin yozuvlaridan 11 birlik narida — matnlar bir-biriga urilmaydi.
 */
export const UNO_GROUP_LABELS = [
  { text: "DIGITAL (PWM ~)", x: 278, y: 58, anchor: "middle" as const },
  { text: "POWER", x: 200, y: 233, anchor: "middle" as const },
  { text: "ANALOG IN", x: 290, y: 233, anchor: "middle" as const },
];

/**
 * Mahkamlash teshiklari — haqiqiy Uno chizmasidagi to'rt nuqta
 * (13.97/2.54, 15.24/50.8, 66.04/7.62, 66.04/35.56 mm) shu masshtabga
 * o'girilgan. Shuning uchun ular nosimmetrik, lekin haqiqatga mos.
 */
export const UNO_MOUNTS = [
  { x: 83, y: 28 },
  { x: 77, y: 254 },
  { x: 320, y: 99 },
  { x: 320, y: 216 },
];

/* ─────────────────────── Plata ustidagi qismlar ─────────────────────── */

export interface UnoRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * Yirik qismlar. Har biri o'z komponentida chiziladi, lekin joylashuvi
 * shu yerda — shunda hech narsa bir-birining ustiga tushmaydi va
 * kompozitsiyani bitta joydan boshqarish mumkin.
 *
 * Qismlar orasidagi bo'sh yo'laklar ataylab qoldirilgan: silkscreen
 * yozuvlari (yuqorida 36–64, pastda 226–246) hech qanday detal bilan
 * kesishmaydi.
 */
export const UNO_PARTS = {
  /**
   * USB Type-B — chap yuqorida. Plata chetidan chiqib turadi (haqiqatdagidek),
   * lekin `viewBox` ichida qoladi: node chegarasidan kesilib ketmaydi.
   */
  usb: { x: 0, y: 48, w: 62, h: 78 } satisfies UnoRect,
  /** DC quvvat uyasi — chap pastda. */
  dcJack: { x: 0, y: 186, w: 56, h: 48 } satisfies UnoRect,
  /** USB↔UART boshqaruvchi (kichik QFP). */
  usbChip: { x: 72, y: 62, w: 36, h: 34 } satisfies UnoRect,
  /** 16 MGs kvarts rezonator. */
  crystal: { x: 72, y: 104, w: 34, h: 16 } satisfies UnoRect,
  /** Chiziqli kuchlanish stabilizatori (radiatorli). */
  regulator: { x: 66, y: 222, w: 44, h: 22 } satisfies UnoRect,
  /**
   * Asosiy mikrokontroller — DIP-28 (33 mm ≈ 156 birlik).
   * Oyoqlari korpusdan 6 birlik chiqadi, shuning uchun pastda guruh
   * yozuvlariga (228–234) tegmasligi uchun joy qoldirilgan.
   */
  mcu: { x: 136, y: 178, w: 156, h: 36 } satisfies UnoRect,
  /** Reset tugmasi. */
  reset: { x: 128, y: 68, w: 26, h: 24 } satisfies UnoRect,
} as const;

/** Elektrolitik kondensatorlar (markaz + radius). */
export const UNO_CAPS = [
  { x: 78, y: 200, r: 12 },
  { x: 108, y: 200, r: 12 },
] as const;

/** Ikki dona 2×3 ICSP header: biri USB chipi uchun, biri asosiy MCU uchun. */
export const UNO_ICSP = [
  { id: "icsp1", x: 166, y: 68, w: 30, h: 26, label: "ICSP1" },
  { id: "icsp2", x: 298, y: 158, w: 30, h: 26, label: "ICSP" },
] as const;

/** Plataning indikator LED'lari — chapdan o'ngga. */
export const UNO_LEDS = [
  { id: "ON", x: 214, y: 78, label: "ON" },
  { id: "L", x: 238, y: 78, label: "L" },
  { id: "TX", x: 262, y: 78, label: "TX" },
  { id: "RX", x: 286, y: 78, label: "RX" },
] as const;

export type UnoLedId = (typeof UNO_LEDS)[number]["id"];

/** Markaziy yozuv. Chip ustiga chiqmaydi, trace'larni yopmaydi. */
export const UNO_BRANDING = {
  x: 200,
  titleY: 134,
  subtitleY: 149,
  title: "PilotKids UNO",
  subtitle: "LEARNING BOARD",
} as const;

/**
 * O'tkazgich yo'llari. Ataylab faqat bo'sh yo'laklardan o'tadi va hech qanday
 * yozuv ostiga kirmaydi — shuning uchun chizma tartibli ko'rinadi.
 */
export const UNO_TRACES: readonly string[] = [
  "M132 100 V170 H186",
  "M144 100 V162 H186",
  "M256 100 V170 H214",
  "M268 100 V162 H214",
  "M280 100 V154 H262",
  "M292 130 V166 H274",
  "M62 140 H120 V126",
  "M62 152 H126 V166",
];

/** Trace uchlaridagi teshikchalar (via) — faqat katta zoomda ko'rinadi. */
export const UNO_VIAS: ReadonlyArray<{ x: number; y: number }> = [
  { x: 186, y: 170 },
  { x: 186, y: 162 },
  { x: 214, y: 170 },
  { x: 214, y: 162 },
  { x: 262, y: 154 },
  { x: 274, y: 166 },
  { x: 120, y: 126 },
  { x: 126, y: 166 },
];

/** Sinov maydonchalari — plata "tirik" ko'rinsin. */
export const UNO_PADS: ReadonlyArray<{ x: number; y: number }> = [
  { x: 122, y: 106 },
  { x: 122, y: 116 },
  { x: 316, y: 128 },
  { x: 316, y: 138 },
];

/** Mayda SMD rezistor/kondensatorlar (markazi bo'yicha, yotiq yoki tik). */
export const UNO_SMD: ReadonlyArray<{ x: number; y: number; vertical?: boolean }> = [
  { x: 118, y: 70 },
  { x: 118, y: 80 },
  { x: 118, y: 90 },
  { x: 206, y: 108 },
  { x: 206, y: 118 },
  { x: 292, y: 108 },
  { x: 292, y: 118 },
  { x: 130, y: 208, vertical: true },
  { x: 130, y: 224, vertical: true },
  { x: 62, y: 160 },
  { x: 62, y: 172 },
];

/** viewBox koordinatasini 0–1 nisbatga o'giradi (katalog shu ko'rinishni kutadi). */
export function pinRatio(pin: { x: number; y: number }): { x: number; y: number } {
  return { x: pin.x / UNO_VIEWBOX.width, y: pin.y / UNO_VIEWBOX.height };
}

/**
 * Plata konturi — o'ng chekkasidagi o'yiq bilan.
 * Chizma ham, tanlangandagi fokus halqasi ham shu yagona yo'ldan foydalanadi,
 * shunda halqa plataning aynan shakliga mos tushadi.
 */
export function unoOutlinePath(radius = 7): string {
  const { x, y, w, h } = UNO_BOARD;
  const r = radius;
  const right = x + w;
  const bottom = y + h;
  const inset = right - UNO_NOTCH.inset;

  return [
    `M${x + r},${y}`,
    `H${right - r}`,
    `A${r},${r} 0 0 1 ${right},${y + r}`,
    `V${UNO_NOTCH.from}`,
    `H${inset}`,
    `V${UNO_NOTCH.to}`,
    `H${right}`,
    `V${bottom - r}`,
    `A${r},${r} 0 0 1 ${right - r},${bottom}`,
    `H${x + r}`,
    `A${r},${r} 0 0 1 ${x},${bottom - r}`,
    `V${y + r}`,
    `A${r},${r} 0 0 1 ${x + r},${y}`,
    "Z",
  ].join(" ");
}
