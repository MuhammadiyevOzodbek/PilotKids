import {
  BB_CHANNEL,
  BB_COLUMNS,
  BB_PITCH,
  BB_ROWS,
  BB_ROW_LABELS,
  BB_VIEWBOX,
  BB_Y,
  bbColumnX,
  breadboardHoles,
} from "@/lib/virtual-lab/breadboard-layout";

/**
 * Breadboard chizmasi.
 *
 * Teshiklar `breadboard-layout` dan olinadi — pinlar ham o'sha yerdan,
 * shuning uchun sim doim ko'rinib turgan teshikka tushadi.
 *
 * Chizmada elektr qoidasi ko'rinib turishi kerak: ustunlar ichidagi
 * bog'lanishni nozik yo'lak, relslarni esa uzun chiziq bildiradi. Bola
 * "nega bu ikki teshik ulangan?" degan savolga ekranga qarab javob topadi.
 */

export interface BreadboardSymbolProps {
  width: number;
  height: number;
  /** Mayda yozuvlar (ustun raqamlari, qator harflari) ko'rinsinmi. */
  showDetail?: boolean;
}

const LAST_X = bbColumnX(BB_COLUMNS - 1);

/** Ustun raqamlari haqiqiy breadboarddagidek beshtadan belgilanadi. */
const NUMBERED = Array.from({ length: BB_COLUMNS }, (_, i) => i + 1).filter(
  (n) => n === 1 || n % 5 === 0,
);

function Rail({ y, tone, sign }: { y: number; tone: "plus" | "minus"; sign: "+" | "−" }) {
  const color = tone === "plus" ? "var(--bb-rail-plus)" : "var(--bb-rail-minus)";
  return (
    <g>
      <rect x={16} y={y - 1} width={BB_VIEWBOX.width - 32} height={2} fill={color} opacity="0.55" />
      <text
        x={12}
        y={y + 4}
        textAnchor="middle"
        fontSize="12"
        fontWeight="800"
        fill={color}
        fontFamily="var(--font-sans), system-ui, sans-serif"
      >
        {sign}
      </text>
      <text
        x={BB_VIEWBOX.width - 12}
        y={y + 4}
        textAnchor="middle"
        fontSize="12"
        fontWeight="800"
        fill={color}
        fontFamily="var(--font-sans), system-ui, sans-serif"
      >
        {sign}
      </text>
    </g>
  );
}

export function BreadboardSymbol({ width, height, showDetail = true }: BreadboardSymbolProps) {
  const holes = breadboardHoles();
  const stripHeight = (BB_ROWS - 1) * BB_PITCH;

  return (
    <svg
      className="vlab-breadboard"
      width={width}
      height={height}
      viewBox={`0 0 ${BB_VIEWBOX.width} ${BB_VIEWBOX.height}`}
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label="Breadboard: ustundagi besh teshik o'zaro ulangan, relslar butun uzunligi bo'ylab"
    >
      {/* Korpus */}
      <rect
        x="1"
        y="1"
        width={BB_VIEWBOX.width - 2}
        height={BB_VIEWBOX.height - 2}
        rx="10"
        fill="var(--bb-body)"
        stroke="var(--bb-edge)"
        strokeWidth="1.5"
      />

      {/* Quvvat relslari */}
      <Rail y={BB_Y.railTopPlus} tone="plus" sign="+" />
      <Rail y={BB_Y.railTopMinus} tone="minus" sign="−" />
      <Rail y={BB_Y.railBottomMinus} tone="minus" sign="−" />
      <Rail y={BB_Y.railBottomPlus} tone="plus" sign="+" />

      {/*
       * Ustunlar ichidagi bog'lanish: har bir ustun ostidagi yengil yo'lak
       * beshta teshikning bir tugun ekanini ko'rsatadi.
       */}
      {Array.from({ length: BB_COLUMNS }, (_, i) => (
        <g key={`strip-${i}`} fill="var(--bb-strip)">
          <rect
            x={bbColumnX(i) - 5}
            y={BB_Y.topRow0 - 6}
            width="10"
            height={stripHeight + 12}
            rx="5"
          />
          <rect
            x={bbColumnX(i) - 5}
            y={BB_Y.bottomRow0 - 6}
            width="10"
            height={stripHeight + 12}
            rx="5"
          />
        </g>
      ))}

      {/* O'rtadagi kanal */}
      <rect
        x="10"
        y={BB_CHANNEL.y}
        width={BB_VIEWBOX.width - 20}
        height={BB_CHANNEL.height}
        rx="3"
        fill="var(--bb-channel)"
      />

      {/* Teshiklar */}
      {holes.map((hole) => (
        <rect
          key={hole.id}
          x={hole.x - 3}
          y={hole.y - 3}
          width="6"
          height="6"
          rx="1.5"
          fill="var(--bb-hole)"
        />
      ))}

      {showDetail && (
        <g
          fill="var(--bb-label)"
          fontFamily="var(--font-sans), system-ui, sans-serif"
          fontSize="9"
          fontWeight="600"
          textAnchor="middle"
        >
          {/* Ustun raqamlari — kanal ichida, haqiqiy taxtadagidek */}
          {NUMBERED.map((n) => (
            <text key={`n-${n}`} x={bbColumnX(n - 1)} y={BB_CHANNEL.y + 14}>
              {n}
            </text>
          ))}
          {/* Qator harflari ikkala chetda */}
          {BB_ROW_LABELS.top.map((letter, i) => (
            <g key={`t-${letter}`}>
              <text x={16} y={BB_Y.topRow0 + i * BB_PITCH + 3}>
                {letter}
              </text>
              <text x={LAST_X + 16} y={BB_Y.topRow0 + i * BB_PITCH + 3}>
                {letter}
              </text>
            </g>
          ))}
          {BB_ROW_LABELS.bottom.map((letter, i) => (
            <g key={`b-${letter}`}>
              <text x={16} y={BB_Y.bottomRow0 + i * BB_PITCH + 3}>
                {letter}
              </text>
              <text x={LAST_X + 16} y={BB_Y.bottomRow0 + i * BB_PITCH + 3}>
                {letter}
              </text>
            </g>
          ))}
        </g>
      )}
    </svg>
  );
}
