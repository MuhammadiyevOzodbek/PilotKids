"use client";

import { useMemo } from "react";
import { CanvasTexture, SRGBColorSpace, type Texture } from "three";
import { getDefinition } from "@/lib/virtual-lab/catalog";
import { localPinPosition, sizeOf } from "@/lib/virtual-lab/lab3d/layout";
import { Box, Cyl, Emissive, InstancedBoxes, M, mat, roundedPlate } from "./model-kit";
import type { ModelProps } from "./models-boards";

/**
 * Bir kanalli rele moduli (§4, §5, §13).
 *
 * ── Bu MODUL, yalang'och rele emas ──────────────────────────────────────
 * Katalogda oltita pin bor: uchtasi boshqaruv tomonida (VCC, GND, IN),
 * uchtasi esa yuk tomonida (NC, COM, NO). Bu — Arduino to'plamlaridagi
 * relay moduli: platasi, drayver tranzistori, optopara va vintli
 * klemmalari bilan. Model ham aynan shuni ko'rsatadi.
 *
 * ── Yo'nalish KATALOGDAN ────────────────────────────────────────────────
 * Boshqaruv pinlari `y = 0.95` (old qirra), kommutatsiya kontaktlari esa
 * `y = 0.06` (orqa qirra) da. Ya'ni past kuchlanishli tomon bolaga
 * qaraydi, yuk tomoni esa narigi tomonda — chizmadagi bilan bir xil.
 *
 * ── Ulanish nuqtasi = ko'rinadigan metall ───────────────────────────────
 * Klemma ichiga botib qolgan ulanish nuqtasini bosib bo'lmasdi: oldida
 * turgan plastik hodisani o'zi olib qolardi. Shuning uchun har bir
 * nuqtaga KICHIK metall detal quriladi (header oyog'i yoki klemmaning
 * qisqichi), plastik korpus esa uning ortida qoladi (§14, §17).
 *
 * ── Mantiq bu yerda YO'Q ────────────────────────────────────────────────
 * Chulg'am qachon tortishi, COM qaysi kontaktga o'tishi — hammasi
 * `Simulator` da (§46). Model faqat `runtime.active` ni o'qiydi va
 * indikator chirog'ini yoqadi.
 */

/* ─────────────────────────── O'lchamlar (sm) ─────────────────────────── */

/** Plata qalinligi — haqiqiy 1.6 mm. */
const PCB_T = 0.16;

/** Plata burchagining yumaloqlanish radiusi. */
const PCB_CORNER = 0.18;

/** Plataning ustki yuzasi — hamma detal shu balandlikdan boshlanadi. */
const TOP = PCB_T;

/**
 * Rele korpusi — modulning eng katta va eng tanish qismi.
 *
 * `z` shunday tanlanganki, korpus orqadagi klemmalar bilan ham, olddagi
 * header bilan ham TEGMAYDI: ular orasida ikki millimetrlik tirqish
 * qoladi. Detallar bir-birining ichiga kirib ketsa model yig'ilmagan
 * ko'rinardi.
 */
const RELAY = { w: 1.9, h: 1.5, d: 1.3, x: 0.95, z: 0.35 } as const;

/** Rele korpusining tepasi — modelning eng baland nuqtasi. */
const RELAY_TOP = TOP + RELAY.h;

/**
 * Vintli klemma uyasi.
 *
 * Uchta uya YONMA-YON turadi: ular orasidagi tirqish har bir kanalni
 * ajratib ko'rsatadi — haqiqiy klemma blokida ham shunday.
 */
const TERMINAL = { w: 1.35, h: 0.9, d: 0.8, z: -0.72 } as const;

/** Klemmaning old yuzasi — sim kiradigan teshik shu yerda. */
const TERMINAL_FACE = TERMINAL.z - TERMINAL.d / 2;

/** Boshqaruv header'i: qora plastik asos va oltin oyoqlar. */
const HEADER = { baseH: 0.2, baseD: 0.26, pinH: 0.5, pinW: 0.09 } as const;

/* ─────────────────────────── Materiallar ─────────────────────────── */

/*
 * Sirtlar ATAYLAB har xil (§13): plata mat lak, rele korpusi silliq
 * sanoat plastigi, klemma esa boshqacha tusdagi plastik. Materiallar
 * `mat()` orqali keshlanadi (§33).
 */
const RM = {
  /** Ko'k lak qoplama. */
  pcb: () => mat("#12508f", { rough: 0.74, metal: 0.04 }),
  /** Kesilgan qirra — lak yo'q, quyuqroq. */
  pcbEdge: () => mat("#0b3a69", { rough: 0.84 }),
  /** Rele korpusi — sanoat ko'ki. */
  relay: () => mat("#2a64c5", { rough: 0.52, metal: 0.05 }),
  /** Korpusning ustki yuzasi — bosma yorliq shunga tushadi. */
  relayTop: () => mat("#2f6cd0", { rough: 0.5, metal: 0.05 }),
  /** Vintli klemma korpusi — yashil plastik. */
  terminal: () => mat("#1f7d52", { rough: 0.66 }),
  /** Klemma ichidagi teshik — yorug'lik tushmaydigan chuqurlik. */
  hole: () => mat("#07100c", { rough: 0.92 }),
  /** Vint boshi va qisqich — po'lat. */
  screw: () => mat("#b9c0ca", { rough: 0.3, metal: 0.85 }),
  /** Header oyog'i — oltin qoplama. */
  pin: () => mat("#d6a83b", { rough: 0.26, metal: 0.8 }),
  /** Mikrosxema va tranzistor korpusi. */
  ic: () => mat("#15181d", { rough: 0.58, metal: 0.1 }),
  /** Diod korpusi. */
  diode: () => mat("#20242b", { rough: 0.5 }),
  /** SMD rezistor. */
  smd: () => mat("#cbb894", { rough: 0.7 }),
};

/* ─────────────────────────── Pinlar katalogdan ─────────────────────────── */

interface PinSpot {
  id: string;
  label: string;
  x: number;
  y: number;
  z: number;
}

let pinCache: PinSpot[] | null = null;

/**
 * Barcha oltita pinning o'rni — KATALOGDAN.
 *
 * Manba `localPinPosition`, ya'ni `PinField` ishlatadigan funksiyaning
 * aynan o'zi. Shu sababli ko'rinadigan metall bilan sim yopishadigan
 * nuqta hech qachon ajralib qolmaydi.
 */
function relayPins(): PinSpot[] {
  if (pinCache) return pinCache;
  const def = getDefinition("relay");
  pinCache =
    def?.pins.flatMap((pin) => {
      const at = localPinPosition("relay", pin.id);
      // Silkscreen tor: qavs ichidagi izoh («NC (odatda ulangan)») kesiladi.
      const label = pin.label.split(" ")[0] ?? pin.id.toUpperCase();
      return at ? [{ id: pin.id, label, x: at.x, y: at.y, z: at.z }] : [];
    }) ?? [];
  return pinCache;
}

/** Boshqaruv tomoni — old qirradagi uchta pin. */
function controlPins(): PinSpot[] {
  return relayPins().filter((p) => p.z > 0);
}

/** Yuk tomoni — orqa qirradagi uchta klemma. */
function loadPins(): PinSpot[] {
  return relayPins().filter((p) => p.z < 0);
}

/* ─────────────────────────── Model ─────────────────────────── */

export function RelayModel({ runtime }: ModelProps) {
  const { w, d } = sizeOf("relay");
  const on = runtime?.active === true;

  const silkscreen = useMemo(() => silkscreenTexture(relayPins(), w, d), [w, d]);

  return (
    <group>
      <RelayBoard width={w} depth={d} />

      {/* Yozuv qatlami plata yuzasidan bir necha mikron balandda — aks holda
          ikki yuza chuqurlik bo'yicha "urishib" miltillardi. */}
      {silkscreen && (
        <mesh position={[0, TOP + 0.003, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[w, d]} />
          <meshStandardMaterial map={silkscreen} transparent roughness={0.78} depthWrite={false} />
        </mesh>
      )}

      <RelayHousing on={on} />
      {loadPins().map((pin) => (
        <ScrewTerminal key={pin.id} x={pin.x} />
      ))}
      <ControlHeader />
      <SupportComponents />
      <StatusLed on={on} />
    </group>
  );
}

/* ─────────────────────────── Bo'laklar ─────────────────────────── */

/** Yupqa ko'k plata: ustki yuzasi lakli, qirrasi quyuqroq. */
function RelayBoard({ width, depth }: { width: number; depth: number }) {
  return (
    <mesh
      geometry={roundedPlate(width, depth, PCB_T, PCB_CORNER)}
      material={[RM.pcb(), RM.pcbEdge()]}
      castShadow
      receiveShadow
    />
  );
}

/**
 * Rele korpusi — modulning asosiy detali.
 *
 * Yaxlit kub emas: qirralari yumaloqlangan, ustida bosma yorliq maydoni
 * va yon tomonida quyuqroq chok bor. Aynan shu uch narsa uni
 * "ko'k g'isht" emas, jihoz qismi qilib ko'rsatadi.
 */
function RelayHousing({ on }: { on: boolean }) {
  return (
    <group position={[RELAY.x, 0, RELAY.z]}>
      <mesh
        position={[0, TOP, 0]}
        geometry={roundedPlate(RELAY.w, RELAY.d, RELAY.h, 0.1)}
        material={[RM.relayTop(), RM.relay()]}
        castShadow
        receiveShadow
      />
      {/* Ustidagi bosma yorliq maydoni */}
      <Box
        pos={[0, RELAY_TOP + 0.002, 0]}
        size={[RELAY.w * 0.72, 0.01, RELAY.d * 0.5]}
        material={mat("#dfe6f2", { rough: 0.7 })}
        shadow={false}
      />
      {/* Korpus bo'laklari orasidagi chok */}
      <Box
        pos={[0, TOP + RELAY.h * 0.28, 0]}
        size={[RELAY.w + 0.006, 0.03, RELAY.d + 0.006]}
        material={mat("#1b4790", { rough: 0.6 })}
        shadow={false}
      />
      {/*
        Chulg'am tortganini bildiradigan ingichka yoriq.
        Rele ishlaganda ichkaridan issiq nur ko'rinadi — bu simulyator
        holatidan, o'ylab topilgan animatsiya emas (§46).
      */}
      <mesh position={[0, TOP + RELAY.h * 0.62, RELAY.d / 2 + 0.004]} scale={[0.5, 0.05, 0.01]}>
        <boxGeometry />
        <Emissive color="#ffb03a" intensity={on ? 1.6 : 0.02} opacity={1} />
      </mesh>
    </group>
  );
}

/**
 * Bitta vintli klemma uyasi.
 *
 * Plastik korpus ulanish nuqtasidan ORQADA turadi, metall qisqich esa
 * aynan o'sha nuqtada: shunda pin bosilishi ham, ko'rinishi ham
 * to'g'ri bo'ladi (§17).
 */
function ScrewTerminal({ x }: { x: number }) {
  return (
    <group position={[x, 0, 0]}>
      {/* Yashil plastik uya */}
      <mesh
        position={[0, TOP, TERMINAL.z]}
        geometry={roundedPlate(TERMINAL.w, TERMINAL.d, TERMINAL.h, 0.06)}
        material={[RM.terminal(), RM.terminal()]}
        castShadow
        receiveShadow
      />
      {/* Sim kiradigan teshik */}
      <Box
        pos={[0, TOP + 0.3, TERMINAL_FACE + 0.02]}
        size={[0.44, 0.3, 0.06]}
        material={RM.hole()}
        shadow={false}
      />
      {/* Simni qisadigan metall — ulanish nuqtasi aynan shu yerda */}
      <Box pos={[0, 0.4, TERMINAL_FACE - 0.05]} size={[0.34, 0.16, 0.14]} material={RM.screw()} />
      {/* Vint boshi va uning tirqishi */}
      <Cyl
        pos={[0, TOP + TERMINAL.h - 0.02, TERMINAL.z]}
        r={0.22}
        h={0.06}
        material={RM.screw()}
        smooth
      />
      <Box
        pos={[0, TOP + TERMINAL.h + 0.012, TERMINAL.z]}
        size={[0.3, 0.02, 0.06]}
        material={RM.hole()}
        shadow={false}
      />
    </group>
  );
}

/**
 * Boshqaruv header'i — VCC, GND, IN.
 *
 * Asos uchala oyoqni qamrab oladi, oyoqlar esa katalog nuqtalarida.
 * Ular INSTANSIYALANMAGAN: uchtagina, va instansiya uchun alohida mesh
 * ochish shu holatda foyda bermaydi.
 */
function ControlHeader() {
  const pins = controlPins();
  if (pins.length === 0) return null;

  const xs = pins.map((p) => p.x);
  const first = Math.min(...xs);
  const last = Math.max(...xs);
  const z = pins[0]!.z;

  return (
    <group>
      <Box
        pos={[(first + last) / 2, TOP + HEADER.baseH / 2, z]}
        size={[last - first + 0.4, HEADER.baseH, HEADER.baseD]}
        material={M.headerBlack()}
      />
      {pins.map((pin) => (
        <Box
          key={pin.id}
          pos={[pin.x, TOP + HEADER.pinH / 2, z]}
          size={[HEADER.pinW, HEADER.pinH, HEADER.pinW]}
          material={RM.pin()}
        />
      ))}
    </group>
  );
}

/**
 * Plataning qolgan qismidagi elektronika.
 *
 * Faqat KO'RINISH uchun: simulyatsiyada bu detallar yo'q va bo'lishi ham
 * shart emas — ular plata bo'sh ko'rinmasligi va modul "haqiqiy" bo'lib
 * o'qilishi uchun. Real modulda ham aynan shular turadi: optopara,
 * drayver tranzistori va chulg'amni himoyalaydigan diod.
 */
function SupportComponents() {
  return (
    <group>
      {/* Optopara — sakkiz oyoqli mikrosxema */}
      <Box pos={[-1.5, TOP + 0.13, 0.35]} size={[0.9, 0.26, 0.55]} material={RM.ic()} />
      <Cyl
        pos={[-1.78, TOP + 0.27, 0.35]}
        r={0.07}
        h={0.02}
        material={mat("#3a4149", { rough: 0.6 })}
        shadow={false}
      />

      {/* Drayver tranzistori — TO-92, yassi tomoni oldinga */}
      <Cyl pos={[-0.55, TOP + 0.26, 0.6]} r={0.22} h={0.5} material={RM.ic()} smooth />
      <Box pos={[-0.55, TOP + 0.26, 0.78]} size={[0.44, 0.5, 0.1]} material={RM.ic()} />

      {/* Himoya diodi va uning kumush halqasi */}
      <Cyl pos={[-1.55, TOP + 0.11, -0.05]} r={0.11} h={0.5} material={RM.diode()} axis="x" />
      <Cyl
        pos={[-1.72, TOP + 0.11, -0.05]}
        r={0.115}
        h={0.06}
        material={mat("#cfd6de", { rough: 0.4, metal: 0.6 })}
        axis="x"
        shadow={false}
      />

      {/* Mayda SMD rezistorlar */}
      <InstancedBoxes items={SMD_SPOTS} size={SMD_SIZE} material={RM.smd()} />
    </group>
  );
}

const SMD_SIZE: [number, number, number] = [0.14, 0.06, 0.18];

const SMD_SPOTS: ReadonlyArray<readonly [number, number, number]> = [
  [-0.9, TOP + 0.03, -0.05],
  [-0.9, TOP + 0.03, 0.2],
  [-2.0, TOP + 0.03, -0.2],
];

/**
 * Holat chirog'i.
 *
 * Rele tortganda yonadi — holat SIMULYATORDAN (`runtime.active`), ya'ni
 * chiroq zanjirning haqiqiy holatini ko'rsatadi (§46).
 */
function StatusLed({ on }: { on: boolean }) {
  return (
    <group position={[2.15, 0, 1.05]}>
      {/* Oq plastik uy */}
      <Cyl pos={[0, TOP + 0.04, 0]} r={0.16} h={0.08} material={mat("#e8ecf2", { rough: 0.7 })} />
      <mesh position={[0, TOP + 0.16, 0]} scale={[0.14, 0.14, 0.14]} castShadow>
        <sphereGeometry args={[1, 12, 10]} />
        <Emissive color="#33d17a" intensity={on ? 2.6 : 0.06} opacity={1} />
      </mesh>
    </group>
  );
}

/* ─────────────────────────── Silkscreen ─────────────────────────── */

const silkCache = new Map<string, Texture | null>();

/**
 * Plata ustidagi bosma qatlam (§7, §8, §16).
 *
 * Yozuvlar KATALOGDAN olinadi: pin nomi ham, o'rni ham. Shu sababli
 * plataga bosilgan «NC» aynan NC pinining tepasida turadi va tooltipdagi
 * nom bilan bir xil bo'ladi — ikkalasi bitta manbadan.
 *
 * Butun yozuv qatlami bitta kanvasda, ya'ni bitta qo'shimcha yuza (§20).
 * Tashqi shrift yuklanmaydi — laboratoriya internetsiz ham ishlaydi.
 */
function silkscreenTexture(
  pins: ReadonlyArray<PinSpot>,
  width: number,
  depth: number,
): Texture | null {
  const key = pins.map((p) => `${p.label}@${p.x}:${p.z}`).join("|");
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

  ctx.fillStyle = "#e2e9f1";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = `bold ${Math.round(px * 0.16)}px system-ui, sans-serif`;

  for (const pin of pins) {
    /*
     * Yozuv pinning ICHKARI tomonida: header oyog'i ham, klemma korpusi
     * ham uni yopib qo'ymasligi kerak.
     */
    const inward = pin.z > 0 ? -0.42 : 0.5;
    ctx.fillText(pin.label.toUpperCase(), toU(pin.x), toV(pin.z + inward));
  }

  ctx.globalAlpha = 0.7;
  ctx.font = `bold ${Math.round(px * 0.13)}px system-ui, sans-serif`;
  ctx.fillText("RELAY 1CH · 5V", toU(-1.35), toV(0.95));

  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.anisotropy = 4;
  silkCache.set(key, texture);
  return texture;
}
