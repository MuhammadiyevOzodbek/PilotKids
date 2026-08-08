"use client";

import { useMemo } from "react";
import { CatmullRomCurve3, Vector3 } from "three";
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

  return (
    <group>
      {circuit.wires.map((wire) => (
        <Wire
          key={wire.id}
          wire={wire}
          fromNode={circuit.nodes.find((n) => n.id === wire.from.nodeId)}
          toNode={circuit.nodes.find((n) => n.id === wire.to.nodeId)}
          selected={selectedWireId === wire.id}
          flow={wireFlow[wire.id]}
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
  onSelect,
}: {
  wire: WireConnection;
  fromNode: CircuitNode | undefined;
  toNode: CircuitNode | undefined;
  selected: boolean;
  /** Simulyator hisoblagan tok — bezak emas (§24, §46). */
  flow: WireFlow | undefined;
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
    </group>
  );
}

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
