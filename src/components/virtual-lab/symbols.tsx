import { formatOhms, resistorOhms } from "@/lib/virtual-lab/catalog";
import type { ComponentRuntimeState } from "@/lib/virtual-lab/types";
import { BatterySymbol } from "./battery";
import {
  CapacitorSymbol,
  DiodeSymbol,
  JoystickSymbol,
  KeypadSymbol,
  L298nSymbol,
  NpnTransistorSymbol,
  SevenSegmentSymbol,
  ShiftRegisterSymbol,
} from "./symbols-modules";
import { BreadboardSymbol } from "./breadboard";
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
  /**
   * Chizma ichidan sozlamani o'zgartirish.
   *
   * Klaviatura tugmalari uchun kerak: bola tugmani sichqoncha bilan bosib
   * turgan paytda kontakt yopiq bo'lishi kerak, ya'ni holat inspektordan
   * emas, chizmaning o'zidan keladi.
   */
  onSetting?: (key: string, value: string | number | boolean) => void;
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

/* ─────────────────────────── TMP36 harorat ─────────────────────────── */

function Tmp36({ width, height, settings, showDetail = true }: SymbolProps) {
  const t = typeof settings.temperature === "number" ? settings.temperature : 25;
  return (
    <svg width={width} height={height} viewBox="0 0 70 70" aria-hidden>
      {/* TO-92 korpus: yassi old tomonli qora yarim-doira */}
      <path d="M18 46 L18 26 A17 17 0 0 1 52 26 L52 46 Z" fill="#1c1c1e" />
      <rect x="18" y="24" width="34" height="4" fill="#2b3444" />
      {/* Oyoqlar */}
      <rect x="22" y="46" width="3" height="16" fill="#9aa4b2" />
      <rect x="33" y="46" width="3" height="18" fill="#9aa4b2" />
      <rect x="45" y="46" width="3" height="16" fill="#9aa4b2" />
      {showDetail && (
        <text
          x="35"
          y="40"
          textAnchor="middle"
          fontFamily="ui-monospace, monospace"
          fontSize="11"
          fontWeight="700"
          fill="#e8c33a"
        >
          {Math.round(t)}°
        </text>
      )}
    </svg>
  );
}

/* ─────────────────────────── Tuproq namligi ─────────────────────────── */

function SoilMoisture({ width, height, settings }: SymbolProps) {
  const pct = typeof settings.moisture === "number" ? settings.moisture : 0;
  // Namlik ortgan sari pronglar ko'kroq.
  const wet = `color-mix(in srgb, #2f6bf3 ${pct}%, #8a7355)`;
  return (
    <svg width={width} height={height} viewBox="0 0 70 80" aria-hidden>
      {/* Ulanish taxtasi */}
      <rect x="16" y="6" width="38" height="16" rx="3" fill="#1d3a6b" />
      <rect x="20" y="4" width="3" height="8" fill="#9aa4b2" />
      <rect x="33" y="4" width="3" height="8" fill="#9aa4b2" />
      <rect x="46" y="4" width="3" height="8" fill="#9aa4b2" />
      {/* Ikki tishli prob */}
      <rect x="24" y="24" width="8" height="50" rx="2" fill={wet} />
      <rect x="38" y="24" width="8" height="50" rx="2" fill={wet} />
      <path d="M24 74 L28 80 L32 74 Z" fill={wet} />
      <path d="M38 74 L42 80 L46 74 Z" fill={wet} />
    </svg>
  );
}

/* ─────────────────────────── PIR harakat ─────────────────────────── */

function Pir({ width, height, settings, runtime }: SymbolProps) {
  const motion = settings.motion === true || (runtime?.pins?.out ?? 0) === 1;
  return (
    <svg width={width} height={height} viewBox="0 0 80 80" aria-hidden>
      <rect x="10" y="12" width="60" height="48" rx="6" fill="#0f7a3a" />
      {motion && <circle cx="40" cy="32" r="26" fill="#3ddc84" opacity="0.25" />}
      {/* Fresnel gumbaz */}
      <circle cx="40" cy="32" r="18" fill="#f2f4f7" />
      <circle cx="40" cy="32" r="18" fill="none" stroke="#c8cdd4" strokeWidth="1" />
      <path
        d="M28 32 h24 M40 20 v24 M31 23 l18 18 M49 23 l-18 18"
        stroke="#c8cdd4"
        strokeWidth="0.8"
      />
      {/* Oyoqlar */}
      <rect x="22" y="60" width="4" height="14" fill="#9aa4b2" />
      <rect x="38" y="60" width="4" height="14" fill="#9aa4b2" />
      <rect x="54" y="60" width="4" height="14" fill="#9aa4b2" />
    </svg>
  );
}

/* ─────────────────────────── DC motor ─────────────────────────── */

function DcMotor({ width, height, runtime }: SymbolProps) {
  const speed = runtime?.speed ?? 0;
  const direction = runtime?.direction ?? 1;
  const spinning = (runtime?.active ?? false) && speed > 0.02;
  // Tezroq → aylanish davri kichik (0.25–1.2 s).
  const dur = 0.25 + (1 - Math.min(1, speed)) * 1.2;

  return (
    <svg width={width} height={height} viewBox="0 0 90 80" aria-hidden>
      {/* Korpus */}
      <rect x="10" y="14" width="60" height="44" rx="10" fill="#3a4658" />
      <rect x="10" y="14" width="60" height="12" rx="6" fill="#4a5a6a" />
      {/* Val va rotor */}
      <circle cx="40" cy="36" r="15" fill="#2b3444" />
      <g>
        {spinning && (
          <animateTransform
            attributeName="transform"
            type="rotate"
            from={`0 40 36`}
            to={`${direction * 360} 40 36`}
            dur={`${dur}s`}
            repeatCount="indefinite"
          />
        )}
        <rect x="38.5" y="22" width="3" height="28" rx="1.5" fill="#f5f7fa" />
        <rect x="26" y="34.5" width="28" height="3" rx="1.5" fill="#f5f7fa" opacity="0.5" />
      </g>
      <circle cx="40" cy="36" r="3.5" fill="#0b1220" />
      {/* Chiquvchi val */}
      <rect x="70" y="33" width="12" height="6" rx="2" fill="#9aa4b2" />
      {/* Terminallar */}
      <rect x="23" y="58" width="4" height="16" fill="#e5484d" />
      <rect x="59" y="58" width="4" height="16" fill="#1d2b3a" />
    </svg>
  );
}

/* ─────────────────────────── Breadboard ─────────────────────────── */

/** Chizma alohida modulda — teshiklar geometriyasi u yerda. */
function Breadboard({ width, height, showDetail }: SymbolProps) {
  return <BreadboardSymbol width={width} height={height} showDetail={showDetail} />;
}

/* ─────────────────────────── DHT11 ─────────────────────────── */

function Dht11({ width, height, settings, showDetail = true }: SymbolProps) {
  const t = typeof settings.temperature === "number" ? settings.temperature : 22;
  const h = typeof settings.humidity === "number" ? settings.humidity : 55;
  return (
    <svg width={width} height={height} viewBox="0 0 80 90" aria-label="DHT11 sensori">
      {/* Ko'k korpus va old tomondagi panjara — haqiqiy DHT11 shunday */}
      <rect x="12" y="8" width="56" height="54" rx="4" fill="#2f6bf3" />
      <rect x="12" y="8" width="56" height="6" rx="3" fill="#5a91ff" opacity="0.6" />
      {[0, 1, 2].map((r) =>
        [0, 1, 2, 3, 4].map((c) => (
          <rect
            key={`${r}-${c}`}
            x={20 + c * 9}
            y={18 + r * 9}
            width="5"
            height="5"
            rx="1"
            fill="#14306b"
          />
        )),
      )}
      {/*
       * Joriy qiymat korpusning o'zida ko'rinadi. Ilgari u oyoqlar ustiga
       * tushib, o'qilmay qolardi.
       */}
      {showDetail && (
        <>
          <rect x="17" y="45" width="46" height="13" rx="3" fill="#e8eefb" />
          <text
            x="40"
            y="55"
            textAnchor="middle"
            fontFamily="ui-monospace, monospace"
            fontSize="10"
            fontWeight="700"
            fill="#14306b"
          >
            {Math.round(t)}° {Math.round(h)}%
          </text>
        </>
      )}
      {/* Oyoqlar — markazlari pin nuqtalariga (0.2 / 0.5 / 0.8) mos */}
      <rect x="14.5" y="62" width="3" height="16" fill="#9aa4b2" />
      <rect x="38.5" y="62" width="3" height="16" fill="#9aa4b2" />
      <rect x="62.5" y="62" width="3" height="16" fill="#9aa4b2" />
    </svg>
  );
}

/* ─────────────────────────── LCD 16×2 ─────────────────────────── */

function Lcd1602({ width, height, settings, runtime }: SymbolProps) {
  const backlight = settings.backlight !== false;
  const powered = runtime?.powered === true;
  const lit = backlight && powered;
  const lines = runtime?.lines ?? [];

  return (
    <svg
      className="vlab-lcd"
      data-lit={lit ? "true" : "false"}
      width={width}
      height={height}
      viewBox="0 0 240 120"
      role="img"
      aria-label={
        lines.some((l) => l.trim()) ? `LCD: ${lines.join(" / ").trim()}` : "LCD displey (bo'sh)"
      }
    >
      {/* Yashil plata */}
      <rect x="2" y="2" width="236" height="102" rx="6" fill="var(--lcd-board)" />
      {/* Ekran oynasi */}
      <rect
        x="18"
        y="16"
        width="204"
        height="70"
        rx="3"
        fill={lit ? "var(--lcd-screen-on)" : "var(--lcd-screen-off)"}
      />
      {/*
       * Belgilar monospace shriftda va aniq qadam bilan chiziladi:
       * `setCursor` bilan qo'yilgan probel ham o'z o'rnini egallashi kerak.
       */}
      {lit &&
        LCD_LINES.map((row) => {
          const text = lines[row] ?? "";
          return [...text].map((char, col) =>
            char === " " ? null : (
              <text
                key={`${row}-${col}`}
                x={26 + col * 12.2}
                y={44 + row * 28}
                fontFamily="ui-monospace, SFMono-Regular, monospace"
                fontSize="17"
                fontWeight="600"
                fill="var(--lcd-text)"
              >
                {char}
              </text>
            ),
          );
        })}
      {/* Ulanish pinlari */}
      {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
        <rect key={i} x={17 + i * 28.8} y="104" width="4" height="14" fill="#9aa4b2" />
      ))}
    </svg>
  );
}

const LCD_LINES = [0, 1];

/* ─────────────────────────── Rele ─────────────────────────── */

function Relay({ width, height, runtime }: SymbolProps) {
  const on = runtime?.active === true;
  return (
    <svg
      className="vlab-relay"
      data-on={on ? "true" : "false"}
      width={width}
      height={height}
      viewBox="0 0 140 110"
      role="img"
      aria-label={on ? "Rele: COM–NO ulangan" : "Rele: COM–NC ulangan"}
    >
      {/* Modul platasi */}
      <rect x="4" y="14" width="132" height="82" rx="5" fill="#1d5c3a" />

      {/*
       * Kalit sxemasi tepada, aynan o'z pinlari ostida: NC chapda (28),
       * COM o'rtada (70), NO o'ngda (112). Tilcha chulg'am tortganda
       * NC dan NO ga o'tadi — bola qaysi kontakt ulanganini ko'rib turadi.
       * Farq faqat rangda emas, joylashuvda ham.
       */}
      <g stroke="var(--relay-contact)" strokeWidth="2.5" strokeLinecap="round" fill="none">
        <path d="M28 18 L28 30" />
        <path d="M112 18 L112 30" />
        <path d="M70 18 L70 44" />
        <circle cx="28" cy="31" r="3.5" fill="var(--relay-contact)" stroke="none" />
        <circle cx="112" cy="31" r="3.5" fill="var(--relay-contact)" stroke="none" />
        <circle cx="70" cy="44" r="4" fill="var(--relay-contact)" stroke="none" />
        <path d={on ? "M70 44 L110 33" : "M70 44 L30 33"} />
      </g>
      {/* Kontakt yozuvlari — rang ko'rmasa ham o'qib bilsin */}
      <g
        fill="#a7d3bb"
        fontFamily="var(--font-sans), system-ui, sans-serif"
        fontSize="8"
        fontWeight="700"
        textAnchor="middle"
      >
        <text x="28" y="45">
          NC
        </text>
        <text x="112" y="45">
          NO
        </text>
        <text x="70" y="58">
          COM
        </text>
      </g>

      {/* Chulg'am korpusi (past) */}
      <rect x="18" y="60" width="76" height="30" rx="3" fill="#2f6bf3" />
      <rect x="18" y="60" width="76" height="6" rx="3" fill="#5a91ff" opacity="0.6" />
      <text
        x="56"
        y="82"
        textAnchor="middle"
        fontFamily="var(--font-sans), system-ui, sans-serif"
        fontSize="12"
        fontWeight="800"
        fill="#dbe7ff"
      >
        RELE
      </text>

      {/* Ishlash indikatori */}
      <circle className="vlab-relay-led" cx="118" cy="80" r="5" />

      {/* Boshqaruv pinlari (past): 0.14 / 0.36 / 0.58 nisbatlariga mos */}
      {[17.6, 48.4, 79.2].map((x) => (
        <rect key={`c-${x}`} x={x} y="96" width="4" height="12" fill="#9aa4b2" />
      ))}
      {/* Kommutatsiya pinlari (tepa): 0.2 / 0.5 / 0.8 */}
      {[26, 68, 110].map((x) => (
        <rect key={`s-${x}`} x={x} y="2" width="4" height="12" fill="#9aa4b2" />
      ))}
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
  tmp36: Tmp36,
  "soil-moisture": SoilMoisture,
  pir: Pir,
  servo: Servo,
  "dc-motor": DcMotor,
  battery: Battery,
  dht11: Dht11,
  lcd1602: Lcd1602,
  relay: Relay,
  "power-5v": Power5V,
  ground: Ground,
  multimeter: Multimeter,
  // Faza B — alohida modulda chizilgan.
  diode: DiodeSymbol,
  capacitor: CapacitorSymbol,
  "npn-transistor": NpnTransistorSymbol,
  joystick: JoystickSymbol,
  "seven-segment": SevenSegmentSymbol,
  "shift-register": ShiftRegisterSymbol,
  l298n: L298nSymbol,
  "keypad-4x4": KeypadSymbol,
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
