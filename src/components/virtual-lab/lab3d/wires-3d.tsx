"use client";

import { useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { CatmullRomCurve3, Matrix4, Vector3, type InstancedMesh } from "three";
import { worldPinPosition } from "@/lib/virtual-lab/lab3d/layout";
import type {
  Circuit,
  CircuitNode,
  WireColor,
  WireConnection,
  WireFlow,
} from "@/lib/virtual-lab/types";
import { useCircuitStore, useSimulationStore } from "@/stores/virtual-lab";
import { useLab3DStore } from "@/stores/lab3d";

/**
 * Simlar (§14).
 *
 * Sim haqiqiy kabeldek osilib turadi: ikki uchi orasida yuqoriga ko'tarilgan
 * yoy chiziladi va `TubeGeometry` bilan qalinlik beriladi. To'g'ri chiziq
 * ham mumkin edi, lekin unda ustma-ust ketgan ikki sim bir-biridan
 * ajralmasdi — yoyning balandligi masofaga bog'liq bo'lgani uchun ular
 * tabiiy ravishda yoyilib turadi.
 *
 * Sim uchlari HAR RENDER da pin joylashuvidan qayta hisoblanadi, ya'ni
 * komponent ko'chirilganda sim o'zi ergashadi (§14) — alohida kuzatuv
 * mexanizmi kerak emas.
 */

const WIRE_HEX: Record<WireColor, string> = {
  red: "#e5484d",
  black: "#2b3038",
  blue: "#3b82f6",
  green: "#33d17a",
  yellow: "#f5c542",
  orange: "#ff9f0a",
};

/** Simning qalinligi (sm) — haqiqiy jumper kabelga yaqin. */
const WIRE_RADIUS = 0.055;

/**
 * Ikki nuqta orasidagi osilgan yoy.
 *
 * O'rtadagi nuqta masofaning uchdan biriga ko'tariladi: qisqa sim deyarli
 * to'g'ri, uzun sim esa sezilarli osiladi — xuddi stol ustidagi kabeldek.
 */
function wireCurve(from: Vector3, to: Vector3): CatmullRomCurve3 {
  const distance = from.distanceTo(to);
  const lift = Math.min(2.2, 0.35 + distance * 0.28);

  const a = from.clone().lerp(to, 0.28);
  a.y += lift * 0.85;
  const b = from.clone().lerp(to, 0.72);
  b.y += lift * 0.85;

  return new CatmullRomCurve3([from, a, b, to], false, "catmullrom", 0.4);
}

/** Simning ikki uchi — pin joylashuvidan. */
function endpoints(
  fromNode: CircuitNode | undefined,
  toNode: CircuitNode | undefined,
  wire: WireConnection,
) {
  if (!fromNode || !toNode) return null;

  const from = worldPinPosition(fromNode, wire.from.pinId);
  const to = worldPinPosition(toNode, wire.to.pinId);
  if (!from || !to) return null;

  return {
    from: new Vector3(from.x, from.y, from.z),
    to: new Vector3(to.x, to.y, to.z),
  };
}

export function Wires3D({ circuit }: { circuit: Circuit }) {
  const selectedWireId = useLab3DStore((s) => s.selectedWireId);
  const selectWire = useLab3DStore((s) => s.selectWire);
  const setSelection = useCircuitStore((s) => s.setSelection);
  const wireFlow = useSimulationStore((s) => s.wireFlow);
  const showFlow = useLab3DStore((s) => s.settings.showCurrentFlow);

  /*
   * Tugunlar ID bo'yicha jadvalda.
   *
   * Ilgari har bir sim uchun `nodes.find()` chaqirilardi: yuzta
   * komponentli va yuzta simli sxemada bu har renderda o'n ming
   * solishtirish degani edi, komponent sudralganda esa har kadrda (§33).
   */
  const nodesById = useMemo(() => {
    const map = new Map<string, CircuitNode>();
    for (const node of circuit.nodes) map.set(node.id, node);
    return map;
  }, [circuit.nodes]);

  return (
    <group>
      {circuit.wires.map((wire) => (
        <Wire
          key={wire.id}
          wire={wire}
          fromNode={nodesById.get(wire.from.nodeId)}
          toNode={nodesById.get(wire.to.nodeId)}
          selected={selectedWireId === wire.id}
          flow={wireFlow[wire.id]}
          showFlow={showFlow}
          onSelect={() => {
            // Inspektor bir vaqtda bittasini ko'rsatadi — komponent
            // tanlovi bo'shatilmasa sim uning ustiga chiqib qolardi.
            selectWire(wire.id);
            setSelection([]);
          }}
        />
      ))}
    </group>
  );
}

function Wire({
  wire,
  fromNode,
  toNode,
  selected,
  flow,
  showFlow,
  onSelect,
}: {
  wire: WireConnection;
  fromNode: CircuitNode | undefined;
  toNode: CircuitNode | undefined;
  selected: boolean;
  /** Simulyator hisoblagan tok — bezak emas (§24, §46). */
  flow: WireFlow | undefined;
  /** Tok zarrachalari ko'rsatilsinmi (pastki qatordagi katakcha). */
  showFlow: boolean;
  onSelect: () => void;
}) {
  /*
   * Uchlar va yoy birga hisoblanadi, bog'liqlik esa TUGUNLARNING O'ZI.
   * Do'kon o'zgarmas: komponent ko'chirilsa yangi obyekt keladi va yoy
   * qayta quriladi, ya'ni sim orqada qolmaydi. Komponent qimirlamasa
   * hisob ham takrorlanmaydi (§33).
   */
  const geometry = useMemo(() => {
    const ends = endpoints(fromNode, toNode, wire);
    return ends ? { ends, curve: wireCurve(ends.from, ends.to) } : null;
  }, [fromNode, toNode, wire]);

  if (!geometry) return null;
  const { ends } = geometry;

  const color = WIRE_HEX[wire.color] ?? WIRE_HEX.blue;

  /*
   * Tok o'tayotgan sim biroz yorishadi (§24).
   *
   * Yorqinlik SIMULYATOR hisoblagan tokdan keladi — 20 mA odatdagi LED
   * toki, shuning uchun shu qiymat to'liq yorqinlikka to'g'ri keladi.
   * Tanlangan sim esa har doim ko'rinadi, tok bor-yo'qligidan qat'i nazar.
   */
  const current = Math.min(1, Math.abs(flow?.milliamps ?? 0) / 20);
  const glow = selected ? 0.7 : current * 0.55;
  // Yo'nalish simulyatordan: 0 bo'lsa ham nuqtalar bir tomonga yursin.
  const direction = (flow?.direction ?? 1) < 0 ? -1 : 1;

  return (
    <group>
      <mesh
        castShadow
        onPointerDown={(event) => {
          event.stopPropagation();
          onSelect();
        }}
      >
        <tubeGeometry args={[geometry.curve, 28, WIRE_RADIUS, 7, false]} />
        <meshStandardMaterial
          color={color}
          roughness={0.45}
          emissive={glow > 0 ? color : "#000000"}
          emissiveIntensity={glow}
        />
      </mesh>

      {/* Uchlaridagi metall halqalar — sim pinга «kiygandek» ko'rinadi */}
      {[ends.from, ends.to].map((point, i) => (
        <mesh key={i} position={point} scale={0.085}>
          <sphereGeometry args={[1, 10, 8]} />
          <meshStandardMaterial color="#cfd6de" roughness={0.3} metalness={0.75} />
        </mesh>
      ))}

      {showFlow && current > 0.02 && (
        <CurrentFlow
          curve={geometry.curve}
          color={color}
          strength={current}
          direction={direction}
        />
      )}
    </group>
  );
}

/** Zarrachalar soni — sim uzunligidan qat'i nazar bir xil. */
const FLOW_DOTS = 6;

/**
 * Sim ichida oqayotgan tok (§24).
 *
 * ── Nega bu kerak ───────────────────────────────────────────────────────
 * «Tok» bolaga ko'rinmaydigan tushuncha: LED yonadi, lekin NIMA sababdan
 * yonayotgani jumper kabelning ichida qolib ketadi. Yo'nalish bo'ylab
 * yurgan nuqtalar aynan shuni ko'rsatadi — qaysi uchidan qaysi uchiga.
 *
 * ── Nega sukut bo'yicha o'chiq ──────────────────────────────────────────
 * Yigirmata simda yigirmata animatsiya sahnani DOIM qayta chizishga
 * majbur qiladi (`frameloop="demand"` ning ma'nosi qolmaydi). Shu sababli
 * bu — pastki qatordagi katakcha bilan yoqiladigan qo'shimcha, doimiy
 * bezak emas.
 *
 * ── Nega simulyatordan ──────────────────────────────────────────────────
 * Tezlik ham, yo'nalish ham `Simulator` hisoblagan tokdan (§46): teskari
 * ulangan batareyada nuqtalar teskari yuradi, tok yo'q simda esa umuman
 * paydo bo'lmaydi.
 */
function CurrentFlow({
  curve,
  color,
  strength,
  direction,
}: {
  curve: CatmullRomCurve3;
  color: string;
  /** 0–1: yorqinlik va tezlik shundan. */
  strength: number;
  /** +1 — `from` dan `to` ga, −1 — teskari. */
  direction: number;
}) {
  const dots = useRef<InstancedMesh>(null);
  const invalidate = useThree((s) => s.invalidate);

  useFrame((state) => {
    const mesh = dots.current;
    if (!mesh) return;

    // Tez oqim ham ko'z ilg'aydigan tezlikda qolsin.
    const speed = 0.25 + strength * 0.55;
    const phase = (state.clock.elapsedTime * speed * direction) % 1;

    for (let i = 0; i < FLOW_DOTS; i += 1) {
      // `+ 1) % 1` — manfiy yo'nalishda ham 0…1 oralig'ida qoladi.
      const t = (((i / FLOW_DOTS + phase) % 1) + 1) % 1;
      curve.getPointAt(t, FLOW_POINT);
      mesh.setMatrixAt(i, FLOW_MATRIX.makeTranslation(FLOW_POINT.x, FLOW_POINT.y, FLOW_POINT.z));
    }
    mesh.instanceMatrix.needsUpdate = true;

    // Animatsiya davom etishi uchun keyingi kadr so'raladi (§33).
    invalidate();
  });

  return (
    <instancedMesh ref={dots} args={[undefined, undefined, FLOW_DOTS]} raycast={() => null}>
      <sphereGeometry args={[WIRE_RADIUS * 1.5, 8, 6]} />
      <meshStandardMaterial
        color="#ffffff"
        emissive={color}
        emissiveIntensity={1.4}
        toneMapped={false}
      />
    </instancedMesh>
  );
}

/*
 * Yordamchi obyektlar MODUL darajasida: har kadrda `new Vector3()` yozish
 * sekundiga yuzlab obyekt yaratardi.
 */
const FLOW_POINT = new Vector3();
const FLOW_MATRIX = new Matrix4();

/**
 * Ulanayotgan simning ko'rsatkichi.
 *
 * Boshlang'ich pindan sichqoncha ostidagi nuqtagacha — hali ulanmagan,
 * shuning uchun ingichka va yarim shaffof.
 */
export function PendingWire({ from, to, color }: { from: Vector3; to: Vector3; color: WireColor }) {
  const curve = useMemo(() => wireCurve(from, to), [from, to]);
  return (
    <mesh>
      <tubeGeometry args={[curve, 20, WIRE_RADIUS * 0.8, 6, false]} />
      <meshStandardMaterial
        color={WIRE_HEX[color] ?? WIRE_HEX.blue}
        transparent
        opacity={0.65}
        roughness={0.5}
      />
    </mesh>
  );
}

export { WIRE_HEX };
