"use client";

import { CatmullRomCurve3, TubeGeometry, Vector3, type Material } from "three";
import { getDefinition } from "@/lib/virtual-lab/catalog";
import { localPinPosition } from "@/lib/virtual-lab/lab3d/layout";
import { Box, Cyl, Ring, mat, num, roundedPlate } from "./model-kit";
import type { ModelProps } from "./models-boards";

/**
 * SG90 uslubidagi mikroservo (§4, §5, §13).
 *
 * ── O'lchamlar HAQIQIY ──────────────────────────────────────────────────
 * Sahna birligi — santimetr (`layout.ts`). Haqiqiy SG90: korpus
 * 22.8 × 12.2 × 22.5 mm, qanotlari bilan uzunligi 32.2 mm, qanot
 * teshiklari orasi 27.8 mm. Servo KICHIK: u Arduino platasining yarmicha
 * ham kelmaydi va model shuni ko'rsatishi kerak — ilgari u deyarli plata
 * bo'yida edi.
 *
 * ── Nima aylanadi ───────────────────────────────────────────────────────
 * FAQAT qanot guruhi (rul): o'q, stupitsa, ikkita yelka va markazdagi
 * vint. Korpus, qanotchalar va kabel qimirlamaydi. Burchak
 * SIMULYATORDAN keladi, simulyatsiya ishlamayotganda esa sozlamadan —
 * bu qoida ilgarigidek qoldirilgan (§46).
 *
 * ── Kabel va uchlari ────────────────────────────────────────────────────
 * Katalogda uchta ulanish nuqtasi korpusdan TASHQARIDA, old qirrada
 * turadi. Shuning uchun model haqiqiy jihozni ko'rsatadi: korpusdan
 * uch simli kabel chiqadi va har bir sim o'z uyachasi bilan tugaydi —
 * sim aynan o'sha uyachaga ulanadi (§14).
 *
 * Bitta uch pinli qapqoq (haqiqiy servo razyomi) ATAYLAB qilinmadi:
 * katalog nuqtalari orasi ~1 sm, haqiqiy razyomda esa 2.54 mm. Bitta
 * korpusga sig'dirish uchun uni uch barobar kattalashtirish kerak
 * bo'lardi va u servoning o'zidan kattaroq ko'rinardi.
 */

/* ─────────────────────────── O'lchamlar (sm) ─────────────────────────── */

/** Korpus: 22.8 × 12.2 mm, balandligi 20.5 mm (yuqori qopqoqsiz). */
const CASE = { w: 2.28, d: 1.22, h: 2.05, corner: 0.1 } as const;

/** Yuqori qopqoq — reduktor tomoni, korpusdan bir oz kichik. */
const COVER = { h: 0.2, inset: 0.05 } as const;

/** Korpusning eng tepasi. */
const CASE_TOP = CASE.h + COVER.h;

/**
 * O'rnatish qanotchalari — korpusning YUQORI qismida.
 *
 * Haqiqiy SG90 da ular tepaga yaqin turadi va korpusdan ancha yupqa.
 */
const EAR = { h: 0.2, d: 1.0, y: 1.62, tip: 1.61, holeR: 0.13, holeX: 1.39 } as const;

/**
 * Reduktor bo'rtmasi va chiqish o'qi.
 *
 * `x` — markazdan siljish: haqiqiy servoda o'q korpus markazida EMAS,
 * bir chetga yaqin turadi. Aynan shu siljish uni "qutichaga o'rnatilgan
 * g'ildirak" emas, servo qilib ko'rsatadi.
 */
const GEARBOX = { x: -0.62, r: 0.33, h: 0.2, secondR: 0.2, secondX: 0.15 } as const;

/** Reduktor bo'rtmasining tepasi. */
const BOSS_TOP = CASE_TOP + GEARBOX.h;

/** Chiqish o'qi (shlitsli). */
const SPLINE = { r: 0.16, h: 0.14 } as const;

/** Rul (qanot): ikki yelkali, yelka uzunligi 9 mm. */
const HORN = { arm: 0.9, width: 0.24, thick: 0.07, hubR: 0.26, hubH: 0.16 } as const;

/** Rul yuzasi — vint shu balandlikda. */
const HORN_Y = BOSS_TOP + SPLINE.h - 0.02;

/** Kabel uyachasi — har bir sim o'z uyachasi bilan tugaydi. */
const SOCKET = { w: 0.3, h: 0.34, d: 0.2 } as const;

/* ─────────────────────────── Materiallar ─────────────────────────── */

/*
 * Sirtlar ATAYLAB har xil (§13): korpus quyma plastik, rul och rangli va
 * matroq, vint esa metall. Materiallar `mat()` orqali keshlanadi (§33).
 */
const SM = {
  /** Ko'k quyma plastik korpus. */
  case: () => mat("#1769aa", { rough: 0.55, metal: 0.03 }),
  /** Yuqori qopqoq — quyish qolipi boshqa, tusi ham bir oz farq qiladi. */
  cover: () => mat("#1a75bd", { rough: 0.5, metal: 0.03 }),
  /** Korpus choki va pastki panel. */
  seam: () => mat("#10527f", { rough: 0.68 }),
  /** Rul — och kulrang plastik. */
  horn: () => mat("#e8e8e5", { rough: 0.55 }),
  /** Chiqish o'qi — quyuqroq plastik. */
  spline: () => mat("#c9ccd2", { rough: 0.45 }),
  /** Markaziy vint. */
  screw: () => mat("#c2c9d2", { rough: 0.25, metal: 0.8 }),
  /** Qanotcha teshigi va rul teshiklari — yorug'lik tushmaydigan chuqurlik. */
  hole: () => mat("#0a1018", { rough: 0.92 }),
  /** Kabel uyachasi va kabel chiqishi. */
  connector: () => mat("#15171b", { rough: 0.8 }),
  /** Yopishtirilgan yorliq. */
  label: () => mat("#eef1f5", { rough: 0.72 }),
};

/** Uch simning rangi — haqiqiy servo kabelidagidek. */
const WIRE_COLORS: Record<string, string> = {
  gnd: "#5a3a26",
  vcc: "#c0392b",
  signal: "#e08a2e",
};

/* ─────────────────────────── Pinlar katalogdan ─────────────────────────── */

interface PinSpot {
  id: string;
  x: number;
  y: number;
  z: number;
}

let pinCache: PinSpot[] | null = null;

/**
 * Kabel uchlarining o'rni — KATALOGDAN.
 *
 * Manba `localPinPosition`, ya'ni `PinField` ishlatadigan funksiyaning
 * aynan o'zi. Shu sababli sim doim ko'zga ko'ringan uyachadan chiqadi.
 */
function servoPins(): PinSpot[] {
  if (pinCache) return pinCache;
  const def = getDefinition("servo");
  pinCache =
    def?.pins.flatMap((pin) => {
      const at = localPinPosition("servo", pin.id);
      return at ? [{ id: pin.id, x: at.x, y: at.y, z: at.z }] : [];
    }) ?? [];
  return pinCache;
}

/* ─────────────────────────── Model ─────────────────────────── */

export function ServoMotorModel({ settings, runtime }: ModelProps) {
  // Burchak simulyatordan; simulyatsiya yo'q bo'lsa sozlamadagi qiymat.
  const angle = runtime?.angle ?? num(settings, "angle", 90);
  const rad = ((angle - 90) * Math.PI) / 180;

  return (
    <group>
      <ServoHousing />
      <Gearbox />
      <ServoHorn angle={rad} />
      <ServoCable />
    </group>
  );
}

/* ─────────────────────────── Korpus ─────────────────────────── */

/**
 * Korpus, yuqori qopqoq, qanotchalar va yorliq.
 *
 * Korpus IKKI bo'lakdan: pastki tana va uning ustidagi qopqoq. Orasidagi
 * chok haqiqiy quyma korpusda ham bor va shakl "ko'k g'isht" bo'lib
 * qolmasligi uchun eng arzon vosita.
 */
function ServoHousing() {
  return (
    <group>
      {/* Asosiy tana */}
      <mesh
        geometry={roundedPlate(CASE.w, CASE.d, CASE.h, CASE.corner)}
        material={[SM.case(), SM.case()]}
        castShadow
        receiveShadow
      />
      {/* Yuqori qopqoq — bir oz kichik, shuning uchun qirra ko'rinadi */}
      <mesh
        position={[0, CASE.h, 0]}
        geometry={roundedPlate(
          CASE.w - COVER.inset,
          CASE.d - COVER.inset,
          COVER.h,
          CASE.corner - 0.02,
        )}
        material={[SM.cover(), SM.cover()]}
        castShadow
      />
      {/* Korpus choki */}
      <Box
        pos={[0, CASE.h - 0.02, 0]}
        size={[CASE.w + 0.008, 0.04, CASE.d + 0.008]}
        material={SM.seam()}
        shadow={false}
      />
      {/* Pastki panel — tag tomoni ham tugallangan ko'rinsin */}
      <Box
        pos={[0, 0.04, 0]}
        size={[CASE.w - 0.14, 0.08, CASE.d - 0.14]}
        material={SM.seam()}
        shadow={false}
      />

      <MountingEar side={-1} />
      <MountingEar side={1} />

      {/* Orqa yuzadagi yorliq — brend emas, faqat texnik yozuv */}
      <Box
        pos={[0.1, CASE.h * 0.52, -CASE.d / 2 - 0.004]}
        size={[CASE.w * 0.62, CASE.h * 0.4, 0.01]}
        material={SM.label()}
        shadow={false}
      />
      <Box
        pos={[0.1, CASE.h * 0.52, -CASE.d / 2 - 0.008]}
        size={[CASE.w * 0.42, 0.05, 0.005]}
        material={SM.seam()}
        shadow={false}
      />

      {/* Kabel chiqishi — old yuzaning pastki qismida */}
      <Box
        pos={[-0.35, 0.3, CASE.d / 2 + 0.05]}
        size={[0.5, 0.34, 0.14]}
        material={SM.connector()}
      />
    </group>
  );
}

/**
 * O'rnatish qanotchasi va undagi teshik.
 *
 * Qanotcha korpusdan ANCHA yupqa (2 mm) va tepaga yaqin turadi —
 * haqiqiy servoda ham shunday. Ilgari u korpus bilan bir xil qalinlikda
 * edi va butun detal bitta katta g'ishtga o'xshab qolgandi.
 */
function MountingEar({ side }: { side: -1 | 1 }) {
  const inner = CASE.w / 2 - 0.05;
  const length = EAR.tip - inner;

  return (
    <group>
      <mesh
        position={[side * (inner + length / 2), EAR.y, 0]}
        geometry={roundedPlate(length, EAR.d, EAR.h, 0.09)}
        material={[SM.case(), SM.case()]}
        castShadow
      />
      {/* Teshik — ustidan qaralganda aniq ko'rinadi */}
      <Cyl
        pos={[side * EAR.holeX, EAR.y + EAR.h - 0.02, 0]}
        r={EAR.holeR}
        h={0.06}
        material={SM.hole()}
        smooth
        shadow={false}
      />
      {/* Teshik atrofidagi bo'rtma halqa */}
      <Ring
        pos={[side * EAR.holeX, EAR.y + EAR.h - 0.01, 0]}
        r={EAR.holeR + 0.045}
        tube={0.03}
        material={SM.cover()}
        segments={24}
      />
    </group>
  );
}

/* ─────────────────────────── Reduktor ─────────────────────────── */

/**
 * Reduktor bo'rtmasi va chiqish o'qi.
 *
 * Ichki tishli g'ildiraklar ATAYLAB chizilmagan (§27): servo yopiq
 * jihoz, ularni ko'rish imkoni yo'q va har bir servoga minglab
 * uchburchak qo'shish behuda bo'lardi.
 */
function Gearbox() {
  return (
    <group>
      {/* Asosiy bo'rtma — o'q shu markazda */}
      <Cyl
        pos={[GEARBOX.x, CASE_TOP + GEARBOX.h / 2, 0]}
        r={GEARBOX.r}
        h={GEARBOX.h}
        material={SM.cover()}
        smooth
      />
      {/* Yonidagi kichik bo'rtma — ikkinchi o'q joyi */}
      <Cyl
        pos={[GEARBOX.secondX, CASE_TOP + GEARBOX.h * 0.4, 0]}
        r={GEARBOX.secondR}
        h={GEARBOX.h * 0.8}
        material={SM.cover()}
        smooth
        shadow={false}
      />
      {/* Bo'rtma atrofidagi lab */}
      <Ring
        pos={[GEARBOX.x, CASE_TOP + 0.02, 0]}
        r={GEARBOX.r + 0.03}
        tube={0.03}
        material={SM.seam()}
        segments={32}
      />
    </group>
  );
}

/* ─────────────────────────── Rul ─────────────────────────── */

/**
 * Aylanadigan rul: o'q, stupitsa, ikkita yelka va vint.
 *
 * Butun guruh reduktor markazida Y o'qi atrofida buriladi — ya'ni
 * burchak o'zgarsa faqat bitta `rotation` yangilanadi, geometriya esa
 * qayta qurilmaydi (§33).
 */
function ServoHorn({ angle }: { angle: number }) {
  return (
    <group position={[GEARBOX.x, 0, 0]} rotation={[0, angle, 0]}>
      {/* Shlitsli chiqish o'qi */}
      <Cyl
        pos={[0, BOSS_TOP + SPLINE.h / 2, 0]}
        r={SPLINE.r}
        h={SPLINE.h}
        material={SM.spline()}
        smooth
      />

      {/* Stupitsa */}
      <Cyl
        pos={[0, HORN_Y + HORN.hubH / 2, 0]}
        r={HORN.hubR}
        h={HORN.hubH}
        material={SM.horn()}
        smooth
      />

      <HornArm side={-1} />
      <HornArm side={1} />

      {/* Markaziy vint va uning tirqishi */}
      <Cyl
        pos={[0, HORN_Y + HORN.hubH, 0]}
        r={0.09}
        h={0.05}
        material={SM.screw()}
        smooth
        shadow={false}
      />
      <Box
        pos={[0, HORN_Y + HORN.hubH + 0.026, 0]}
        size={[0.12, 0.012, 0.03]}
        material={SM.hole()}
        shadow={false}
      />
    </group>
  );
}

/**
 * Rulning bitta yelkasi.
 *
 * Shakli — uchi yumaloq tasma (`roundedPlate` da radius enining yarmiga
 * teng): to'g'ri burchakli tayoqcha "rul" bo'lib ko'rinmasdi. Yelkada
 * ikkita mayda teshik bor — haqiqiy rulda ular tortqi mahkamlanadigan
 * joy.
 */
function HornArm({ side }: { side: -1 | 1 }) {
  const length = HORN.arm;

  return (
    <group position={[side * (length / 2 + 0.06), 0, 0]}>
      <mesh
        position={[0, HORN_Y + 0.02, 0]}
        geometry={roundedPlate(length, HORN.width, HORN.thick, HORN.width / 2)}
        material={[SM.horn(), SM.horn()]}
        castShadow
      />
      {[0.16, 0.34].map((offset) => (
        <Cyl
          key={offset}
          pos={[side * offset, HORN_Y + HORN.thick, 0]}
          r={0.045}
          h={0.03}
          material={SM.hole()}
          smooth
          shadow={false}
        />
      ))}
    </group>
  );
}

/* ─────────────────────────── Kabel ─────────────────────────── */

const cableCache = new Map<string, TubeGeometry>();

/**
 * Korpusdan uyachagacha bo'lgan bitta sim.
 *
 * Egri chiziq bilan: to'g'ri tayoqcha "sim" bo'lib ko'rinmaydi.
 * Geometriya uch nuqtasi bo'yicha keshlanadi — sahnadagi barcha servo
 * uchta shakldan foydalanadi (§33).
 */
function cableGeometry(toX: number, toZ: number): TubeGeometry {
  const key = `${toX}|${toZ}`;
  const cached = cableCache.get(key);
  if (cached) return cached;

  const start = new Vector3(-0.35, 0.3, CASE.d / 2 + 0.1);
  const curve = new CatmullRomCurve3(
    [
      start,
      new Vector3(-0.35 + (toX + 0.35) * 0.3, 0.26, CASE.d / 2 + 0.3),
      new Vector3(toX * 0.85, 0.2, (CASE.d / 2 + toZ) / 2 + 0.1),
      new Vector3(toX, 0.16, toZ - SOCKET.d / 2),
    ],
    false,
    "catmullrom",
    0.4,
  );

  const created = new TubeGeometry(curve, 14, 0.045, 6, false);
  cableCache.set(key, created);
  return created;
}

/** Uch simli kabel va uchidagi uyachalar. */
function ServoCable() {
  return (
    <group>
      {servoPins().map((pin) => (
        <CableLead
          key={pin.id}
          pin={pin}
          color={mat(WIRE_COLORS[pin.id] ?? "#5a3a26", { rough: 0.6 })}
        />
      ))}
    </group>
  );
}

/** Bitta sim va uning uyachasi — ulanish nuqtasi uyacha markazida. */
function CableLead({ pin, color }: { pin: PinSpot; color: Material }) {
  return (
    <group>
      <mesh geometry={cableGeometry(pin.x, pin.z)} material={color} castShadow />
      {/* Uyacha korpusi */}
      <Box
        pos={[pin.x, pin.y, pin.z]}
        size={[SOCKET.w, SOCKET.h, SOCKET.d]}
        material={SM.connector()}
      />
      {/* Uyacha og'zi — metall kontakt shu chuqurchada */}
      <Box
        pos={[pin.x, pin.y, pin.z + SOCKET.d / 2 - 0.01]}
        size={[SOCKET.w * 0.45, SOCKET.h * 0.45, 0.03]}
        material={SM.hole()}
        shadow={false}
      />
      {/* Qutbni bildiruvchi rangli halqa — sim rangi bilan bir xil */}
      <Box
        pos={[pin.x, pin.y - SOCKET.h / 2 + 0.04, pin.z]}
        size={[SOCKET.w + 0.01, 0.07, SOCKET.d + 0.01]}
        material={color}
        shadow={false}
      />
    </group>
  );
}
