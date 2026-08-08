"use client";

import { CanvasTexture, RepeatWrapping, SRGBColorSpace, type Texture } from "three";

/**
 * Stol qopqog'ining yog'och naqshi.
 *
 * ── Nega tekstura kerak ─────────────────────────────────────────────────
 * Bir tekis rangdagi katta yuza uch o'lchamli ko'rinmaydi: unda hech
 * qanday tafsilot yo'q va ko'z uni "stol" deb emas, "rangli tekislik"
 * deb o'qiydi. Yog'och tolasi esa yuzaga yo'nalish beradi va uning
 * kattaligini ko'rsatadi — Arduino stolga nisbatan qanchalik kichik
 * ekani shundan bilinadi.
 *
 * ── Nega kanvas ─────────────────────────────────────────────────────────
 * Tashqi rasm yuklanmaydi: laboratoriya internetsiz ham ishlashi kerak
 * (§33). Naqsh brauzerning o'z `canvas` ida chiziladi va takrorlanadigan
 * qilib bir marta keshlanadi.
 */

/** Bir marta chizilib, butun ilova uchun ulashiladi. */
let cached: Texture | null = null;

/**
 * Takrorlanuvchi tasodifiy son.
 *
 * `Math.random()` ATAYLAB ishlatilmagan: har ochilishda boshqa naqsh
 * chiqarardi va foydalanuvchi "stol o'zgarib ketdi" deb o'ylardi.
 * Bu esa doim bir xil, lekin tartibsiz ko'rinadigan ketma-ketlik.
 */
function seeded(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
}

export function deskTexture(): Texture | null {
  if (cached) return cached;
  if (typeof document === "undefined") return null;

  const size = 512;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;

  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  const random = seeded(20260808);

  // Asos — issiq, lekin to'yinmagan yog'och rangi. To'q sahnada ham
  // ko'zni charchatmaydi, ustidagi qora komponentlar esa ajralib turadi.
  ctx.fillStyle = "#6b533c";
  ctx.fillRect(0, 0, size, size);

  /*
   * Tolalar — deyarli gorizontal, biroz to'lqinli chiziqlar.
   * Ular yuzaga yo'nalish beradi; qalinligi va shaffofligi har xil
   * bo'lgani uchun naqsh takrorlangani sezilmaydi.
   */
  for (let i = 0; i < 220; i += 1) {
    const y = random() * size;
    const light = random() > 0.5;
    ctx.strokeStyle = light ? "#7d6349" : "#5b4531";
    ctx.globalAlpha = 0.12 + random() * 0.3;
    ctx.lineWidth = 0.6 + random() * 2.2;

    ctx.beginPath();
    ctx.moveTo(-10, y);
    // Uch bo'lakli to'lqin — to'g'ri chiziq sun'iy ko'rinardi.
    for (let x = 0; x <= size + 10; x += size / 3) {
      ctx.lineTo(x, y + (random() - 0.5) * 7);
    }
    ctx.stroke();
  }

  // Bir nechta tugun — yog'ochning tabiiy belgisi.
  ctx.globalAlpha = 0.2;
  for (let i = 0; i < 3; i += 1) {
    const cx = random() * size;
    const cy = random() * size;
    for (let ring = 1; ring <= 5; ring += 1) {
      ctx.strokeStyle = "#4c3826";
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.ellipse(cx, cy, ring * 3.5, ring * 2.1, 0.4, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  ctx.globalAlpha = 1;

  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  // Naqsh stol bo'ylab takrorlanadi — 512 piksel butun qopqoqqa cho'zilsa
  // tolalar tanilib bo'lmas darajada yoyilib ketardi.
  texture.wrapS = RepeatWrapping;
  texture.wrapT = RepeatWrapping;
  texture.repeat.set(3, 2);
  texture.anisotropy = 8;

  cached = texture;
  return texture;
}
