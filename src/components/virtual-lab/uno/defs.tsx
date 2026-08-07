import { memo } from "react";
import { unoOutlinePath } from "@/lib/virtual-lab/uno-layout";
import type { BoardIds } from "./types";

/**
 * Chizmaning gradient va filtrlari.
 *
 * Hamma rang `--board-*` CSS o'zgaruvchilaridan olinadi (`virtual-lab.css`),
 * shuning uchun kunduzgi va tungi mavzuda plata boshqacha ko'rinadi, lekin
 * chizmada birorta hex qotirilmagan.
 *
 * Bu blok holatga bog'liq emas — `memo` uni har render'da qayta yaratmaydi.
 */
function BoardDefsInner({ ids }: { ids: BoardIds }) {
  return (
    <defs>
      {/* Tekstolit: yuqoridan pastga yengil qorayadi. */}
      <linearGradient id={ids.pcb} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="var(--board-pcb-light)" />
        <stop offset="52%" stopColor="var(--board-pcb)" />
        <stop offset="100%" stopColor="var(--board-pcb-dark)" />
      </linearGradient>

      {/* Solder mask ustidagi ichki soya — plata "qalin" ko'rinadi. */}
      <radialGradient id={ids.pcbShade} cx="0.5" cy="0.42" r="0.78">
        <stop offset="0%" stopColor="#000" stopOpacity="0" />
        <stop offset="100%" stopColor="#000" stopOpacity="0.28" />
      </radialGradient>

      <linearGradient id={ids.metal} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="var(--board-metal-light)" />
        <stop offset="45%" stopColor="var(--board-metal)" />
        <stop offset="100%" stopColor="var(--board-metal-dark)" />
      </linearGradient>

      <linearGradient id={ids.metalDark} x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="var(--board-metal)" />
        <stop offset="100%" stopColor="var(--board-metal-dark)" />
      </linearGradient>

      <linearGradient id={ids.chip} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="var(--board-chip-light)" />
        <stop offset="100%" stopColor="var(--board-chip)" />
      </linearGradient>

      <linearGradient id={ids.plastic} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="var(--board-pin-shell-light)" />
        <stop offset="100%" stopColor="var(--board-pin-shell)" />
      </linearGradient>

      {/*
       * Yengil soya — plata stol ustida yotgandek. `stdDeviation` ataylab
       * kichik: og'ir blur ko'p node bo'lganda kadrni cho'zib yuboradi.
       */}
      <filter id={ids.depth} x="-8%" y="-8%" width="118%" height="122%">
        <feDropShadow
          dx="0"
          dy="2.5"
          stdDeviation="2.6"
          floodColor="var(--board-shadow)"
          floodOpacity="0.45"
        />
      </filter>

      {/*
       * Trace'lar va ichki soya plata konturidan tashqariga chiqmasin.
       * Bitta kontur ikkala joyda ishlatiladi — kesim aniq mos tushadi.
       */}
      <clipPath id={ids.clip}>
        <path d={unoOutlinePath()} />
      </clipPath>
    </defs>
  );
}

export const BoardDefs = memo(BoardDefsInner);
