"use client";

import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";

/**
 * Modellar uchun umumiy qurilish bloklari.
 *
 * Har bir komponent nolga qaytmasdan shu yerdagi bo'laklardan yig'iladi:
 * plata, pin qatori, oyoq, korpus. Shu sababli o'ttizta model bir-biriga
 * o'xshash ko'rinadi va bittasini yaxshilash hammasiga tegadi.
 *
 * GLB fayllar ATAYLAB ishlatilmagan (§34): protsedural model yuklab
 * olinmaydi, o'lchami noldan iborat va istalgan komponent uchun bir necha
 * qatorda yoziladi. Kelajakda alohida komponentga GLTF qo'shish uchun
 * registrdagi bitta yozuvni almashtirish yetarli.
 */

/* ─────────────────────────── Ulashilgan resurslar ─────────────────────────── */

/*
 * Geometriya va materiallar MODUL darajasida bir marta yaratiladi.
 * Har bir `<meshStandardMaterial>` elementi alohida material obyekti hosil
 * qiladi; o'ttizta komponentda bu yuzlab material va shuncha shader
 * kompilyatsiyasi degani (§33).
 */
export const BOX = new THREE.BoxGeometry(1, 1, 1);
export const CYL = new THREE.CylinderGeometry(1, 1, 1, 20);
/**
 * Silliq silindr — yon yuzasi katta ko'rinadigan qismlar uchun.
 *
 * 20 qirra mayda detalda sezilmaydi, lekin ultratovush o'zgartkichi kabi
 * kaftdek katta metall bankada qirralar ochiq ko'rinadi va model
 * "past-poli" bo'lib qoladi. 48 qirra silliq, lekin baribir arzon.
 */
export const CYL_SMOOTH = new THREE.CylinderGeometry(1, 1, 1, 48);
export const SPHERE = new THREE.SphereGeometry(1, 16, 12);

/* ─────────────────────────── Plata va halqa geometriyasi ─────────────────────────── */

const plateCache = new Map<string, THREE.BufferGeometry>();

/**
 * Burchaklari yumaloqlangan YUPQA plata.
 *
 * Oddiy `BoxGeometry` plata emas, o'yinchoq g'isht bo'lib ko'rinadi:
 * haqiqiy PCB ning burchagi yumaloq, qirrasi esa mayda fasqali. Bu yerda
 * shakl chizilib, qalinlik bo'yicha cho'ziladi.
 *
 * Natija IKKI materialli: 0 — ustki/pastki yuza, 1 — yon qirra. Shu
 * sababli qirrani quyuqroq rangda berish mumkin (haqiqiy platada kesilgan
 * qirra lak ostidagi steklotekstolit rangida bo'ladi).
 *
 * Geometriya o'lchov bo'yicha keshlanadi va Y bo'yicha 0 dan `h` gacha
 * turadi — ya'ni plataning tagi aynan stol yuzasida.
 */
export function roundedPlate(w: number, d: number, h: number, radius = 0.2): THREE.BufferGeometry {
  const key = `${w}|${d}|${h}|${radius}`;
  const cached = plateCache.get(key);
  if (cached) return cached;

  const r = Math.min(radius, w / 2, d / 2);
  const bevel = Math.min(0.02, h / 4);

  const shape = new THREE.Shape();
  const x = w / 2 - r;
  const y = d / 2 - r;
  shape.moveTo(-x, -d / 2);
  shape.lineTo(x, -d / 2);
  shape.quadraticCurveTo(w / 2, -d / 2, w / 2, -y);
  shape.lineTo(w / 2, y);
  shape.quadraticCurveTo(w / 2, d / 2, x, d / 2);
  shape.lineTo(-x, d / 2);
  shape.quadraticCurveTo(-w / 2, d / 2, -w / 2, y);
  shape.lineTo(-w / 2, -y);
  shape.quadraticCurveTo(-w / 2, -d / 2, -x, -d / 2);

  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: h - 2 * bevel,
    bevelEnabled: true,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelSegments: 1,
    curveSegments: 5,
  });

  // Cho'zilish Z bo'yicha edi — plata yotishi uchun Y ga buriladi.
  geometry.rotateX(-Math.PI / 2);
  geometry.computeBoundingBox();
  geometry.translate(0, -(geometry.boundingBox?.min.y ?? 0), 0);
  geometry.computeVertexNormals();

  plateCache.set(key, geometry);
  return geometry;
}

const ringCache = new Map<string, THREE.TorusGeometry>();

/**
 * Yotgan halqa (torus) — metall qirra, chok yoki konsentrik naqsh uchun.
 *
 * `Cyl` dan farqi: halqa MIQYOSLANMAYDI, chunki miqyos naychaning
 * qalinligini ham cho'zib, halqani ovalga aylantirardi. Shu sababli har
 * o'lcham uchun alohida (lekin keshlangan) geometriya.
 */
export function ringGeometry(radius: number, tube: number, segments = 40): THREE.TorusGeometry {
  const key = `${radius}|${tube}|${segments}`;
  const cached = ringCache.get(key);
  if (cached) return cached;
  const created = new THREE.TorusGeometry(radius, tube, 6, segments);
  created.rotateX(-Math.PI / 2);
  ringCache.set(key, created);
  return created;
}

const materialCache = new Map<string, THREE.MeshStandardMaterial>();

/** Rang va sirt bo'yicha ulashilgan material. */
export function mat(
  color: string,
  options: { rough?: number; metal?: number; transparent?: number } = {},
): THREE.MeshStandardMaterial {
  const { rough = 0.6, metal = 0, transparent } = options;
  const key = `${color}|${rough}|${metal}|${transparent ?? ""}`;
  const cached = materialCache.get(key);
  if (cached) return cached;

  const created = new THREE.MeshStandardMaterial({
    color,
    roughness: rough,
    metalness: metal,
    transparent: transparent !== undefined,
    opacity: transparent ?? 1,
  });
  materialCache.set(key, created);
  return created;
}

/**
 * Ko'p ishlatiladigan materiallar.
 *
 * Sirtlar ATAYLAB har xil (§13): hamma narsa bir xil mat qora bo'lsa
 * model o'yinchoqqa o'xshaydi. Haqiqiy platada esa lak qoplamasi
 * yarim yaltiroq, korpuslar mat, konnektorlar esa metall — ko'z aynan
 * shu farqdan "haqiqiy" degan xulosa chiqaradi.
 */
export const M = {
  pcbBlue: () => mat("#1c5e9e", { rough: 0.55 }),
  /** Plataning lak qoplamasi — yarim yaltiroq, mikro-metall yaltirog'i bilan. */
  solderMask: () => mat("#1a5b9c", { rough: 0.38, metal: 0.12 }),
  /** Mikrosxema korpusi — quyuq, deyarli mat epoksid. */
  icBlack: () => mat("#15181d", { rough: 0.58, metal: 0.1 }),
  /** Konnektor plastigi — mat qora. */
  headerBlack: () => mat("#101318", { rough: 0.88 }),
  /** Uya ichi — yorug'lik tushmaydigan chuqurlik. */
  socketHole: () => mat("#04060a", { rough: 0.95 }),
  /** USB/DC konnektorlarning shtamplangan po'lat korpusi. */
  connector: () => mat("#c6ccd5", { rough: 0.26, metal: 0.95 }),
  /** Qalaylangan oyoqlar va kontaktlar. */
  tinned: () => mat("#9ea8b4", { rough: 0.3, metal: 0.88 }),
  pcbGreen: () => mat("#136b3c", { rough: 0.55 }),
  pcbRed: () => mat("#8f1d2a", { rough: 0.55 }),
  pcbBlack: () => mat("#181d24", { rough: 0.5 }),
  plasticWhite: () => mat("#e8ecf2", { rough: 0.75 }),
  plasticBlack: () => mat("#20242b", { rough: 0.7 }),
  plasticBlue: () => mat("#2f5fb8", { rough: 0.7 }),
  plasticRed: () => mat("#c8443c", { rough: 0.55 }),
  metal: () => mat("#b9c2cc", { rough: 0.35, metal: 0.85 }),
  gold: () => mat("#d8b45a", { rough: 0.35, metal: 0.9 }),
  silver: () => mat("#cfd6de", { rough: 0.3, metal: 0.8 }),
  darkGlass: () => mat("#0d1b2a", { rough: 0.15 }),
};

/**
 * Yorug'lik CHIQARADIGAN material (LED, segment, ekran).
 *
 * Bu material ULASHILMAYDI: bitta LEDning yonishi boshqasini ham yoqib
 * yuborardi.
 *
 * Material obyekti qo'lda YARATILMAYDI ham. R3F `<meshStandardMaterial>`
 * elementiga berilgan propslarni MAVJUD material ustiga qo'llaydi, ya'ni
 * yorqinlik har kadrda o'zgarsa ham yangi obyekt paydo bo'lmaydi va
 * shader qayta kompilyatsiya qilinmaydi (§33). Qo'lda `new Material()`
 * qilib, keyin maydonini yozish esa React qoidasini buzardi: hook
 * qaytargan qiymatni render paytida o'zgartirib bo'lmaydi.
 */
export function Emissive({
  color,
  intensity,
  opacity = 0.92,
}: {
  color: string;
  /** 0 — o'chiq, 3 atrofida — to'liq yonган. */
  intensity: number;
  opacity?: number;
}) {
  return (
    <meshStandardMaterial
      color={color}
      emissive={color}
      emissiveIntensity={intensity}
      roughness={0.25}
      transparent
      opacity={opacity}
    />
  );
}

/* ─────────────────────────── Oddiy shakllar ─────────────────────────── */

/**
 * To'rtburchak jism. `pos` — markazi, `size` — [kenglik, balandlik, chuqurlik].
 *
 * `shadow={false}` — qism soya tashlamaydi. Mayda SMD elementlar uchun shu
 * kerak: ularning soyasi ko'rinmaydi, lekin har biri soya kartasiga
 * qo'shimcha chizish degani (§19).
 */
export function Box({
  pos = [0, 0, 0],
  size,
  material,
  rot,
  shadow = true,
}: {
  pos?: [number, number, number];
  size: [number, number, number];
  material: THREE.Material;
  rot?: [number, number, number];
  shadow?: boolean;
}) {
  return (
    <mesh
      position={pos}
      rotation={rot}
      scale={size}
      geometry={BOX}
      material={material}
      castShadow={shadow}
      receiveShadow={shadow}
    />
  );
}

/** Silindr. `axis` — o'qi qaysi tomonga qaragan. */
export function Cyl({
  pos = [0, 0, 0],
  r,
  h,
  material,
  axis = "y",
  rTop,
  shadow = true,
  smooth = false,
}: {
  pos?: [number, number, number];
  r: number;
  h: number;
  material: THREE.Material;
  axis?: "x" | "y" | "z";
  /** Yuqori radius — konus qilish uchun. */
  rTop?: number;
  shadow?: boolean;
  /** Katta silindrlar uchun — 48 qirrali silliq geometriya. */
  smooth?: boolean;
}) {
  const rot: [number, number, number] =
    axis === "x" ? [0, 0, Math.PI / 2] : axis === "z" ? [Math.PI / 2, 0, 0] : [0, 0, 0];
  return (
    <mesh
      position={pos}
      rotation={rot}
      scale={[r, h, r]}
      geometry={smooth ? CYL_SMOOTH : CYL}
      material={material}
      castShadow={shadow}
      receiveShadow={shadow}
    >
      {rTop !== undefined && <cylinderGeometry args={[rTop / r, 1, 1, 20]} attach="geometry" />}
    </mesh>
  );
}

/** Yotgan metall halqa — `ringGeometry` dagi keshlangan shakl bilan. */
export function Ring({
  pos = [0, 0, 0],
  r,
  tube,
  material,
  segments,
  shadow = false,
}: {
  pos?: [number, number, number];
  r: number;
  tube: number;
  material: THREE.Material;
  segments?: number;
  shadow?: boolean;
}) {
  return (
    <mesh
      position={pos}
      geometry={ringGeometry(r, tube, segments)}
      material={material}
      castShadow={shadow}
      receiveShadow={shadow}
    />
  );
}

/**
 * Bir xil mayda jismlar to'plami — bitta chizish chaqiruvida (§20).
 *
 * Mikrosxema oyoqlari, SMD elementlar, header uyalari: har biri alohida
 * mesh bo'lsa bitta Arduino yuzdan ortiq chizish chaqiruvi bo'lardi.
 * Instansiyada esa hammasi bitta.
 */
export function InstancedBoxes({
  items,
  size,
  material,
  shadow = false,
}: {
  items: ReadonlyArray<readonly [number, number, number]>;
  size: [number, number, number];
  material: THREE.Material;
  shadow?: boolean;
}) {
  const ref = useRef<THREE.InstancedMesh>(null);

  useEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;

    const matrix = new THREE.Matrix4();
    const position = new THREE.Vector3();
    const quaternion = new THREE.Quaternion();
    const scale = new THREE.Vector3(...size);

    items.forEach(([x, y, z], i) => {
      mesh.setMatrixAt(i, matrix.compose(position.set(x, y, z), quaternion, scale));
    });
    mesh.instanceMatrix.needsUpdate = true;
    mesh.count = items.length;
  }, [items, size]);

  if (items.length === 0) return null;

  return (
    <instancedMesh
      ref={ref}
      args={[BOX, material, items.length]}
      castShadow={shadow}
      receiveShadow={shadow}
    />
  );
}

/**
 * Komponent oyog'i (LED, rezistor, tranzistor uchun).
 *
 * Oyoqlar pastga — stol tomon — cho'ziladi: shunda komponent breadboardga
 * sanchilgandek ko'rinadi va sim pastdan emas, oyoq uchidan chiqadi.
 */
export function Leg({ x, z, h = 0.6 }: { x: number; z: number; h?: number }) {
  return <Cyl pos={[x, -h / 2, z]} r={0.025} h={h} material={M.silver()} />;
}

/**
 * Pin qatori (header).
 *
 * Bu FAQAT ko'rinish: ulanish nuqtalari alohida `PinField` da, chunki
 * ular bosiladigan va hover qilinadigan bo'lishi kerak.
 */
export function PinHeader({
  from,
  to,
  z,
  y,
  count,
}: {
  from: number;
  to: number;
  z: number;
  y: number;
  count: number;
}) {
  const items = useMemo(() => {
    const step = count > 1 ? (to - from) / (count - 1) : 0;
    return Array.from({ length: count }, (_, i) => from + i * step);
  }, [from, to, count]);

  return (
    <group>
      {/* Qora plastik asos */}
      <Box
        pos={[(from + to) / 2, y + 0.12, z]}
        size={[Math.abs(to - from) + 0.25, 0.24, 0.25]}
        material={M.plasticBlack()}
      />
      {items.map((x, i) => (
        <Box key={i} pos={[x, y + 0.3, z]} size={[0.06, 0.36, 0.06]} material={M.gold()} />
      ))}
    </group>
  );
}

/** Rezistor rang halqalari uchun jadval. */
const BAND_COLORS = [
  "#1a1a1a",
  "#6b3a12",
  "#d0342c",
  "#e07b1c",
  "#e8c93a",
  "#3f9e4d",
  "#2f5fb8",
  "#8e5bb5",
  "#9aa3ad",
  "#f2f2f2",
];

/**
 * Qarshilik qiymatidan rang halqalari (§9).
 *
 * Haqiqiy rezistorlardagi kabi: birinchi ikki halqa raqamlar, uchinchisi
 * nollar soni. 220 Ω → qizil, qizil, jigarrang.
 */
export function resistorBands(ohms: number): string[] {
  const safe = Math.max(1, Math.round(ohms));
  const digits = String(safe);
  const first = Number(digits[0] ?? "0");
  const second = Number(digits[1] ?? "0");
  const zeros = Math.max(0, digits.length - 2);
  return [
    BAND_COLORS[first] ?? BAND_COLORS[0]!,
    BAND_COLORS[second] ?? BAND_COLORS[0]!,
    BAND_COLORS[Math.min(zeros, 9)] ?? BAND_COLORS[0]!,
    // To'rtinchi halqa — aniqlik (oltin, ±5 %).
    "#c9a227",
  ];
}

/* ─────────────────────────── Sozlama o'qish ─────────────────────────── */

/** `CircuitNode.settings` dan son (yo'q bo'lsa zaxira qiymat). */
export function num(
  settings: Record<string, string | number | boolean>,
  key: string,
  fallback: number,
): number {
  const value = settings[key];
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

/** `CircuitNode.settings` dan mantiqiy qiymat. */
export function bool(
  settings: Record<string, string | number | boolean>,
  key: string,
  fallback = false,
): boolean {
  const value = settings[key];
  return typeof value === "boolean" ? value : fallback;
}

/** `CircuitNode.settings` dan matn. */
export function str(
  settings: Record<string, string | number | boolean>,
  key: string,
  fallback: string,
): string {
  const value = settings[key];
  return typeof value === "string" && value.length > 0 ? value : fallback;
}
