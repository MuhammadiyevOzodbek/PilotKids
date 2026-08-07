import { memo } from "react";
import {
  UNO_BOARD,
  UNO_MOUNTS,
  UNO_PADS,
  UNO_TRACES,
  UNO_VIAS,
  unoOutlinePath,
} from "@/lib/virtual-lab/uno-layout";
import { isHigh, type BoardDetail, type BoardIds } from "./types";

/**
 * Tekstolit (PCB) va uning ustidagi "bosilgan" qatlamlar.
 *
 * Uch qatlam: korpus → o'tkazgich yo'llari → qirradagi yorug'lik.
 * Hech biri holatga bog'liq emas, shuning uchun hammasi `memo` — plata
 * sekundiga o'nlab marta yangilansa ham bu qismlar qayta chizilmaydi.
 */

/** Plata korpusi: gradient, ichki soya va nozik tashqi qirra. */
function BoardBodyInner({ ids }: { ids: BoardIds }) {
  const outline = unoOutlinePath();

  return (
    <>
      <g filter={`url(#${ids.depth})`}>
        <path d={outline} fill={`url(#${ids.pcb})`} />
      </g>

      {/* Solder mask ustidagi ichki soya — chekkalar sal to'qroq. */}
      <path d={outline} fill={`url(#${ids.pcbShade})`} pointerEvents="none" />

      {/* Tashqi qirra: pastda soya, yuqorida yorug'lik → 2.5D chuqurlik. */}
      <path
        d={outline}
        fill="none"
        stroke="var(--board-edge)"
        strokeWidth="1"
        opacity="0.7"
        pointerEvents="none"
      />
      <path
        d={`M${UNO_BOARD.x + 8},${UNO_BOARD.y + 1.4} H${UNO_BOARD.x + UNO_BOARD.w - 8}`}
        stroke="var(--board-highlight)"
        strokeWidth="1.4"
        strokeLinecap="round"
        opacity="0.5"
        pointerEvents="none"
      />
    </>
  );
}

export const BoardBody = memo(BoardBodyInner);

/**
 * O'tkazgich yo'llari, via'lar va sinov maydonchalari.
 *
 * Yo'llar ataylab faqat bo'sh yo'laklardan o'tadi — hech qanday silkscreen
 * yozuvi ostidan chiqmaydi. `clipPath` esa ularni plata konturi ichida
 * ushlab turadi.
 */
function BoardTracesInner({ ids, detail }: { ids: BoardIds; detail: BoardDetail }) {
  const fine = isHigh(detail);

  return (
    <g clipPath={`url(#${ids.clip})`} pointerEvents="none">
      <g
        stroke="var(--board-trace)"
        strokeWidth="1.1"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
        opacity="0.5"
      >
        {UNO_TRACES.map((d) => (
          <path key={d} d={d} />
        ))}
      </g>

      {fine && (
        <>
          <g fill="var(--board-trace)" opacity="0.55">
            {UNO_VIAS.map((v) => (
              <circle key={`${v.x}-${v.y}`} cx={v.x} cy={v.y} r="1.8" />
            ))}
          </g>
          <g fill="var(--board-pad)" opacity="0.75">
            {UNO_PADS.map((p) => (
              <rect
                key={`${p.x}-${p.y}`}
                x={p.x - 3}
                y={p.y - 1.6}
                width="6"
                height="3.2"
                rx="0.8"
              />
            ))}
          </g>
        </>
      )}
    </g>
  );
}

export const BoardTraces = memo(BoardTracesInner);

/**
 * Mahkamlash teshigi: metall halqa + qoramtir teshik.
 *
 * Ulanish nuqtasi emas — `pointerEvents` o'chirilgan, shunda bola uni pin
 * deb o'ylab sim tortmaydi.
 */
function MountingHoleInner({ x, y, ids }: { x: number; y: number; ids: BoardIds }) {
  return (
    <g pointerEvents="none">
      <circle cx={x} cy={y} r="6" fill="var(--board-pcb-dark)" />
      <circle cx={x} cy={y} r="5" fill={`url(#${ids.metal})`} />
      <circle
        cx={x}
        cy={y}
        r="4.9"
        fill="none"
        stroke="var(--board-shadow)"
        strokeWidth="0.5"
        opacity="0.5"
      />
      <circle cx={x} cy={y} r="2.6" fill="var(--board-hole)" />
    </g>
  );
}

export const MountingHole = memo(MountingHoleInner);

/** To'rttala teshik — chizmada bitta chaqiruv bilan. */
function MountingHolesInner({ ids }: { ids: BoardIds }) {
  return (
    <>
      {UNO_MOUNTS.map((m) => (
        <MountingHole key={`${m.x}-${m.y}`} x={m.x} y={m.y} ids={ids} />
      ))}
    </>
  );
}

export const MountingHoles = memo(MountingHolesInner);
