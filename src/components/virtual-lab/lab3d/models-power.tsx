"use client";

import { useMemo } from "react";
import { CanvasTexture, SRGBColorSpace, type Texture } from "three";
import { localPinPosition, sizeOf } from "@/lib/virtual-lab/lab3d/layout";
import { Box, Cyl, Ring, mat, roundedPlate } from "./model-kit";

/**
 * Quvvat terminallari: «5V quvvat» va «GND (yer)» (§4, §5, §13).
 *
 * ── Nima bu komponent ───────────────────────────────────────────────────
 * Bu batareya EMAS va Arduino ham emas — laboratoriyaning ideal manbasi:
 * zanjirga doimiy 5 V beradigan (yoki uni yerga qaytaradigan) tugun.
 * Shuning uchun model ham stol ustidagi KICHIK laboratoriya bloki
 * ko'rinishida: korpus, ustida bitta klemma, old tomonida yorliq.
 *
 * ── Nega ikkalasi bitta faylda ──────────────────────────────────────────
 * Ikkalasi bir xil jihoz, faqat qutbi boshqa: bittasida qizil korpus va
 * «+5V», ikkinchisida grafit korpus va yer belgisi. Ularni ikkita faylga
 * bo'lish bir xil kodni ikki marta yozish bo'lardi va biri yaxshilanganda
 * ikkinchisi eskiligicha qolardi.
 *
 * ── Bitta klemma, ikkita emas ───────────────────────────────────────────
 * Katalogda har bir blokning FAQAT bitta ulanish nuqtasi bor (`out`).
 * Ko'rinish uchun ikkinchi «GND» klemmasini qo'shish yolg'on bo'lardi:
 * bola uni bosardi va hech narsa bo'lmasdi. Zanjirning ikkinchi uchi
 * uchun alohida «GND» bloki qo'yiladi — laboratoriya modeli aynan
 * shunday qurilgan va bu yerda o'zgartirilmaydi (§46).
 *
 * ── Mantiq bu yerda YO'Q ────────────────────────────────────────────────
 * Kuchlanish va tugunlar `netlist.ts` da (`powerNets` / `groundNets`),
 * ulanish nuqtasi esa `PinField` da — KATALOG nisbatidan. Bu fayl faqat
 * shakl: klemma aynan o'sha nuqtaga quriladi, ya'ni sim ko'zga ko'ringan
 * metalldan chiqadi (§14).
 */

/* ─────────────────────────── O'lchamlar (sm) ─────────────────────────── */

/** Korpus oyoqchalari — blok stolga yopishib yotmasin. */
const FOOT = { h: 0.08, r: 0.13 } as const;

/**
 * Asosiy korpus: 34 × 28 × 13.2 mm — kaftdagi kichik blok.
 *
 * Chuqurligi (28 mm) klemmaning o'rniga qarab tanlangan: katalogda
 * ulanish nuqtasi chuqurlikning 40 % ida turadi, ya'ni klemma old
 * qirraga yaqin. Tor korpusda uning asosi qirradan osilib qolardi.
 */
const BODY = { w: 3.4, d: 2.8, h: 1.32, corner: 0.22 } as const;

/**
 * Korpus IKKI qobiqdan yig'iladi, orasida ariqcha.
 *
 * Yaxlit quti "joy to'ldiruvchi" bo'lib ko'rinardi. Ariqcha esa uni
 * yig'ilgan jihozga aylantiradi — haqiqiy korpuslar ham shunday
 * quriladi. Ariqcha ICHKARIGA botgan, tashqariga chiqmagan: aks holda
 * u tanlov ramkasidan oshib turardi.
 */
const SHELL = { lower: 0.58, groove: 0.06, inset: 0.05 } as const;

/** Korpus tepasi. */
const BODY_TOP = FOOT.h + BODY.h;

/** Ustki panel — korpusdan ozgina kichik, chekkasi hoshiya bo'lib qoladi. */
const PANEL = { w: BODY.w - 0.24, d: BODY.d - 0.14, h: 0.05 } as const;

/** Panel yuzasi — klemma shu balandlikdan boshlanadi. */
const PANEL_TOP = BODY_TOP + PANEL.h;

/**
 * Klemma (binding post) qatlamlari.
 *
 * Haqiqiy laboratoriya klemmasi shunday yig'iladi: metall asos halqasi →
 * rangli bo'rtma qalpoqcha (qo'l bilan buraladi) → o'rtasidan chiqqan
 * metall shtir. Aynan shu uch qatlam uni "silindr" emas, "klemma"
 * qilib ko'rsatadi.
 */
const POST = { baseR: 0.2, collarR: 0.16, collarH: 0.2, pinR: 0.075, pinH: 0.26 } as const;

/** Klemma shtirining uchi — modelning eng baland nuqtasi. */
const POST_TOP = PANEL_TOP + POST.collarH + POST.pinH;

/* ─────────────────────────── Materiallar ─────────────────────────── */

/*
 * Sirtlar ATAYLAB har xil (§13): korpus bo'yalgan va mat, panel biroz
 * ochroq, klemma esa aniq metall. Materiallar `mat()` orqali keshlanadi,
 * ya'ni sahnadagi o'nta blok bitta shaderdan foydalanadi (§33).
 */
const PM = {
  /** Musbat manba — sanoat qizili, bo'yalgan korpus. */
  redShell: () => mat("#b3352f", { rough: 0.66, metal: 0.08 }),
  /** Uning ustki qismi — bir oz ochroq, shunda chok ko'rinadi. */
  redTop: () => mat("#c14039", { rough: 0.62, metal: 0.08 }),
  /** Yer bloki — grafit korpus. */
  darkShell: () => mat("#262b33", { rough: 0.68, metal: 0.08 }),
  darkTop: () => mat("#2f3540", { rough: 0.64, metal: 0.08 }),
  /** Ustki panel — mat plastik, yozuvlar shunga bosiladi. */
  panel: () => mat("#e6e9ee", { rough: 0.8 }),
  /** Oyoqchalar — rezina. */
  foot: () => mat("#15171b", { rough: 0.95 }),
  /** Klemma asosi va shtiri — nikellangan metall. */
  metal: () => mat("#c6ccd5", { rough: 0.26, metal: 0.9 }),
  /** Musbat klemmaning qalpoqchasi. */
  collarRed: () => mat("#d0453d", { rough: 0.34, metal: 0.2 }),
  /** Manfiy klemmaning qalpoqchasi. */
  collarBlack: () => mat("#1b1e24", { rough: 0.38, metal: 0.2 }),
  /** Korpus bo'laklari orasidagi chok. */
  seam: () => mat("#141619", { rough: 0.85 }),
};

/* ─────────────────────────── Klemma o'rni katalogdan ─────────────────────────── */

const postCache = new Map<string, number>();

/**
 * Klemmaning chuqurlik bo'yicha o'rni — KATALOG nisbatidan.
 *
 * 5V bloki oldinda (`y = 0.9`), yer bloki esa orqada (`y = 0.1`) ulanadi.
 * Qo'lda yozilgan koordinata ikkalasini bir joyga qo'yardi va yer
 * blokining simi ko'rinmas nuqtadan chiqardi. Bu yerda manba bitta:
 * `localPinPosition` — `PinField` ishlatadigan funksiyaning AYNAN o'zi.
 */
function postZ(type: string): number {
  const cached = postCache.get(type);
  if (cached !== undefined) return cached;
  const at = localPinPosition(type, "out");
  const z = at?.z ?? 0;
  postCache.set(type, z);
  return z;
}

/* ─────────────────────────── Model ─────────────────────────── */

export function PowerTerminalModel({ kind }: { kind: "power" | "ground" }) {
  const type = kind === "power" ? "power-5v" : "ground";
  const { w, d } = sizeOf(type);
  const z = postZ(type);

  const topLabel = useMemo(() => topTexture(kind), [kind]);
  const frontLabel = useMemo(() => frontTexture(kind), [kind]);

  return (
    <group>
      <PowerBody kind={kind} width={w} depth={d} />
      <PowerTopPanel texture={topLabel} />
      <PowerTerminal kind={kind} z={z} />
      <PowerLabel texture={frontLabel} depth={d} />
    </group>
  );
}

/* ─────────────────────────── Bo'laklar ─────────────────────────── */

/**
 * Korpus — rezina oyoqchalar ustida turgan, qirralari yumaloqlangan blok.
 *
 * Ikki qismdan: pastki va ustki qobiq, orasida chok. Yaxlit quti sifat
 * jihatidan "joy to'ldiruvchi" bo'lib ko'rinardi; chok esa uni yig'ilgan
 * jihozga aylantiradi — haqiqiy korpuslar ham shunday quriladi.
 */
function PowerBody({
  kind,
  width,
  depth,
}: {
  kind: "power" | "ground";
  width: number;
  depth: number;
}) {
  const power = kind === "power";
  const shell = power ? PM.redShell() : PM.darkShell();
  const top = power ? PM.redTop() : PM.darkTop();

  const grooveY = FOOT.h + SHELL.lower;
  const upperY = grooveY + SHELL.groove;

  return (
    <group>
      {/* Rezina oyoqchalar — blok stolga yopishmaydi va tagida soya qoladi */}
      {[
        [-1, -1],
        [1, -1],
        [-1, 1],
        [1, 1],
      ].map(([sx, sz]) => (
        <Cyl
          key={`${sx}:${sz}`}
          pos={[sx! * (width / 2 - 0.35), FOOT.h / 2, sz! * (depth / 2 - 0.35)]}
          r={FOOT.r}
          h={FOOT.h}
          material={PM.foot()}
          shadow={false}
        />
      ))}

      {/* Pastki qobiq — quyuqroq */}
      <mesh
        position={[0, FOOT.h, 0]}
        geometry={roundedPlate(BODY.w, BODY.d, SHELL.lower, BODY.corner)}
        material={[shell, shell]}
        castShadow
        receiveShadow
      />
      {/* Ariqcha — ikki qobiq orasidagi ingichka chuqurcha */}
      <mesh
        position={[0, grooveY, 0]}
        geometry={roundedPlate(
          BODY.w - SHELL.inset * 2,
          BODY.d - SHELL.inset * 2,
          SHELL.groove,
          BODY.corner - 0.04,
        )}
        material={[PM.seam(), PM.seam()]}
      />
      {/* Ustki qobiq — bir oz ochroq, shunda ikki bo'lak ajralib turadi */}
      <mesh
        position={[0, upperY, 0]}
        geometry={roundedPlate(BODY.w, BODY.d, BODY_TOP - upperY, BODY.corner)}
        material={[top, top]}
        castShadow
        receiveShadow
      />
    </group>
  );
}

/**
 * Ustki panel — yozuvlar bosilgan yassi maydon.
 *
 * Korpusdan kichikroq, shuning uchun atrofida hoshiya qoladi va panel
 * "yopishtirilgan stiker" emas, o'rnatilgan qism bo'lib ko'rinadi.
 */
function PowerTopPanel({ texture }: { texture: Texture | null }) {
  return (
    <group>
      <mesh
        position={[0, BODY_TOP, 0]}
        geometry={roundedPlate(PANEL.w, PANEL.d, PANEL.h, BODY.corner - 0.06)}
        material={[PM.panel(), PM.panel()]}
        castShadow
        receiveShadow
      />
      {texture && (
        <mesh position={[0, PANEL_TOP + 0.002, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[PANEL.w, PANEL.d]} />
          <meshStandardMaterial map={texture} transparent depthWrite={false} roughness={0.7} />
        </mesh>
      )}
    </group>
  );
}

/**
 * Klemma — sim aynan shu metallga ulanadi (§14).
 *
 * Qalpoqchaning RANGI qutbni aytadi: qizil — musbat, qora — yer. Bu
 * laboratoriya jihozlarining umumiy qoidasi, shuning uchun bola uni
 * boshqa asboblarda ham tanib oladi.
 */
function PowerTerminal({ kind, z }: { kind: "power" | "ground"; z: number }) {
  const collar = kind === "power" ? PM.collarRed() : PM.collarBlack();

  return (
    <group position={[0, 0, z]}>
      {/* Panelga o'tirgan metall asos */}
      <Cyl pos={[0, PANEL_TOP + 0.03, 0]} r={POST.baseR} h={0.06} material={PM.metal()} smooth />
      <Ring
        pos={[0, PANEL_TOP + 0.06, 0]}
        r={POST.baseR - 0.02}
        tube={0.025}
        material={PM.metal()}
      />

      {/* Buraladigan rangli qalpoqcha */}
      <Cyl
        pos={[0, PANEL_TOP + 0.06 + POST.collarH / 2, 0]}
        r={POST.collarR}
        h={POST.collarH}
        material={collar}
        smooth
      />
      {/* Qalpoqchaning bo'rtmalari — barmoq tegadigan yuza */}
      {[0, 1, 2, 3].map((i) => (
        <Box
          key={i}
          pos={[0, PANEL_TOP + 0.06 + POST.collarH / 2, 0]}
          rot={[0, (i * Math.PI) / 4, 0]}
          size={[POST.collarR * 2.1, POST.collarH * 0.7, 0.05]}
          material={collar}
          shadow={false}
        />
      ))}

      {/* Metall shtir — ulanish nuqtasi shu o'qda */}
      <Cyl
        pos={[0, PANEL_TOP + POST.collarH + POST.pinH / 2, 0]}
        r={POST.pinR}
        h={POST.pinH}
        material={PM.metal()}
        smooth
      />
      {/* Uchidagi gaykacha */}
      <Cyl
        pos={[0, POST_TOP - 0.03, 0]}
        r={POST.pinR * 1.5}
        h={0.06}
        material={PM.metal()}
        smooth
        shadow={false}
      />
    </group>
  );
}

/** Old yuzadagi bosma yorliq. */
function PowerLabel({ texture, depth }: { texture: Texture | null; depth: number }) {
  if (!texture) return null;
  return (
    <mesh position={[0, FOOT.h + BODY.h * 0.58, depth / 2 + 0.004]}>
      <planeGeometry args={[BODY.w - 0.5, BODY.h * 0.5]} />
      <meshStandardMaterial map={texture} transparent depthWrite={false} roughness={0.7} />
    </mesh>
  );
}

/* ─────────────────────────── Yozuvlar ─────────────────────────── */

const topCache = new Map<string, Texture | null>();
const frontCache = new Map<string, Texture | null>();

/**
 * Ustki paneldagi yozuv (§6).
 *
 * Klemma yonida qutb belgisi, panelning ikkinchi chekkasida esa blok
 * nomi. Yozuv GEOMETRIYA bilan chizilmaydi va tashqi shrift ham
 * yuklanmaydi — hammasi bitta kanvasda, ya'ni butun yozuv qatlami bitta
 * qo'shimcha yuza (§20). Laboratoriya internetsiz ham ishlashi kerak.
 */
function topTexture(kind: "power" | "ground"): Texture | null {
  const cached = topCache.get(kind);
  if (cached !== undefined) return cached;
  if (typeof document === "undefined") return null;

  const width = 320;
  const height = Math.round((width * PANEL.d) / PANEL.w);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    topCache.set(kind, null);
    return null;
  }

  const power = kind === "power";
  ctx.clearRect(0, 0, width, height);
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  /*
   * Klemma panelning old (5V) yoki orqa (GND) chekkasida turadi —
   * katalogdagi nisbat shunday. Yozuv esa DOIM qarama-qarshi chekkada:
   * aks holda metall qalpoqcha uni yopib qo'yardi.
   */
  const postSide = power ? 0.78 : 0.22;
  const textSide = power ? 0.3 : 0.7;

  // Klemma atrofidagi halqa — qaysi qutb ekanini uzoqdan ham ko'rsatadi.
  ctx.strokeStyle = power ? "#c0392b" : "#2b3038";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(width / 2, height * postSide, height * 0.3, 0, Math.PI * 2);
  ctx.stroke();

  ctx.fillStyle = power ? "#b3352f" : "#20242b";
  ctx.font = `bold ${Math.round(height * 0.3)}px system-ui, sans-serif`;
  ctx.fillText(power ? "+5V" : "GND", width / 2, height * textSide);

  ctx.fillStyle = "#6b7480";
  ctx.font = `600 ${Math.round(height * 0.13)}px system-ui, sans-serif`;
  ctx.fillText(power ? "DC OUTPUT" : "COMMON", width / 2, height * (power ? 0.48 : 0.52));

  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.anisotropy = 4;
  topCache.set(kind, texture);
  return texture;
}

/**
 * Old yuzadagi yorliq (§7).
 *
 * Brend nomi yo'q — faqat blok nima qilishi. Yer bloki uchun yozuv
 * o'rniga xalqaro yer belgisi: uni bola darslikda ham, sxemada ham
 * o'sha ko'rinishda uchratadi.
 */
function frontTexture(kind: "power" | "ground"): Texture | null {
  const cached = frontCache.get(kind);
  if (cached !== undefined) return cached;
  if (typeof document === "undefined") return null;

  const width = 256;
  const height = 96;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    frontCache.set(kind, null);
    return null;
  }

  const power = kind === "power";

  // Bosma tabelcha — och kulrang, ingichka hoshiya bilan.
  ctx.fillStyle = "#eceff4";
  ctx.fillRect(0, 0, width, height);
  ctx.strokeStyle = "#aeb6c2";
  ctx.lineWidth = 3;
  ctx.strokeRect(1.5, 1.5, width - 3, height - 3);

  // Chap chekkadagi rangli yo'lak — qutb rangi.
  ctx.fillStyle = power ? "#c0392b" : "#2b3038";
  ctx.fillRect(0, 0, width * 0.07, height);

  ctx.textBaseline = "middle";
  ctx.textAlign = "left";

  if (power) {
    ctx.fillStyle = "#15181d";
    ctx.font = `bold ${Math.round(height * 0.52)}px system-ui, sans-serif`;
    ctx.fillText("5V", width * 0.14, height * 0.42);
    ctx.fillStyle = "#5b6472";
    ctx.font = `600 ${Math.round(height * 0.19)}px system-ui, sans-serif`;
    ctx.fillText("POWER SOURCE", width * 0.14, height * 0.78);
  } else {
    ctx.fillStyle = "#15181d";
    ctx.font = `bold ${Math.round(height * 0.4)}px system-ui, sans-serif`;
    ctx.fillText("GND", width * 0.14, height * 0.4);
    ctx.fillStyle = "#5b6472";
    ctx.font = `600 ${Math.round(height * 0.19)}px system-ui, sans-serif`;
    ctx.fillText("COMMON RETURN", width * 0.14, height * 0.75);

    // Yer belgisi — uchta qisqaruvchi chiziq.
    ctx.strokeStyle = "#15181d";
    ctx.lineWidth = 4;
    const cx = width * 0.82;
    [0.34, 0.24, 0.14].forEach((halfWidth, i) => {
      const y = height * (0.34 + i * 0.16);
      ctx.beginPath();
      ctx.moveTo(cx - width * halfWidth * 0.5, y);
      ctx.lineTo(cx + width * halfWidth * 0.5, y);
      ctx.stroke();
    });
    ctx.beginPath();
    ctx.moveTo(cx, height * 0.16);
    ctx.lineTo(cx, height * 0.34);
    ctx.stroke();
  }

  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.anisotropy = 4;
  frontCache.set(kind, texture);
  return texture;
}
