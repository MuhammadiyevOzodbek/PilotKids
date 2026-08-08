"use client";

import { CanvasTexture, SRGBColorSpace, type Texture } from "three";
import {
  UNO_BRANDING,
  UNO_GROUP_LABELS,
  UNO_ICSP,
  UNO_LEDS,
  UNO_PADS,
  UNO_PINS,
  UNO_TEXT,
  UNO_TRACES,
  UNO_VIAS,
  UNO_VIEWBOX,
  unoOutlinePath,
} from "@/lib/virtual-lab/uno-layout";

/**
 * Plata yuzasidagi bosma qatlam — silkscreen (§7, §8, §14).
 *
 * ── Nega tekstura, `<Text>` emas ────────────────────────────────────────
 * drei'ning `<Text>` komponenti troika orqali shrift faylini TARMOQDAN
 * yuklaydi (fonts.gstatic.com). Laboratoriya esa internetsiz ham
 * ishlashi kerak, shu sababli bu yerda hech qanday tashqi resurs yo'q:
 * butun qatlam brauzerning o'z `canvas` i bilan chiziladi.
 *
 * Bundan tashqari bu ANCHA arzon. Har bir yozuv alohida mesh bo'lsa
 * plataning o'zi ellikdan ortiq chizish chaqiruvi bo'lardi (§20).
 * Bu yerda esa hamma yozuv, kontur va o'tkazgich yo'llari BITTA
 * teksturaga tushadi — ya'ni bitta qo'shimcha yuzа.
 *
 * ── Nega koordinatalar to'g'ri tushadi ──────────────────────────────────
 * Kanvas aynan `viewBox` o'lchamida (faqat kattalashtirilgan) chiziladi,
 * so'ng plata ustiga 0–1 UV bilan yopishtiriladi. Shu sababli 2D SVG
 * dagi yozuv qayerda bo'lsa, 3D da ham o'sha yerda: ikkalasi
 * `uno-layout.ts` dagi bir xil raqamlardan foydalanadi.
 */

/**
 * Kanvas chizma birligiga nisbatan necha marta katta.
 *
 * 3 — kichik yozuvlar (9 birlik) 27 pikselga to'g'ri keladi va kamera
 * yaqinlashganda ham to'kilmaydi. 4 ga oshirish teksturani ikki barobar
 * og'irlashtiradi, ko'z esa farqni ilg'amaydi.
 */
const SCALE = 3;

/** Bosma bo'yoq rangi — sof oq emas, biroz kulrang (haqiqiy silkscreen shunday). */
const INK = "#e8eef7";

let cached: Texture | null = null;

/**
 * Silkscreen teksturasi.
 *
 * Butun ilova uchun BITTA nusxa: plata sahnaga necha marta qo'yilsa ham
 * qatlam o'zgarmaydi, shuning uchun uni har safar qayta chizish faqat
 * xotira sarflardi.
 */
export function unoSilkscreenTexture(): Texture | null {
  if (cached) return cached;
  if (typeof document === "undefined") return null;

  const canvas = document.createElement("canvas");
  canvas.width = UNO_VIEWBOX.width * SCALE;
  canvas.height = UNO_VIEWBOX.height * SCALE;

  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  ctx.scale(SCALE, SCALE);
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  drawTraces(ctx);
  drawOutline(ctx);
  drawPinLabels(ctx);
  drawGroupLabels(ctx);
  drawBranding(ctx);
  drawPartLabels(ctx);

  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  // Kamera burchak ostida qaraganda yozuv yoyilib ketmasin.
  texture.anisotropy = 8;
  cached = texture;
  return texture;
}

/* ─────────────────────────── Qatlamlar ─────────────────────────── */

/**
 * O'tkazgich yo'llari, via va maydonchalar.
 *
 * Bular silkscreen emas, mis qatlam — shuning uchun boshqa rangda va
 * yozuvlardan OLDIN chiziladi: yozuv ular ustida turadi.
 */
function drawTraces(ctx: CanvasRenderingContext2D) {
  ctx.save();
  ctx.globalAlpha = 0.5;
  ctx.strokeStyle = "#2b78c2";
  ctx.lineWidth = 1.6;
  for (const path of UNO_TRACES) ctx.stroke(new Path2D(path));

  ctx.globalAlpha = 0.75;
  ctx.fillStyle = "#c9a24a";
  for (const via of UNO_VIAS) {
    ctx.beginPath();
    ctx.arc(via.x, via.y, 1.7, 0, Math.PI * 2);
    ctx.fill();
  }
  for (const pad of UNO_PADS) {
    ctx.fillRect(pad.x - 2.5, pad.y - 1.8, 5, 3.6);
  }
  ctx.restore();
}

/** Plata konturi — 2D chizmadagi bilan bitta yo'ldan. */
function drawOutline(ctx: CanvasRenderingContext2D) {
  ctx.save();
  ctx.globalAlpha = 0.42;
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1.4;
  ctx.stroke(new Path2D(unoOutlinePath()));
  ctx.restore();
}

/** Har bir uya ustidagi raqam: 13, ~11, A0, 5V … */
function drawPinLabels(ctx: CanvasRenderingContext2D) {
  ctx.save();
  ctx.fillStyle = INK;
  ctx.font = "bold 8px system-ui, sans-serif";

  for (const pin of UNO_PINS) {
    const top = pin.y < UNO_VIEWBOX.height / 2;
    const y = top ? UNO_TEXT.topPinLabelY : UNO_TEXT.bottomPinLabelY;

    /*
     * Uzun yozuvlar (IOREF, RESET, AREF) qadamга sig'maydi va qo'shni
     * yozuvga urilardi. Ular tik holatda yoziladi — haqiqiy platada ham
     * shunday.
     */
    if (pin.silk.length > 3) {
      ctx.save();
      ctx.translate(pin.x, y + (top ? 6 : -6));
      ctx.rotate(-Math.PI / 2);
      ctx.font = "bold 6.5px system-ui, sans-serif";
      ctx.fillText(pin.silk, 0, 0);
      ctx.restore();
      continue;
    }

    ctx.fillText(pin.silk, pin.x, y);
  }
  ctx.restore();
}

/** DIGITAL (PWM ~), POWER, ANALOG IN. */
function drawGroupLabels(ctx: CanvasRenderingContext2D) {
  ctx.save();
  ctx.fillStyle = INK;
  ctx.font = "bold 11px system-ui, sans-serif";
  for (const label of UNO_GROUP_LABELS) {
    ctx.textAlign = label.anchor === "middle" ? "center" : "left";
    ctx.fillText(label.text, label.x, label.y);
  }
  ctx.restore();
}

/**
 * Markaziy yozuv.
 *
 * Arduino'ning brendi va logotipi ATAYLAB ko'chirilmagan (§8): plata
 * PilotKids'niki va shunday deb yozilgan.
 */
function drawBranding(ctx: CanvasRenderingContext2D) {
  ctx.save();
  ctx.fillStyle = INK;
  ctx.textAlign = "center";

  ctx.font = "bold 17px system-ui, sans-serif";
  ctx.fillText(UNO_BRANDING.title, UNO_BRANDING.x, UNO_BRANDING.titleY);

  ctx.globalAlpha = 0.7;
  ctx.font = "9px system-ui, sans-serif";
  // Harflar orasini kengaytirish: `letterSpacing` hamma brauzerda yo'q,
  // shuning uchun harflar qo'lda joylashtiriladi.
  spacedText(ctx, UNO_BRANDING.subtitle, UNO_BRANDING.x, UNO_BRANDING.subtitleY, 2);
  ctx.restore();
}

/** Harflar orasi kengaytirilgan yozuv (markazga tekislangan). */
function spacedText(
  ctx: CanvasRenderingContext2D,
  text: string,
  cx: number,
  y: number,
  gap: number,
) {
  const letters = [...text];
  const widths = letters.map((letter) => ctx.measureText(letter).width);
  const total = widths.reduce((sum, width) => sum + width, 0) + gap * (letters.length - 1);

  ctx.save();
  ctx.textAlign = "left";
  let x = cx - total / 2;
  letters.forEach((letter, i) => {
    ctx.fillText(letter, x, y);
    x += (widths[i] ?? 0) + gap;
  });
  ctx.restore();
}

/** Indikator va ICSP yozuvlari — qism qayerdaligini aytadi. */
function drawPartLabels(ctx: CanvasRenderingContext2D) {
  ctx.save();
  ctx.fillStyle = INK;
  ctx.textAlign = "center";

  ctx.font = "bold 7px system-ui, sans-serif";
  for (const led of UNO_LEDS) ctx.fillText(led.label, led.x, led.y - 9);

  ctx.globalAlpha = 0.65;
  ctx.font = "6px system-ui, sans-serif";
  for (const icsp of UNO_ICSP) {
    ctx.fillText(icsp.label, icsp.x + icsp.w / 2, icsp.y - 5);
  }
  ctx.restore();
}
