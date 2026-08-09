"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ComponentRef } from "react";
import { Canvas, useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { Grid, OrbitControls } from "@react-three/drei";
import {
  BackSide,
  ConeGeometry,
  CylinderGeometry,
  MOUSE,
  Matrix4,
  PCFShadowMap,
  Quaternion,
  TOUCH,
  Vector3,
  type InstancedMesh,
} from "three";
import {
  DESK,
  TABLE,
  clampToTable,
  nodePosition,
  snapToGrid,
  toWorkspaceXY,
  worldPinPosition,
} from "@/lib/virtual-lab/lab3d/layout";
import { MOVE_KEYS, movementFrom, navigationShift } from "@/lib/virtual-lab/lab3d/navigation";
import { validateCircuit } from "@/lib/virtual-lab/validator";
import { useCircuitStore, useSimulationStore } from "@/stores/virtual-lab";
import { useLab3DStore, type CameraView } from "@/stores/lab3d";
import { Component3D } from "./component-3d";
import { deskTexture } from "./desk-texture";
import { HORIZON, grassTexture, skyTexture, treeSpots } from "./scenery";
import { PendingWire, Wires3D } from "./wires-3d";

/**
 * 3D ish maydoni.
 *
 * Sahna sxemani `useCircuitStore` dan oladi — 2D laboratoriya bilan bitta
 * do'kondan. Shu sababli bu yerda qilingan har bir o'zgarish (komponent
 * qo'shish, sim ulash) 2D da ham ko'rinadi va undo/redo, saqlash hamda
 * simulyator qayta yozilmaydi (§42).
 */

/* ─────────────────────────── Kamera ─────────────────────────── */

/** Tayyor ko'rinishlar: kamera qayerdan qaraydi (§4). */
const VIEWS: Record<CameraView, [number, number, number]> = {
  perspective: [22, 20, 26],
  top: [0, 42, 0.001],
  front: [0, 8, 40],
  left: [-40, 10, 0.001],
  right: [40, 10, 0.001],
};

/**
 * Kamera buyruqlarini bajaradi.
 *
 * Kamera holati React'da SAQLANMAYDI: u har kadrda o'zgaradi va store'ga
 * yozilsa butun interfeys qayta chizilardi (§33). Store'da faqat buyruq
 * hisoblagichi turadi — u o'zgarganda kamera bir marta ko'chiriladi.
 */
type OrbitRef = ComponentRef<typeof OrbitControls>;

function CameraDirector({ controls }: { controls: React.RefObject<OrbitRef | null> }) {
  const command = useLab3DStore((s) => s.cameraCommand);
  const { camera } = useThree();
  const circuit = useCircuitStore((s) => s.circuit);
  const selectedIds = useCircuitStore((s) => s.selectedIds);

  useEffect(() => {
    const control = controls.current;
    if (!control) return;

    if (command.view === "focus" || command.view === "fit") {
      // Tanlangan komponentga (yoki hammasiga) qaraydigan nuqta.
      const nodes =
        command.view === "focus" && selectedIds.length > 0
          ? circuit.nodes.filter((n) => selectedIds.includes(n.id))
          : circuit.nodes;
      if (nodes.length === 0) return;

      const points = nodes.map(nodePosition);
      const center = points.reduce(
        (acc, p) => ({ x: acc.x + p.x / points.length, z: acc.z + p.z / points.length }),
        { x: 0, z: 0 },
      );
      const spread = Math.max(
        6,
        ...points.map((p) => Math.hypot(p.x - center.x, p.z - center.z) * 2.4),
      );

      control.target.set(center.x, 0, center.z);
      camera.position.set(center.x + spread * 0.6, spread * 0.75, center.z + spread * 0.9);
      control.update();
      return;
    }

    const [x, y, z] = VIEWS[command.view];
    control.target.set(0, 0, 0);
    camera.position.set(x, y, z);
    control.update();
    /*
     * ATAYLAB faqat `command.token` ga bog'liq.
     *
     * Boshqa qiymatlar (sxema, tanlov, kamera) ro'yxatga qo'shilsa, har
     * bir komponent ko'chirilganda kamera sakrab ketardi. Bu effekt
     * BUYRUQNI bajaradi, holatni kuzatmaydi.
     */
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [command.token]);

  return null;
}

/* ─────────────────────────── Klaviatura bilan yurish ─────────────────────────── */

/** Nishon stol chetidan qancha uzoqqa chiqa oladi (sm). */
const ROAM_MARGIN = 30;

const ROAM_BOUNDS = {
  x: TABLE.width / 2 + ROAM_MARGIN,
  z: TABLE.depth / 2 + ROAM_MARGIN,
} as const;

/**
 * W A S D bilan sahna bo'ylab yurish.
 *
 * Hisobning O'ZI bu yerda emas — u `lab3d/navigation.ts` da, sof
 * funksiya sifatida va testlar bilan qoplangan. Bu komponent faqat
 * tugmalarni kuzatadi va natijani kameraga qo'llaydi.
 *
 * ── Nega kamera ham, nishon ham ko'chiriladi ────────────────────────────
 * `OrbitControls` kamerani nishon atrofida aylantiradi. Faqat kamerani
 * ko'chirish uni nishonga nisbatan burardi, ya'ni "yurish" o'rniga
 * "aylanish" chiqardi. Ikkalasini bir xil vektorga siljitish esa qarash
 * burchagini saqlaydi — xuddi kamerani qo'lda ko'tarib yurgandek.
 *
 * ── Nega `useFrame` ichida `invalidate` ─────────────────────────────────
 * Sahna `frameloop="demand"` bilan ishlaydi: kadr faqat kerak bo'lganda
 * chiziladi (§33). Birinchi kadrni `keydown` so'raydi, keyingilarini esa
 * har kadr o'zi so'rab turadi — tugma qo'yib yuborilishi bilan sikl
 * to'xtaydi va bo'sh turgan laboratoriya batareyani yemaydi.
 */
/**
 * Ctrl bilan birga bosilganda YURISHGA emas, qisqartmaga tegishli tugmalar.
 *
 * Ctrl tezlatgichga aylangach, `Ctrl+S` (saqlash) va `Ctrl+D` (nusxalash)
 * bir vaqtning o'zida kamerani ham qimirlatib yuborardi.
 */
const CTRL_SHORTCUT_KEYS = new Set(["KeyS", "KeyD", "ShiftLeft"]);

/**
 * Bo'shliq fokusdagi tugmani bosishi kerakmi.
 *
 * Bo'shliq endi kamerani ko'taradi, lekin brauzerda u fokusdagi tugmani
 * bosadigan STANDART tugma ham. Uni hamma joyda o'zlashtirib olish
 * klaviatura bilan ishlaydigan foydalanuvchidan asboblar panelini
 * tortib olardi — shu sababli fokus tugmada bo'lsa bo'shliq unga qoladi.
 */
function activatesControl(code: string, target: EventTarget | null): boolean {
  if (code !== "Space") return false;
  const element = target as HTMLElement | null;
  return Boolean(element?.closest?.("button, a, [role='button']"));
}

function KeyboardNavigation({ controls }: { controls: React.RefObject<OrbitRef | null> }) {
  const camera = useThree((s) => s.camera);
  const invalidate = useThree((s) => s.invalidate);

  const held = useRef(new Set<string>());
  const boost = useRef(false);

  useEffect(() => {
    /** Matn kiritilayotgan bo'lsa tugmalar kameraga tegmasin. */
    const typing = (target: EventTarget | null) => {
      const element = target as HTMLElement | null;
      if (!element) return false;
      if (["INPUT", "TEXTAREA", "SELECT"].includes(element.tagName)) return true;
      if (element.isContentEditable) return true;
      return Boolean(element.closest?.(".monaco-editor"));
    };

    const onDown = (event: KeyboardEvent) => {
      /*
       * Ctrl har qanday tugmada yangilanadi.
       *
       * Ilgari u faqat yurish tugmasi bosilganda o'qilardi, shuning uchun
       * `W` ni ushlab turib keyin tezlatgichni bosish hech narsa qilmasdi —
       * tezlashtirish faqat u OLDIN bosilgan bo'lsa ishlardi.
       */
      boost.current = event.ctrlKey;

      /*
       * Ctrl endi TEZLATGICH, ya'ni u bosilganda ham yurish davom etadi.
       * Lekin Ctrl+S va Ctrl+D qisqartmalari o'z ishini qilishi kerak —
       * shu sababli aynan o'sha tugmalar Ctrl bilan yurishga qo'shilmaydi
       * (Shift ham: Ctrl+Shift+Z bosilganda kamera pastga sho'ng'imasin).
       *
       * Bu kichik nomutanosiblik qoldiradi: avval Ctrl, keyin `S` bosilsa
       * orqaga yurilmaydi. Teskarisi — avval `S`, keyin Ctrl — ishlaydi,
       * chunki tugma allaqachon ro'yxatda.
       */
      if (event.metaKey || event.altKey) return;
      if (event.ctrlKey && CTRL_SHORTCUT_KEYS.has(event.code)) return;
      if (!(event.code in MOVE_KEYS)) return;
      if (typing(event.target)) return;
      if (activatesControl(event.code, event.target)) return;

      // O'q tugmalari sahifani aylantirmasin.
      event.preventDefault();
      held.current.add(event.code);
      invalidate();
    };

    const onUp = (event: KeyboardEvent) => {
      boost.current = event.ctrlKey;
      held.current.delete(event.code);
    };

    /*
     * Oyna fokusni yo'qotganda bosilgan tugmalar "yopishib" qolmasin:
     * Alt+Tab qilinsa `keyup` bu oynaga yetib kelmaydi va kamera abadiy
     * oldinga yurib ketardi.
     */
    const release = () => held.current.clear();

    window.addEventListener("keydown", onDown);
    window.addEventListener("keyup", onUp);
    window.addEventListener("blur", release);
    return () => {
      window.removeEventListener("keydown", onDown);
      window.removeEventListener("keyup", onUp);
      window.removeEventListener("blur", release);
    };
  }, [invalidate]);

  useFrame((_, delta) => {
    if (held.current.size === 0) return;
    const control = controls.current;
    if (!control) return;

    camera.getWorldDirection(AHEAD);

    const shift = navigationShift({
      ...movementFrom(held.current),
      camera: camera.position,
      target: control.target,
      direction: AHEAD,
      delta,
      boost: boost.current,
      bounds: ROAM_BOUNDS,
    });

    if (shift.x !== 0 || shift.y !== 0 || shift.z !== 0) {
      SHIFT.set(shift.x, shift.y, shift.z);
      control.target.add(SHIFT);
      camera.position.add(SHIFT);
      control.update();
    }

    // Tugma hali bosilib turibdi — keyingi kadrni ham so'raymiz.
    invalidate();
  });

  return null;
}

/*
 * Vektorlar MODUL darajasida: harakat har kadrda hisoblanadi va bu yerda
 * `new Vector3()` yozish sekundiga yuzlab obyekt yaratib, axlat
 * yig'uvchini bekorga ishga solardi.
 */
const AHEAD = new Vector3();
const SHIFT = new Vector3();

/* ─────────────────────────── Stol ─────────────────────────── */

/**
 * Ish stoli — pol, stol va ustidagi gilamcha.
 *
 * ── Nega oddiy tekislik yetarli emas ────────────────────────────────────
 * Ilgari stol yassi to'rtburchak edi: qalinligi ham, oyog'i ham, atrofida
 * xonasi ham yo'q. Uch o'lchamli sahnada bunday yuza masshtabni umuman
 * bermaydi — Arduino 6.86 sm ekanini ko'rsatadigan hech narsa yo'q, chunki
 * uni solishtirish uchun tanish predmet kerak. Haqiqiy o'lchamdagi stol
 * (150 × 92 sm, balandligi 74 sm) aynan shu vazifani bajaradi.
 *
 * Barcha o'lchamlar `layout.ts` dagi `DESK` dan — sahna geometriyasi
 * bitta joydan boshqariladi.
 */
function Workbench({ showGrid }: { showGrid: boolean }) {
  const wood = deskTexture();

  const matTop = 0;
  const matBottom = matTop - DESK.mat.thickness;
  /** Qopqoq gilamcha ostida yotadi. */
  const topCentre = matBottom - DESK.thickness / 2;
  const floorY = -DESK.height;

  /** Oyoqlarning markazlari — qopqoq burchaklaridan ichkarida. */
  const legX = DESK.width / 2 - DESK.leg.inset - DESK.leg.size / 2;
  const legZ = DESK.depth / 2 - DESK.leg.inset - DESK.leg.size / 2;
  const legHeight = DESK.height - DESK.thickness - DESK.mat.thickness;

  return (
    <group>
      <Scenery groundY={floorY} />

      {/*
        Qopqoq — yog'och naqshi bilan.

        Soya TASHLAMAYDI: soya kamerasi ish maydoni bo'yicha sozlangan
        (mayda komponentlar aniq soya bersin uchun), stol esa undan
        kattaroq — uning soyasi polda keskin kesilgan holda chiqardi.
      */}
      <mesh position={[0, topCentre, 0]} receiveShadow>
        <boxGeometry args={[DESK.width, DESK.thickness, DESK.depth]} />
        <meshStandardMaterial map={wood} color="#ffffff" roughness={0.62} metalness={0.04} />
      </mesh>

      {/* Qirra — qopqoqning yon tomoni quyuqroq, chekkasi ko'rinib tursin */}
      <mesh position={[0, topCentre, 0]}>
        <boxGeometry args={[DESK.width + 0.12, DESK.thickness * 0.42, DESK.depth + 0.12]} />
        <meshStandardMaterial color="#4a3826" roughness={0.7} />
      </mesh>

      {/* To'rtta metall oyoq */}
      {[
        [-legX, -legZ],
        [legX, -legZ],
        [-legX, legZ],
        [legX, legZ],
      ].map(([x, z]) => (
        <mesh key={`${x}:${z}`} position={[x!, matBottom - DESK.thickness - legHeight / 2, z!]}>
          <boxGeometry args={[DESK.leg.size, legHeight, DESK.leg.size]} />
          <meshStandardMaterial color="#3a4048" roughness={0.42} metalness={0.72} />
        </mesh>
      ))}

      {/*
        Antistatik ish gilamchasi.

        Komponentlar aynan shu ustida turadi (usti y = 0). U yog'ochdan
        quyuqroq — mayda qora detallar unda yo'qolib ketmaydi va ish
        maydoni qayerda tugashi ko'rinib turadi.
      */}
      <mesh position={[0, matBottom + DESK.mat.thickness / 2, 0]} receiveShadow>
        <boxGeometry args={[DESK.mat.width, DESK.mat.thickness, DESK.mat.depth]} />
        <meshStandardMaterial color="#26303c" roughness={0.92} metalness={0.02} />
      </mesh>

      {/* Gilamchaning ochroq hoshiyasi */}
      <mesh position={[0, matBottom + DESK.mat.thickness / 2, 0]}>
        <boxGeometry
          args={[DESK.mat.width + 0.5, DESK.mat.thickness * 0.7, DESK.mat.depth + 0.5]}
        />
        <meshStandardMaterial color="#33404f" roughness={0.9} />
      </mesh>

      {showGrid && (
        <Grid
          position={[0, 0.006, 0]}
          args={[TABLE.width, TABLE.depth]}
          cellSize={1}
          cellThickness={0.5}
          // Gilamchaga BOSILGAN chiziqlardek — yorqin ko'k emas, oq-kulrang.
          cellColor="#46525f"
          sectionSize={5}
          sectionThickness={1}
          sectionColor="#6d8095"
          fadeDistance={80}
          fadeStrength={1.1}
          infiniteGrid={false}
        />
      )}
    </group>
  );
}

/* ─────────────────────────── Atrof-muhit ─────────────────────────── */

/** Daraxt tanasi va shoxlari uchun ulashilgan geometriya. */
const TRUNK = new CylinderGeometry(0.55, 0.85, 1, 7);
const CROWN = new ConeGeometry(1, 1, 8);

/**
 * Stol atrofidagi tabiat: osmon, o't va daraxtlar.
 *
 * ── Nega bu kerak ───────────────────────────────────────────────────────
 * Laboratoriya BOLALAR uchun. Qorong'i bo'shliqda turgan stol texnik
 * dasturga o'xshaydi va zeriktiradi. Ochiq havodagi stol esa tanish
 * muhit — bola u yerda o'ynagisi keladi.
 *
 * Manzara ATAYLAB sodda va past kontrastli: u fon, diqqat markazi emas.
 * Ish gilamchasi undan ancha quyuq, shuning uchun ko'z avtomatik
 * ravishda stol ustiga qaraydi.
 */
function Scenery({ groundY }: { groundY: number }) {
  const sky = skyTexture();
  const grass = grassTexture();

  const trees = useMemo(() => treeSpots(), []);
  const trunks = useRef<InstancedMesh>(null);
  const crowns = useRef<InstancedMesh>(null);

  /*
   * Daraxtlar INSTANSIYALANGAN: yigirma ikkitasi ikkita chizish
   * chaqiruvida chiziladi. Har biri alohida mesh bo'lsa fon uchun
   * qirq to'rt chaqiruv ketardi (§20).
   */
  useEffect(() => {
    const trunkMesh = trunks.current;
    const crownMesh = crowns.current;
    if (!trunkMesh || !crownMesh) return;

    const matrix = new Matrix4();
    const position = new Vector3();
    const quaternion = new Quaternion();
    const scale = new Vector3();

    trees.forEach((tree, i) => {
      const trunkHeight = 9 * tree.scale;
      const crownHeight = 15 * tree.scale;

      scale.set(tree.scale, trunkHeight, tree.scale);
      position.set(tree.x, groundY + trunkHeight / 2, tree.z);
      trunkMesh.setMatrixAt(i, matrix.compose(position, quaternion, scale));

      scale.set(5.2 * tree.scale, crownHeight, 5.2 * tree.scale);
      position.set(tree.x, groundY + trunkHeight + crownHeight / 2 - 1.5, tree.z);
      crownMesh.setMatrixAt(i, matrix.compose(position, quaternion, scale));
    });

    trunkMesh.instanceMatrix.needsUpdate = true;
    crownMesh.instanceMatrix.needsUpdate = true;
    trunkMesh.count = trees.length;
    crownMesh.count = trees.length;
  }, [trees, groundY]);

  return (
    <group>
      {/*
        Osmon gumbazi.

        Ichkarisiga qaraydi (`BackSide`) va yorug'likka bo'ysunmaydi
        (`meshBasicMaterial`) — aks holda quyosh uni bir tomondan
        yoritib, sun'iy dog' hosil qilardi. Tuman ham unga tegmaydi.
      */}
      {sky && (
        <mesh>
          <sphereGeometry args={[340, 32, 16]} />
          <meshBasicMaterial map={sky} side={BackSide} fog={false} depthWrite={false} />
        </mesh>
      )}

      {/* O't — stol ostidagi yer */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, groundY, 0]} receiveShadow>
        <planeGeometry args={[620, 620]} />
        <meshStandardMaterial map={grass} color="#ffffff" roughness={1} metalness={0} />
      </mesh>

      <instancedMesh ref={trunks} args={[TRUNK, undefined, trees.length]}>
        <meshStandardMaterial color="#7a5a3c" roughness={0.9} />
      </instancedMesh>
      <instancedMesh ref={crowns} args={[CROWN, undefined, trees.length]}>
        <meshStandardMaterial color="#4e9450" roughness={0.85} />
      </instancedMesh>
    </group>
  );
}

/* ─────────────────────────── Sahna ichi ─────────────────────────── */

interface DragState {
  nodeId: string;
  /**
   * Bosilgan nuqta bilan komponent markazi orasidagi farq.
   *
   * BOSILGANDA emas, birinchi HARAKATDA hisoblanadi va shu sababli
   * boshida `null`. Sababi — parallaks: bosish hodisasidagi nuqta
   * komponentning O'Z yuzasida (servoning tepasi stoldan 3.6 sm baland),
   * keyingi harakatlarda esa nuqta stol tekisligida o'lchanadi. Ikkalasi
   * aralashtirilganda baland komponent qiya kameradan sudralganda
   * birinchi pikseldayoq sakrab ketardi.
   */
  offsetX: number | null;
  offsetZ: number | null;
  moved: boolean;
}

function SceneContents({ onToast }: { onToast: (message: string) => void }) {
  const circuit = useCircuitStore((s) => s.circuit);
  const selectedIds = useCircuitStore((s) => s.selectedIds);
  const setSelection = useCircuitStore((s) => s.setSelection);
  const moveNode = useCircuitStore((s) => s.moveNode);
  const commitMove = useCircuitStore((s) => s.commitMove);
  const addWire = useCircuitStore((s) => s.addWire);

  const runtime = useSimulationStore((s) => s.runtime);

  const tool = useLab3DStore((s) => s.tool);
  const wireColor = useLab3DStore((s) => s.wireColor);
  const pendingWire = useLab3DStore((s) => s.pendingWire);
  const startWire = useLab3DStore((s) => s.startWire);
  const cancelWire = useLab3DStore((s) => s.cancelWire);
  const selectWire = useLab3DStore((s) => s.selectWire);
  const settings = useLab3DStore((s) => s.settings);

  const controls = useRef<OrbitRef | null>(null);
  const dragRef = useRef<DragState | null>(null);

  /** Ulanayotgan simning ikkinchi uchi — sichqoncha ostidagi nuqta. */
  const [wireTip, setWireTip] = useState<Vector3 | null>(null);

  /** Qaysi pinlar simga ulangan — pin rangi shunga qarab o'zgaradi (§16). */
  const connected = useMemo(() => {
    const map = new Map<string, Set<string>>();
    for (const wire of circuit.wires) {
      for (const end of [wire.from, wire.to]) {
        const set = map.get(end.nodeId) ?? new Set<string>();
        set.add(end.pinId);
        map.set(end.nodeId, set);
      }
    }
    return map;
  }, [circuit.wires]);

  /**
   * Tekshiruv topgan muammolar — komponent bo'yicha (§16).
   *
   * Tekshiruv HAR o'zgarishda ishlaydi, «Ishga tushirish» bosilishini
   * kutmaydi: noto'g'ri ulangan LED darhol qizil ramka bilan belgilanadi,
   * bola esa xatoni o'sha zahoti ko'radi.
   *
   * Qoidalar 2D dagi `validateCircuit` dan — ikkala laboratoriyada bitta.
   */
  const nodeIssues = useMemo(() => {
    const map = new Map<string, "error" | "warning">();
    for (const issue of validateCircuit(circuit)) {
      // `info` darajasi ramka chizishга arzimaydi — u maslahat, xato emas.
      if (issue.severity !== "error" && issue.severity !== "warning") continue;
      for (const id of issue.nodeIds) {
        // Xato ogohlantirishdan ustun.
        if (issue.severity === "error" || !map.has(id)) map.set(id, issue.severity);
      }
    }
    return map;
  }, [circuit]);

  const empty = useMemo(() => new Set<string>(), []);

  /* ── Komponentni sudrash ── */

  const beginDrag = useCallback(
    (nodeId: string) => {
      if (tool !== "select") return;
      if (!circuit.nodes.some((n) => n.id === nodeId)) return;

      dragRef.current = { nodeId, offsetX: null, offsetZ: null, moved: false };
      // Sudrash paytida kamera aylanmasin.
      if (controls.current) controls.current.enabled = false;
    },
    [circuit.nodes, tool],
  );

  const onGroundMove = useCallback(
    (event: ThreeEvent<PointerEvent>) => {
      // Sim tortilayotgan bo'lsa uchini kursor ortidan yuramiz.
      if (pendingWire) {
        setWireTip(new Vector3(event.point.x, 0.8, event.point.z));
      }

      const drag = dragRef.current;
      if (!drag) return;

      const node = circuit.nodes.find((n) => n.id === drag.nodeId);
      if (!node) return;

      /*
       * Birinchi harakat — ushlash nuqtasini belgilaydi.
       *
       * Komponent shu paytda QIMIRLAMAYDI: markaz bilan kursor orasidagi
       * farq eslab qolinadi va keyingi harakatlarda saqlanadi. Shu sababli
       * baland komponentni chetidan ushlab sudrash ham to'g'ri ishlaydi.
       */
      if (drag.offsetX === null || drag.offsetZ === null) {
        const at = nodePosition(node);
        drag.offsetX = at.x - event.point.x;
        drag.offsetZ = at.z - event.point.z;
        return;
      }

      drag.moved = true;

      // Chegara `layout.ts` da — sof funksiya, testlar bilan qoplangan.
      const inside = clampToTable(event.point.x + drag.offsetX, event.point.z + drag.offsetZ);
      const x = snapToGrid(inside.x, settings.snapToGrid);
      const z = snapToGrid(inside.z, settings.snapToGrid);
      const target = toWorkspaceXY(x, z);
      moveNode(drag.nodeId, target.x, target.y);
    },
    [circuit.nodes, moveNode, pendingWire, settings.snapToGrid],
  );

  const endDrag = useCallback(() => {
    const drag = dragRef.current;
    dragRef.current = null;
    if (controls.current) controls.current.enabled = true;
    // Sudrash bitta undo qadam bo'lsin — har piksel uchun emas.
    if (drag?.moved) commitMove();
  }, [commitMove]);

  useEffect(() => {
    window.addEventListener("pointerup", endDrag);
    return () => window.removeEventListener("pointerup", endDrag);
  }, [endDrag]);

  /* ── Sim ulash (§14) ── */

  const onPinDown = useCallback(
    (nodeId: string, pinId: string, event: ThreeEvent<PointerEvent>) => {
      /*
       * Sim asbobi tanlanmagan — hodisa PASTGA o'tsin.
       *
       * Shunda pin ustiga bosish komponentni tanlaydi va sudraydi, xuddi
       * plataning bo'sh joyiga bosgandek. Bir vaqtda nima qilish
       * kerakligi ham aytiladi: asbob sukut bo'yicha «tanlash» va bola
       * pinni bosaverib, laboratoriya buzuq deb o'ylardi.
       */
      if (tool !== "wire") {
        onToast("Sim ulash uchun yuqoridagi «sim» asbobini tanlang");
        return;
      }

      // Shu paytdan boshlab bosish SIMNIKI — komponent sudralmasin.
      event.stopPropagation();

      if (!pendingWire) {
        startWire({ nodeId, pinId });
        const node = circuit.nodes.find((n) => n.id === nodeId);
        const at = node ? worldPinPosition(node, pinId) : null;
        if (at) setWireTip(new Vector3(at.x, at.y, at.z));
        return;
      }

      // Ikkinchi bosish — ulanish. Qoidalarni 2D dagi `addWire` tekshiradi.
      const result = addWire(pendingWire, { nodeId, pinId });
      if (!result.ok) onToast(result.reason ?? "Bu ikki pinni ulab bo'lmaydi");
      cancelWire();
      setWireTip(null);
    },
    [addWire, cancelWire, circuit.nodes, onToast, pendingWire, startWire, tool],
  );

  /** Ulanayotgan simning boshlang'ich nuqtasi. */
  const pendingFrom = useMemo(() => {
    if (!pendingWire) return null;
    const node = circuit.nodes.find((n) => n.id === pendingWire.nodeId);
    const at = node ? worldPinPosition(node, pendingWire.pinId) : null;
    return at ? new Vector3(at.x, at.y, at.z) : null;
  }, [circuit.nodes, pendingWire]);

  return (
    <>
      {/*
        Yorug'lik: bitta asosiy manba soya beradi, ikkitasi to'ldiradi.
        Ko'proq soya tashlovchi chiroq FPS ni sezilarli tushiradi (§33).
      */}
      <ambientLight intensity={0.62} />
      {/*
        Quyosh.

        Soya kamerasi ISH MAYDONI bo'yicha sozlangan, butun manzara
        bo'yicha emas: 2048 piksel 90 sm ga taqsimlansa 1 sm ga ~23
        piksel tushadi va LEDdek mayda element ham aniq soya beradi.
        Manzaraga cho'zilsa soyalar loyqalanib ketardi.
      */}
      <directionalLight
        position={[16, 26, 14]}
        intensity={1.9}
        color="#fff6e6"
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-45}
        shadow-camera-right={45}
        shadow-camera-top={45}
        shadow-camera-bottom={-45}
        // Yuza bilan soya orasidagi "chiziqlar" (shadow acne) yo'qolsin.
        shadow-bias={-0.0004}
      />
      <directionalLight position={[-18, 12, -10]} intensity={0.35} color="#dbeaff" />
      {/*
        Osmon va yerdan qaytgan yorug'lik.
        Tepadan ko'k, pastdan o'tning yashili — shu sababli stol ostidagi
        soyalar qop-qora emas, tabiiy ko'rinadi. HDR fayl yuklanmaydi,
        ya'ni tarmoqqa bog'lanmaydi (§33).
      */}
      <hemisphereLight args={["#cfe6ff", "#6b9c52", 0.75]} />

      <Workbench showGrid={settings.showGrid} />

      {/*
        Ko'rinmas yer tekisligi: sudrash va sim uchini shu yerdagi
        kesishuv nuqtasi belgilaydi. Bo'sh joyga bosilsa tanlov bekor.
      */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0, 0]}
        visible={false}
        onPointerMove={onGroundMove}
        onPointerDown={() => {
          setSelection([]);
          selectWire(null);
          if (pendingWire) {
            cancelWire();
            setWireTip(null);
          }
        }}
      >
        <planeGeometry args={[TABLE.width * 2, TABLE.depth * 2]} />
        <meshBasicMaterial />
      </mesh>

      {circuit.nodes.map((node) => (
        <Component3D
          key={node.id}
          node={node}
          runtime={runtime[node.id]}
          selected={selectedIds.includes(node.id)}
          connectedPins={connected.get(node.id) ?? empty}
          issue={nodeIssues.get(node.id)}
          onSelect={() => {
            setSelection([node.id]);
            // Inspektor bir vaqtda bittasini ko'rsatadi.
            selectWire(null);
          }}
          onDragStart={() => beginDrag(node.id)}
          onPinDown={(pinId, event) => onPinDown(node.id, pinId, event)}
        />
      ))}

      <Wires3D circuit={circuit} />
      {pendingFrom && wireTip && <PendingWire from={pendingFrom} to={wireTip} color={wireColor} />}

      <OrbitControls
        ref={controls}
        makeDefault
        enableDamping
        dampingFactor={0.12}
        minDistance={4}
        maxDistance={90}
        // Stol ostidan qarash mumkin emas — sahna teskari ko'rinardi.
        maxPolarAngle={Math.PI / 2.05}
        /* Chap tugma tanlash va sudrash uchun band — kamera o'ng va o'rta tugmada (§4). */
        mouseButtons={{ LEFT: undefined, MIDDLE: MOUSE.PAN, RIGHT: MOUSE.ROTATE }}
        /* Bitta barmoq — aylantirish, ikkitasi — masshtab va surish (§4). */
        touches={{ ONE: TOUCH.ROTATE, TWO: TOUCH.DOLLY_PAN }}
      />
      <CameraDirector controls={controls} />
      <KeyboardNavigation controls={controls} />
    </>
  );
}

/* ─────────────────────────── Tashqi qobiq ─────────────────────────── */

export function LabScene({ onToast }: { onToast: (message: string) => void }) {
  return (
    <Canvas
      /*
       * Soya turi ATAYLAB ko'rsatilgan.
       *
       * `shadows` ni oddiy `true` qilib qo'yish PCFSoft turini tanlaydi,
       * u esa three.js da eskirgan va konsolga har yuklanishda
       * ogohlantirish yozadi (kutubxonaning o'zi baribir PCF ga
       * qaytaradi). Turni o'zimiz aytsak, ko'rinish o'zgarmaydi, lekin
       * ogohlantirish yo'qoladi.
       */
      shadows={{ type: PCFShadowMap }}
      dpr={[1, 2]}
      // Kamera boshlang'ich holati; keyin `CameraDirector` boshqaradi.
      /*
       * `far` osmon gumbazidan (340 sm) uzoqroq: kamera markazdan 90 sm
       * chetga chiqishi mumkin, ya'ni gumbazning narigi tomoni 430 sm da
       * qoladi. Kichik qiymatda osmon kesilib, qora yoriq ko'rinardi.
       */
      camera={{ position: VIEWS.perspective, fov: 42, near: 0.1, far: 1200 }}
      // Sahna faqat kerak bo'lganda qayta chiziladi — bo'sh turgan
      // laboratoriya noutbuk batareyasini yemasin (§33).
      frameloop="demand"
      gl={{ antialias: true, powerPreference: "high-performance" }}
    >
      <color attach="background" args={[HORIZON]} />
      {/*
        Havo tumani — uzoqdagi daraxtlar ufqqa singib ketadi.

        Rangi UFQ rangida: shunda o't qoplami osmon bilan tutashgan
        joyda chegara ko'rinmaydi. Qorong'i tuman bu yerda mumkin emas
        edi — u yorug' osmonda kulrang halqa bo'lib chiqardi.
      */}
      <fog attach="fog" args={[HORIZON, 150, 400]} />
      <SceneContents onToast={onToast} />
    </Canvas>
  );
}
