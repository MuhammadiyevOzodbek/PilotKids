"use client";

import { useEffect, useMemo } from "react";
import { CanvasTexture, SRGBColorSpace, type Texture } from "three";
import { LCD_COLUMNS, LCD_ROWS, getDefinition } from "@/lib/virtual-lab/catalog";
import { localPinPosition, sizeOf } from "@/lib/virtual-lab/lab3d/layout";
import { Box, Cyl, Emissive, InstancedBoxes, M, bool, mat, roundedPlate } from "./model-kit";
import type { ModelProps } from "./models-boards";

/**
 * LCD1602 — 16×2 belgili displey moduli (§4, §5, §13).
 *
 * ── Nega alohida fayl ───────────────────────────────────────────────────
 * Ilgari bu model uch qatorlik edi: yashil g'isht ustida ko'k plita. Uni
 * haqiqiy modulga o'xshatish uchun bir necha qatlam kerak — plata, metall
 * ramka, ichkariga cho'kkan oyna, belgilar maydoni, 16 oyoqli header,
 * o'rnatish teshiklari. Hammasi `models-parts.tsx` ichida qolsa, o'sha fayl
 * o'qib bo'lmas darajada shishardi (HC-SR04 ham shu sababli alohida).
 *
 * ── O'lchamlar HAQIQIY ──────────────────────────────────────────────────
 * Sahna birligi — santimetr (`layout.ts`). Haqiqiy LCD1602: plata
 * 80 × 36 × 1.6 mm, metall ramka 71.3 × 24.3 mm, ko'rinadigan soha
 * 64.5 × 16.4 mm, belgilar maydoni 56.2 × 11.5 mm. Bu yerdagi raqamlar
 * to'g'ridan-to'g'ri o'sha jadvaldan.
 *
 * ── Yo'nalish ───────────────────────────────────────────────────────────
 * Modul stol ustida YOTADI, ekrani tepaga qaraydi. Header plataning OLD
 * qirrasida (+Z) — ya'ni sim bolaga qaragan tomondan chiqadi. Birinchi
 * qator ekranning uzoq (−Z) tomonida: oldindan qaralganda u yuqorida
 * turadi, xuddi haqiqiy displeydagidek.
 *
 * ── Mantiq bu yerda YO'Q ────────────────────────────────────────────────
 * Model faqat shakl. Ekrandagi matn `Simulator` dan tayyor holda keladi
 * (`runtime.lines`), pin ID'lari va ulanish nuqtalari esa KATALOGDAN
 * (`PinField`). Shu sababli bu faylni butunlay almashtirsa ham netlist,
 * simlar va simulyatsiya sezmaydi.
 */

/* ─────────────────────────── O'lchamlar (sm) ─────────────────────────── */

/** Plata qalinligi — haqiqiy 1.6 mm. */
const PCB_T = 0.17;

/** Plata burchagining yumaloqlanish radiusi. */
const PCB_CORNER = 0.25;

/** Plataning ustki yuzasi — hamma detal shu balandlikdan boshlanadi. */
const TOP = PCB_T;

/**
 * Metall ramka (bezel) — displey moduli plataga shu ramka bilan qisiladi.
 *
 * `z` markazdan ORQAGA surilgan: old tomonda header va pin yozuvlari uchun
 * yo'lak qolishi kerak — haqiqiy modulda ham ramka yuqori qirraga yaqin.
 */
const BEZEL = {
  w: 7.12,
  d: 2.46,
  z: -0.28,
  /** Plata yuzasidan ramka qirrasigacha. */
  h: 0.55,
  /** Ramka enining X va Z bo'yicha kengligi. */
  rimX: 0.34,
  rimZ: 0.4,
} as const;

/** Ramka qirrasi — modulning eng baland nuqtasi. */
const BEZEL_TOP = TOP + BEZEL.h;

/** Ko'rinadigan oyna: ramka ichidagi tuynuk (haqiqiy 64.5 × 16.4 mm). */
const WINDOW = {
  w: BEZEL.w - 2 * BEZEL.rimX,
  d: BEZEL.d - 2 * BEZEL.rimZ,
} as const;

/**
 * Oyna yuzasi — ramka qirrasidan 1.3 mm PASTDA.
 *
 * Aynan shu cho'kish tufayli yon tomondan qaralganda ramka soya beradi va
 * ekran "yopishtirilgan ko'k stiker" bo'lib qolmaydi.
 */
const GLASS_TOP = BEZEL_TOP - 0.13;

/**
 * Belgilar maydoni oynaga nisbatan (haqiqiy 56.2 × 11.5 mm).
 *
 * Nisbat sifatida saqlanadi, chunki u kanvas ichida piksel bilan
 * chiziladi — mesh emas (§20).
 */
const ACTIVE = { u: 5.62 / WINDOW.w, v: 1.15 / WINDOW.d } as const;

/** Header: qora plastik asos va oltin oyoqlarning o'lchami. */
const HEADER = {
  baseH: 0.2,
  baseD: 0.24,
  pinH: 0.45,
  pinW: 0.08,
} as const;

/** Pin yozuvlari — ramka bilan header orasidagi tor yo'lakda. */
const LABEL_Z = 1.22;

/**
 * O'rnatish teshiklari — to'rt burchakda, header oyoqlaridan chetda.
 *
 * X bo'yicha 3.78: eng chetdagi oyoq 3.52 da turadi, ya'ni teshik ham,
 * uning silkscreen halqasi ham oyoqqa tegmaydi.
 */
const MOUNT_HOLES: ReadonlyArray<readonly [number, number]> = [
  [-3.78, -1.5],
  [3.78, -1.5],
  [-3.78, 1.5],
  [3.78, 1.5],
];

const MOUNT_R = 0.11;

/* ─────────────────────────── Materiallar ─────────────────────────── */

/*
 * Sirtlar ATAYLAB har xil (§13): yashil lak mat, metall ramka yarim
 * yaltiroq, oyoqlar esa oltin. Ko'z "haqiqiy" degan xulosani aynan shu
 * qarama-qarshilikdan chiqaradi. `mat()` materiallarni keshlaydi, ya'ni
 * sahnada o'nta displey bo'lsa ham shader bir marta kompilyatsiya
 * qilinadi (§33).
 */
const LM = {
  /** Yashil lak qoplama — mat, deyarli metall yaltirog'isiz. */
  pcb: () => mat("#0C7A39", { rough: 0.74, metal: 0.04 }),
  /** Kesilgan qirra — lak yo'q, shuning uchun quyuqroq. */
  pcbEdge: () => mat("#07512a", { rough: 0.86 }),
  /** Ramka — shtamplangan po'lat, yarim mat. */
  bezel: () => mat("#41474f", { rough: 0.44, metal: 0.62 }),
  /** Ramka ostidagi polarizator qirrasi — deyarli qora. */
  polarizer: () => mat("#0a141f", { rough: 0.55 }),
  /** Header oyog'i — oltin qoplamali latun. */
  pin: () => mat("#D6A83B", { rough: 0.25, metal: 0.78 }),
  /** O'rnatish teshigi — yorug'lik tushmaydigan chuqurlik. */
  hole: () => mat("#05080c", { rough: 0.95 }),
};

/* ─────────────────────────── Oyoqlar katalogdan ─────────────────────────── */

interface PinVisual {
  /** Plataga bosiladigan qisqa yozuv — VSS, VDD, VO, RS, RW, E, D0…D7, A, K. */
  label: string;
  x: number;
  z: number;
}

let pinCache: PinVisual[] | null = null;
let pinBoxCache: ReadonlyArray<readonly [number, number, number]> | null = null;

/**
 * ULANADIGAN oyoqlarning o'rni — KATALOG nisbatlaridan.
 *
 * Qo'lda yozilgan koordinata bir kun kelib katalogdan ajralib qolardi va
 * sim ko'zga ko'ringan oyoqning yonidan chiqib ketardi. Bu yerda esa
 * ikkalasi bitta manbadan: `localPinPosition` — `PinField` ulanish
 * nuqtasini qo'yish uchun ishlatadigan funksiyaning AYNAN o'zi.
 */
function lcdPins(): PinVisual[] {
  if (pinCache) return pinCache;

  const def = getDefinition("lcd1602");
  pinCache =
    def?.pins.flatMap((pin) => {
      const at = localPinPosition("lcd1602", pin.id);
      // Silkscreen tor: qavs ichidagi izoh («VSS (GND)») kesib tashlanadi.
      const label = pin.label.split(" ")[0] ?? pin.id.toUpperCase();
      return at ? [{ label, x: at.x, z: at.z }] : [];
    }) ?? [];
  return pinCache;
}

/**
 * KO'RINADIGAN oyoqlarning o'rni.
 *
 * Katalogda modulning HAMMA o'n olti oyog'i bor, shuning uchun bu yerda
 * hech nima o'ylab topilmaydi: ko'ringan oyoq bilan sim yopishadigan
 * nuqta — bitta ro'yxatning ikki ko'rinishi.
 */
function headerPinPositions(): ReadonlyArray<readonly [number, number, number]> {
  if (pinBoxCache) return pinBoxCache;

  const y = TOP + HEADER.pinH / 2;
  pinBoxCache = lcdPins().map((pin) => [pin.x, y, pin.z] as const);
  return pinBoxCache;
}

const PIN_SIZE: [number, number, number] = [HEADER.pinW, HEADER.pinH, HEADER.pinW];

/* ─────────────────────────── Model ─────────────────────────── */

export function Lcd1602Model({ settings, runtime }: ModelProps) {
  const { w, d } = sizeOf("lcd1602");
  /*
   * Yoritish va kontrast SIMULYATORDAN keladi (§46).
   *
   * `runtime.backlight` — A/K oyoqlaridagi haqiqiy ulanish natijasi;
   * simulyatsiya ishlamayotganda esa inspektordagi katakcha ishlaydi,
   * aks holda to'xtatilgan sahnada hamma displey qorong'i bo'lib qolardi.
   */
  const backlight = runtime?.backlight ?? bool(settings, "backlight", true);
  const lines = runtime?.lines ?? [];
  const contrast = runtime?.contrast ?? 1;
  const cursor =
    runtime?.cursorVisible === true
      ? { col: runtime.cursorCol ?? 0, row: runtime.cursorRow ?? 0 }
      : null;

  const silkscreen = useMemo(() => silkscreenTexture(lcdPins(), w, d), [w, d]);

  return (
    <group>
      <LcdBoard width={w} depth={d} />

      {/* Yozuv qatlami plata yuzasidan bir necha mikron balandda — aks holda
          ikki yuza chuqurlik bo'yicha "urishib" miltillardi. */}
      {silkscreen && (
        <mesh position={[0, TOP + 0.003, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[w, d]} />
          <meshStandardMaterial map={silkscreen} transparent roughness={0.78} depthWrite={false} />
        </mesh>
      )}

      <LcdScreenFrame />
      <LcdDisplayWindow backlight={backlight} />
      <CharacterArea lines={lines} backlight={backlight} contrast={contrast} cursor={cursor} />

      <LcdPinHeader width={w} />
      <MountHoles />
    </group>
  );
}

/* ─────────────────────────── Bo'laklar ─────────────────────────── */

/** Yupqa yashil plata: ustki yuzasi lakli, qirrasi quyuqroq. */
function LcdBoard({ width, depth }: { width: number; depth: number }) {
  // `roundedPlate` o'lcham bo'yicha keshlangan — har render da yangi
  // geometriya yaratilmaydi.
  return (
    <mesh
      geometry={roundedPlate(width, depth, PCB_T, PCB_CORNER)}
      material={[LM.pcb(), LM.pcbEdge()]}
      castShadow
      receiveShadow
    />
  );
}

/**
 * Metall ramka — TO'RT chetdan iborat, ya'ni o'rtasi haqiqatan bo'sh.
 *
 * Yaxlit quti bo'lsa oyna ramkaning USTIDA yotgandek ko'rinardi; bu yerda
 * esa oyna chetlar orasidagi chuqurchada qoladi va yon tomondan qaralganda
 * qirra soya beradi.
 */
function LcdScreenFrame() {
  const y = TOP + BEZEL.h / 2;
  const halfW = WINDOW.w / 2 + BEZEL.rimX / 2;
  const halfD = WINDOW.d / 2 + BEZEL.rimZ / 2;

  return (
    <group position={[0, 0, BEZEL.z]}>
      {[-1, 1].map((side) => (
        <Box
          key={`x${side}`}
          pos={[side * halfW, y, 0]}
          size={[BEZEL.rimX, BEZEL.h, BEZEL.d]}
          material={LM.bezel()}
        />
      ))}
      {[-1, 1].map((side) => (
        <Box
          key={`z${side}`}
          pos={[0, y, side * halfD]}
          size={[WINDOW.w, BEZEL.h, BEZEL.rimZ]}
          material={LM.bezel()}
        />
      ))}
    </group>
  );
}

/**
 * Ekran oynasi — ramka ichidagi cho'kkan qatlam.
 *
 * Ikki qatlam: quyuq polarizator qirrasi va uning ustida yorug'lik
 * chiqaradigan suyuq kristall yuzasi. Orqa yoritish o'chirilganda ikkinchisi
 * deyarli so'nadi — haqiqiy modulda ham matn o'shanda zo'rg'a ko'rinadi.
 */
function LcdDisplayWindow({ backlight }: { backlight: boolean }) {
  return (
    <group position={[0, 0, BEZEL.z]}>
      {/* Polarizator — oynadan bir oz kengroq, ramka ostiga kirib turadi */}
      <Box
        pos={[0, TOP + (GLASS_TOP - TOP) / 2 - 0.03, 0]}
        size={[WINDOW.w + 0.1, GLASS_TOP - TOP - 0.06, WINDOW.d + 0.1]}
        material={LM.polarizer()}
        shadow={false}
      />
      {/* Suyuq kristall yuzasi */}
      <mesh
        position={[0, GLASS_TOP - 0.03, 0]}
        scale={[WINDOW.w, 0.06, WINDOW.d]}
        castShadow={false}
        receiveShadow={false}
      >
        <boxGeometry />
        <Emissive
          color={backlight ? "#2f74d8" : "#16324f"}
          intensity={backlight ? 0.8 : 0.1}
          opacity={1}
        />
      </mesh>
    </group>
  );
}

/**
 * Belgilar maydoni — 16 × 2 katak va ulardagi MATN.
 *
 * Matn geometriya bilan chizilmaydi: 32 ta belgi har biri alohida quti
 * bo'lsa, bitta displey o'ttizta qo'shimcha chizish chaqiruvi bo'lardi
 * (§20) va harflar baribir to'rtburchak bo'lib qolardi. Bu yerda hammasi
 * BITTA kanvasda: kataklar ham, harflar ham. Kanvas matn o'zgarganda
 * qayta chiziladi, tekstura obyekti esa o'sha-o'sha qoladi (§33).
 *
 * Matn SIMULYATORDAN keladi — bu yerda hech nima o'ylab topilmaydi (§46).
 */
function CharacterArea({
  lines,
  backlight,
  contrast,
  cursor,
}: {
  lines: readonly string[];
  backlight: boolean;
  /** VO oyog'idan hisoblangan kontrast 0–1. */
  contrast: number;
  /** `lcd.cursor()` yoqilgan bo'lsa — kursorning o'rni. */
  cursor: { col: number; row: number } | null;
}) {
  const texture = useCharacterTexture(lines, contrast, cursor);
  if (!texture) return null;

  return (
    <mesh
      position={[0, GLASS_TOP + 0.004, BEZEL.z]}
      rotation={[-Math.PI / 2, 0, 0]}
      // Yupqa yozuv qatlami: soyaga qo'shilishi ham, nur tushishi ham shart emas.
      raycast={() => null}
    >
      <planeGeometry args={[WINDOW.w, WINDOW.d]} />
      <meshStandardMaterial
        map={texture}
        emissiveMap={texture}
        emissive="#eef6ff"
        emissiveIntensity={backlight ? 1.1 : 0.25}
        transparent
        depthWrite={false}
        roughness={0.45}
      />
    </mesh>
  );
}

/**
 * 16 oyoqli header — qora plastik asos va undan chiqqan oltin oyoqlar.
 *
 * Oyoqlar INSTANSIYALANGAN: o'n oltitasi bitta chizish chaqiruvida (§20).
 */
function LcdPinHeader({ width }: { width: number }) {
  const items = headerPinPositions();
  const z = items[0]?.[2] ?? 1.58;

  const first = items[0]?.[0] ?? -width / 2;
  const last = items[items.length - 1]?.[0] ?? width / 2;
  /*
   * Asos oyoqlardan atigi 0.8 mm chetga chiqadi. Kengroq bo'lsa plataning
   * YUMALOQ burchagidan osilib qolardi — yon tomondan qaralganda bu
   * darrov ko'zga tashlanadi.
   */
  const baseW = Math.min(width - 0.2, last - first + 0.16);

  return (
    <group>
      <Box
        pos={[(first + last) / 2, TOP + HEADER.baseH / 2, z]}
        size={[baseW, HEADER.baseH, HEADER.baseD]}
        material={M.headerBlack()}
      />
      <InstancedBoxes items={items} size={PIN_SIZE} material={LM.pin()} shadow />
    </group>
  );
}

/** O'rnatish teshiklari — plataga tushirilgan quyuq chuqurchalar. */
function MountHoles() {
  return (
    <group>
      {MOUNT_HOLES.map(([x, z]) => (
        <Cyl
          key={`${x},${z}`}
          pos={[x, TOP - 0.005, z]}
          r={MOUNT_R}
          h={0.03}
          material={LM.hole()}
          shadow={false}
        />
      ))}
    </group>
  );
}

/* ─────────────────────────── Ekran teksturasi ─────────────────────────── */

/** Belgilar maydoni kanvasining o'lchami — oyna nisbatiga mos. */
const CHAR_CANVAS = { width: 640, height: Math.round((640 * WINDOW.d) / WINDOW.w) } as const;

/**
 * Ekrandagi matnning teksturasi.
 *
 * Kalit — matnning O'ZI: `lcd.print()` chaqirilmaguncha yangi tekstura
 * ham, yangi kanvas ham paydo bo'lmaydi. Simulyator soniyasiga o'nlab
 * marta ishlaydi, lekin ekrandagi yozuv kamdan-kam o'zgaradi — shuning
 * uchun bu yerda hisob-kitob deyarli nolga teng.
 *
 * Eskisi ATAYLAB tozalanadi: `dispose()` chaqirilmasa har yangilanish GPU
 * xotirasida bitta tekstura qoldirib ketardi (§33).
 */
function useCharacterTexture(
  lines: readonly string[],
  contrast: number,
  cursor: { col: number; row: number } | null,
): Texture | null {
  /*
   * Kontrast YAXLITLANADI: VO ga potensiometr ulanganda kuchlanish
   * arzimas miqdorda tebranib turadi va har kadrda yangi tekstura
   * yaratilardi. Yigirma pog'ona ko'z uchun uzluksiz ko'rinadi.
   */
  const level = Math.round(Math.max(0, Math.min(1, contrast)) * 20);
  const key = `${level}|${cursor ? `${cursor.col},${cursor.row}` : ""}|${lines.join("\n")}`;

  const texture = useMemo(() => {
    // Serverda kanvas yo'q — model matnsiz, lekin xatosiz chiziladi.
    if (typeof document === "undefined") return null;

    const [, cursorPart, ...textParts] = key.split("|");
    const text = textParts.join("|");
    const at = cursorPart
      ? { col: Number(cursorPart.split(",")[0]), row: Number(cursorPart.split(",")[1]) }
      : null;

    const canvas = document.createElement("canvas");
    canvas.width = CHAR_CANVAS.width;
    canvas.height = CHAR_CANVAS.height;
    drawCharacters(canvas, text.length > 0 ? text.split("\n") : [], level / 20, at);

    const created = new CanvasTexture(canvas);
    created.colorSpace = SRGBColorSpace;
    created.anisotropy = 4;
    return created;
  }, [key, level]);

  useEffect(() => () => texture?.dispose(), [texture]);

  return texture;
}

/**
 * Kanvasga 16 × 2 katak va matnni chizadi.
 *
 * Kataklar DOIM chiziladi — hatto matn bo'sh bo'lganda ham. Aynan shu
 * zaif to'r displeyni "belgili LCD" qilib ko'rsatadi: ular bo'lmasa ekran
 * telefon ekraniga o'xshab qolardi.
 */
function drawCharacters(
  canvas: HTMLCanvasElement,
  lines: readonly string[],
  contrast: number,
  cursor: { col: number; row: number } | null,
): void {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const { width, height } = canvas;
  ctx.clearRect(0, 0, width, height);

  const areaW = width * ACTIVE.u;
  const areaH = height * ACTIVE.v;
  const left = (width - areaW) / 2;
  const top = (height - areaH) / 2;
  const cellW = areaW / LCD_COLUMNS;
  const cellH = areaH / LCD_ROWS;

  // Katak izlari — juda zaif, faqat to'r sezilib tursin.
  ctx.fillStyle = "rgba(226, 240, 255, 0.07)";
  for (let row = 0; row < LCD_ROWS; row += 1) {
    for (let col = 0; col < LCD_COLUMNS; col += 1) {
      ctx.fillRect(
        left + col * cellW + cellW * 0.08,
        top + row * cellH + cellH * 0.06,
        cellW * 0.84,
        cellH * 0.88,
      );
    }
  }

  /*
   * Belgilar — monokenglikdagi shrift, har biri o'z katagining markazida.
   *
   * Kontrast shaffoflikka aylanadi: VO ga ulangan potensiometr burilganda
   * yozuv fonga singib boradi, xuddi haqiqiy moduldagidek. Juda past
   * kontrastda belgilar butunlay yo'qoladi.
   */
  ctx.globalAlpha = Math.max(0, Math.min(1, contrast * 1.25));
  ctx.fillStyle = "#f2f8ff";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = `bold ${Math.round(cellH * 0.72)}px "Courier New", ui-monospace, monospace`;

  // Kursor — `lcd.cursor()` yoqilganda katak ostidagi chiziqcha.
  if (cursor) {
    const col = Math.max(0, Math.min(LCD_COLUMNS - 1, cursor.col));
    const row = Math.max(0, Math.min(LCD_ROWS - 1, cursor.row));
    ctx.fillRect(
      left + col * cellW + cellW * 0.15,
      top + (row + 1) * cellH - cellH * 0.18,
      cellW * 0.7,
      Math.max(1, cellH * 0.08),
    );
  }

  lines.slice(0, LCD_ROWS).forEach((line, row) => {
    Array.from(line.slice(0, LCD_COLUMNS)).forEach((ch, col) => {
      if (ch === " ") return;
      ctx.fillText(ch, left + (col + 0.5) * cellW, top + (row + 0.52) * cellH);
    });
  });
}

/* ─────────────────────────── Silkscreen ─────────────────────────── */

const silkCache = new Map<string, Texture | null>();

/**
 * Plata ustidagi bosma qatlam: modul nomi, pin yozuvlari, 1-oyoq belgisi
 * (§7, §8, §14).
 *
 * Yozuv GEOMETRIYA bilan chizilmaydi va tashqi shrift ham yuklanmaydi —
 * `uno-silkscreen.ts` va HC-SR04 dagi bilan bir xil yondashuv: hammasi
 * bitta kanvasga tushadi, ya'ni butun yozuv qatlami bitta qo'shimcha
 * yuza (§20). Laboratoriya internetsiz ham ishlashi kerak.
 *
 * Yozuvlarning X o'rni KATALOG nisbatidan keladi, shuning uchun "RS"
 * doim o'z oyog'ining tepasida turadi va tooltipdagi nom bilan bir xil.
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
  ctx.fillStyle = "#e2e9f1";
  ctx.strokeStyle = "#e2e9f1";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  /*
   * Pin yozuvlari — o'n oltita, qadam atigi 4.7 mm. Shrift shunga qarab
   * kichik: kattaroq bo'lsa "VSS" bilan "VDD" bir-biriga yopishardi.
   */
  ctx.font = `bold ${Math.round(px * 0.115)}px system-ui, sans-serif`;
  for (const { label, x } of labels) {
    ctx.fillText(label.toUpperCase(), toU(x), toV(LABEL_Z));
  }

  // Modul nomi — ramka orqasidagi tor yo'lakda.
  ctx.globalAlpha = 0.75;
  ctx.font = `bold ${Math.round(px * 0.13)}px system-ui, sans-serif`;
  ctx.fillText("LCD1602  ·  16 × 2", toU(0), toV(-1.66));

  // Birinchi oyoq belgisi — haqiqiy platada ham kvadrat kontakt bilan ajratiladi.
  const first = labels[0];
  if (first) {
    ctx.globalAlpha = 0.85;
    ctx.lineWidth = Math.max(1, px * 0.03);
    ctx.strokeRect(toU(first.x) - px * 0.12, toV(1.58) - px * 0.12, px * 0.24, px * 0.24);
  }

  // O'rnatish teshiklari atrofidagi kontakt halqasi.
  ctx.globalAlpha = 0.45;
  ctx.lineWidth = Math.max(1, px * 0.035);
  for (const [x, z] of MOUNT_HOLES) {
    ctx.beginPath();
    ctx.arc(toU(x), toV(z), px * (MOUNT_R + 0.05), 0, Math.PI * 2);
    ctx.stroke();
  }

  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.anisotropy = 4;
  silkCache.set(key, texture);
  return texture;
}
