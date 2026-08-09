"use client";

import { useMemo } from "react";
import {
  CanvasTexture,
  CatmullRomCurve3,
  SRGBColorSpace,
  TubeGeometry,
  Vector3,
  type Material,
  type Texture,
} from "three";
import { formatVolts } from "@/lib/virtual-lab/catalog";
import { localPinPosition } from "@/lib/virtual-lab/lab3d/layout";
import { Box, Cyl, Emissive, Ring, bool, mat, num, roundedPlate, str } from "./model-kit";
import type { ModelProps } from "./models-boards";

/**
 * 9 V batareya (PP3 / 6LR61) va uning klipsasi (§4, §5, §13).
 *
 * ── O'lchamlar HAQIQIY ──────────────────────────────────────────────────
 * Sahna birligi — santimetr (`layout.ts`). Haqiqiy PP3: 48.5 × 26.5 ×
 * 17.5 mm, tugmachalar orasi 12.7 mm. Bu yerdagi raqamlar to'g'ridan-to'g'ri
 * o'sha jadvaldan olingan, shuning uchun batareya Arduino (6.86 sm) yonida
 * to'g'ri kattalikda ko'rinadi — u haqiqatda ham plataning yarmicha keladi.
 *
 * ── Nega klipsa va uchlari ──────────────────────────────────────────────
 * Katalogda batareyaning ikkita ulanish nuqtasi CHAP va O'NG chetda, o'rta
 * chiziqda turadi (2D chizma ham shunday). Haqiqiy PP3 da esa ikkala
 * tugmacha USTIDA. Ikkalasini bir-biriga zo'rlab moslashtirish o'rniga
 * model haqiqiy jihozni ko'rsatadi: batareyaga qisqichli klipsa kiygizilgan
 * va undan ikkita simcha chiqib, chap va o'ngdagi uchlarga (ferrula)
 * boradi. Aynan shu — har bir Arduino to'plamidagi «9 V snap» kabeli.
 * Natijada ko'zga ko'ringan metall uch bilan sim yopishadigan nuqta bir
 * joyda qoladi (§14).
 *
 * ── Qutblanish ──────────────────────────────────────────────────────────
 * Sozlamadagi «teskari solingan» — simulyatorda manfiy kuchlanish
 * (`batteryVoltage`). Bu yerda u simchalarning RANGI bilan ko'rsatiladi:
 * qizil simcha qaysi uchga borsa, musbat qutb o'sha tomonda. Bola
 * inspektorga qaramasdan ham nima o'zgarganini ko'radi.
 *
 * ── Mantiq bu yerda YO'Q ────────────────────────────────────────────────
 * Kuchlanish, zanjir va tok `Simulator` da (§46); ulanish nuqtalari esa
 * `PinField` da, KATALOG nisbatlaridan. Bu fayl faqat shakl.
 */

/* ─────────────────────────── O'lchamlar (sm) ─────────────────────────── */

/** Korpus: haqiqiy 26.5 × 17.5 × 48.5 mm. */
const BODY = { w: 2.65, d: 1.75, h: 4.85, corner: 0.24 } as const;

/** Ustki metall qopqoq — korpusdan bir oz kichik, qirrasi ko'rinib tursin. */
const CAP = { w: BODY.w - 0.06, d: BODY.d - 0.06, h: 0.16 } as const;

/** Qopqoq yuzasi — tugmachalar shu balandlikdan boshlanadi. */
const CAP_TOP = BODY.h + CAP.h;

/**
 * Tugmachalar orasidagi masofa — haqiqiy 12.7 mm.
 *
 * Musbati (erkak) kichikroq va balandroq, manfiysi (urg'ochi) kengroq va
 * o'rtasi chuqur: real PP3 da ular aynan shu bilan farqlanadi.
 */
const SNAP = { gap: 0.635, plusR: 0.19, minusR: 0.26, h: 0.26 } as const;

/**
 * Tugmacha ustidagi qora rezina g'ilof — simcha shundan chiqadi.
 *
 * Yaxlit klipsa (butun ustni yopadigan qalpoqcha) ataylab qo'yilmadi: u
 * ikkala tugmachani ham berkitardi va bola qaysi qutb qayerdaligini
 * ko'rmasdi. G'ilof esa faqat kavshar joyini yopadi — metall tugmacha
 * pastda ochiq qoladi.
 */
const BOOT = { r: 0.2, h: 0.2 } as const;

/** G'ilof tepasi — simcha aynan shu nuqtadan boshlanadi. */
const BOOT_TOP = CAP_TOP + SNAP.h + BOOT.h;

/** Simcha va uning uchidagi ferrula (metall naycha). */
const LEAD = { r: 0.075, tipR: 0.09, tipLen: 0.34, y: 0.15 } as const;

/* ─────────────────────────── Materiallar ─────────────────────────── */

/*
 * Sirtlar ATAYLAB har xil (§13): korpus deyarli mat, qopqoq yarim yaltiroq
 * metall, tugmachalar esa aniq metall. Ko'z "haqiqiy" degan xulosani aynan
 * shu farqdan chiqaradi. `mat()` materiallarni keshlaydi (§33).
 */
const BM = {
  /** Yopishtirilgan qoplama — quyuq grafit, mat. */
  shell: () => mat("#22252b", { rough: 0.62, metal: 0.12 }),
  /** O'chirilgan batareya — rangi so'ngan, "ishlamayapti" belgisi. */
  shellOff: () => mat("#565c66", { rough: 0.72, metal: 0.06 }),
  /** Ustki va pastki yuza — qoplama bukilgan joyi, quyuqroq. */
  shellEdge: () => mat("#171a1f", { rough: 0.7 }),
  shellEdgeOff: () => mat("#454a53", { rough: 0.75 }),
  /** Qisilgan metall qopqoq. */
  cap: () => mat("#9aa1ab", { rough: 0.38, metal: 0.62 }),
  /** Qopqoq bilan korpus orasidagi chok. */
  seam: () => mat("#111318", { rough: 0.8 }),
  /** Musbat tugmacha — latun. */
  plus: () => mat("#d9ab4c", { rough: 0.26, metal: 0.88 }),
  /** Manfiy tugmacha — nikellangan po'lat. */
  minus: () => mat("#c3cad3", { rough: 0.24, metal: 0.9 }),
  /** Manfiy tugmachaning ichi — yorug'lik tushmaydigan chuqurlik. */
  socket: () => mat("#0a0c10", { rough: 0.9 }),
  /** Klipsa plastigi. */
  clip: () => mat("#15171b", { rough: 0.78 }),
  /** Simchalar. */
  red: () => mat("#c0392b", { rough: 0.5 }),
  black: () => mat("#191b1f", { rough: 0.5 }),
  /** Ferrula — qalaylangan metall. */
  ferrule: () => mat("#b8c0ca", { rough: 0.3, metal: 0.85 }),
};

/* ─────────────────────────── Uchlar katalogdan ─────────────────────────── */

let tipCache: { minus: number; plus: number } | null = null;

/**
 * Simcha uchlarining X o'rni — KATALOG nisbatlaridan.
 *
 * Qo'lda yozilgan koordinata bir kun kelib katalogdan ajralib qolardi va
 * sim ko'zga ko'ringan ferruladan emas, yonidagi bo'shliqdan chiqardi. Bu
 * yerda esa manba bitta: `localPinPosition` — `PinField` ishlatadigan
 * funksiyaning AYNAN o'zi.
 */
function tipPositions(): { minus: number; plus: number } {
  if (tipCache) return tipCache;
  const minus = localPinPosition("battery", "minus");
  const plus = localPinPosition("battery", "plus");
  tipCache = { minus: minus?.x ?? -1.72, plus: plus?.x ?? 1.72 };
  return tipCache;
}

/* ─────────────────────────── Model ─────────────────────────── */

export function BatteryModel({ settings, runtime }: ModelProps) {
  const volts = num(settings, "voltage", 9);
  const enabled = bool(settings, "enabled", true);
  const reversed = str(settings, "polarity", "normal") === "reversed";
  const active = runtime?.active === true;

  const tips = tipPositions();
  /*
   * Qizil simcha MUSBAT qutbga tegishli, lekin qaysi uchga borishi
   * batareyaning qanday solinganiga bog'liq. Teskari solinganda simulyator
   * ham manfiy kuchlanish beradi — ikkalasi bitta sozlamadan.
   */
  const plusTip = reversed ? tips.minus : tips.plus;
  const minusTip = reversed ? tips.plus : tips.minus;

  const label = useMemo(() => labelTexture(volts), [volts]);
  const topMarks = useMemo(() => topTexture(), []);

  return (
    <group>
      <BatteryBody enabled={enabled} />
      <BatteryTopCap />
      <BatteryLabel texture={label} active={active} enabled={enabled} />

      {/* Qopqoqdagi + va − belgilari */}
      {topMarks && (
        <mesh position={[0, CAP_TOP + 0.002, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[CAP.w, CAP.d]} />
          <meshStandardMaterial map={topMarks} transparent depthWrite={false} roughness={0.6} />
        </mesh>
      )}

      <BatteryTerminal kind="plus" />
      <BatteryTerminal kind="minus" />

      {/*
        Simchalar TUGMACHADAN chiqadi va o'z uchiga boradi.

        Teskari solinganda ular kesishadi — bu tasodif emas, balki eng
        aniq belgi: qizil simcha chap uchga borsa, musbat qutb chapda.
        Kesishgan joyda ustma-ust tushmasliklari uchun ularning yoylari
        chuqurlik bo'yicha ajratilgan.
      */}
      <Lead fromX={SNAP.gap} toX={plusTip} color={BM.red()} lane={0.12} />
      <Lead fromX={-SNAP.gap} toX={minusTip} color={BM.black()} lane={-0.12} />
      <LeadTip x={plusTip} color={BM.red()} />
      <LeadTip x={minusTip} color={BM.black()} />
    </group>
  );
}

/* ─────────────────────────── Bo'laklar ─────────────────────────── */

/**
 * Korpus — burchaklari yumaloqlangan, qirralari mayda fasqali prizma.
 *
 * Oddiy `BoxGeometry` o'yinchoq g'isht bo'lib ko'rinardi: haqiqiy
 * batareyaning tik qirralari yumaloq, ustki qirrasi esa bukilgan.
 * `roundedPlate` aynan shuni beradi va o'lcham bo'yicha keshlanadi (§33).
 */
function BatteryBody({ enabled }: { enabled: boolean }) {
  return (
    <mesh
      geometry={roundedPlate(BODY.w, BODY.d, BODY.h, BODY.corner)}
      material={enabled ? [BM.shellEdge(), BM.shell()] : [BM.shellEdgeOff(), BM.shellOff()]}
      castShadow
      receiveShadow
    />
  );
}

/** Qisilgan metall qopqoq va uning ostidagi chok. */
function BatteryTopCap() {
  return (
    <group>
      {/* Chok — qopqoq bilan qoplama tutashgan joy */}
      <Box
        pos={[0, BODY.h - 0.03, 0]}
        size={[BODY.w + 0.01, 0.06, BODY.d + 0.01]}
        material={BM.seam()}
        shadow={false}
      />
      <mesh
        position={[0, BODY.h, 0]}
        geometry={roundedPlate(CAP.w, CAP.d, CAP.h, BODY.corner - 0.04)}
        material={[BM.cap(), BM.cap()]}
        castShadow
        receiveShadow
      />
    </group>
  );
}

/**
 * Tugmacha (snap).
 *
 * Musbati — erkak: ingichka, balandroq, tepasi yumaloq. Manfiysi —
 * urg'ochi: kengroq va o'rtasi chuqur. Haqiqiy PP3 da ular aynan shu bilan
 * farqlanadi va shu sababli ularni chalkashtirib klipsa kiygizib bo'lmaydi.
 */
function BatteryTerminal({ kind }: { kind: "plus" | "minus" }) {
  const plus = kind === "plus";
  const x = plus ? SNAP.gap : -SNAP.gap;
  const r = plus ? SNAP.plusR : SNAP.minusR;
  const material = plus ? BM.plus() : BM.minus();

  return (
    <group position={[x, 0, 0]}>
      {/* Qopqoqqa o'tirgan asos halqasi */}
      <Ring pos={[0, CAP_TOP + 0.01, 0]} r={r + 0.04} tube={0.03} material={material} />
      <Cyl
        pos={[0, CAP_TOP + SNAP.h / 2, 0]}
        r={r}
        h={SNAP.h}
        material={material}
        smooth
        rTop={plus ? r * 0.82 : undefined}
      />
      {plus ? (
        // Erkak tugmachaning yumaloq tepasi.
        <Cyl
          pos={[0, CAP_TOP + SNAP.h, 0]}
          r={r * 0.82}
          h={0.05}
          material={material}
          smooth
          shadow={false}
        />
      ) : (
        // Urg'ochi tugmachaning chuqurchasi.
        <Cyl
          pos={[0, CAP_TOP + SNAP.h - 0.02, 0]}
          r={r * 0.55}
          h={0.06}
          material={BM.socket()}
          smooth
          shadow={false}
        />
      )}
    </group>
  );
}

/**
 * Tugmacha ustidagi rezina g'ilof — kavshar joyi va simchaning boshi.
 *
 * Haqiqiy «9 V snap» kabelida ham aynan shunday: metall tugmacha ochiq
 * qoladi, simcha esa qora g'ilof ostidan chiqadi.
 */
function LeadBoot({ x }: { x: number }) {
  return (
    <Cyl
      pos={[x, CAP_TOP + SNAP.h + BOOT.h / 2, 0]}
      r={BOOT.r}
      h={BOOT.h}
      material={BM.clip()}
      smooth
    />
  );
}

/* ─────────────────────────── Simchalar ─────────────────────────── */

const leadCache = new Map<string, TubeGeometry>();

/**
 * Tugmachadan ferrulagacha bo'lgan simcha.
 *
 * Egri chiziq bilan chiziladi: to'g'ri tayoqcha "sim" bo'lib ko'rinmaydi.
 * Geometriya boshlanish/tugash nuqtasi bo'yicha keshlanadi — sahnadagi
 * barcha batareya to'rtta shakldan foydalanadi (to'g'ri va teskari
 * holatdagi ikkitadan), ya'ni yuzta batareya ham qo'shimcha xotira
 * olmaydi (§33).
 */
function leadGeometry(fromX: number, toX: number, lane: number): TubeGeometry {
  const key = `${fromX}|${toX}|${lane}`;
  const cached = leadCache.get(key);
  if (cached) return cached;

  /*
   * Yoy faqat PASTGA tushadi — hech bir nuqtasi g'ilof tepasidan
   * balandga chiqmaydi. Aks holda simcha tanlov ramkasidan oshib
   * ketardi va model «chegarasidan chiqib turgan» bo'lib ko'rinardi.
   */
  const outward = toX >= fromX ? 1 : -1;
  const curve = new CatmullRomCurve3(
    [
      new Vector3(fromX, BOOT_TOP, 0),
      new Vector3(fromX + outward * 0.4, BOOT_TOP - 0.25, lane),
      new Vector3(toX * 0.85, BODY.h * 0.42, lane * 0.7),
      new Vector3(toX, LEAD.y, 0),
    ],
    false,
    "catmullrom",
    0.4,
  );

  const created = new TubeGeometry(curve, 16, LEAD.r, 6, false);
  leadCache.set(key, created);
  return created;
}

function Lead({
  fromX,
  toX,
  color,
  lane,
}: {
  /** Qaysi tugmachadan chiqadi. */
  fromX: number;
  /** Qaysi uchga boradi (teskari solinganda almashadi). */
  toX: number;
  color: Material;
  /** Chuqurlik bo'yicha yo'lak — ikki simcha kesishganda ustma-ust tushmasin. */
  lane: number;
}) {
  return (
    <group>
      <LeadBoot x={fromX} />
      <mesh geometry={leadGeometry(fromX, toX, lane)} material={color} castShadow />
    </group>
  );
}

/** Simcha uchidagi ferrula — sim aynan shu metallga ulanadi (§14). */
function LeadTip({ x, color }: { x: number; color: Material }) {
  const inward = x > 0 ? -1 : 1;
  return (
    <group>
      {/* Plastik yeng */}
      <Cyl
        pos={[x + inward * LEAD.tipLen * 0.6, LEAD.y, 0]}
        r={LEAD.r * 1.5}
        h={LEAD.tipLen * 0.5}
        material={color}
        axis="x"
      />
      {/* Metall naycha */}
      <Cyl pos={[x, LEAD.y, 0]} r={LEAD.tipR} h={LEAD.tipLen} material={BM.ferrule()} axis="x" />
    </group>
  );
}

/* ─────────────────────────── Yorliq ─────────────────────────── */

/**
 * Old yuzadagi yorliq va uning yonidagi holat chirog'i.
 *
 * Yorliq TEKSTURA: har bir harfni geometriya bilan chizish bitta
 * batareyaga yuzlab uchburchak qo'shardi (§20). Yonayotgan chiroq esa
 * alohida mesh — u simulyator holatiga qarab o'zgaradi va tekstura
 * qayta qurilmasligi kerak (§33).
 */
function BatteryLabel({
  texture,
  active,
  enabled,
}: {
  texture: Texture | null;
  /** Zanjirda tok bor — simulyator aytadi (§46). */
  active: boolean;
  enabled: boolean;
}) {
  const z = BODY.d / 2 + 0.004;

  return (
    <group>
      {texture && (
        <mesh position={[0, BODY.h * 0.52, z]}>
          <planeGeometry args={[BODY.w - 0.22, BODY.h * 0.74]} />
          <meshStandardMaterial map={texture} transparent roughness={0.65} depthWrite={false} />
        </mesh>
      )}
      {/*
        Ishlayotgan batareyaning ko'rsatkichi.
        Ilgari bu kuchlanishga qarab uzayadigan kulrang chiziq edi —
        u na haqiqiy detalga, na tushunarli belgiga o'xshardi.
      */}
      <mesh position={[0, 0.42, z]} scale={[0.42, 0.09, 0.02]}>
        <boxGeometry />
        <Emissive
          color={active ? "#33d17a" : "#2a2f37"}
          intensity={active && enabled ? 2.2 : 0.05}
          opacity={1}
        />
      </mesh>
    </group>
  );
}

const labelCache = new Map<string, Texture | null>();

/**
 * Yorliq teksturasi (§7, §8).
 *
 * Matn SOZLAMADAN olinadi: inspektorda 12 V qo'yilsa yorliqda ham 12 V
 * yoziladi. Yolg'on «9V» chizib qo'yish bolani chalkashtirardi — u
 * sozlamada boshqa qiymat turganini ko'rib turadi.
 *
 * Brend nomi ATAYLAB o'ylab topilgan («VOLTA») — haqiqiy tovar belgisini
 * ishlatib bo'lmaydi.
 */
function labelTexture(volts: number): Texture | null {
  const key = formatVolts(volts);
  const cached = labelCache.get(key);
  if (cached !== undefined) return cached;
  if (typeof document === "undefined") return null;

  const width = 256;
  const height = 384;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    labelCache.set(key, null);
    return null;
  }

  // Qog'oz yorliq — sof oq emas, biroz issiq tusda.
  ctx.fillStyle = "#eceff4";
  ctx.fillRect(0, 0, width, height);

  // Yuqori va pastki bo'yama yo'laklar.
  ctx.fillStyle = "#1f6feb";
  ctx.fillRect(0, 0, width, height * 0.16);
  ctx.fillRect(0, height * 0.86, width, height * 0.14);

  ctx.fillStyle = "#f2b134";
  ctx.fillRect(0, height * 0.16, width, height * 0.02);

  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  // Brend — o'ylab topilgan nom.
  ctx.fillStyle = "#ffffff";
  ctx.font = `bold ${Math.round(height * 0.075)}px system-ui, sans-serif`;
  ctx.fillText("VOLTA", width / 2, height * 0.082);

  // Kuchlanish — yorliqning eng katta yozuvi.
  ctx.fillStyle = "#15181d";
  ctx.font = `bold ${Math.round(height * 0.2)}px system-ui, sans-serif`;
  ctx.fillText(key, width / 2, height * 0.36);

  ctx.fillStyle = "#4a5260";
  ctx.font = `600 ${Math.round(height * 0.055)}px system-ui, sans-serif`;
  ctx.fillText("ALKALINE", width / 2, height * 0.5);
  ctx.font = `${Math.round(height * 0.045)}px system-ui, sans-serif`;
  ctx.fillText("6LR61 · PP3", width / 2, height * 0.56);

  // Qutb belgilari — tugmachalar tomonini takrorlaydi.
  ctx.fillStyle = "#15181d";
  ctx.font = `bold ${Math.round(height * 0.07)}px system-ui, sans-serif`;
  ctx.fillText("−", width * 0.28, height * 0.68);
  ctx.fillText("+", width * 0.72, height * 0.68);

  ctx.strokeStyle = "#b9c0cb";
  ctx.lineWidth = 2;
  ctx.strokeRect(width * 0.18, height * 0.63, width * 0.64, height * 0.1);

  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.anisotropy = 4;
  labelCache.set(key, texture);
  return texture;
}

let topCache: Texture | null | undefined;

/**
 * Qopqoqdagi + va − belgilari.
 *
 * Ular geometriya bilan emas, tekstura bilan: mayda burtma belgilar
 * uchun o'nlab uchburchak sarflash noo'rin (§20). Belgilar tugmachalar
 * YONIDA turadi, ustida emas — aks holda metall ularni yopib qo'yardi.
 */
function topTexture(): Texture | null {
  if (topCache !== undefined) return topCache;
  if (typeof document === "undefined") return null;

  const size = 128;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = Math.round((size * CAP.d) / CAP.w);

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    topCache = null;
    return null;
  }

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#2b3038";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = `bold ${Math.round(canvas.height * 0.42)}px system-ui, sans-serif`;

  /* Sm → tekstura koordinatasi (chapdan o'ngga). */
  const toU = (x: number) => (x / CAP.w + 0.5) * canvas.width;

  // Tugmachadan chetroqda: metall qalpoqcha belgini yopmasin.
  ctx.fillText("−", toU(-SNAP.gap - 0.42), canvas.height * 0.5);
  ctx.fillText("+", toU(SNAP.gap + 0.42), canvas.height * 0.5);

  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.anisotropy = 4;
  topCache = texture;
  return texture;
}
