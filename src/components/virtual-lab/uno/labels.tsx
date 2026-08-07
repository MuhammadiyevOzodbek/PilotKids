import { memo } from "react";
import { UNO_BRANDING, UNO_GROUP_LABELS, UNO_PINS, UNO_TEXT } from "@/lib/virtual-lab/uno-layout";
import { BOARD_FONT } from "./types";

/**
 * Silkscreen — plataga oq bo'yoq bilan bosilgan yozuvlar.
 *
 * Uch daraja: pin nomlari (eng mayda) → guruh sarlavhalari → brend.
 * O'lchamlar shu tartibda o'sadi, shuning uchun ko'z avval brendni,
 * keyin bo'limni, oxirida pinni o'qiydi.
 */

/**
 * Pin yozuvining o'lchami uzunlikka qarab kichrayadi: aks holda "IOREF" va
 * "RESET" qo'shni uyaning yozuvi ustiga chiqib ketardi (qadam — 12 birlik).
 */
function pinFontSize(silk: string): number {
  if (silk.length >= 5) return 3.1;
  if (silk.length === 4) return 4;
  if (silk.length === 3) return 4.9;
  return 5.6;
}

function BoardLabelsInner() {
  return (
    <g
      fontFamily={BOARD_FONT}
      fill="var(--board-label)"
      fontWeight="700"
      pointerEvents="none"
      aria-hidden
    >
      {UNO_PINS.map((p) => (
        <text
          key={p.id}
          x={p.x}
          y={p.y < 100 ? UNO_TEXT.topPinLabelY : UNO_TEXT.bottomPinLabelY}
          textAnchor="middle"
          fontSize={pinFontSize(p.silk)}
          letterSpacing={p.silk.length >= 5 ? -0.15 : 0.1}
          opacity="0.88"
        >
          {p.silk}
        </text>
      ))}

      {UNO_GROUP_LABELS.map((g) => (
        <text
          key={g.text}
          x={g.x}
          y={g.y}
          textAnchor={g.anchor}
          fontSize="6"
          fontWeight="600"
          letterSpacing="1.1"
          opacity="0.62"
        >
          {g.text}
        </text>
      ))}
    </g>
  );
}

export const BoardLabels = memo(BoardLabelsInner);

/**
 * Markaziy brend.
 *
 * Ataylab kichik: plataning markazi bu yozuv emas, mikrokontroller. Yozuv
 * chip ustiga chiqmaydi va o'tkazgich yo'llarini yopmaydi — u shunchaki
 * bo'sh maydonga bosilgan.
 */
function BoardBrandingInner({ subtitle }: { subtitle: boolean }) {
  return (
    <g textAnchor="middle" fontFamily={BOARD_FONT} pointerEvents="none">
      <text
        x={UNO_BRANDING.x}
        y={UNO_BRANDING.titleY}
        fontSize="12"
        fontWeight="750"
        letterSpacing="0.3"
        fill="var(--board-brand)"
      >
        {UNO_BRANDING.title}
      </text>
      {subtitle && (
        <text
          x={UNO_BRANDING.x}
          y={UNO_BRANDING.subtitleY}
          fontSize="5.8"
          fontWeight="600"
          letterSpacing="2.6"
          fill="var(--board-brand)"
          opacity="0.6"
        >
          {UNO_BRANDING.subtitle}
        </text>
      )}
    </g>
  );
}

export const BoardBranding = memo(BoardBrandingInner);
