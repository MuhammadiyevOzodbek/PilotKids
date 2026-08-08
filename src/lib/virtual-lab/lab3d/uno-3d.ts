/**
 * PilotKids UNO platasining UCH O'LCHAMLI geometriyasi.
 *
 * Bu yerda hech qanday koordinata QO'LDA yozilmagan. Hammasi
 * `uno-layout.ts` dan olinadi — o'sha fayl 2D SVG chizmasi va katalog pin
 * nuqtalari uchun ham yagona manba. Natijada:
 *
 *     uno-layout.ts  →  SVG chizma (2D)
 *                    →  katalog pinlari (netlist, simulyator)
 *                    →  3D model (shu fayl)
 *
 * Ya'ni 3D dagi USB uyasi 2D dagi USB uyasi bilan aynan bir joyda turadi
 * va chizmada biror qism siljitilsa, uchala ko'rinish birga siljiydi.
 * Modelni "chiroyli bo'lsin" deb ko'zdan yozish mumkin emas — geometriya
 * o'lchov chizmasidan keladi.
 *
 * Bu modul SOF: three.js ham, React ham import qilmaydi. Shu sababli uni
 * `.ts` testida to'g'ridan-to'g'ri tekshirish mumkin.
 */

import {
  UNO_BOARD,
  UNO_NOTCH,
  UNO_PINS,
  UNO_PITCH,
  UNO_VIEWBOX,
  type UnoPinSpec,
} from "../uno-layout";
import { sizeOf } from "./layout";

/* ─────────────────────────── Birlik almashtirish ─────────────────────────── */

const UNO = sizeOf("arduino-uno");

/**
 * Chizma birligi → stol ustidagi santimetr.
 *
 * Formula katalogdagi `pinRatio` bilan AYNAN bir xil: avval 0–1 nisbat,
 * keyin markazdan siljish. Shu sababli chizmadagi teshik markazi bilan
 * `localPinPosition` qaytargan pin nuqtasi bir joyga tushadi — orada
 * yaxlitlash farqi ham yo'q.
 */
export function ux(vx: number): number {
  return (vx / UNO_VIEWBOX.width - 0.5) * UNO.w;
}

export function uz(vy: number): number {
  return (vy / UNO_VIEWBOX.height - 0.5) * UNO.d;
}

/** Chizmadagi kenglik (X bo'yicha uzunlik) → santimetr. */
export function uw(units: number): number {
  return (units / UNO_VIEWBOX.width) * UNO.w;
}

/** Chizmadagi balandlik (Z bo'yicha chuqurlik) → santimetr. */
export function ud(units: number): number {
  return (units / UNO_VIEWBOX.height) * UNO.d;
}

/* ─────────────────────────── Balandliklar ─────────────────────────── */

/**
 * Vertikal qatlamlar (sm).
 *
 * Ilgari plata butun balandligi bo'yicha (1.2 sm) bitta ko'k kub edi —
 * ya'ni 12 mm qalinlikdagi tekstolit. Aynan shu narsa modelni "plastik
 * o'yinchoq" qilib ko'rsatardi. Haqiqiy Uno: 1.6 mm plata + ustida
 * ~8.5 mm balandlikdagi ayol header. Ikkalasining yig'indisi baribir
 * `sizeOf().pinY` ga teng bo'lishi SHART — sim uchlari o'sha balandlikka
 * ulanadi va uni o'zgartirish 2D bilan aloqani buzardi.
 */
export const UNO_H = {
  /** Tekstolit qalinligi. */
  pcb: 0.17,
  /** Header korpusining balandligi — usti aynan pin nuqtasida tugaydi. */
  header: UNO.pinY - 0.17,
  /** Plata ustki yuzasi (silkscreen shu balandlikda). */
  surface: 0.17,
  /** Header uyasining og'zi = pin nuqtasi. */
  socket: UNO.pinY,
} as const;

/** Plata gabariti — o'lcham o'zgarsa testda darrov ko'rinsin. */
export const UNO_SIZE = { w: UNO.w, d: UNO.d, h: UNO.h } as const;

/* ─────────────────────────── Plata konturi ─────────────────────────── */

export interface Vec2 {
  x: number;
  z: number;
}

/**
 * Plata konturi — o'ng chekkasidagi o'yiq bilan (§15).
 *
 * `unoOutlinePath()` SVG yo'lini qaytaradi, lekin uni `ExtrudeGeometry`
 * ga berib bo'lmaydi. Shu sababli bu yerda o'sha kontur burchak
 * nuqtalari ro'yxati sifatida qaytariladi — ikkalasi bitta o'lchamlardan
 * (`UNO_BOARD`, `UNO_NOTCH`) quriladi, ya'ni bir-biridan uzilmaydi.
 *
 * Burchak radiusi konturga kiritilmagan: uni yumaloqlash chizuvchi
 * tomonda, ketma-ket nuqtalar orasiga egri chiziq qo'yish bilan
 * bajariladi.
 */
export function unoOutlineCorners(): Vec2[] {
  const left = ux(UNO_BOARD.x);
  const right = ux(UNO_BOARD.x + UNO_BOARD.w);
  const back = uz(UNO_BOARD.y);
  const front = uz(UNO_BOARD.y + UNO_BOARD.h);
  const inset = ux(UNO_BOARD.x + UNO_BOARD.w - UNO_NOTCH.inset);

  return [
    { x: left, z: back },
    { x: right, z: back },
    { x: right, z: uz(UNO_NOTCH.from) },
    { x: inset, z: uz(UNO_NOTCH.from) },
    { x: inset, z: uz(UNO_NOTCH.to) },
    { x: right, z: uz(UNO_NOTCH.to) },
    { x: right, z: front },
    { x: left, z: front },
  ];
}

/** Burchaklarni yumaloqlash radiusi (sm). */
export const UNO_CORNER_R = uw(7);

/* ─────────────────────────── Qismlar ─────────────────────────── */

/** Chizmadagi to'rtburchakning stol ustidagi o'rni va o'lchami. */
export interface Part3D {
  /** Markazi. */
  cx: number;
  cz: number;
  /** X va Z bo'yicha o'lchami. */
  w: number;
  d: number;
}

export function part3(rect: { x: number; y: number; w: number; h: number }): Part3D {
  return {
    cx: ux(rect.x + rect.w / 2),
    cz: uz(rect.y + rect.h / 2),
    w: uw(rect.w),
    d: ud(rect.h),
  };
}

/* ─────────────────────────── Header bloklari ─────────────────────────── */

export interface SocketSpec {
  /** Uyaning stol ustidagi markazi (X). */
  x: number;
  spec: UnoPinSpec;
}

export interface HeaderBlock {
  /** Blokning Z chizig'i. */
  z: number;
  /** Korpus markazi va uzunligi. */
  cx: number;
  w: number;
  sockets: SocketSpec[];
}

/**
 * Ayol headerlar — pinlarning O'ZIDAN yig'iladi (§6).
 *
 * `UNO_HEADERS` da tayyor to'rtburchaklar bor, lekin ular chizma uchun
 * yaxlitlangan: chekka uya korpus qirrasidan bir necha birlik narida.
 * 3D da har bir uya ustiga bosiladigan nuqta tushadi, shu sababli
 * korpus pinlardan qurilgani ishonchliroq — uya markazi bilan bosish
 * nuqtasi orasida hech qanday farq qolmaydi.
 *
 * Bloklar Z bo'yicha guruhlanadi, keyin X bo'yicha uzilish joyidan
 * bo'linadi: haqiqiy platadagi kabi D0–D7 va D8–AREF ikki alohida
 * korpus bo'lib chiqadi.
 */
export function unoHeaderBlocks(): HeaderBlock[] {
  const rows = new Map<number, UnoPinSpec[]>();
  for (const pin of UNO_PINS) {
    const list = rows.get(pin.y) ?? [];
    list.push(pin);
    rows.set(pin.y, list);
  }

  const blocks: HeaderBlock[] = [];
  const pad = uw(UNO_PITCH) * 0.5;

  for (const [vy, list] of [...rows.entries()].sort((a, b) => a[0] - b[0])) {
    const sorted = [...list].sort((a, b) => a.x - b.x);
    let group: UnoPinSpec[] = [];

    const flush = () => {
      if (group.length === 0) return;
      const xs = group.map((p) => ux(p.x));
      const min = Math.min(...xs);
      const max = Math.max(...xs);
      blocks.push({
        z: uz(vy),
        cx: (min + max) / 2,
        w: max - min + pad * 2,
        sockets: group.map((spec) => ({ x: ux(spec.x), spec })),
      });
      group = [];
    };

    for (const pin of sorted) {
      const previous = group[group.length - 1];
      // Ikki qadamdan katta tirqish — bu allaqachon boshqa korpus.
      if (previous && pin.x - previous.x > UNO_PITCH * 1.5) flush();
      group.push(pin);
    }
    flush();
  }

  return blocks;
}

/** Bitta uyaning kengligi (sm) — qadamdan biroz kichik, orasi ko'rinsin. */
export const SOCKET_W = uw(UNO_PITCH) * 0.78;

/* ─────────────────────────── ATmega328P ─────────────────────────── */

/** DIP-28 korpusining har tomonidagi oyoq soni. */
export const MCU_PINS_PER_SIDE = 14;

/**
 * Mikrokontroller oyoqlarining o'rni.
 *
 * Oyoqlar korpus chetidan tashqariga chiqadi va plataga tegadi, shuning
 * uchun ular korpusdan ALOHIDA joylashtiriladi.
 */
export function mcuLegPositions(body: Part3D): Array<{ x: number; z: number }> {
  const step = body.w / MCU_PINS_PER_SIDE;
  const first = body.cx - body.w / 2 + step / 2;
  const offset = body.d / 2 + uw(3);

  return Array.from({ length: MCU_PINS_PER_SIDE * 2 }, (_, i) => {
    const side = i < MCU_PINS_PER_SIDE ? -1 : 1;
    const index = i % MCU_PINS_PER_SIDE;
    return { x: first + index * step, z: body.cz + side * offset };
  });
}

/* ─────────────────────────── Tooltip matni ─────────────────────────── */

/**
 * Pin haqidagi qisqa ma'lumot (§17).
 *
 * Matn platadagi YOZUV (silk) va chizmadagi turdan olinadi, chunki
 * bolaning ko'rgani ham aynan shu yozuv. `getDefinition` dagi `label`
 * ham shu manbadan kelib chiqadi, ya'ni ikkalasi bir-biriga zid emas.
 */
export function unoPinHint(pinId: string): { silk: string; note: string } | null {
  const spec = UNO_PINS.find((p) => p.id === pinId);
  if (!spec) return null;

  const notes: Record<UnoPinSpec["kind"], string> = {
    digital: "Raqamli kirish/chiqish",
    pwm: "Raqamli — PWM qo'llab-quvvatlanadi",
    analog: "Analog kirish (0–1023)",
    power: "Quvvat",
    ground: "Yer (GND)",
    special: "Maxsus",
  };

  return { silk: spec.silk, note: notes[spec.kind] };
}
