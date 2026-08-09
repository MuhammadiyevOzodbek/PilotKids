/**
 * 2D katalogdan 3D geometriya (§42).
 *
 * 3D laboratoriya YANGI ma'lumot modeli qurmaydi — u `Circuit` ning aynan
 * o'zidan foydalanadi. Shu sababli bitta loyihani ikkala laboratoriyada
 * ochish mumkin va simulyator ikkalasiga bir xil xizmat qiladi:
 *
 *     Circuit  →  Simulator  →  2D renderer
 *                            →  3D renderer
 *
 * Bu modul ana shu ko'prik: `CircuitNode.x/y/rotation` ni stol ustidagi
 * joylashuvga, katalogdagi pin NISBATLARINI esa uch o'lchamli nuqtaga
 * o'giradi.
 *
 * Pin nisbatlarini qayta ishlatish ataylab: pin ID'lari (`anode`, `D13`,
 * `t3-2`) ikkala renderer'da bir xil qoladi, ya'ni netlist, validator va
 * simulyator uchun 2D bilan 3D orasida hech qanday farq yo'q.
 */

import { getDefinition } from "../catalog";
import type { Circuit, CircuitNode } from "../types";

/* ─────────────────────────── O'lchov birligi ─────────────────────────── */

/**
 * 3D sahnaning birligi — SANTIMETR.
 *
 * Haqiqiy o'lchamlar ishlatiladi: Arduino Uno 6.86 × 5.34 sm. Shunda
 * komponentlar bir-biriga nisbatan to'g'ri ko'rinadi va bola «breadboard
 * Arduinodan uzunroq ekan» degan haqiqiy tasavvurga ega bo'ladi.
 */
export const CM = 1;

/**
 * 2D ish maydonidagi piksel → stol ustidagi santimetr.
 *
 * 2D da Arduino 344 px, haqiqatda 6.86 sm. 50 px/sm shundan olingan:
 * 2D sxemani 3D ga ko'chirganda komponentlar taxminan o'sha nisbatda
 * joylashadi va ustma-ust tushib qolmaydi.
 */
export const PX_PER_CM = 50;

/* ─────────────────────────── Komponent o'lchamlari ─────────────────────────── */

export interface Size3D {
  /** Kenglik (X), chuqurlik (Z), balandlik (Y) — santimetrda. */
  w: number;
  d: number;
  h: number;
  /**
   * Pinlar komponent tagidan qancha balandda.
   *
   * Plata va modullarda pinlar ustki yuzada (`h`), oyoqli komponentlarda
   * esa pastda (0) — sim shu balandlikdan boshlanadi.
   */
  pinY: number;
}

/**
 * Haqiqiy o'lchamlar (sm).
 *
 * 2D dagi piksel o'lchamlaridan OLINMAYDI: u yerda LED 60 × 80 px, ya'ni
 * Arduinoning beshdan biri — haqiqatda esa o'n to'rt marta kichik. 2D da
 * bu to'g'ri (kichik belgi bosilmaydi), 3D da esa yolg'on bo'lardi.
 */
const SIZES: Record<string, Size3D> = {
  "arduino-uno": { w: 6.86, d: 5.34, h: 1.2, pinY: 1.2 },
  breadboard: { w: 16.5, d: 5.5, h: 1.0, pinY: 1.0 },

  led: { w: 0.5, d: 0.5, h: 0.9, pinY: 0 },
  "rgb-led": { w: 0.5, d: 0.5, h: 0.9, pinY: 0 },

  resistor: { w: 1.2, d: 0.3, h: 0.3, pinY: 0.15 },
  diode: { w: 0.8, d: 0.3, h: 0.3, pinY: 0.15 },
  capacitor: { w: 0.6, d: 0.6, h: 1.1, pinY: 0 },
  "npn-transistor": { w: 0.55, d: 0.45, h: 0.55, pinY: 0 },
  "push-button": { w: 0.62, d: 0.62, h: 0.45, pinY: 0 },
  /*
   * 16 mm li potensiometr: korpus ⌀16 × 9 mm, bo'yin va o'q ustida.
   * `h` — murvat qirrasi (tanlov ramkasi shundan). `w`/`d` va `pinY`
   * ATAYLAB o'zgarmagan: ulanish nuqtalari o'sha-o'sha joyda qoladi.
   */
  potentiometer: { w: 1.6, d: 1.6, h: 2.15, pinY: 0 },
  joystick: { w: 3.4, d: 2.6, h: 3.2, pinY: 0.35 },
  "keypad-4x4": { w: 7.0, d: 7.6, h: 0.25, pinY: 0.25 },

  ldr: { w: 3.0, d: 1.5, h: 0.8, pinY: 0.8 },
  tmp36: { w: 3.0, d: 1.5, h: 0.8, pinY: 0.8 },
  "soil-moisture": { w: 6.0, d: 2.0, h: 0.5, pinY: 0.5 },
  pir: { w: 3.2, d: 2.4, h: 2.4, pinY: 0.35 },
  /*
   * HC-SR04 — haqiqiy plata 45 × 20 × 1.6 mm, o'zgartkich bankasi 12 mm.
   * `h` modelning HAQIQIY tepasi (banka qirrasi 1.37 sm) bo'yicha
   * qo'yilgan: tanlov ramkasi shu o'lchamdan quriladi, ya'ni komponent
   * atrofida bo'sh joy qolmaydi. `pinY` esa oltin oyoqning UCHI —
   * sim ko'zga ko'ringan oyoqdan chiqadi.
   */
  ultrasonic: { w: 4.5, d: 2.0, h: 1.4, pinY: 0.56 },
  dht11: { w: 2.3, d: 1.2, h: 0.7, pinY: 0.7 },

  /*
   * SG90 mikroservo: korpus 22.8 × 12.2 × 22.5 mm, qanotlari bilan
   * uzunligi 32.2 mm. Servo KICHIK — ilgari u 4 × 3.6 sm edi, ya'ni
   * Arduino bo'yicha, va sahnada masshtab hissini buzardi.
   *
   * `d` korpus chuqurligidan kengroq (2.2 sm): u kabel uchidagi
   * uyachalarni ham qamrab oladi. Katalog nisbati (0.95) shu o'lchamda
   * uyachalarni korpus oldiga, z = 0.99 ga qo'yadi.
   *
   * `h` — rul vintining tepasi; `pinY` esa uyacha markazi, ya'ni sim
   * stolga yaqin joydan chiqadi.
   */
  servo: { w: 3.3, d: 2.2, h: 2.8, pinY: 0.28 },
  /*
   * Kichik cho'tkali motor: banka ⌀25 × 32 mm, val 9 mm chiqadi.
   *
   * `d` — val uchidan klemma tilchasigacha bo'lgan TO'LIQ uzunlik (Z
   * bo'ylab), `w` esa bankaning diametri. Katalogdagi nisbatlar shu
   * o'lchamda klemmalarni orqa qopqoqdagi tilchalar markaziga —
   * (±0.55, 1.55, 1.98) ga — qo'yadi.
   */
  "dc-motor": { w: 2.5, d: 4.4, h: 2.5, pinY: 1.55 },
  l298n: { w: 4.3, d: 4.3, h: 2.7, pinY: 0.9 },

  buzzer: { w: 1.2, d: 1.2, h: 0.9, pinY: 0 },
  /*
   * LCD1602 — haqiqiy plata 80 × 36 × 1.6 mm, metall ramka plata yuzasidan
   * 5.5 mm baland. `h` shu ramkaning qirrasi bo'yicha: tanlov ramkasi shu
   * o'lchamdan quriladi, ya'ni modul atrofida bo'sh joy qolmaydi (ilgari
   * 1.2 sm edi va displey qalin g'ishtdek ko'rinardi). `pinY` esa oltin
   * oyoqning UCHI — sim ko'zga ko'ringan oyoqdan chiqadi.
   */
  lcd1602: { w: 8.0, d: 3.6, h: 0.74, pinY: 0.56 },
  /*
   * Bir kanalli rele moduli: plata 50 × 26 mm, ustida rele korpusi.
   * `h` — rele korpusining tepasi (tanlov ramkasi shundan quriladi).
   * `w`, `d` va `pinY` ATAYLAB o'zgarmagan: ulanish nuqtalari o'z
   * joyida qoladi.
   */
  relay: { w: 5.0, d: 2.6, h: 1.7, pinY: 0.4 },
  "seven-segment": { w: 1.9, d: 2.5, h: 0.8, pinY: 0 },
  "shift-register": { w: 2.0, d: 0.72, h: 0.42, pinY: 0 },

  /*
   * 9 V batareya (PP3) va unga kiygizilgan klipsa.
   *
   * Korpusning O'ZI 26.5 × 17.5 × 48.5 mm, lekin `w` kengroq (3.8 sm):
   * u klipsadan chiqqan ikkita simchaning UCHINI ham qamrab oladi.
   * Aynan shu uchlarga sim ulanadi, ya'ni katalog nisbatlari (0.046 va
   * 0.954) shu kenglikda ferrulalarning markaziga — ±1.725 sm ga —
   * tushadi. Kenglikni o'zgartirish ulanish nuqtasini ko'rinadigan
   * metalldan ajratib yuboradi.
   *
   * `h` — klipsa qirrasigacha: tanlov ramkasi shundan quriladi.
   * `pinY` esa ferrulalar yotgan balandlik, ya'ni sim stolga yaqin
   * joydan chiqadi.
   */
  battery: { w: 3.8, d: 1.75, h: 5.55, pinY: 0.15 },
  /*
   * 5V va GND bloklari — bir xil korpus, faqat qutbi boshqa.
   *
   * 34 × 28 mm korpus, ustida bitta klemma; `h` klemma shtirining uchiga
   * qadar (tanlov ramkasi shundan quriladi). `pinY` — shtirning o'rtasi,
   * ya'ni sim ko'zga ko'ringan metallga yopishadi.
   */
  "power-5v": { w: 3.4, d: 2.8, h: 1.92, pinY: 1.8 },
  ground: { w: 3.4, d: 2.8, h: 1.92, pinY: 1.8 },

  multimeter: { w: 8.0, d: 13.0, h: 2.6, pinY: 1.3 },
};

/** Katalogda bor, lekin o'lchami yozilmagan komponent uchun xavfsiz zaxira. */
const FALLBACK_SIZE: Size3D = { w: 3, d: 2, h: 1, pinY: 1 };

export function sizeOf(type: string): Size3D {
  return SIZES[type] ?? FALLBACK_SIZE;
}

/** Katalogdagi hamma komponentning 3D o'lchami borligini tekshirish uchun. */
export function hasExplicitSize(type: string): boolean {
  return type in SIZES;
}

/* ─────────────────────────── Joylashuv ─────────────────────────── */

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

/**
 * Komponentning stol ustidagi o'rni.
 *
 * 2D ish maydoni gorizontal tekislikka yotqiziladi: `x → x`, `y → z`.
 * Balandlik (Y) doim 0 — hamma narsa stol ustida turadi.
 */
export function nodePosition(node: CircuitNode): Vec3 {
  return { x: node.x / PX_PER_CM, y: 0, z: node.y / PX_PER_CM };
}

/**
 * Y o'qi atrofidagi burilish (radian).
 *
 * 2D da burilish soat yo'nalishi bo'yicha darajada saqlanadi. 3D da Y o'qi
 * yuqoriga qaragani uchun belgisi teskari — aks holda 2D da o'ngga burilgan
 * komponent 3D da chapga burilardi.
 */
export function nodeRotationY(node: CircuitNode): number {
  return (-node.rotation * Math.PI) / 180;
}

/** Stol ustidagi nuqtani 2D ish maydoni koordinatasiga qaytaradi. */
export function toWorkspaceXY(x: number, z: number): { x: number; y: number } {
  return { x: Math.round(x * PX_PER_CM), y: Math.round(z * PX_PER_CM) };
}

/* ─────────────────────────── Pinlar ─────────────────────────── */

/**
 * Pinning KOMPONENT ICHIDAGI o'rni.
 *
 * Katalogdagi `x`/`y` — 0 dan 1 gacha nisbat (chapdan o'ngga, yuqoridan
 * pastga). Ular 2D chizma uchun qo'yilgan, lekin nisbat bo'lgani uchun
 * uch o'lchamda ham to'g'ri ishlaydi: markazdan siljish sifatida o'lchamga
 * ko'paytiriladi.
 */
export function localPinPosition(type: string, pinId: string): Vec3 | null {
  const def = getDefinition(type);
  const pin = def?.pins.find((p) => p.id === pinId);
  if (!pin) return null;

  const size = sizeOf(type);
  return {
    x: (pin.x - 0.5) * size.w,
    y: size.pinY,
    z: (pin.y - 0.5) * size.d,
  };
}

/** Pinning STOL ustidagi (dunyo) o'rni — komponent burilishi hisobga olinadi. */
export function worldPinPosition(node: CircuitNode, pinId: string): Vec3 | null {
  const local = localPinPosition(node.type, pinId);
  if (!local) return null;

  const angle = nodeRotationY(node);
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const base = nodePosition(node);

  // Y o'qi atrofida aylantirish.
  return {
    x: base.x + local.x * cos + local.z * sin,
    y: base.y + local.y,
    z: base.z - local.x * sin + local.z * cos,
  };
}

/** Sxemadagi barcha pinlarning dunyo koordinatalari: `"nodeId:pinId" → nuqta`. */
export function collectPinPositions(circuit: Circuit): Map<string, Vec3> {
  const out = new Map<string, Vec3>();
  for (const node of circuit.nodes) {
    const def = getDefinition(node.type);
    if (!def) continue;
    for (const pin of def.pins) {
      if (!pin.connectable) continue;
      const at = worldPinPosition(node, pin.id);
      if (at) out.set(`${node.id}:${pin.id}`, at);
    }
  }
  return out;
}

/* ─────────────────────────── Stol ─────────────────────────── */

/**
 * ISH MAYDONI — komponentlar joylashadigan soha (sm).
 *
 * Grid, soyalar va kameraning yurish chegarasi shu bo'yicha quriladi.
 * Stolning o'zi bundan kattaroq (`DESK`), chunki haqiqiy stolda ham
 * ishlanadigan joy atrofida chekka qoladi.
 */
export const TABLE = { width: 120, depth: 80 } as const;

/**
 * Ish stolining o'lchamlari (sm).
 *
 * Haqiqiy raqamlar: 150 × 92 sm — odatdagi o'quv stoli, balandligi 74 sm.
 * Bu ATAYLAB tasodifiy emas: butun sahna santimetrda o'lchanadi va Arduino
 * (6.86 sm) stolga nisbatan qanchalik kichik ekani ko'rinib turishi kerak.
 * Ilgari stol yassi to'rtburchak edi va o'lcham hissi umuman yo'q edi.
 */
export const DESK = {
  width: 150,
  depth: 92,
  /** Qopqoq qalinligi. */
  thickness: 3.4,
  /** Poldan qopqoq ustigacha. */
  height: 74,
  /** Oyoq yon tomoni va chetdan ichkariga kirishi. */
  leg: { size: 6, inset: 7 },
  /**
   * Antistatik rezina gilamcha — komponentlar aynan shu ustida turadi.
   *
   * Uning USTKI yuzasi y = 0 da: butun laboratoriya shu tekislikni
   * "stol usti" deb biladi (`nodePosition` doim y = 0 qaytaradi).
   */
  mat: { width: TABLE.width, depth: TABLE.depth, thickness: 0.32 },
} as const;

/** Yangi komponent tashlanganda tegishadigan panjara qadami (sm). */
export const GRID_STEP = 0.5;

export function snapToGrid(value: number, enabled: boolean): number {
  return enabled ? Math.round(value / GRID_STEP) * GRID_STEP : value;
}

/**
 * Komponentni ISH MAYDONI ichida ushlab turadi.
 *
 * Sudrash paytida kursor stol chetidan chiqib ketishi mumkin va komponent
 * ergashardi: u gilamchadan tashqarida, ba'zan stol qirrasidan tashqarida
 * qolib, uni topish uchun kamerani izlab yurishga to'g'ri kelardi. Endi
 * kursor uzoqlashsa ham komponent chekkada to'xtaydi — xuddi haqiqiy
 * stolda buyumni chetiga surganingdek.
 */
export function clampToTable(x: number, z: number): { x: number; z: number } {
  const limitX = TABLE.width / 2;
  const limitZ = TABLE.depth / 2;
  return {
    x: Math.max(-limitX, Math.min(limitX, x)),
    z: Math.max(-limitZ, Math.min(limitZ, z)),
  };
}
