"use client";

import { KEYPAD_KEYS, SHIFT_REGISTER_BITS } from "@/lib/virtual-lab/catalog";
import type { ComponentRuntimeState } from "@/lib/virtual-lab/types";

/**
 * Faza B komponentlarining chizmalari.
 *
 * Alohida fayl: `symbols.tsx` allaqachon 20 dan ortiq chizmani saqlaydi va
 * yana sakkiztasi uni o'qib bo'lmas holga keltirardi. Chizmalar shu yerda
 * ham bir xil tilda: 2D SVG, `viewBox` bilan miqyoslanadi, ranglar mavzu
 * o'zgaruvchilariga bog'lanmagan qismlarda detalning haqiqiy rangiga mos.
 *
 * Har bir chizma `runtime` holatini o'qiydi — bu ko'rsatkichlar simulyator
 * hisobidan keladi, chizmaning o'zida hech qanday qiymat to'qib
 * chiqarilmaydi.
 */

export interface ModuleSymbolProps {
  width: number;
  height: number;
  settings: Record<string, string | number | boolean>;
  runtime?: ComponentRuntimeState;
  showDetail?: boolean;
  /** Chizma ichidan sozlamani o'zgartirish (klaviatura tugmalari uchun). */
  onSetting?: (key: string, value: string | number | boolean) => void;
}

/** Oyoq — barcha DIP/modul chizmalarida bir xil ko'rinsin. */
function Leg({ x, y, height = 14 }: { x: number; y: number; height?: number }) {
  return <rect x={x - 1.5} y={y} width="3" height={height} rx="1" fill="#9aa4b2" />;
}

/* ─────────────────────────── Diod ─────────────────────────── */

export function DiodeSymbol({ width, height, settings, runtime }: ModuleSymbolProps) {
  const vf = typeof settings.vf === "number" ? settings.vf : 0.7;
  const conducting = runtime?.forward === true && (runtime.milliamps ?? 0) > 0.01;
  return (
    <svg width={width} height={height} viewBox="0 0 90 40" aria-label="Diod">
      {/* Oyoqlar chetgacha — sim aynan pin nuqtasiga tushadi */}
      <rect x="0" y="18.5" width="24" height="3" fill="#9aa4b2" />
      <rect x="66" y="18.5" width="24" height="3" fill="#9aa4b2" />
      {/* Qora shisha korpus */}
      <rect x="24" y="8" width="42" height="24" rx="4" fill="#1b2431" />
      <rect x="24" y="8" width="42" height="7" rx="3" fill="#2c3a4f" opacity="0.8" />
      {/* Katod yo'lagi — qaysi tomon "−" ekanini aynan shu ko'rsatadi */}
      <rect x="58" y="8" width="6" height="24" fill="#e8eefb" />
      {conducting && (
        <rect x="24" y="8" width="42" height="24" rx="4" fill="#ffb020" opacity="0.28" />
      )}
      <text
        x="40"
        y="24"
        textAnchor="middle"
        fontFamily="ui-monospace, monospace"
        fontSize="9"
        fontWeight="700"
        fill="#e8eefb"
      >
        {vf.toFixed(1)}V
      </text>
    </svg>
  );
}

/* ─────────────────────────── Kondensator ─────────────────────────── */

export function CapacitorSymbol({ width, height, settings, runtime }: ModuleSymbolProps) {
  const uf = typeof settings.microfarads === "number" ? settings.microfarads : 100;
  const polarized = settings.polarized !== false;
  const reversed = polarized && runtime?.forward === false;
  const label = uf >= 1000 ? `${(uf / 1000).toFixed(uf % 1000 ? 1 : 0)}mF` : `${uf}µF`;

  return (
    <svg width={width} height={height} viewBox="0 0 60 84" aria-label="Kondensator">
      {/* Silindr korpus */}
      <rect x="10" y="4" width="40" height="60" rx="7" fill="#1f4fd8" />
      <ellipse cx="30" cy="8" rx="20" ry="5" fill="#4a7bff" />
      {/* Manfiy tomonni bildiruvchi oq yo'lak — haqiqiy elektrolitdagidek */}
      {polarized && (
        <>
          <rect x="36" y="8" width="14" height="56" rx="3" fill="#dfe8fb" opacity="0.92" />
          <text
            x="43"
            y="42"
            textAnchor="middle"
            fontSize="13"
            fontWeight="800"
            fill="#1f4fd8"
            fontFamily="ui-monospace, monospace"
          >
            −
          </text>
        </>
      )}
      <text
        x="22"
        y="30"
        textAnchor="middle"
        fontSize="10"
        fontWeight="800"
        fill="#ffffff"
        fontFamily="ui-monospace, monospace"
      >
        +
      </text>
      <text
        x="22"
        y="48"
        textAnchor="middle"
        fontSize="8.5"
        fontWeight="700"
        fill="#ffffff"
        fontFamily="ui-monospace, monospace"
      >
        {label}
      </text>
      {reversed && (
        <rect x="10" y="4" width="40" height="60" rx="7" fill="#e5484d" opacity="0.35" />
      )}
      <Leg x={18} y={64} height={18} />
      <Leg x={42} y={64} height={18} />
    </svg>
  );
}

/* ─────────────────────────── NPN tranzistor ─────────────────────────── */

const BJT_TONE: Record<string, string> = {
  off: "#6b7787",
  active: "#ffb020",
  saturated: "#3ddc84",
};

export function NpnTransistorSymbol({ width, height, settings, runtime }: ModuleSymbolProps) {
  const state = runtime?.transistor ?? "off";
  const beta = typeof settings.beta === "number" ? settings.beta : 100;
  return (
    <svg width={width} height={height} viewBox="0 0 76 80" aria-label="NPN tranzistor">
      {/* Yarim doira korpus — TO-92 shakli */}
      <path d="M20 22 A22 22 0 0 1 64 22 L64 58 A22 22 0 0 1 20 58 Z" fill="#1b2431" />
      <rect x="18" y="22" width="6" height="36" rx="2" fill="#2c3a4f" />
      <text
        x="44"
        y="36"
        textAnchor="middle"
        fontSize="8.5"
        fontWeight="700"
        fill="#e8eefb"
        fontFamily="ui-monospace, monospace"
      >
        NPN
      </text>
      <text
        x="44"
        y="50"
        textAnchor="middle"
        fontSize="8"
        fontWeight="700"
        fill={BJT_TONE[state] ?? "#6b7787"}
        fontFamily="ui-monospace, monospace"
      >
        β{beta}
      </text>
      {/* Kollektor (yuqori) va emitter (past) oyoqlari */}
      <rect x="53" y="0" width="3" height="24" rx="1" fill="#9aa4b2" />
      <rect x="53" y="56" width="3" height="24" rx="1" fill="#9aa4b2" />
      {/* Baza oyog'i chapga */}
      <rect x="0" y="38.5" width="22" height="3" rx="1" fill="#9aa4b2" />
      {/* Holat indikatori */}
      <circle cx="30" cy="40" r="4" fill={BJT_TONE[state] ?? "#6b7787"} />
    </svg>
  );
}

/* ─────────────────────────── Joystik ─────────────────────────── */

export function JoystickSymbol({ width, height, settings, runtime }: ModuleSymbolProps) {
  const x = typeof settings.x === "number" ? settings.x : 0;
  const y = typeof settings.y === "number" ? settings.y : 0;
  const pressed = settings.pressed === true;
  const powered = runtime?.active === true;
  // −100…+100 → chizmadagi siljish (piksel).
  const dx = (x / 100) * 16;
  const dy = (-y / 100) * 16;

  return (
    <svg width={width} height={height} viewBox="0 0 110 118" aria-label="Joystik moduli">
      <rect x="4" y="4" width="102" height="96" rx="8" fill="#1f4fd8" />
      <rect x="4" y="4" width="102" height="10" rx="5" fill="#4a7bff" opacity="0.55" />
      {/* Harakat maydoni */}
      <circle cx="55" cy="52" r="34" fill="#12224a" />
      <circle cx="55" cy="52" r="34" fill="none" stroke="#3a5db8" strokeWidth="1.5" />
      {/* Tutqich — X/Y qiymatiga qarab siljiydi */}
      <circle cx={55 + dx} cy={52 + dy} r="17" fill={pressed ? "#e5484d" : "#0d1526"} />
      <circle
        cx={55 + dx}
        cy={52 + dy}
        r="17"
        fill="none"
        stroke={powered ? "#3ddc84" : "#4a5b7a"}
        strokeWidth="2"
      />
      <circle cx={55 + dx} cy={52 + dy} r="6" fill={pressed ? "#ff8a8a" : "#33415c"} />
      <text
        x="55"
        y="95"
        textAnchor="middle"
        fontSize="8.5"
        fontWeight="700"
        fill="#cfe0ff"
        fontFamily="ui-monospace, monospace"
      >
        X {x} · Y {y}
      </text>
      {[0.1, 0.3, 0.5, 0.7, 0.9].map((r, i) => (
        <Leg key={i} x={r * 110} y={100} />
      ))}
    </svg>
  );
}

/* ─────────────────────────── 7-segment ─────────────────────────── */

/** Segment shakllari — `viewBox="0 0 84 116"` ichida. */
const SEGMENT_PATHS: Record<string, string> = {
  a: "M26 20 L58 20 L53 26 L31 26 Z",
  b: "M60 22 L60 52 L54 47 L54 28 Z",
  c: "M60 60 L60 90 L54 84 L54 65 Z",
  d: "M26 92 L58 92 L53 86 L31 86 Z",
  e: "M24 60 L24 90 L30 84 L30 65 Z",
  f: "M24 22 L24 52 L30 47 L30 28 Z",
  g: "M27 56 L57 56 L52 61 L32 61 Z M27 56 L32 51 L52 51 L57 56 Z",
};

export function SevenSegmentSymbol({ width, height, settings, runtime }: ModuleSymbolProps) {
  const on = runtime?.segments ?? {};
  const digit = runtime?.digit ?? null;
  const commonAnode = settings.common === "anode";

  return (
    <svg width={width} height={height} viewBox="0 0 84 116" aria-label="7-segmentli indikator">
      <rect x="6" y="10" width="72" height="94" rx="6" fill="#12161f" />
      {Object.entries(SEGMENT_PATHS).map(([id, d]) => (
        <path
          key={id}
          d={d}
          fill={on[id] ? "#ff4d4d" : "#2a2f3c"}
          style={on[id] ? { filter: "drop-shadow(0 0 4px #ff6b6b)" } : undefined}
        />
      ))}
      {/* O'nlik nuqta */}
      <circle cx="66" cy="88" r="4" fill={on.dp ? "#ff4d4d" : "#2a2f3c"} />
      <text
        x="42"
        y="112"
        textAnchor="middle"
        fontSize="7.5"
        fontWeight="700"
        fill="#8fa3c4"
        fontFamily="ui-monospace, monospace"
      >
        {commonAnode ? "COM→5V" : "COM→GND"}
        {digit ? ` · ${digit}` : ""}
      </text>
    </svg>
  );
}

/* ─────────────────────────── 74HC595 ─────────────────────────── */

export function ShiftRegisterSymbol({ width, height, runtime }: ModuleSymbolProps) {
  const latch = runtime?.latchBits ?? [];
  const enabled = runtime?.active !== false;

  return (
    <svg width={width} height={height} viewBox="0 0 150 118" aria-label="74HC595 registri">
      {/* DIP-16 korpus */}
      <rect x="10" y="16" width="130" height="86" rx="5" fill="#1b2431" />
      <rect x="10" y="16" width="130" height="8" rx="4" fill="#2c3a4f" opacity="0.8" />
      {/* Birinchi oyoq belgisi */}
      <circle cx="22" cy="92" r="4" fill="#0d1119" stroke="#39465c" />
      <text
        x="75"
        y="44"
        textAnchor="middle"
        fontSize="12"
        fontWeight="800"
        fill="#e8eefb"
        fontFamily="ui-monospace, monospace"
      >
        74HC595
      </text>
      {/* Chiqish bitlari — chip ustida jonli ko'rinadi */}
      {Array.from({ length: SHIFT_REGISTER_BITS }, (_, i) => (
        <g key={i}>
          <rect
            x={16 + i * 15.5}
            y={54}
            width="12"
            height="12"
            rx="2.5"
            fill={enabled && latch[i] ? "#3ddc84" : "#2a3345"}
          />
          <text
            x={22 + i * 15.5}
            y={78}
            textAnchor="middle"
            fontSize="7"
            fontWeight="700"
            fill="#8fa3c4"
            fontFamily="ui-monospace, monospace"
          >
            Q{i}
          </text>
        </g>
      ))}
      {!enabled && (
        <text
          x="75"
          y="96"
          textAnchor="middle"
          fontSize="7.5"
          fontWeight="700"
          fill="#ffb020"
          fontFamily="ui-monospace, monospace"
        >
          OE yuqori — chiqish o&apos;chiq
        </text>
      )}
      {Array.from({ length: 8 }, (_, i) => (
        <Leg key={`t${i}`} x={9 + (i + 0.5) * (150 / 8) - 0.4} y={2} height={14} />
      ))}
      {Array.from({ length: 8 }, (_, i) => (
        <Leg key={`b${i}`} x={9 + (i + 0.5) * (150 / 8) - 0.4} y={102} height={14} />
      ))}
    </svg>
  );
}

/* ─────────────────────────── L298N ─────────────────────────── */

const MODE_LABEL: Record<string, string> = {
  stop: "STOP",
  forward: "OLD",
  reverse: "ORQA",
  brake: "TORMOZ",
};

function ChannelBadge({
  x,
  label,
  channel,
}: {
  x: number;
  label: string;
  channel?: { speed: number; direction: number; mode: string };
}) {
  const mode = channel?.mode ?? "stop";
  const speed = Math.round((channel?.speed ?? 0) * 100);
  const tone = mode === "stop" ? "#6b7787" : mode === "brake" ? "#ffb020" : "#3ddc84";
  return (
    <g>
      <rect x={x} y="52" width="62" height="30" rx="5" fill="#0f1727" stroke="#33415c" />
      <text
        x={x + 31}
        y="65"
        textAnchor="middle"
        fontSize="8"
        fontWeight="800"
        fill={tone}
        fontFamily="ui-monospace, monospace"
      >
        {label} {MODE_LABEL[mode] ?? "STOP"}
      </text>
      <text
        x={x + 31}
        y="77"
        textAnchor="middle"
        fontSize="8"
        fontWeight="700"
        fill="#8fa3c4"
        fontFamily="ui-monospace, monospace"
      >
        {speed}%
      </text>
    </g>
  );
}

export function L298nSymbol({ width, height, settings, runtime }: ModuleSymbolProps) {
  const volts = typeof settings.supplyVoltage === "number" ? settings.supplyVoltage : 12;
  return (
    <svg width={width} height={height} viewBox="0 0 168 132" aria-label="L298N motor drayveri">
      <rect x="6" y="14" width="156" height="104" rx="7" fill="#0f5132" />
      <rect x="6" y="14" width="156" height="9" rx="4" fill="#1b7a4d" opacity="0.7" />
      {/* Radiator — L298N ning eng tanilgan qismi */}
      <rect x="60" y="20" width="48" height="26" rx="3" fill="#8a94a6" />
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <rect key={i} x={63 + i * 7.5} y="21" width="3" height="24" fill="#6c7688" />
      ))}
      <text
        x="26"
        y="34"
        fontSize="9"
        fontWeight="800"
        fill="#dff5e6"
        fontFamily="ui-monospace, monospace"
      >
        L298N
      </text>
      <text
        x="120"
        y="34"
        fontSize="8"
        fontWeight="700"
        fill="#a9e5c2"
        fontFamily="ui-monospace, monospace"
      >
        {volts}V
      </text>
      <ChannelBadge x={12} label="A" channel={runtime?.channelA} />
      <ChannelBadge x={94} label="B" channel={runtime?.channelB} />
      {/* Yuqoridagi klemma bloklari (OUT1…OUT4) */}
      {[0.06, 0.22, 0.78, 0.94].map((r, i) => (
        <g key={i}>
          <rect x={r * 168 - 7} y="2" width="14" height="12" rx="2" fill="#123" />
          <Leg x={r * 168} y={0} height={6} />
        </g>
      ))}
      {[0.12, 0.28, 0.44, 0.6, 0.76, 0.92].map((r, i) => (
        <Leg key={`b${i}`} x={r * 168} y={118} height={12} />
      ))}
    </svg>
  );
}

/* ─────────────────────────── 4×4 klaviatura ─────────────────────────── */

export function KeypadSymbol({ width, height, settings, onSetting }: ModuleSymbolProps) {
  const active = typeof settings.key === "string" ? settings.key : "";

  /*
   * Tugma sichqoncha bosilgan paytda YOPIQ, qo'yib yuborilganda ochiq —
   * haqiqiy klaviaturadagidek. Shuning uchun `pointerdown`/`pointerup`
   * ishlatiladi, oddiy `click` emas: `click` faqat qo'yib yuborilgandan
   * keyin keladi va bosib turish holatini bera olmaydi.
   */
  const press = (key: string) => (event: React.PointerEvent) => {
    event.stopPropagation();
    onSetting?.("key", key);
  };
  const release = (event: React.PointerEvent) => {
    event.stopPropagation();
    onSetting?.("key", "");
  };

  return (
    <svg width={width} height={height} viewBox="0 0 148 158" aria-label="4×4 klaviatura">
      <rect x="4" y="4" width="140" height="140" rx="8" fill="#1b2431" />
      <rect x="4" y="4" width="140" height="9" rx="4" fill="#2c3a4f" opacity="0.7" />
      {KEYPAD_KEYS.map((row, r) =>
        row.map((key, c) => {
          const isActive = active === key;
          return (
            <g
              key={key}
              onPointerDown={press(key)}
              onPointerUp={release}
              onPointerLeave={isActive ? release : undefined}
              style={{ cursor: "pointer" }}
            >
              <rect
                x={12 + c * 32}
                y={20 + r * 30}
                width="28"
                height="26"
                rx="4"
                fill={isActive ? "#2f6bf3" : "#39465c"}
              />
              <text
                x={26 + c * 32}
                y={38 + r * 30}
                textAnchor="middle"
                fontSize="12"
                fontWeight="800"
                fill={isActive ? "#ffffff" : "#dbe4f3"}
                fontFamily="ui-monospace, monospace"
              >
                {key}
              </text>
            </g>
          );
        }),
      )}
      {Array.from({ length: 8 }, (_, i) => (
        <Leg key={i} x={(0.1 + i * 0.12) * 148} y={144} height={12} />
      ))}
    </svg>
  );
}
