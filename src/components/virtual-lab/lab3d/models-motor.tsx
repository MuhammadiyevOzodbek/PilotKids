"use client";

import { localPinPosition, sizeOf } from "@/lib/virtual-lab/lab3d/layout";
import { Box, Cyl, Ring, mat } from "./model-kit";
import type { ModelProps } from "./models-boards";

/**
 * Kichik cho'tkali DC motor (§4, §5, §13).
 *
 * ── O'lchamlar HAQIQIY ──────────────────────────────────────────────────
 * Sahna birligi — santimetr (`layout.ts`). O'quv to'plamlaridagi motor:
 * banka ⌀25 mm, uzunligi 32 mm, val ⌀2.6 mm va 9 mm chiqib turadi. Shu
 * sababli motor Arduino (6.86 sm) yonida to'g'ri kattalikda ko'rinadi —
 * u haqiqatda ham plataning uchdan biricha keladi.
 *
 * ── Yo'nalish KATALOGDAN ────────────────────────────────────────────────
 * Katalogdagi ikkala terminal `y = 0.95` da, ya'ni komponentning OLD
 * qirrasida va X bo'yicha ikkiga ajralgan. Demak motor stol ustida
 * o'qi Z bo'ylab yotadi: klemmali qopqoq oldinda (bolaga qaragan
 * tomonda), val esa orqaga qaraydi.
 *
 * Ilgari model buni e'tiborsiz qoldirgan edi: banka X o'qi bo'ylab
 * yotardi va "klemmalar" chap tomonga chizilardi — ya'ni sim ulanadigan
 * nuqta bilan ko'zga ko'ringan metall BUTUNLAY boshqa joyda edi. Endi
 * ikkalasi bitta manbadan (`localPinPosition`) hisoblanadi (§14).
 *
 * ── Mantiq bu yerda YO'Q ────────────────────────────────────────────────
 * Tezlik, yo'nalish va kuchlanish `Simulator` da (§46). Model faqat
 * o'sha qiymatlarni ko'rsatadi: val uchidagi belgi tezlik bo'lganda
 * yashil bo'lib buriladi.
 */

/* ─────────────────────────── O'lchamlar (sm) ─────────────────────────── */

/** Metall banka: ⌀25 mm, uzunligi 32 mm. */
const CAN = { r: 1.25, len: 3.2 } as const;

/** Banka o'qi stol yuzasidan shu balandlikda — pastki nuqtasi aynan y = 0. */
const AXIS_Y = CAN.r;

/**
 * Banka Z bo'yicha qayerda tugaydi.
 *
 * Orqa (klemmali) qopqoq OLDINDA, ya'ni +Z da — chunki katalogdagi
 * ulanish nuqtalari shu tomonda. Val esa −Z ga chiqadi.
 *
 * Orqa chegara ataylab ulanish nuqtasidan (z = 1.98) BERIROQDA: klemma
 * tilchalari qopqoqdan tashqariga chiqib turishi kerak, aks holda ular
 * bankaning ichiga botib ketardi va ko'rinmasdi.
 */
const CAN_Z = { front: -1.2, rear: 1.85 } as const;

/**
 * Val: ⌀2.6 mm. Uzunligi bu yerda YOZILMAGAN — u komponentning to'liq
 * chuqurligidan hisoblanadi, ya'ni val uchi doim tanlov ramkasining
 * qirrasida tugaydi (ko'rinadigan qismi ≈ 9 mm).
 */
const SHAFT = { r: 0.13, collarR: 0.34, collarLen: 0.18 } as const;

/** Klemma tilchasi va uning izolyatsion asosi. */
const TAB = { w: 0.22, h: 0.42, d: 0.3 } as const;

/** Rezina beshiklar — motor stol ustida dumalab ketmasin. */
const CRADLE = { w: 0.3, h: 0.3, len: 2.2, x: 0.88 } as const;

/* ─────────────────────────── Materiallar ─────────────────────────── */

/*
 * Sirtlar ATAYLAB har xil (§13): banka shtamplangan po'lat, qopqoqlar bir
 * oz quyuqroq, val esa jilolangan — u eng yaltiroq qism. Materiallar
 * `mat()` orqali keshlanadi, ya'ni sahnadagi o'nta motor bitta shaderdan
 * foydalanadi (§33).
 */
const MM = {
  /** Tortilgan po'lat banka. */
  can: () => mat("#9198a3", { rough: 0.34, metal: 0.82 }),
  /** Bankadagi bo'ylama chok — biroz quyuqroq chiziq. */
  seam: () => mat("#6f757f", { rough: 0.42, metal: 0.7 }),
  /** Qopqoqlar — bankadan quyuqroq, boshqacha shtamp. */
  cap: () => mat("#7d838d", { rough: 0.4, metal: 0.76 }),
  /** Jilolangan val. */
  shaft: () => mat("#d3d9e0", { rough: 0.2, metal: 0.92 }),
  /** Val atrofidagi bronza vtulka. */
  bushing: () => mat("#b99a5e", { rough: 0.34, metal: 0.8 }),
  /** Klemma tilchalari — latun. */
  tab: () => mat("#cfa74a", { rough: 0.3, metal: 0.85 }),
  /** Klemmalar ostidagi izolyator. */
  insulator: () => mat("#1b1e24", { rough: 0.85 }),
  /** Rezina beshik. */
  rubber: () => mat("#16181c", { rough: 0.95 }),
  /** Havo teshiklari — yorug'lik tushmaydigan chuqurlik. */
  vent: () => mat("#0a0c10", { rough: 0.9 }),
};

/* ─────────────────────────── Klemmalar katalogdan ─────────────────────────── */

interface TerminalSpot {
  id: string;
  x: number;
  y: number;
  z: number;
}

let terminalCache: TerminalSpot[] | null = null;

/**
 * Klemmalarning o'rni — KATALOG nisbatlaridan.
 *
 * Manba `localPinPosition`, ya'ni `PinField` ulanish nuqtasini qo'yish
 * uchun ishlatadigan funksiyaning AYNAN o'zi. Shuning uchun sim doim
 * ko'zga ko'ringan latun tilchadan chiqadi va model o'lchami o'zgarsa
 * ikkalasi birga siljiydi.
 */
function terminals(): TerminalSpot[] {
  if (terminalCache) return terminalCache;
  terminalCache = (["t1", "t2"] as const).flatMap((id) => {
    const at = localPinPosition("dc-motor", id);
    return at ? [{ id, x: at.x, y: at.y, z: at.z }] : [];
  });
  return terminalCache;
}

/* ─────────────────────────── Model ─────────────────────────── */

export function DcMotorModel({ runtime }: ModelProps) {
  const { d } = sizeOf("dc-motor");
  const speed = runtime?.speed ?? 0;
  const direction = runtime?.direction ?? 1;

  /*
   * Val aylanishi kadr vaqtiga emas, TEZLIKKA bog'liq. Uzluksiz
   * aylantirish `useFrame` talab qiladi va u har kadrda React'ni
   * qo'zg'atardi (§33); shu bois bu yerda faqat burchak ko'rsatkichi —
   * yo'nalishga qarab burilgan belgi.
   */
  const spinning = speed > 0.02;
  const marker = spinning ? direction * 0.6 : 0;

  return (
    <group>
      <MotorCradle />
      <MotorCan />
      <MotorFrontCap />
      <OutputShaft depth={d} marker={marker} spinning={spinning} speed={speed} />
      <MotorRearCap />
      {terminals().map((spot) => (
        <MotorTerminal key={spot.id} spot={spot} />
      ))}
    </group>
  );
}

/* ─────────────────────────── Bo'laklar ─────────────────────────── */

/**
 * Metall banka — motorning tanasi.
 *
 * `smooth` bilan 48 qirrali: silindr yon tomondan katta ko'rinadi va 20
 * qirrada qirralari sanalib qolardi. Bo'ylama chok haqiqiy shtamplangan
 * bankada ham bor — u shaklni "quvur" emas, "yig'ilgan korpus" qiladi.
 */
function MotorCan() {
  const length = CAN_Z.rear - CAN_Z.front;
  const center = (CAN_Z.front + CAN_Z.rear) / 2;

  return (
    <group>
      <Cyl pos={[0, AXIS_Y, center]} r={CAN.r} h={length} material={MM.can()} axis="z" smooth />
      {/* Bo'ylama chok — bankaning yon tomonidagi ingichka chiziq */}
      <Box
        pos={[0, AXIS_Y + CAN.r - 0.01, center]}
        size={[0.09, 0.06, length - 0.2]}
        material={MM.seam()}
        shadow={false}
      />
      {/* Qopqoqlar tutashgan joydagi halqalar */}
      {[CAN_Z.front + 0.1, CAN_Z.rear - 0.1].map((z) => (
        <Ring
          key={z}
          pos={[0, AXIS_Y, z]}
          r={CAN.r - 0.02}
          tube={0.035}
          material={MM.seam()}
          segments={48}
        />
      ))}
    </group>
  );
}

/**
 * Old qopqoq — val chiqadigan tomon.
 *
 * Uch qatlam: bankaga botirilgan qopqoq → bronza vtulka → uning
 * atrofidagi havo teshiklari. Aynan shu tomon "quvvat chiqadigan yuza"
 * ekanini ko'rsatadi.
 *
 * Qopqoq bankadan KICHIKROQ: haqiqiy motorda ham u banka ichiga kirib
 * qisiladi. Kattaroq qilinsa eng keng nuqta qopqoq bo'lardi va model
 * tanlov ramkasidan chiqib turardi.
 */
function MotorFrontCap() {
  return (
    <group>
      <Cyl
        pos={[0, AXIS_Y, CAN_Z.front - 0.06]}
        r={CAN.r - 0.02}
        h={0.14}
        material={MM.cap()}
        axis="z"
        smooth
      />
      {/* Val atrofidagi vtulka */}
      <Cyl
        pos={[0, AXIS_Y, CAN_Z.front - 0.15 - SHAFT.collarLen / 2]}
        r={SHAFT.collarR}
        h={SHAFT.collarLen}
        material={MM.bushing()}
        axis="z"
        smooth
      />
      {/*
        Havo teshiklari — qopqoqqa tushirilgan uchta chuqurcha.
        Haqiqiy motorda ular teshik, lekin ularni geometriya bilan kesish
        bitta motorga yuzlab uchburchak qo'shardi (§20).
      */}
      {[0, 1, 2].map((i) => {
        const angle = (i * 2 * Math.PI) / 3 + Math.PI / 6;
        return (
          <Cyl
            key={i}
            pos={[Math.cos(angle) * 0.72, AXIS_Y + Math.sin(angle) * 0.72, CAN_Z.front - 0.13]}
            r={0.16}
            h={0.03}
            material={MM.vent()}
            axis="z"
            shadow={false}
          />
        );
      })}
    </group>
  );
}

/**
 * Chiqish vali va uning uchidagi aylanish belgisi.
 *
 * Belgi — bezak emas: u SIMULYATOR bergan tezlik va yo'nalishni
 * ko'rsatadi (§46). Motor to'xtaganda kulrang va tik turadi, aylanganda
 * yashil bo'lib yo'nalish tomon buriladi.
 */
function OutputShaft({
  depth,
  marker,
  spinning,
  speed,
}: {
  /** Komponentning to'liq chuqurligi — val undan chiqib ketmasligi kerak. */
  depth: number;
  marker: number;
  spinning: boolean;
  speed: number;
}) {
  const tip = -depth / 2 + 0.05;
  const start = CAN_Z.front - 0.2;
  const length = start - tip;

  return (
    <group>
      <Cyl
        pos={[0, AXIS_Y, (start + tip) / 2]}
        r={SHAFT.r}
        h={length}
        material={MM.shaft()}
        axis="z"
        smooth
      />
      {/* Val uchidagi kichik g'altak va undagi bo'yalgan chiziq */}
      <Cyl pos={[0, AXIS_Y, tip + 0.06]} r={0.26} h={0.1} material={MM.cap()} axis="z" smooth />
      <Box
        pos={[0, AXIS_Y, tip + 0.12]}
        rot={[0, 0, marker]}
        size={[0.07, 0.42 + speed * 0.12, 0.03]}
        material={mat(spinning ? "#33d17a" : "#5a616b")}
        shadow={false}
      />
    </group>
  );
}

/**
 * Orqa qopqoq — klemmalar shu yerda.
 *
 * Ustida qora izolyator plastinka: haqiqiy motorda ham tilchalar
 * metall qopqoqqa tegmasligi uchun plastik asosga o'rnatiladi.
 */
function MotorRearCap() {
  return (
    <group>
      <Cyl
        pos={[0, AXIS_Y, CAN_Z.rear + 0.07]}
        r={CAN.r - 0.02}
        h={0.14}
        material={MM.cap()}
        axis="z"
        smooth
      />
      <Cyl
        pos={[0, AXIS_Y, CAN_Z.rear + 0.16]}
        r={0.85}
        h={0.05}
        material={MM.insulator()}
        axis="z"
        smooth
        shadow={false}
      />
      {/* Markazdagi podshipnik burtmasi */}
      <Cyl
        pos={[0, AXIS_Y, CAN_Z.rear + 0.19]}
        r={0.22}
        h={0.08}
        material={MM.cap()}
        axis="z"
        smooth
        shadow={false}
      />
    </group>
  );
}

/**
 * Bitta klemma tilchasi.
 *
 * Joyi KATALOGDAN keladi, ya'ni sim ulanadigan nuqta tilchaning aynan
 * o'rtasida bo'ladi. Tilcha ostida kichik izolyator — u tilchani metall
 * qopqoqdan ajratib turadi.
 */
function MotorTerminal({ spot }: { spot: TerminalSpot }) {
  return (
    <group position={[spot.x, spot.y, spot.z]}>
      {/* Izolyator asos — qopqoq tomonga qaragan */}
      <Box
        pos={[0, -0.1, -0.12]}
        size={[TAB.w + 0.16, TAB.h * 0.7, TAB.d * 0.7]}
        material={MM.insulator()}
        shadow={false}
      />
      {/* Latun tilcha */}
      <Box pos={[0, 0, 0]} size={[TAB.w, TAB.h, TAB.d]} material={MM.tab()} />
      {/* Sim o'raladigan tirqish — tilchaning uchidagi teshik izi */}
      <Box
        pos={[0, TAB.h * 0.22, 0.02]}
        size={[TAB.w * 0.45, 0.1, TAB.d + 0.02]}
        material={MM.insulator()}
        shadow={false}
      />
    </group>
  );
}

/**
 * Rezina beshiklar — motorni ushlab turadigan ikki yostiqcha.
 *
 * Silindr stol ustida o'zicha turmaydi: yostiqchasiz model "dumalab
 * ketadigan quvur" bo'lib ko'rinardi. Ular bankaning yon yuzasiga tegib
 * turadi va shu bilan motorning stolga qanday o'rnatilishini ko'rsatadi.
 */
function MotorCradle() {
  return (
    <group>
      {[-1, 1].map((side) => (
        <Box
          key={side}
          pos={[side * CRADLE.x, CRADLE.h / 2, (CAN_Z.front + CAN_Z.rear) / 2]}
          size={[CRADLE.w, CRADLE.h, CRADLE.len]}
          material={MM.rubber()}
        />
      ))}
    </group>
  );
}
