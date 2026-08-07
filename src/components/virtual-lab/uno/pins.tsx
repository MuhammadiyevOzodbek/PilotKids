import { memo } from "react";
import { UNO_HEADERS, UNO_PINS } from "@/lib/virtual-lab/uno-layout";
import type { BoardIds, BoardPinState } from "./types";

/**
 * Header uyalari.
 *
 * Uya — ikki qatlam: qora plastik korpus va uning ichidagi metall kontakt.
 * Ulanish nuqtasi (React Flow `Handle`i) aynan shu uyaning markaziga
 * tushadi, chunki ikkalasi ham `uno-layout` dagi bitta koordinatadan
 * oziqlanadi.
 *
 * Har bir uya alohida `memo` — D13 miltillaganda faqat o'sha bitta uya
 * qayta chiziladi, qolgan 31 tasi tegilmaydi.
 */

/** Uyaning plastik korpusi — butun blok uchun bitta. */
function PinHeaderInner({ ids }: { ids: BoardIds }) {
  return (
    <g pointerEvents="none">
      {UNO_HEADERS.map((h) => (
        <g key={h.id}>
          <rect x={h.x} y={h.y} width={h.w} height={h.h} rx="2" fill={`url(#${ids.plastic})`} />
          {/* Ichkariga tushgan soya — uyalar chuqurdek ko'rinadi. */}
          <rect
            x={h.x}
            y={h.y}
            width={h.w}
            height="2.4"
            fill="var(--board-shadow)"
            opacity="0.45"
          />
          <rect
            x={h.x}
            y={h.y + h.h - 1.2}
            width={h.w}
            height="1.2"
            fill="var(--board-pin-shell-light)"
            opacity="0.35"
          />
        </g>
      ))}
    </g>
  );
}

export const PinHeader = memo(PinHeaderInner);

/** Bitta uya. `state` — pinning hozirgi holati (rang + qo'shimcha belgi). */
function ArduinoPinInner({
  x,
  y,
  state,
  ids,
}: {
  x: number;
  y: number;
  state: BoardPinState;
  ids: BoardIds;
}) {
  return (
    <g className="vlab-socket" data-state={state} pointerEvents="none">
      {/* Korpusdagi kvadrat teshik */}
      <rect x={x - 4.4} y={y - 6} width="8.8" height="12" rx="1.3" fill="var(--board-pin-shell)" />
      <rect x={x - 3.4} y={y - 3.4} width="6.8" height="6.8" rx="1" fill="var(--board-hole)" />
      {/* Metall kontakt */}
      <rect
        x={x - 2.5}
        y={y - 2.5}
        width="5"
        height="5"
        rx="0.8"
        fill={`url(#${ids.metal})`}
        className="vlab-socket-contact"
      />
      {/* Kontakt ichidagi teshik — chuqurlik hissi */}
      <rect x={x - 1.1} y={y - 1.1} width="2.2" height="2.2" rx="0.5" fill="var(--board-hole)" />

      {/* Holat belgisi: ulangan pinda kichik nuqta, HIGH da yoritilgan halqa. */}
      {state !== "idle" && state !== "disabled" && (
        <circle className="vlab-socket-mark" cx={x} cy={y} r="6.6" />
      )}
    </g>
  );
}

export const ArduinoPin = memo(ArduinoPinInner);

/** Barcha uyalar. Chizmadagi har bir uya — ishlaydigan ulanish nuqtasi. */
function PinSocketsInner({
  ids,
  states,
}: {
  ids: BoardIds;
  states?: Record<string, BoardPinState>;
}) {
  return (
    <>
      {UNO_PINS.map((p) => (
        <ArduinoPin key={p.id} x={p.x} y={p.y} state={states?.[p.id] ?? "idle"} ids={ids} />
      ))}
    </>
  );
}

export const PinSockets = memo(PinSocketsInner);
