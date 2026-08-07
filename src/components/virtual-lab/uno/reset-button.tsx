import { memo, useCallback, useState } from "react";
import { UNO_PARTS } from "@/lib/virtual-lab/uno-layout";
import { BOARD_FONT, atLeastMid, type BoardDetail, type BoardIds } from "./types";

/**
 * Plataning RESET tugmasi — chizmadagi yagona bosiladigan qism.
 *
 * Chizma SVG'si `pointer-events: none` bilan o'chirilgan (aks holda sim
 * tortish ishlamasdi), shuning uchun tugma o'zi uchun uni qayta yoqadi.
 * `nodrag`/`nopan` klasslari React Flow'ga "bu bosishni menga qoldirma"
 * deydi — bosganda plata joyidan siljib ketmaydi.
 *
 * Klaviatura: Tab bilan fokus, Enter yoki bo'sh joy bilan bosish.
 */
function ResetButtonInner({
  ids,
  detail,
  onReset,
}: {
  ids: BoardIds;
  detail: BoardDetail;
  onReset?: () => void;
}) {
  const [pressed, setPressed] = useState(false);
  const { x, y, w, h } = UNO_PARTS.reset;
  const cx = x + w / 2;
  const cy = y + h / 2 - 1;

  const fire = useCallback(() => {
    setPressed(true);
    window.setTimeout(() => setPressed(false), 180);
    onReset?.();
  }, [onReset]);

  return (
    <g
      className="vlab-reset nodrag nopan"
      data-pressed={pressed ? "true" : undefined}
      role="button"
      tabIndex={0}
      aria-label="Platani qayta ishga tushirish (RESET)"
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => {
        e.stopPropagation();
        fire();
      }}
      onKeyDown={(e) => {
        if (e.key !== "Enter" && e.key !== " ") return;
        e.preventDefault();
        e.stopPropagation();
        fire();
      }}
    >
      <title>RESET — dasturni boshidan ishga tushiradi</title>

      {/* Kengaytirilgan bosish maydoni: ko'rinadigan tugmadan kattaroq. */}
      <rect x={x - 4} y={y - 4} width={w + 8} height={h + 8} fill="transparent" />

      {/* Metall korpus */}
      <rect x={x} y={y} width={w} height={h} rx="2.5" fill={`url(#${ids.metal})`} />
      <rect
        x={x}
        y={y}
        width={w}
        height={h}
        rx="2.5"
        fill="none"
        stroke="var(--board-metal-dark)"
        strokeWidth="0.8"
        opacity="0.8"
      />
      <rect
        x={x + 2}
        y={y + 1.2}
        width={w - 4}
        height="1.4"
        rx="0.7"
        fill="var(--board-metal-light)"
        opacity="0.9"
      />

      {/* Bosiladigan qalpoqcha */}
      <circle className="vlab-reset-shadow" cx={cx} cy={cy + 1.5} r="7" />
      <circle className="vlab-reset-cap" cx={cx} cy={cy} r="6.4" />
      <circle className="vlab-reset-gloss" cx={cx} cy={cy - 1.4} r="4.4" />

      {atLeastMid(detail) && (
        <text
          x={cx}
          y={y + h + 7}
          textAnchor="middle"
          fontFamily={BOARD_FONT}
          fontSize="5"
          fontWeight="700"
          letterSpacing="0.5"
          fill="var(--board-label)"
          opacity="0.7"
        >
          RESET
        </text>
      )}
    </g>
  );
}

export const ResetButton = memo(ResetButtonInner);
