"use client";

import { localPinPosition } from "@/lib/virtual-lab/lab3d/layout";
import { Box, Cyl, Ring, mat, num } from "./model-kit";
import type { ModelProps } from "./models-boards";

/**
 * Buraladigan potensiometr — 16 mm li o'quv modeli (§4, §5, §13).
 *
 * ── O'lchamlar HAQIQIY ──────────────────────────────────────────────────
 * Sahna birligi — santimetr (`layout.ts`). Arduino to'plamlaridagi
 * potensiometr: korpus ⌀16 mm va 9 mm baland, rezbali bo'yin ⌀7 mm,
 * o'qi ⌀6 mm, oyoqlari orasi 5 mm. Bu yerdagi raqamlar o'sha jadvaldan.
 *
 * ── Nima aylanadi ───────────────────────────────────────────────────────
 * FAQAT yuqori guruh: o'q, murvat va undagi oq ko'rsatkich. Korpus,
 * bo'yin va oyoqlar qimirlamaydi — haqiqiy potensiometrda ham shunday.
 * Burchak SOZLAMADAN hisoblanadi (0–1023 → −135°…+135°) va bu qoida
 * ilgarigidek qoldirilgan: jonli boshqaruv qiymatni o'zgartirsa, murvat
 * o'sha zahoti buriladi (§46).
 *
 * ── Oyoqlar KATALOGDAN ──────────────────────────────────────────────────
 * Uchala oyoqning o'rni `localPinPosition` dan olinadi — `PinField`
 * ulanish nuqtasini qo'yish uchun ishlatadigan funksiyaning AYNAN o'zi.
 * Ilgari model oyoqlarni ±0.25 sm ga chizardi, ulanish nuqtalari esa
 * ±0.56 da edi: sim ko'zga ko'ringan metalldan emas, uning yonidan
 * chiqardi (§14).
 */

/* ─────────────────────────── O'lchamlar (sm) ─────────────────────────── */

/** Metall korpus: ⌀16 mm, balandligi 9 mm. */
const BODY = { r: 0.8, h: 0.82, rimH: 0.08 } as const;

/** Korpus tepasi — bo'yin shu balandlikdan boshlanadi. */
const BODY_TOP = BODY.h + BODY.rimH;

/** Rezbali bo'yin va uni qisadigan gayka. */
const BUSHING = { r: 0.35, h: 0.3, nutR: 0.44, nutH: 0.12 } as const;

/** Bo'yin tepasi — o'q shu yerdan chiqadi. */
const BUSHING_TOP = BODY_TOP + BUSHING.h;

/** Aylanadigan o'q: ⌀6 mm. */
const SHAFT = { r: 0.3, top: 1.72 } as const;

/** Murvat — barmoq bilan buraladigan qism. */
const KNOB = { r: 0.58, rTop: 0.52, h: 0.6, bottom: 1.55 } as const;

/** Murvat qirrasi — modelning eng baland nuqtasi. */
const KNOB_TOP = KNOB.bottom + KNOB.h;

/** Oyoqlar chiqadigan plastik taglik va oyoqning o'zi. */
const TERMINAL = { plateH: 0.3, plateD: 0.3, pinW: 0.09, pinD: 0.07, pinBottom: -0.5 } as const;

/* ─────────────────────────── Materiallar ─────────────────────────── */

/*
 * Sirtlar ATAYLAB har xil (§13): korpus shtamplangan metall, murvat mat
 * plastik, ko'rsatkich esa bo'yalgan oq chiziq. Materiallar `mat()`
 * orqali keshlanadi (§33).
 */
const PM = {
  /** Shtamplangan metall korpus. */
  body: () => mat("#7e848d", { rough: 0.46, metal: 0.6 }),
  /** Korpusning qisilgan qirrasi — quyuqroq. */
  rim: () => mat("#666c75", { rough: 0.52, metal: 0.55 }),
  /** Rezbali bo'yin va gayka — nikellangan. */
  bushing: () => mat("#aeb5bf", { rough: 0.34, metal: 0.78 }),
  /** Aylanadigan o'q — quyuq metall. */
  shaft: () => mat("#8f959e", { rough: 0.36, metal: 0.7 }),
  /** Murvat — mat qora plastik. */
  knob: () => mat("#1d2026", { rough: 0.72, metal: 0.05 }),
  /** Murvatning yon qirralari (rifleniye) — bir oz ochroq. */
  knurl: () => mat("#282c33", { rough: 0.7 }),
  /** Burilish ko'rsatkichi. */
  marker: () => mat("#f2f4f7", { rough: 0.5 }),
  /** Oyoqlar chiqadigan plastik taglik. */
  wafer: () => mat("#26292f", { rough: 0.82 }),
  /** Qalaylangan oyoqlar. */
  pin: () => mat("#b9c1cb", { rough: 0.3, metal: 0.85 }),
};

/* ─────────────────────────── Oyoqlar katalogdan ─────────────────────────── */

interface PinSpot {
  id: string;
  x: number;
  z: number;
}

let pinCache: PinSpot[] | null = null;

function potPins(): PinSpot[] {
  if (pinCache) return pinCache;
  pinCache = (["vcc", "wiper", "gnd"] as const).flatMap((id) => {
    const at = localPinPosition("potentiometer", id);
    return at ? [{ id, x: at.x, z: at.z }] : [];
  });
  return pinCache;
}

/* ─────────────────────────── Model ─────────────────────────── */

export function PotentiometerModel({ settings }: ModelProps) {
  const value = num(settings, "value", 512);
  // 0–1023 → −135°…+135° (haqiqiy potensiometr shuncha buriladi).
  const angle = ((value / 1023) * 270 - 135) * (Math.PI / 180);

  return (
    <group>
      <PotBody />
      <ShaftCollar />
      <RotatingKnob angle={angle} />
      <PotTerminals />
    </group>
  );
}

/* ─────────────────────────── Bo'laklar ─────────────────────────── */

/**
 * Metall korpus.
 *
 * Ikki qatlam: asosiy silindr va uning ustidagi qisilgan qirra. Aynan
 * shu qirra haqiqiy potensiometrda korpusni yopib turadi va shakli
 * "quvur" emas, "yig'ilgan detal" bo'lib ko'rinadi.
 */
function PotBody() {
  return (
    <group>
      <Cyl pos={[0, BODY.h / 2, 0]} r={BODY.r} h={BODY.h} material={PM.body()} smooth />
      {/* Qisilgan qirra — korpus tepasidagi ingichka halqa */}
      <Cyl
        pos={[0, BODY.h + BODY.rimH / 2, 0]}
        r={BODY.r - 0.04}
        h={BODY.rimH}
        material={PM.rim()}
        smooth
      />
      {/* Pastki lab — korpus stolga tekis o'tirgani ko'rinsin */}
      <Ring pos={[0, 0.02, 0]} r={BODY.r - 0.05} tube={0.04} material={PM.rim()} segments={48} />
      {/* Aylanishga qarshi tirgak — haqiqiy potensiometrda ham bor */}
      <Box
        pos={[0, BODY_TOP + 0.03, -BODY.r + 0.18]}
        size={[0.14, 0.12, 0.14]}
        material={PM.rim()}
        shadow={false}
      />
    </group>
  );
}

/**
 * Rezbali bo'yin, shayba va gayka.
 *
 * Gayka OLTI qirrali: bu detalni bir qarashda tanitadigan belgi. Qolgan
 * silindrlar 48 qirrali (`smooth`), shuning uchun olti qirra sun'iy
 * emas, ataylab qilingan farq bo'lib ko'rinadi.
 */
function ShaftCollar() {
  return (
    <group>
      {/* Shayba */}
      <Cyl
        pos={[0, BODY_TOP + 0.03, 0]}
        r={BUSHING.nutR + 0.03}
        h={0.06}
        material={PM.bushing()}
        smooth
        shadow={false}
      />
      {/* Rezbali bo'yin */}
      <Cyl
        pos={[0, BODY_TOP + BUSHING.h / 2, 0]}
        r={BUSHING.r}
        h={BUSHING.h}
        material={PM.bushing()}
        smooth
      />
      {/* Rezba izlari — uchta ingichka halqa */}
      {[0.1, 0.18, 0.26].map((offset) => (
        <Ring
          key={offset}
          pos={[0, BODY_TOP + offset, 0]}
          r={BUSHING.r}
          tube={0.018}
          material={PM.bushing()}
          segments={32}
        />
      ))}
      {/* Olti qirrali gayka */}
      <mesh position={[0, BODY_TOP + 0.12, 0]} castShadow>
        <cylinderGeometry args={[BUSHING.nutR, BUSHING.nutR, BUSHING.nutH, 6]} />
        <meshStandardMaterial color="#aeb5bf" roughness={0.34} metalness={0.78} />
      </mesh>
    </group>
  );
}

/**
 * Aylanadigan qism: o'q, murvat va ko'rsatkich.
 *
 * Butun guruh Y o'qi atrofida buriladi — ya'ni burchak o'zgarsa faqat
 * bitta `rotation` yangilanadi, geometriya esa qayta qurilmaydi (§33).
 */
function RotatingKnob({ angle }: { angle: number }) {
  return (
    <group rotation={[0, angle, 0]}>
      {/* O'q — bo'yin ichidan chiqadi */}
      <Cyl
        pos={[0, (BUSHING_TOP + SHAFT.top) / 2, 0]}
        r={SHAFT.r}
        h={SHAFT.top - BUSHING_TOP}
        material={PM.shaft()}
        smooth
      />

      {/* Murvat — pastga qarab bir oz kengayadi */}
      <Cyl
        pos={[0, KNOB.bottom + KNOB.h / 2, 0]}
        r={KNOB.r}
        h={KNOB.h}
        material={PM.knob()}
        rTop={KNOB.rTop}
        smooth
      />

      {/*
        Yon qirralar (rifleniye) — barmoq tegadigan yuza.
        Sakkizta yupqa plastina butun aylanani o'ymakor qilib ko'rsatadi;
        haqiqiy naqshni geometriya bilan kesish yuzlab uchburchak
        qo'shardi (§20).
      */}
      {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
        <Box
          key={i}
          pos={[0, KNOB.bottom + KNOB.h * 0.45, 0]}
          rot={[0, (i * Math.PI) / 8, 0]}
          size={[KNOB.r * 2.02, KNOB.h * 0.7, 0.05]}
          material={PM.knurl()}
          shadow={false}
        />
      ))}

      <PotIndicator />
    </group>
  );
}

/**
 * Burilish ko'rsatkichi — murvatning ustida va yonida oq chiziq.
 *
 * Ikki qismdan: ustki chiziq tepadan qaralganda, yon chiziq esa
 * yonboshdan qaralganda ko'rinadi. Bittasi bilan cheklansa, kamera
 * burchagiga qarab ko'rsatkich yo'qolib qolardi.
 */
function PotIndicator() {
  return (
    <group>
      {/*
        Ustki chiziq — markazdan qirragacha.

        Murvat yuzasiga BOTIRILGAN (uning tepasidan chiqmaydi): bo'yoq
        chiziq bo'rtib tursa u tanlov ramkasidan oshib ketardi va
        chiziqdan ko'ra "yopishtirilgan tayoqcha" bo'lib ko'rinardi.
      */}
      <Box
        pos={[0, KNOB_TOP - 0.011, -KNOB.rTop * 0.5]}
        size={[0.09, 0.02, KNOB.rTop * 0.9]}
        material={PM.marker()}
        shadow={false}
      />
      {/* Yon chiziq — murvat yonboshida */}
      <Box
        pos={[0, KNOB.bottom + KNOB.h * 0.5, -KNOB.r * 0.99]}
        size={[0.08, KNOB.h * 0.62, 0.04]}
        material={PM.marker()}
        shadow={false}
      />
    </group>
  );
}

/**
 * Uchta oyoq va ular chiqadigan plastik taglik.
 *
 * Oyoqlar y = 0 dan PASTGA ham davom etadi: laboratoriyada oyoqli
 * komponentlar shu ko'rinishda — go'yo breadboardga sanchilgan (§14).
 * Ulanish nuqtasi esa aynan stol yuzasida, ya'ni ko'rinadigan metallda.
 */
function PotTerminals() {
  const pins = potPins();
  const z = pins[0]?.z ?? 0.64;
  const span = Math.max(...pins.map((p) => Math.abs(p.x))) * 2 + 0.28;

  return (
    <group>
      {/* Plastik taglik — oyoqlar korpusdan emas, shundan chiqadi */}
      <Box
        pos={[0, TERMINAL.plateH / 2, z]}
        size={[span, TERMINAL.plateH, TERMINAL.plateD]}
        material={PM.wafer()}
      />
      {pins.map((pin) => (
        <PotPin key={pin.id} x={pin.x} z={pin.z} />
      ))}
    </group>
  );
}

/** Bitta qalaylangan oyoq. */
function PotPin({ x, z }: { x: number; z: number }) {
  const top = TERMINAL.plateH - 0.04;
  const height = top - TERMINAL.pinBottom;

  return (
    <Box
      pos={[x, (top + TERMINAL.pinBottom) / 2, z]}
      size={[TERMINAL.pinW, height, TERMINAL.pinD]}
      material={PM.pin()}
    />
  );
}
