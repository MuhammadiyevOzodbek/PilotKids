import { formatOhms, resistorOhms } from "@/lib/virtual-lab/catalog";
import type { ComponentRuntimeState } from "@/lib/virtual-lab/types";
import { BatterySymbol } from "./battery";
import { ArduinoBoardSvg, type BoardDetail, type BoardPinState } from "./uno";

/**
 * Komponentlarning vizual ko'rinishi.
 *
 * Barcha SVG'lar shu loyiha uchun noldan chizilgan — hech qanday tayyor
 * dizayn ko'chirilmagan. Ular soddalashtirilgan, lekin haqiqiy detalni
 * taniydigan darajada: bola ekrandagi narsani stol ustidagisi bilan
 * bog'lay olishi kerak.
 *
 * Har bir simvol `runtime` holatini oladi — LED yorqinligi, servo burchagi
 * kabi jonli o'zgarishlar shu orqali ko'rinadi.
 */

const LED_COLORS: Record<string, { on: string; off: string; glow: string }> = {
  red: { on: "#ff4d4d", off: "#8f2a2a", glow: "#ff6b6b" },
  green: { on: "#3ddc84", off: "#2a6b45", glow: "#5cf0a0" },
  blue: { on: "#4d9dff", off: "#2a4a8f", glow: "#6bb2ff" },
  yellow: { on: "#ffd24d", off: "#8f7a2a", glow: "#ffe27a" },
};

export interface SymbolProps {
  width: number;
  height: number;
  settings: Record<string, string | number | boolean>;
  runtime?: ComponentRuntimeState;
  /**
   * Mayda yozuvlarni ko'rsatishmi. Uzoqlashtirilganda yoki kutubxonadagi
   * kichik ko'rinishda ular o'qilmaydi va faqat shovqin qo'shadi.
   */
  showDetail?: boolean;
  /**
   * Zoom darajasi. Hozircha faqat plata undan foydalanadi — qolgan
   * komponentlar shunchalik mayda emaski, uch bosqich kerak bo'lsin.
   */
  detail?: BoardDetail;
  /** Plata pinlarining ko'rinish holati (uya ostidagi belgi uchun). */
  pinStates?: Record<string, BoardPinState>;
  /** Sxemada shu komponentga tegishli xato bormi. */
  hasError?: boolean;
  /** Plataning RESET tugmasi bosilganda. */
  onReset?: () => void;
}

/* ─────────────────────────── PilotKids UNO ─────────────────────────── */

/**
 * Plata chizmasi alohida modulda (`./uno`) — u yerda o'nga yaqin bo'lak bor
 * va bu faylni sig'dirib bo'lmasdi. Bu yerda faqat simulyator holatini
 * chizmaning tiliga o'giradigan yupqa qatlam qoladi.
 */
function ArduinoUno({
  width,
  height,
  runtime,
  detail = "high",
  pinStates,
  hasError,
  onReset,
}: SymbolProps) {
  return (
    <ArduinoBoardSvg
      width={width}
      height={height}
      detail={detail}
      powered={runtime?.powered === true}
      d13High={(runtime?.pins?.D13 ?? 0) === 1}
      serialActive={runtime?.serialActive === true}
      error={hasError === true}
      pinStates={pinStates}
      onReset={onReset}
    />
  );
}

/* ─────────────────────────── LED ─────────────────────────── */

function Led({ width, height, settings, runtime }: SymbolProps) {
  const key = typeof settings.color === "string" ? settings.color : "red";
  const palette = LED_COLORS[key] ?? LED_COLORS.red!;
  const brightness = runtime?.brightness ?? 0;
  const lit = brightness > 0.02;

  return (
    <svg width={width} height={height} viewBox="0 0 60 80" aria-hidden>
      {lit && (
        <circle cx="30" cy="26" r="28" fill={palette.glow} opacity={0.18 + brightness * 0.4} />
      )}
      {/* Gumbaz */}
      <path
        d="M14 34 A16 16 0 0 1 46 34 L46 44 L14 44 Z"
        fill={lit ? palette.on : palette.off}
        opacity={lit ? 0.55 + brightness * 0.45 : 1}
      />
      <rect x="14" y="42" width="32" height="6" rx="2" fill={lit ? palette.on : palette.off} />
      {/* Yon halqa */}
      <rect x="11" y="44" width="38" height="5" rx="2.5" fill="#9aa4b2" />
      {/* Oyoqlar: uzun — anod (chap), kalta — katod (o'ng) */}
      <rect x="17" y="48" width="3" height="28" fill="#9aa4b2" />
      <rect x="40" y="48" width="3" height="22" fill="#9aa4b2" />
      {lit && <circle cx="30" cy="28" r="8" fill="#ffffff" opacity={brightness * 0.5} />}
    </svg>
  );
}

/* ─────────────────────────── Rezistor ─────────────────────────── */

/**
 * Qarshilik rang kodi — haqiqiy rezistordagi bilan bir xil.
 * Indeks = raqam: 0 qora, 1 jigarrang, 2 qizil …
 */
const BAND_COLORS = [
  "#1c1c1e",
  "#7b4a12",
  "#d64541",
  "#e07a1f",
  "#e8c33a",
  "#3f9d54",
  "#3a6fd8",
  "#8b5cf6",
  "#9aa4b2",
  "#f2f4f7",
] as const;

/**
 * Qarshilikni uchta rang halqasiga aylantiradi: birinchi raqam, ikkinchi
 * raqam va ko'paytiruvchi. Ilgari halqalar qotirilgan edi — 220 Ω ham,
 * 10 kΩ ham bir xil ko'rinardi va sozlama o'zgarganini bilib bo'lmasdi.
 */
function resistorBands(ohms: number): string[] {
  let value = Math.max(10, Math.round(ohms));
  let exponent = 0;
  while (value >= 100) {
    value = Math.round(value / 10);
    exponent += 1;
  }
  const first = Math.floor(value / 10);
  const second = value % 10;
  return [
    BAND_COLORS[first] ?? BAND_COLORS[0]!,
    BAND_COLORS[second] ?? BAND_COLORS[0]!,
    BAND_COLORS[Math.min(exponent, 9)] ?? BAND_COLORS[0]!,
  ];
}

function Resistor({ width, height, settings, showDetail = true }: SymbolProps) {
  const ohms = resistorOhms(settings);
  const bands = resistorBands(ohms);

  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 90 40"
      aria-label={`Rezistor ${formatOhms(ohms)}`}
    >
      {/* Oyoqlari */}
      <rect x="2" y="18" width="20" height="4" fill="#9aa4b2" />
      <rect x="68" y="18" width="20" height="4" fill="#9aa4b2" />
      {/* Korpus */}
      <rect x="22" y="10" width="46" height="20" rx="7" fill="#d8b98a" />
      <rect x="22" y="10" width="46" height="5" rx="4" fill="#e8cda6" opacity="0.7" />
      {/* Qiymatni bildiruvchi uchta halqa + oltin dopusk halqasi */}
      {bands.map((color, i) => (
        <rect key={i} x={29 + i * 9} y="10" width="5" height="20" fill={color} />
      ))}
      <rect x="60" y="10" width="4" height="20" fill="#d4af37" />
      {showDetail && (
        <text
          x="45"
          y="38"
          textAnchor="middle"
          fontFamily="var(--font-sans), system-ui, sans-serif"
          fontSize="9"
          fontWeight="600"
          fill="currentColor"
          opacity="0.8"
        >
          {formatOhms(ohms)}
        </text>
      )}
    </svg>
  );
}

/* ─────────────────────────── Tugma ─────────────────────────── */

function PushButton({ width, height, settings }: SymbolProps) {
  const pressed = settings.pressed === true;
  return (
    <svg width={width} height={height} viewBox="0 0 70 70" aria-hidden>
      <rect x="10" y="14" width="50" height="42" rx="5" fill="#2b3444" />
      <circle cx="35" cy="33" r={pressed ? 12 : 14} fill={pressed ? "#8f2a2a" : "#e5484d"} />
      <circle
        cx="35"
        cy={pressed ? 33 : 31}
        r={pressed ? 9 : 11}
        fill={pressed ? "#a33" : "#ff6b6b"}
      />
      {/* Oyoqlar */}
      <rect x="12" y="54" width="4" height="12" fill="#9aa4b2" />
      <rect x="54" y="54" width="4" height="12" fill="#9aa4b2" />
    </svg>
  );
}

/* ─────────────────────────── Buzzer ─────────────────────────── */

function Buzzer({ width, height, runtime }: SymbolProps) {
  const on = runtime?.buzzing === true;
  return (
    <svg width={width} height={height} viewBox="0 0 80 80" aria-hidden>
      {on && <circle cx="40" cy="34" r="34" fill="#2f6bf3" opacity="0.15" />}
      <circle cx="40" cy="34" r="26" fill="#1d2b3a" />
      <circle cx="40" cy="34" r="20" fill="#2b3444" />
      <circle cx="40" cy="34" r="5" fill="#0b1220" />
      {on && (
        <>
          <path d="M62 22 A24 24 0 0 1 62 46" stroke="#2f6bf3" strokeWidth="2.5" fill="none" />
          <path
            d="M68 16 A32 32 0 0 1 68 52"
            stroke="#2f6bf3"
            strokeWidth="2"
            fill="none"
            opacity="0.6"
          />
        </>
      )}
      <rect x="26" y="60" width="4" height="16" fill="#9aa4b2" />
      <rect x="50" y="60" width="4" height="16" fill="#9aa4b2" />
    </svg>
  );
}

/* ─────────────────────────── Potensiometr ─────────────────────────── */

function Potentiometer({ width, height, settings }: SymbolProps) {
  const value = typeof settings.value === "number" ? settings.value : 512;
  // 0–1023 → −135°…+135°
  const angle = (value / 1023) * 270 - 135;
  return (
    <svg width={width} height={height} viewBox="0 0 80 80" aria-hidden>
      <circle cx="40" cy="34" r="26" fill="#2b3444" />
      <circle cx="40" cy="34" r="20" fill="#3a4658" />
      <g transform={`rotate(${angle} 40 34)`}>
        <rect x="38" y="14" width="4" height="20" rx="2" fill="#f5f7fa" />
      </g>
      <circle cx="40" cy="34" r="4" fill="#0b1220" />
      <rect x="14" y="60" width="4" height="16" fill="#9aa4b2" />
      <rect x="38" y="60" width="4" height="16" fill="#9aa4b2" />
      <rect x="62" y="60" width="4" height="16" fill="#9aa4b2" />
    </svg>
  );
}

/* ─────────────────────────── LDR ─────────────────────────── */

function Ldr({ width, height }: SymbolProps) {
  return (
    <svg width={width} height={height} viewBox="0 0 70 70" aria-hidden>
      <circle cx="35" cy="30" r="24" fill="#e8d7a8" />
      <circle cx="35" cy="30" r="19" fill="#f2e6c4" />
      {/* Ilon izi shaklidagi sezgir yo'l */}
      <path
        d="M20 22 h30 M20 30 h30 M20 38 h30"
        stroke="#8a6d2f"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <path d="M50 22 v8 M20 30 v8" stroke="#8a6d2f" strokeWidth="3" strokeLinecap="round" />
      <rect x="18" y="52" width="4" height="16" fill="#9aa4b2" />
      <rect x="33" y="52" width="4" height="16" fill="#9aa4b2" />
      <rect x="48" y="52" width="4" height="16" fill="#9aa4b2" />
    </svg>
  );
}

/* ─────────────────────────── Servo ─────────────────────────── */

function Servo({ width, height, settings, runtime }: SymbolProps) {
  const angle = runtime?.angle ?? (typeof settings.angle === "number" ? settings.angle : 90);
  return (
    <svg width={width} height={height} viewBox="0 0 110 90" aria-hidden>
      <rect x="14" y="24" width="60" height="44" rx="4" fill="#2b3444" />
      <rect x="4" y="32" width="10" height="12" rx="2" fill="#3a4658" />
      <rect x="4" y="50" width="10" height="12" rx="2" fill="#3a4658" />
      <circle cx="74" cy="34" r="14" fill="#3a4658" />
      {/* Aylanuvchi qo'l: 0°…180° → −90°…+90° */}
      <g transform={`rotate(${angle - 90} 74 34)`}>
        <rect x="72" y="8" width="4" height="28" rx="2" fill="#f5f7fa" />
        <circle cx="74" cy="10" r="3" fill="#e5484d" />
      </g>
      <circle cx="74" cy="34" r="4" fill="#0b1220" />
      <rect x="20" y="68" width="4" height="18" fill="#9aa4b2" />
      <rect x="42" y="68" width="4" height="18" fill="#9aa4b2" />
      <rect x="64" y="68" width="4" height="18" fill="#9aa4b2" />
    </svg>
  );
}

/* ─────────────────────────── Ultrasonic ─────────────────────────── */

function Ultrasonic({ width, height }: SymbolProps) {
  return (
    <svg width={width} height={height} viewBox="0 0 120 70" aria-hidden>
      <rect x="4" y="6" width="112" height="50" rx="5" fill="#1d3a6b" />
      <circle cx="34" cy="30" r="17" fill="#2b3444" />
      <circle cx="34" cy="30" r="13" fill="#4a5a6a" />
      <circle cx="86" cy="30" r="17" fill="#2b3444" />
      <circle cx="86" cy="30" r="13" fill="#4a5a6a" />
      <rect x="52" y="20" width="16" height="20" rx="2" fill="#c8cdd4" />
      <rect x="18" y="56" width="4" height="12" fill="#9aa4b2" />
      <rect x="42" y="56" width="4" height="12" fill="#9aa4b2" />
      <rect x="70" y="56" width="4" height="12" fill="#9aa4b2" />
      <rect x="94" y="56" width="4" height="12" fill="#9aa4b2" />
    </svg>
  );
}

/* ─────────────────────────── Breadboard ─────────────────────────── */

function Breadboard({ width, height }: SymbolProps) {
  const holes = [];
  for (let row = 0; row < 6; row++) {
    for (let col = 0; col < 24; col++) {
      holes.push(
        <rect
          key={`${row}-${col}`}
          x={14 + col * 11.5}
          y={row < 3 ? 18 + row * 11 : 60 + (row - 3) * 11}
          width="4"
          height="4"
          rx="1"
          fill="#9aa4b2"
        />,
      );
    }
  }
  return (
    <svg width={width} height={height} viewBox="0 0 300 120" aria-hidden>
      <rect x="2" y="2" width="296" height="116" rx="6" fill="#eef1f6" />
      <rect x="10" y="52" width="280" height="14" fill="#dde3ec" />
      <rect x="6" y="8" width="288" height="3" fill="#e5484d" opacity="0.7" />
      <rect x="6" y="109" width="288" height="3" fill="#2f6bf3" opacity="0.7" />
      {holes}
    </svg>
  );
}

/* ─────────────────────────── Oddiy simvollar ─────────────────────────── */

function Power5V({ width, height }: SymbolProps) {
  return (
    <svg width={width} height={height} viewBox="0 0 70 50" aria-hidden>
      <rect x="4" y="4" width="62" height="34" rx="6" fill="#e5484d" />
      <text
        x="35"
        y="27"
        textAnchor="middle"
        fontFamily="system-ui, sans-serif"
        fontSize="15"
        fontWeight="800"
        fill="#fff"
      >
        5V
      </text>
      <rect x="33" y="38" width="4" height="10" fill="#9aa4b2" />
    </svg>
  );
}

/* ─────────────────────────── Batareya ─────────────────────────── */

/** Chizma alohida modulda — u yerda gradient va holatlar ko'p. */
function Battery({ width, height, settings, runtime, showDetail }: SymbolProps) {
  return (
    <BatterySymbol
      width={width}
      height={height}
      settings={settings}
      runtime={runtime}
      showDetail={showDetail}
    />
  );
}

function Ground({ width, height }: SymbolProps) {
  return (
    <svg width={width} height={height} viewBox="0 0 70 50" aria-hidden>
      <rect x="33" y="2" width="4" height="12" fill="#9aa4b2" />
      <rect x="14" y="14" width="42" height="5" rx="2" fill="#1d2b3a" />
      <rect x="21" y="24" width="28" height="5" rx="2" fill="#1d2b3a" />
      <rect x="28" y="34" width="14" height="5" rx="2" fill="#1d2b3a" />
    </svg>
  );
}

function RgbLed({ width, height, runtime }: SymbolProps) {
  const color = runtime?.color ?? "#9aa4b2";
  const brightness = runtime?.brightness ?? 0;
  return (
    <svg width={width} height={height} viewBox="0 0 70 90" aria-hidden>
      {brightness > 0 && <circle cx="35" cy="30" r="30" fill={color} opacity={brightness * 0.4} />}
      <path
        d="M18 38 A17 17 0 0 1 52 38 L52 48 L18 48 Z"
        fill={color}
        opacity={0.5 + brightness * 0.5}
      />
      <rect x="15" y="47" width="40" height="5" rx="2.5" fill="#9aa4b2" />
      {[0, 1, 2, 3].map((i) => (
        <rect key={i} x={17 + i * 12} y="52" width="3" height={i === 1 ? 32 : 24} fill="#9aa4b2" />
      ))}
    </svg>
  );
}

function Multimeter({ width, height, runtime }: SymbolProps) {
  const voltage = runtime?.voltage ?? 0;
  const display = `${voltage < 0 ? "-" : ""}${Math.abs(voltage).toFixed(2)}V`;

  return (
    <svg width={width} height={height} viewBox="0 0 110 90" aria-hidden>
      <rect x="6" y="4" width="98" height="72" rx="8" fill="#2b3444" />
      <rect x="16" y="14" width="78" height="26" rx="4" fill="#9fe8c0" />
      <text
        x="55"
        y="33"
        textAnchor="middle"
        fontFamily="ui-monospace, monospace"
        fontSize="14"
        fontWeight="700"
        fill="#14202e"
      >
        {display}
      </text>
      <circle cx="55" cy="56" r="12" fill="#3a4658" />
      <rect x="53" y="46" width="4" height="10" rx="2" fill="#f5f7fa" />
      <rect x="30" y="76" width="4" height="12" fill="#e5484d" />
      <rect x="76" y="76" width="4" height="12" fill="#1d2b3a" />
    </svg>
  );
}

/* ─────────────────────────── Tanlash ─────────────────────────── */

const SYMBOLS: Record<string, (p: SymbolProps) => React.ReactElement> = {
  "arduino-uno": ArduinoUno,
  breadboard: Breadboard,
  led: Led,
  "rgb-led": RgbLed,
  resistor: Resistor,
  "push-button": PushButton,
  buzzer: Buzzer,
  potentiometer: Potentiometer,
  ldr: Ldr,
  ultrasonic: Ultrasonic,
  servo: Servo,
  battery: Battery,
  "power-5v": Power5V,
  ground: Ground,
  multimeter: Multimeter,
};

/** Komponent turiga mos SVG. Topilmasa — oddiy quti. */
export function ComponentSymbol({ type, ...props }: SymbolProps & { type: string }) {
  const Symbol = SYMBOLS[type];
  if (!Symbol) {
    return (
      <svg width={props.width} height={props.height} aria-hidden>
        <rect
          width={props.width}
          height={props.height}
          rx="8"
          fill="var(--surface-3)"
          stroke="var(--border)"
        />
      </svg>
    );
  }
  return <Symbol {...props} />;
}
