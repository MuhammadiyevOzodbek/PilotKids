"use client";

import { CanvasTexture, RepeatWrapping, SRGBColorSpace, type Texture } from "three";

/**
 * Atrof-muhit teksturalari — osmon va o't.
 *
 * ── Nega yorug' muhit ───────────────────────────────────────────────────
 * Laboratoriya bolalar uchun. Qorong'i bo'shliqda turgan stol texnik
 * dasturga o'xshaydi va zeriktiradi — bola u yerda o'ynagisi kelmaydi.
 * Ochiq havodagi stol esa tanish va do'stona: quyosh, o't, daraxtlar.
 *
 * Rang tanlashda bitta qat'iy shart bor: ish gilamchasi va uning
 * ustidagi mayda komponentlar KO'RINIB turishi kerak. Shu sababli fon
 * yorug' va past kontrastli, ish maydoni esa quyuq — ko'z avtomatik
 * ravishda o'rtaga qaraydi.
 *
 * Hech qanday rasm tarmoqdan yuklanmaydi (§33): hammasi brauzerning
 * `canvas` ida chiziladi va bir marta keshlanadi.
 */

/**
 * Takrorlanuvchi tasodifiy son.
 *
 * `Math.random()` ATAYLAB ishlatilmagan: har ochilishda daraxtlar boshqa
 * joyda paydo bo'lardi va bola "manzara o'zgarib ketdi" deb o'ylardi.
 */
export function seeded(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
}

/* ─────────────────────────── Osmon ─────────────────────────── */

/** Ufq rangi — tuman ham, sahna foni ham shu rangda bo'lishi kerak. */
export const HORIZON = "#dff0fb";

/** Osmonning tepasi. */
const ZENITH = "#5fa8e8";

let sky: Texture | null = null;

/**
 * Osmon gumbazi uchun vertikal gradient.
 *
 * Tepasi to'q ko'k, ufqqa yaqinlashgani sari oqaradi — haqiqiy osmon
 * shunday ko'rinadi va aynan shu narsa "ochiq havo" hissini beradi.
 */
export function skyTexture(): Texture | null {
  if (sky) return sky;
  if (typeof document === "undefined") return null;

  const canvas = document.createElement("canvas");
  // Gradient faqat vertikal — eni bitta pikselgina kerak.
  canvas.width = 2;
  canvas.height = 256;

  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
  gradient.addColorStop(0, ZENITH);
  gradient.addColorStop(0.55, "#a8d4f2");
  gradient.addColorStop(0.86, HORIZON);
  gradient.addColorStop(1, HORIZON);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  sky = texture;
  return texture;
}

/* ─────────────────────────── O't ─────────────────────────── */

let grass: Texture | null = null;

/**
 * O't qoplami.
 *
 * Bir tekis yashil rang plastilinga o'xshaydi. Turli tuslardagi mayda
 * dog'lar esa yuzaga tuzilma beradi va katta tekislik bir xil bo'lib
 * ko'rinmaydi.
 */
export function grassTexture(): Texture | null {
  if (grass) return grass;
  if (typeof document === "undefined") return null;

  const size = 256;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;

  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  const random = seeded(76543219);

  ctx.fillStyle = "#6ea653";
  ctx.fillRect(0, 0, size, size);

  const tints = ["#7cb85e", "#5f9349", "#84c268", "#568a42"];
  for (let i = 0; i < 900; i += 1) {
    ctx.fillStyle = tints[Math.floor(random() * tints.length)]!;
    ctx.globalAlpha = 0.25 + random() * 0.4;
    const x = random() * size;
    const y = random() * size;
    // Cho'zinchoq dog'lar — o't tolasiga o'xshaydi.
    ctx.fillRect(x, y, 1 + random() * 2, 3 + random() * 5);
  }

  ctx.globalAlpha = 1;

  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.wrapS = RepeatWrapping;
  texture.wrapT = RepeatWrapping;
  // Bitta plitka ~4 m: yaqindan tolalar ko'rinadi, uzoqdan takrorlanishi
  // sezilmaydi.
  texture.repeat.set(30, 30);
  texture.anisotropy = 8;

  grass = texture;
  return texture;
}

/* ─────────────────────────── Daraxtlar ─────────────────────────── */

export interface TreeSpot {
  x: number;
  z: number;
  /** Bo'y — daraxtlar bir xil bo'lmasin. */
  scale: number;
}

/**
 * Daraxtlarning o'rni — stol atrofidagi halqada.
 *
 * Ular ish maydonidan UZOQDA turadi (`minRadius`): stol ustidagi ishga
 * xalaqit bermasligi va kamera yurganda yo'lni to'smasligi kerak.
 * Joylashuv urug'langan tasodifdan — har ochilishda bir xil manzara.
 */
export function treeSpots(count = 22, minRadius = 130, maxRadius = 230): TreeSpot[] {
  const random = seeded(13572468);
  const spots: TreeSpot[] = [];

  for (let i = 0; i < count; i += 1) {
    /*
     * Burchak teng bo'linadi, keyin biroz siljitiladi. Sof tasodif
     * bo'lsa daraxtlar bir joyga to'planib, boshqa tomon bo'sh qolardi.
     */
    const angle = ((i + random() * 0.7) / count) * Math.PI * 2;
    const radius = minRadius + random() * (maxRadius - minRadius);
    spots.push({
      x: Math.cos(angle) * radius,
      z: Math.sin(angle) * radius,
      scale: 0.75 + random() * 0.7,
    });
  }

  return spots;
}
