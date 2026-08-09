"use client";

import { useMemo } from "react";
import { sizeOf } from "@/lib/virtual-lab/lab3d/layout";
import { Box, Cyl, Emissive, Leg, M, bool, mat, num, resistorBands, str } from "./model-kit";
import type { ModelProps } from "./models-boards";

/**
 * Qolgan komponentlarning protsedural modellari.
 *
 * Har biri o'nlab qatordan iborat: shakl `model-kit` dagi bo'laklardan
 * yig'iladi, holat esa SIMULYATORDAN keladi (§46) — LED yorqinligi,
 * servo burchagi, segment holati hech qachon o'ylab topilmaydi.
 *
 * Kattaroq modullar (HC-SR04, LCD1602) O'Z fayliga ajratilgan — ular ko'p
 * qatlamli va bu yerda o'qib bo'lmas darajada joy egallardi.
 */

/* ═══════════════════════ Chiroqlar ═══════════════════════ */

/** Katalogdagi rang nomini haqiqiy rangga o'giradi. */
const LED_COLORS: Record<string, string> = {
  red: "#ff3b30",
  green: "#34c759",
  blue: "#3b82f6",
  yellow: "#ffd60a",
  white: "#f5f7fa",
  orange: "#ff9f0a",
};

export function LedModel({ settings, runtime }: ModelProps) {
  const { h } = sizeOf("led");
  const color = LED_COLORS[str(settings, "color", "red")] ?? LED_COLORS.red!;
  const brightness = runtime?.brightness ?? 0;

  // Yonmagan LED ham o'z rangida ko'rinadi, lekin nur sochmaydi.
  const glow = { color, intensity: brightness * 3, opacity: 0.55 + brightness * 0.4 };

  return (
    <group>
      {/* Gumbaz va tanasi — shaffof rangli plastik */}
      <mesh position={[0, h - 0.18, 0]} scale={[0.24, 0.24, 0.24]} castShadow>
        <sphereGeometry args={[1, 16, 12]} />
        <Emissive {...glow} />
      </mesh>
      <mesh position={[0, h / 2 - 0.16, 0]} scale={[0.24, h - 0.18, 0.24]} castShadow>
        <cylinderGeometry args={[1, 1, 1, 16]} />
        <Emissive {...glow} />
      </mesh>
      {/* Tag halqasi — qutbni ko'rsatadi */}
      <Cyl pos={[0, 0.04, 0]} r={0.3} h={0.08} material={mat("#c9ced6")} />

      {/* Anod uzunroq (chapda), katod kalta */}
      <Leg x={-0.12} z={0} h={0.7} />
      <Leg x={0.12} z={0} h={0.5} />
    </group>
  );
}

export function RgbLedModel({ runtime }: ModelProps) {
  const { h } = sizeOf("rgb-led");
  // Rangni simulyator uch kanaldan hisoblaydi — bu yerda faqat ko'rsatiladi.
  const color = runtime?.color ?? "#333333";
  const brightness = runtime?.brightness ?? 0;

  const glow = { color, intensity: brightness * 3, opacity: 0.5 + brightness * 0.45 };

  return (
    <group>
      <mesh position={[0, h - 0.18, 0]} scale={[0.26, 0.26, 0.26]} castShadow>
        <sphereGeometry args={[1, 16, 12]} />
        <Emissive {...glow} />
      </mesh>
      <mesh position={[0, h / 2 - 0.16, 0]} scale={[0.26, h - 0.18, 0.26]} castShadow>
        <cylinderGeometry args={[1, 1, 1, 16]} />
        <Emissive {...glow} />
      </mesh>
      <Cyl pos={[0, 0.04, 0]} r={0.32} h={0.08} material={mat("#c9ced6")} />
      {[-0.18, -0.06, 0.06, 0.18].map((x) => (
        <Leg key={x} x={x} z={0} h={0.6} />
      ))}
    </group>
  );
}

/* ═══════════════════════ Passiv elementlar ═══════════════════════ */

export function ResistorModel({ settings }: ModelProps) {
  const ohms = num(settings, "ohms", 220);
  const bands = useMemo(() => resistorBands(ohms), [ohms]);

  return (
    <group>
      {/* Bej korpus */}
      <Cyl pos={[0, 0.15, 0]} r={0.14} h={0.62} material={mat("#d9c9a3")} axis="x" />
      {/* Qiymatga qarab o'zgaradigan rang halqalari (§9) */}
      {bands.map((color, i) => (
        <Cyl
          key={i}
          pos={[-0.22 + i * 0.13, 0.15, 0]}
          r={0.145}
          h={0.06}
          material={mat(color)}
          axis="x"
        />
      ))}
      {/* Metall oyoqlar */}
      <Cyl pos={[-0.45, 0.15, 0]} r={0.025} h={0.28} material={M.silver()} axis="x" />
      <Cyl pos={[0.45, 0.15, 0]} r={0.025} h={0.28} material={M.silver()} axis="x" />
    </group>
  );
}

export function DiodeModel() {
  return (
    <group>
      <Cyl pos={[0, 0.15, 0]} r={0.12} h={0.5} material={M.plasticBlack()} axis="x" />
      {/* Qutb chizig'i — katod tomonda */}
      <Cyl pos={[0.18, 0.15, 0]} r={0.125} h={0.07} material={mat("#e8ecf2")} axis="x" />
      <Cyl pos={[-0.4, 0.15, 0]} r={0.025} h={0.3} material={M.silver()} axis="x" />
      <Cyl pos={[0.4, 0.15, 0]} r={0.025} h={0.3} material={M.silver()} axis="x" />
    </group>
  );
}

export function CapacitorModel({ settings }: ModelProps) {
  const polarized = bool(settings, "polarized", true);
  return (
    <group>
      <Cyl pos={[0, 0.55, 0]} r={0.28} h={1.05} material={mat(polarized ? "#2a4a7a" : "#c8a44a")} />
      <Cyl pos={[0, 1.09, 0]} r={0.28} h={0.04} material={mat("#8d99a8")} />
      {/* Qutbli kondensatorda manfiy tomon chizig'i */}
      {polarized && (
        <Box pos={[0.26, 0.55, 0]} size={[0.06, 0.85, 0.12]} material={mat("#c9ced6")} />
      )}
      <Leg x={-0.12} z={0} h={0.6} />
      <Leg x={0.12} z={0} h={0.6} />
    </group>
  );
}

export function TransistorModel() {
  return (
    <group>
      {/* TO-92 korpus: bir tomoni yassi */}
      <Cyl pos={[0, 0.28, 0]} r={0.24} h={0.55} material={M.plasticBlack()} />
      <Box pos={[0, 0.28, -0.16]} size={[0.48, 0.55, 0.12]} material={M.plasticBlack()} />
      {[-0.14, 0, 0.14].map((x) => (
        <Leg key={x} x={x} z={0} h={0.6} />
      ))}
    </group>
  );
}

/* ═══════════════════════ Boshqaruv ═══════════════════════ */

export function ButtonModel({ settings }: ModelProps) {
  const pressed = bool(settings, "pressed");
  const { h } = sizeOf("push-button");
  return (
    <group>
      <Box pos={[0, h / 2, 0]} size={[0.62, h, 0.62]} material={M.plasticBlack()} />
      {/* Bosilganda tugma pastga tushadi (§9) */}
      <Cyl
        pos={[0, h + (pressed ? 0.04 : 0.1), 0]}
        r={0.16}
        h={pressed ? 0.1 : 0.2}
        material={mat("#d84a44")}
      />
      {[-0.22, 0.22].map((x) =>
        [-0.22, 0.22].map((z) => <Leg key={`${x}:${z}`} x={x} z={z} h={0.4} />),
      )}
    </group>
  );
}

export function JoystickModel({ settings }: ModelProps) {
  const { w, d, h } = sizeOf("joystick");
  // −100…100 → tayoqchaning egilishi (radian).
  const x = (num(settings, "x", 0) / 100) * 0.35;
  const y = (num(settings, "y", 0) / 100) * 0.35;
  const pressed = bool(settings, "pressed");

  return (
    <group>
      <Box pos={[0, 0.1, 0]} size={[w, 0.2, d]} material={M.pcbBlue()} />
      <Box pos={[0, 0.55, -0.2]} size={[2.4, 0.7, 2.4]} material={M.plasticBlack()} />
      <group position={[0, 0.9, -0.2]} rotation={[y, 0, -x]}>
        <Cyl pos={[0, 0.5, 0]} r={0.16} h={1.0} material={M.plasticBlack()} />
        <mesh position={[0, 1.0 + (pressed ? -0.08 : 0), 0]} scale={[0.55, 0.42, 0.55]} castShadow>
          <sphereGeometry args={[1, 16, 12]} />
          <primitive object={M.plasticBlack()} attach="material" />
        </mesh>
      </group>
      <Box pos={[0, 0.3, d / 2 - 0.2]} size={[1.6, 0.24, 0.24]} material={M.plasticBlack()} />
      <group position={[0, h, 0]} />
    </group>
  );
}

export function KeypadModel({ settings }: ModelProps) {
  const { w, d, h } = sizeOf("keypad-4x4");
  const active = str(settings, "key", "");
  const keys = ["1", "2", "3", "A", "4", "5", "6", "B", "7", "8", "9", "C", "*", "0", "#", "D"];

  return (
    <group>
      <Box pos={[0, h / 2, 0]} size={[w, h, d]} material={mat("#2b3038")} />
      {keys.map((key, i) => {
        const col = i % 4;
        const row = Math.floor(i / 4);
        return (
          <Box
            key={key}
            pos={[
              (col - 1.5) * (w / 4.6),
              h + (active === key ? 0.02 : 0.05),
              (row - 1.5) * (d / 4.8),
            ]}
            size={[w / 5.6, active === key ? 0.04 : 0.1, d / 5.8]}
            material={mat(active === key ? "#4c82f7" : "#3e4550")}
          />
        );
      })}
    </group>
  );
}

/* ═══════════════════════ Sensorlar ═══════════════════════ */

/** Sensor modullarining umumiy asosi: kichik PCB va uch pinli header. */
function SensorBoard({ type, children }: { type: string; children?: React.ReactNode }) {
  const { w, d, h } = sizeOf(type);
  return (
    <group>
      <Box pos={[0, h / 2, 0]} size={[w, h, d]} material={M.pcbBlue()} />
      <Box
        pos={[0, h + 0.12, d / 2 - 0.25]}
        size={[w * 0.6, 0.24, 0.26]}
        material={M.plasticBlack()}
      />
      {children}
    </group>
  );
}

export function LdrModel() {
  const { h } = sizeOf("ldr");
  return (
    <SensorBoard type="ldr">
      {/* LDR yuzasidagi ilon izi naqsh */}
      <Cyl pos={[-0.7, h + 0.12, -0.2]} r={0.35} h={0.16} material={mat("#e2d8b8")} />
      <Box pos={[-0.7, h + 0.2, -0.2]} size={[0.5, 0.03, 0.08]} material={mat("#4a3f2a")} />
      <Box pos={[-0.7, h + 0.2, -0.32]} size={[0.5, 0.03, 0.08]} material={mat("#4a3f2a")} />
      <Box pos={[-0.7, h + 0.2, -0.08]} size={[0.5, 0.03, 0.08]} material={mat("#4a3f2a")} />
    </SensorBoard>
  );
}

export function Tmp36Model() {
  const { h } = sizeOf("tmp36");
  return (
    <SensorBoard type="tmp36">
      <Cyl pos={[-0.7, h + 0.25, -0.2]} r={0.22} h={0.5} material={M.plasticBlack()} />
      <Box pos={[-0.7, h + 0.25, -0.36]} size={[0.44, 0.5, 0.1]} material={M.plasticBlack()} />
    </SensorBoard>
  );
}

export function SoilMoistureModel({ settings }: ModelProps) {
  const { w, d, h } = sizeOf("soil-moisture");
  const moisture = num(settings, "moisture", 40) / 100;

  return (
    <group>
      <Box pos={[1.5, h / 2, 0]} size={[w * 0.45, h, d]} material={M.pcbBlue()} />
      <Box pos={[1.5, h + 0.12, 0]} size={[1.2, 0.24, 0.26]} material={M.plasticBlack()} />
      {/* Ikki vilkasimon elektrod */}
      {[-0.5, 0.5].map((z) => (
        <Box key={z} pos={[-1.4, h / 2, z]} size={[w * 0.5, h * 0.8, 0.35]} material={M.gold()} />
      ))}
      {/* Namlik darajasi elektrodlarda nam iz sifatida ko'rinadi */}
      <Box
        pos={[-1.4 - w * 0.25 + w * 0.5 * moisture * 0.5, h * 0.2, 0]}
        size={[w * 0.5 * moisture, 0.05, 1.3]}
        material={mat("#4a7fb8", { rough: 0.2 })}
      />
    </group>
  );
}

export function PirModel({ settings }: ModelProps) {
  const { w, d, h } = sizeOf("pir");
  const motion = bool(settings, "motion");

  return (
    <group>
      <Box pos={[0, 0.15, 0]} size={[w, 0.3, d]} material={M.pcbGreen()} />
      {/* Oq Fresnel gumbazi */}
      <mesh position={[0, 0.3, 0]} scale={[w * 0.42, h * 0.75, d * 0.5]} castShadow>
        <sphereGeometry args={[1, 18, 12]} />
        <Emissive color="#f2f4f7" intensity={motion ? 0.7 : 0} opacity={0.85} />
      </mesh>
      <Box pos={[0, 0.4, d / 2 - 0.2]} size={[0.9, 0.24, 0.26]} material={M.plasticBlack()} />
    </group>
  );
}

/*
 * HC-SR04 modeli `models-ultrasonic.tsx` da — u ko'p qatlamli
 * (metall banka, botiq membrana, silkscreen) va shu faylga sig'masdi.
 */

export function Dht11Model() {
  const { w, d, h } = sizeOf("dht11");
  return (
    <group>
      {/* Ko'k panjarali korpus */}
      <Box pos={[0, h / 2, 0]} size={[w, h, d]} material={mat("#3a7bd5")} />
      {[-0.6, -0.2, 0.2, 0.6].map((x) => (
        <Box
          key={x}
          pos={[x, h + 0.01, 0]}
          size={[0.18, 0.03, d * 0.7]}
          material={mat("#2a5a9e")}
        />
      ))}
      <Box pos={[0, 0.12, d / 2 - 0.15]} size={[1.0, 0.24, 0.2]} material={M.plasticBlack()} />
    </group>
  );
}

/* ═══════════════════════ Motorlar ═══════════════════════ */

export function L298nModel() {
  const { w, d } = sizeOf("l298n");
  return (
    <group>
      <Box pos={[0, 0.2, 0]} size={[w, 0.4, d]} material={M.pcbRed()} />
      {/* Alyuminiy radiator — modulning eng ko'zga tashlanadigan qismi */}
      <Box pos={[0, 1.4, -0.3]} size={[2.6, 2.0, 0.5]} material={M.metal()} />
      {[-1.0, -0.5, 0, 0.5, 1.0].map((x) => (
        <Box key={x} pos={[x, 1.4, -0.05]} size={[0.14, 2.0, 0.3]} material={M.metal()} />
      ))}
      {/* Vintli klemmalar */}
      {[-1.4, -0.5, 0.5, 1.4].map((x) => (
        <Box
          key={x}
          pos={[x, 0.7, d / 2 - 0.45]}
          size={[0.7, 0.6, 0.7]}
          material={mat("#2a6fb0")}
        />
      ))}
      {/* Pin qatori */}
      <Box pos={[0, 0.55, d / 2 - 1.4]} size={[3.0, 0.3, 0.28]} material={M.plasticBlack()} />
    </group>
  );
}

/* ═══════════════════════ Chiqish qurilmalari ═══════════════════════ */

export function BuzzerModel({ runtime }: ModelProps) {
  const { h } = sizeOf("buzzer");
  const buzzing = runtime?.buzzing === true;
  return (
    <group>
      <Cyl pos={[0, h / 2, 0]} r={0.6} h={h} material={M.plasticBlack()} />
      {/* Tovush teshigi — chalinayotganda yorishadi */}
      <Cyl
        pos={[0, h + 0.01, 0]}
        r={0.12}
        h={0.03}
        material={mat(buzzing ? "#ffd60a" : "#4a4f58")}
      />
      <Leg x={-0.2} z={0} h={0.5} />
      <Leg x={0.2} z={0} h={0.5} />
    </group>
  );
}

/** 7-segment indikator — har segment ALOHIDA yonadi (§11). */
export function SevenSegmentModel({ runtime }: ModelProps) {
  const { w, d, h } = sizeOf("seven-segment");
  const segments = runtime?.segments ?? {};

  // Segment joylashuvi: [x, z, gorizontalmi]
  const layout: Record<string, [number, number, boolean]> = {
    a: [0, -0.75, true],
    b: [0.42, -0.38, false],
    c: [0.42, 0.38, false],
    d: [0, 0.75, true],
    e: [-0.42, 0.38, false],
    f: [-0.42, -0.38, false],
    g: [0, 0, true],
  };

  return (
    <group>
      <Box pos={[0, h / 2, 0]} size={[w, h, d]} material={M.plasticBlack()} />
      {Object.entries(layout).map(([id, [x, z, horizontal]]) => (
        <Segment key={id} x={x} z={z} horizontal={horizontal} on={segments[id] === true} h={h} />
      ))}
      {/* O'nlik nuqta */}
      <Segment x={0.62} z={0.75} horizontal on={segments.dp === true} h={h} dot />
    </group>
  );
}

function Segment({
  x,
  z,
  horizontal,
  on,
  h,
  dot,
}: {
  x: number;
  z: number;
  horizontal: boolean;
  on: boolean;
  h: number;
  dot?: boolean;
}) {
  const size: [number, number, number] = dot
    ? [0.12, 0.03, 0.12]
    : horizontal
      ? [0.6, 0.03, 0.13]
      : [0.13, 0.03, 0.6];

  return (
    <mesh position={[x, h + 0.02, z]} scale={size}>
      <boxGeometry />
      <Emissive color="#ff3b30" intensity={on ? 2.6 : 0.04} opacity={on ? 1 : 0.35} />
    </mesh>
  );
}

export function ShiftRegisterModel() {
  const { w, d, h } = sizeOf("shift-register");
  return (
    <group>
      <Box pos={[0, h / 2, 0]} size={[w, h, d]} material={M.plasticBlack()} />
      {/* 1-oyoq o'yig'i */}
      <Cyl pos={[-w / 2 + 0.12, h, 0]} r={0.09} h={0.04} material={mat("#3a4149")} />
      {[-1, 1].map((side) =>
        Array.from({ length: 8 }, (_, i) => (
          <Leg key={`${side}:${i}`} x={-0.87 + i * 0.25} z={(side * d) / 2} h={0.35} />
        )),
      )}
    </group>
  );
}

/* ═══════════════════════ Multimetr ═══════════════════════ */

/**
 * Multimetr (§13).
 *
 * Ekrandagi qiymat `runtime.voltage` dan — simulyator zanjirni yechib
 * hisoblagan haqiqiy kuchlanish. Raqamlar yetti segment uslubida emas,
 * oddiy kataklarda ko'rsatiladi: 3D da kichik matn baribir o'qilmaydi,
 * aniq qiymat esa inspektorda turadi.
 */
export function MultimeterModel({ runtime }: ModelProps) {
  const { w, d, h } = sizeOf("multimeter");
  const volts = runtime?.voltage ?? 0;

  // Ko'rsatkich chizig'i: 0–5 V oralig'ini to'ldiradi.
  const fill = Math.max(0, Math.min(1, Math.abs(volts) / 5));

  return (
    <group>
      {/* Sariq korpus — o'lchov asboblarining tanish rangi */}
      <Box pos={[0, h / 2, 0]} size={[w, h, d]} material={mat("#e0a92a")} />
      <Box
        pos={[0, h / 2 + 0.02, 0]}
        size={[w * 0.86, h * 0.9, d * 0.94]}
        material={M.plasticBlack()}
      />

      {/* LCD ekran */}
      <mesh position={[0, h + 0.02, -d / 2 + 2.2]} scale={[w * 0.66, 0.06, 2.6]}>
        <boxGeometry />
        <Emissive color="#8fd694" intensity={0.5} opacity={1} />
      </mesh>
      <Box
        pos={[-w * 0.3 + (w * 0.6 * fill) / 2, h + 0.06, -d / 2 + 2.2]}
        size={[Math.max(0.12, w * 0.6 * fill), 0.02, 0.7]}
        material={mat("#1d2b1f")}
      />

      {/* Aylanma tanlagich */}
      <Cyl pos={[0, h + 0.1, 0.6]} r={1.5} h={0.2} material={mat("#2b3038")} />
      <Cyl pos={[0, h + 0.22, 0.6]} r={0.9} h={0.16} material={mat("#3e4550")} />
      <Box pos={[0, h + 0.3, -0.1]} size={[0.16, 0.06, 1.1]} material={mat("#f2f4f7")} />

      {/* Qizil va qora shup uyalari */}
      <Cyl pos={[-1.2, h + 0.05, d / 2 - 1.0]} r={0.3} h={0.14} material={mat("#c8443c")} />
      <Cyl pos={[1.2, h + 0.05, d / 2 - 1.0]} r={0.3} h={0.14} material={M.plasticBlack()} />
    </group>
  );
}
