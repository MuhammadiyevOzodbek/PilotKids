"use client";

import { CanvasTexture, SRGBColorSpace, type Texture } from "three";
import { getDefinition } from "@/lib/virtual-lab/catalog";
import { localPinPosition, sizeOf } from "@/lib/virtual-lab/lab3d/layout";
import { Box, Cyl, InstancedBoxes, M, Ring, mat, roundedPlate } from "./model-kit";

/**
 * HC-SR04 — ultratovushli masofa sensori (§4, §5, §13).
 *
 * ── Nega alohida fayl ───────────────────────────────────────────────────
 * Qolgan modullar o'n qatorlik: plata, korpus, header. Bu modulning esa
 * eng tanish qismi — ikkita metall "ko'z" — ko'p qatlamdan iborat
 * (banka, qirra halqasi, botiq membrana, konsentrik naqsh). Hammasi bitta
 * JSX bo'lagiga sig'sa, o'qib bo'lmasdi.
 *
 * ── O'lchamlar HAQIQIY ──────────────────────────────────────────────────
 * Sahna birligi — santimetr (`layout.ts`). Haqiqiy HC-SR04: plata
 * 45 × 20 × 1.6 mm, o'zgartkichlar ⌀16 mm. Shu sababli bu yerdagi
 * raqamlar to'g'ridan-to'g'ri o'lchov jadvalidan olingan va model boshqa
 * komponentlar yonida to'g'ri kattalikda ko'rinadi.
 *
 * ── Yo'nalish ───────────────────────────────────────────────────────────
 * Butun laboratoriyada modullar stol ustida YOTADI va ishchi yuzasi
 * yuqoriga qaraydi (PIR gumbazi, LCD ekrani shunday). HC-SR04 ham
 * shunday: to'g'ri header bilan breadboardga sanchilgan modul aynan shu
 * holatda turadi — plata gorizontal, o'zgartkichlar tepaga. Pinlar
 * plataning old qirrasida (+Z), ya'ni sim doim old tomondan chiqadi.
 *
 * ── Mantiq bu yerda YO'Q ────────────────────────────────────────────────
 * Model faqat shakl: masofa o'lchash, Trig/Echo impulslari va netlist
 * `Simulator` da qoladi (§46). Ulanish nuqtalari ham bu faylda emas —
 * ular `PinField` da, KATALOG nisbatlaridan hisoblanadi. Shu sababli
 * bu yerdagi ko'rinadigan pinlar ham aynan o'sha nisbatlardan chiziladi:
 * ko'zga ko'ringan oyoq bilan sim yopishadigan nuqta hech qachon
 * ajralib qolmaydi.
 */

/* ─────────────────────────── O'lchamlar (sm) ─────────────────────────── */

/** Plata qalinligi — haqiqiy 1.6 mm. */
const PCB_T = 0.17;

/** Plata burchagining yumaloqlanish radiusi. */
const PCB_CORNER = 0.22;

/** Plataning ustki yuzasi — hamma detal shu balandlikdan boshlanadi. */
const TOP = PCB_T;

/** Ultratovush o'zgartkichi: ⌀15 mm banka, plataning old qirrasidan orqaroqda. */
const CAN = {
  /** Markazlari orasi 25 mm — haqiqiy modulda ham shunday. */
  x: 1.25,
  /**
   * Markazdan bir oz ORQAGA surilgan.
   *
   * Bankalar plataning deyarli butun chuqurligini egallaydi, header esa
   * old qirrada. Shu siljish old tomonda VCC/TRIG/ECHO/GND yozuvlari
   * uchun tor yo'lak qoldiradi — haqiqiy modulda ham shunday.
   */
  z: -0.2,
  r: 0.75,
  /** Metall banka balandligi (qirra halqasisiz). */
  bodyH: 1.13,
} as const;

/** Banka tepasi — qirra halqasi shu balandlikda o'tiradi. */
const CAN_TOP = TOP + CAN.bodyH;

/** Header: qora plastik asos va oltin oyoqlarning o'lchami. */
const HEADER = {
  baseH: 0.2,
  pinH: 0.45,
  pinW: 0.075,
} as const;

/*
 * Instansiyalangan qismlarning o'lchami va o'rni MODUL darajasida.
 *
 * Render ichida yozilsa har kadrda yangi massiv paydo bo'lardi va
 * `InstancedBoxes` matritsalarni behuda qayta hisoblardi (§33).
 */
const PIN_SIZE: [number, number, number] = [HEADER.pinW, HEADER.pinH, HEADER.pinW];

const SMD_SIZE: [number, number, number] = [0.12, 0.07, 0.16];

const SMD_RESISTORS: ReadonlyArray<readonly [number, number, number]> = [
  [-0.26, PCB_T + 0.035, 0.1],
  [0.26, PCB_T + 0.035, 0.1],
];

const SMD_CAPS: ReadonlyArray<readonly [number, number, number]> = [
  [-0.24, PCB_T + 0.035, 0.52],
  [0.24, PCB_T + 0.035, 0.52],
];

/** Pin yozuvlari — bankalar bilan header orasidagi tor yo'lakda. */
const LABEL_Z = 0.63;

/** Modul nomi o'zgartkichlar orasidagi yo'lakda. */
const BRAND_Z = 0.3;

/* ─────────────────────────── Materiallar ─────────────────────────── */

/*
 * Sirtlar ATAYLAB har xil (§13). Haqiqiy modulda ko'k lak deyarli mat,
 * alyuminiy banka esa yaltiroq — ko'z "haqiqiy" degan xulosani aynan shu
 * qarama-qarshilikdan chiqaradi. Materiallar `mat()` orqali keshlanadi,
 * ya'ni sahnada o'nta sensor bo'lsa ham shader bir marta kompilyatsiya
 * qilinadi (§33).
 */
const UM = {
  /** Ko'k lak qoplama — mat, deyarli metall yaltirog'isiz. */
  pcb: () => mat("#0866AD", { rough: 0.72, metal: 0.04 }),
  /** Kesilgan qirra — lak yo'q, shuning uchun quyuqroq. */
  pcbEdge: () => mat("#064a80", { rough: 0.82 }),
  /** Tortilgan alyuminiy banka. */
  can: () => mat("#c4cad3", { rough: 0.3, metal: 0.82 }),
  /** Bankaning bukilgan qirrasi — bir oz yorqinroq. */
  canRim: () => mat("#dde2e9", { rough: 0.24, metal: 0.88 }),
  /** Akustik membrana — quyuq grafit, metall emas. */
  membrane: () => mat("#202428", { rough: 0.7, metal: 0.15 }),
  /** Membranadagi konsentrik naqsh. */
  mesh: () => mat("#3a4149", { rough: 0.62, metal: 0.25 }),
  /** Header oyog'i — oltin qoplamali latun. */
  pin: () => mat("#D6A83B", { rough: 0.25, metal: 0.78 }),
  /** Kvars rezonator korpusi. */
  crystal: () => mat("#b7bec7", { rough: 0.32, metal: 0.8 }),
  /** SMD kondensator. */
  smdDark: () => mat("#4a3a28", { rough: 0.6 }),
  /** SMD rezistor. */
  smdLight: () => mat("#cbb894", { rough: 0.7 }),
  /** O'rnatish teshigi — yorug'lik tushmaydigan chuqurlik. */
  hole: () => mat("#05080c", { rough: 0.95 }),
};

/* ─────────────────────────── Oyoqlar katalogdan ─────────────────────────── */

interface PinVisual {
  /** Plataga bosiladigan yozuv — VCC, TRIG, ECHO, GND. */
  label: string;
  x: number;
  z: number;
}

let pinCache: PinVisual[] | null = null;
let pinBoxCache: ReadonlyArray<readonly [number, number, number]> | null = null;

/**
 * Ko'rinadigan oyoqlarning o'rni — KATALOG nisbatlaridan.
 *
 * Qo'lda yozilgan koordinata bir kun kelib katalogdan ajralib qolardi va
 * sim ko'zga ko'ringan oyoqning yonidan chiqib ketardi. Bu yerda esa
 * ikkalasi bitta manbadan: `localPinPosition` — `PinField` ulanish
 * nuqtasini qo'yish uchun ishlatadigan funksiyaning AYNAN o'zi.
 *
 * Natija bir marta hisoblanadi: katalog ish vaqtida o'zgarmaydi.
 */
function ultrasonicPins(): PinVisual[] {
  if (pinCache) return pinCache;

  const def = getDefinition("ultrasonic");
  pinCache =
    def?.pins.flatMap((pin) => {
      const at = localPinPosition("ultrasonic", pin.id);
      return at ? [{ label: pin.id.toUpperCase(), x: at.x, z: at.z }] : [];
    }) ?? [];
  return pinCache;
}

/** Oltin oyoqlarning instansiya o'rinlari. */
function pinBoxPositions(): ReadonlyArray<readonly [number, number, number]> {
  pinBoxCache ??= ultrasonicPins().map((pin) => [pin.x, TOP + HEADER.pinH / 2, pin.z] as const);
  return pinBoxCache;
}

/* ─────────────────────────── Model ─────────────────────────── */

export function UltrasonicModel() {
  const { w, d } = sizeOf("ultrasonic");
  const pins = ultrasonicPins();
  const silkscreen = silkscreenTexture(pins, w, d);
  const headerZ = pins[0]?.z ?? d / 2 - 0.16;

  return (
    <group>
      <Pcb width={w} depth={d} />
      {/* Yozuv qatlami plata yuzasidan bir necha mikron balandda — aks holda
          ikki yuza chuqurlik bo'yicha "urishib" miltillardi. */}
      {silkscreen && (
        <mesh position={[0, TOP + 0.003, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[w, d]} />
          <meshStandardMaterial map={silkscreen} transparent roughness={0.75} depthWrite={false} />
        </mesh>
      )}

      <UltrasonicTransducer x={-CAN.x} />
      <UltrasonicTransducer x={CAN.x} />

      <Electronics />

      {/* Header — qora plastik asos va undan chiqqan oltin oyoqlar */}
      <Box
        pos={[0, TOP + HEADER.baseH / 2, headerZ]}
        size={[w * 0.86, HEADER.baseH, 0.2]}
        material={M.headerBlack()}
      />
      <InstancedBoxes items={pinBoxPositions()} size={PIN_SIZE} material={UM.pin()} shadow />

      {/* O'rnatish teshiklari — burchaklarda, oyoqlardan chetda */}
      {[
        [-w / 2 + 0.17, -d / 2 + 0.2],
        [w / 2 - 0.17, -d / 2 + 0.2],
        [-w / 2 + 0.17, d / 2 - 0.2],
        [w / 2 - 0.17, d / 2 - 0.2],
      ].map(([x, z]) => (
        <Cyl
          key={`${x},${z}`}
          pos={[x!, TOP - 0.005, z!]}
          r={0.07}
          h={0.03}
          material={UM.hole()}
          shadow={false}
        />
      ))}
    </group>
  );
}

/* ─────────────────────────── Bo'laklar ─────────────────────────── */

/** Yupqa ko'k plata: ustki yuzasi lakli, qirrasi quyuqroq. */
function Pcb({ width, depth }: { width: number; depth: number }) {
  // `roundedPlate` o'lcham bo'yicha keshlangan — har render da yangi
  // geometriya yaratilmaydi.
  return (
    <mesh
      geometry={roundedPlate(width, depth, PCB_T, PCB_CORNER)}
      material={[UM.pcb(), UM.pcbEdge()]}
      castShadow
      receiveShadow
    />
  );
}

/**
 * Bitta ultratovush o'zgartkichi.
 *
 * Qatlamlar haqiqiy detaldagidek: alyuminiy banka → bukilgan qirra →
 * undan pastda botiq akustik membrana → membranadagi konsentrik naqsh.
 * Aynan shu botiqlik tufayli qorong'i markaz atrofida kumush halqa
 * ko'rinadi va detal "ikki qora g'ildirak" bo'lib qolmaydi.
 */
function UltrasonicTransducer({ x }: { x: number }) {
  return (
    <group position={[x, 0, CAN.z]}>
      {/* Alyuminiy banka */}
      <Cyl pos={[0, TOP + CAN.bodyH / 2, 0]} r={CAN.r} h={CAN.bodyH} material={UM.can()} smooth />
      {/* Plataga o'tirgan joyidagi payvand halqasi */}
      <Ring pos={[0, TOP + 0.05, 0]} r={CAN.r - 0.01} tube={0.035} material={UM.can()} />
      {/* Korpusdagi bosma chok */}
      <Ring pos={[0, TOP + 0.63, 0]} r={CAN.r - 0.015} tube={0.028} material={UM.canRim()} />

      {/* Bukilgan qirra — botiq markaz atrofidagi kumush halqa */}
      <Ring
        pos={[0, CAN_TOP, 0]}
        r={CAN.r - 0.065}
        tube={0.065}
        material={UM.canRim()}
        segments={48}
        shadow
      />

      {/* Botiq akustik membrana — qirradan ~0.5 mm pastda */}
      <Cyl
        pos={[0, CAN_TOP - 0.03, 0]}
        r={CAN.r - 0.12}
        h={0.04}
        material={UM.membrane()}
        smooth
        shadow={false}
      />
      {/*
        Panjara naqshi — ikkita ingichka halqa va markaz.

        Haqiqiy to'r yuzlab teshikdan iborat, lekin ularni geometriya
        bilan chizish bitta sensorga minglab uchburchak qo'shardi (§20).
        Konsentrik halqa esa o'sha taassurotni uch meshda beradi.
      */}
      <Ring
        pos={[0, CAN_TOP - 0.005, 0]}
        r={0.26}
        tube={0.012}
        material={UM.mesh()}
        segments={36}
      />
      <Ring
        pos={[0, CAN_TOP - 0.005, 0]}
        r={0.45}
        tube={0.012}
        material={UM.mesh()}
        segments={36}
      />
      <Cyl pos={[0, CAN_TOP - 0.005, 0]} r={0.07} h={0.03} material={UM.mesh()} shadow={false} />
    </group>
  );
}

/**
 * O'zgartkichlar orasidagi yo'lakdagi elektronika.
 *
 * Faqat KO'RINISH uchun: simulyatsiyada bu detallar yo'q va bo'lishi
 * ham shart emas — ular plataning bo'sh ko'rinmasligi uchun.
 */
function Electronics() {
  return (
    <group>
      {/* Kvars rezonator — metall korpus */}
      <Box
        pos={[0, TOP + 0.08, -0.62]}
        size={[0.42, 0.16, 0.28]}
        material={UM.crystal()}
        shadow={false}
      />
      {/* Boshqaruvchi mikrosxema */}
      <Box
        pos={[0, TOP + 0.055, -0.15]}
        size={[0.46, 0.11, 0.32]}
        material={M.icBlack()}
        shadow={false}
      />
      {/* Mayda SMD elementlar */}
      <InstancedBoxes items={SMD_RESISTORS} size={SMD_SIZE} material={UM.smdLight()} />
      <InstancedBoxes items={SMD_CAPS} size={SMD_SIZE} material={UM.smdDark()} />
    </group>
  );
}

/* ─────────────────────────── Silkscreen ─────────────────────────── */

const silkCache = new Map<string, Texture | null>();

/**
 * Plata ustidagi bosma qatlam: modul nomi va pin yozuvlari (§7, §8, §14).
 *
 * Yozuv GEOMETRIYA bilan chizilmaydi va tashqi shrift ham yuklanmaydi —
 * `uno-silkscreen.ts` dagi bilan bir xil yondashuv: hammasi bitta kanvasga
 * tushadi, ya'ni butun yozuv qatlami bitta qo'shimcha yuza (§20).
 * Laboratoriya internetsiz ham ishlashi kerak.
 *
 * Pin yozuvlarining X o'rni KATALOG nisbatidan keladi, shuning uchun
 * "Trig" yozuvi doim o'z oyog'ining tepasida turadi.
 */
function silkscreenTexture(
  labels: ReadonlyArray<{ label: string; x: number }>,
  width: number,
  depth: number,
): Texture | null {
  const key = labels.map((l) => `${l.label}@${l.x}`).join("|");
  const cached = silkCache.get(key);
  if (cached !== undefined) return cached;

  if (typeof document === "undefined") return null;

  const height = 256;
  const canvas = document.createElement("canvas");
  canvas.height = height;
  canvas.width = Math.round((height * width) / depth);

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    silkCache.set(key, null);
    return null;
  }

  /** Sm → kanvas piksel. */
  const px = height / depth;
  const toU = (x: number) => (x / width + 0.5) * canvas.width;
  const toV = (z: number) => (z / depth + 0.5) * height;

  // Haqiqiy silkscreen sof oq emas — biroz kulrang.
  ctx.fillStyle = "#dfe7f0";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  ctx.font = `bold ${Math.round(px * 0.15)}px system-ui, sans-serif`;
  for (const { label, x } of labels) {
    ctx.fillText(label.toUpperCase(), toU(x), toV(LABEL_Z));
  }

  ctx.globalAlpha = 0.8;
  ctx.font = `bold ${Math.round(px * 0.19)}px system-ui, sans-serif`;
  ctx.fillText("HC-SR04", toU(0), toV(BRAND_Z));

  // O'rnatish teshiklari atrofidagi kontakt halqasi.
  ctx.globalAlpha = 0.45;
  ctx.lineWidth = Math.max(1, px * 0.035);
  ctx.strokeStyle = "#dfe7f0";
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      ctx.beginPath();
      ctx.arc(
        toU(sx * (width / 2 - 0.17)),
        toV(sz * (depth / 2 - 0.2)),
        px * 0.115,
        0,
        Math.PI * 2,
      );
      ctx.stroke();
    }
  }

  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.anisotropy = 4;
  silkCache.set(key, texture);
  return texture;
}
