"use client";

import { CanvasTexture, SRGBColorSpace, type Texture } from "three";

/**
 * Korpus ustidagi lazer yozuv uchun kichik tekstura (§4, §5).
 *
 * Mikrosxema ustidagi "ATMEGA328P" kabi yozuvlar geometriya bilan
 * chizilmaydi: bitta harf ham o'nlab uchburchak degani va yozuvlar
 * modelni ikki barobar og'irlashtirardi (§20). Bu yerda esa yozuv
 * kichik kanvasga chiziladi va korpusning ustki yuziga yopishtiriladi.
 *
 * Tarmoqdan hech narsa yuklanmaydi — tizim shrifti ishlatiladi.
 */

const cache = new Map<string, Texture | null>();

export interface ChipLabelOptions {
  /** Yozuv qatorlari — birinchisi kattaroq. */
  lines: string[];
  /** Yozuv rangi. */
  color?: string;
  /** Kanvasning eni/bo'yi nisbati — korpus nisbatiga mos bo'lishi kerak. */
  aspect?: number;
}

/**
 * Yozuvli tekstura (shaffof fon).
 *
 * Natija kalit bo'yicha keshlanadi: sahnada o'nta Arduino bo'lsa ham
 * "ATMEGA328P" yozuvi bir marta chiziladi.
 */
export function chipLabelTexture({
  lines,
  color = "#c8ccd4",
  aspect = 4,
}: ChipLabelOptions): Texture | null {
  const key = `${lines.join("|")}|${color}|${aspect}`;
  const cached = cache.get(key);
  if (cached !== undefined) return cached;

  if (typeof document === "undefined") return null;

  const height = 128;
  const width = Math.round(height * aspect);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    cache.set(key, null);
    return null;
  }

  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = color;

  const step = height / (lines.length + 1);
  lines.forEach((line, i) => {
    // Birinchi qator asosiy nom — kattaroq va qalinroq.
    const size = i === 0 ? height * 0.34 : height * 0.2;
    ctx.font = `${i === 0 ? "bold " : ""}${size}px system-ui, sans-serif`;
    ctx.globalAlpha = i === 0 ? 0.95 : 0.6;
    ctx.fillText(line, width / 2, step * (i + 1));
  });

  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.anisotropy = 4;
  cache.set(key, texture);
  return texture;
}
