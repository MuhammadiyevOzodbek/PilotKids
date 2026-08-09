"use client";

import { useEffect, useMemo, useRef } from "react";
import { Html } from "@react-three/drei";
import { Color, Matrix4, Quaternion, Vector3, type InstancedMesh } from "three";
import type { ThreeEvent } from "@react-three/fiber";
import { getDefinition } from "@/lib/virtual-lab/catalog";
import { localPinPosition, type Vec3 } from "@/lib/virtual-lab/lab3d/layout";
import { unoPinHint } from "@/lib/virtual-lab/lab3d/uno-3d";
import type { CircuitNode, ComponentRuntimeState, PinRole } from "@/lib/virtual-lab/types";
import { useLab3DStore } from "@/stores/lab3d";

/**
 * Komponentning ulanish nuqtalari (§15, §16, §17).
 *
 * ── Nega ikkita mesh ────────────────────────────────────────────────────
 * KO'RINADIGAN nuqta kichik: haqiqiy teshik 1 mm va uni katta shar bilan
 * ko'rsatish plataning barcha uyalarini yopib qo'yardi. Ammo kichik
 * nuqtaga sichqoncha bilan urish qiyin, shuning uchun BOSISH sohasi
 * alohida — ko'rinmas, lekin ancha kattaroq shar (§17).
 *
 * ── Nega instansiya ─────────────────────────────────────────────────────
 * Breadboardda 336 ta teshik bor. Har biri alohida mesh bo'lsa bu 336 ta
 * chizish chaqiruvi va 336 ta raycast obyekti degani bo'lardi (§20). Bu
 * yerda esa ikkita instansiyalangan mesh: qaysi nuqta ekanini `instanceId`
 * aytadi.
 */

/** Bosish sohasining radiusi (sm) — ko'rinadigan nuqtadan ancha katta. */
const HIT_RADIUS = 0.19;

/** Ko'rinadigan nuqta radiusi (sm) — haqiqiy kontakt o'lchamida. */
const DOT_RADIUS = 0.075;

/** Sichqoncha ostidagi nuqta kattalashadi — qaysi pin tanlanayotgani aniq bo'lsin. */
const HOVER_SCALE = 1.75;

/** Pin holatlariga mos ranglar (§16). */
const PIN_COLORS = {
  default: "#8d99a8",
  hover: "#4c82f7",
  connected: "#33d17a",
  pending: "#ffb03a",
  high: "#ff9f0a",
} as const;

/** Umumiy pin turlari uchun izoh — plata bo'lmagan komponentlarda ishlatiladi. */
const ROLE_NOTE: Record<PinRole, string> = {
  power: "Quvvat",
  ground: "Yer (GND)",
  digital: "Raqamli kirish/chiqish",
  analog: "Analog kirish",
  pwm: "Raqamli — PWM qo'llab-quvvatlanadi",
  passive: "Oyoqcha — yo'nalishi yo'q",
};

export function PinField({
  node,
  runtime,
  connectedPins,
  onPinDown,
}: {
  node: CircuitNode;
  runtime: ComponentRuntimeState | undefined;
  /** Shu komponentdagi simga ulangan pin ID'lari. */
  connectedPins: ReadonlySet<string>;
  onPinDown: (pinId: string, event: ThreeEvent<PointerEvent>) => void;
}) {
  const dots = useRef<InstancedMesh>(null);
  const hoveredPin = useLab3DStore((s) => s.hoveredPin);
  const pendingWire = useLab3DStore((s) => s.pendingWire);
  const setHoveredPin = useLab3DStore((s) => s.setHoveredPin);
  const showPinNames = useLab3DStore((s) => s.settings.showPinNames);
  const mode = useLab3DStore((s) => s.mode);

  /** Ulanadigan pinlar va ularning komponent ichidagi o'rni. */
  const pins = useMemo(() => {
    const def = getDefinition(node.type);
    if (!def) return [];
    return def.pins
      .filter((pin) => pin.connectable)
      .flatMap((pin) => {
        const at = localPinPosition(node.type, pin.id);
        return at ? [{ id: pin.id, at }] : [];
      });
  }, [node.type]);

  /** Shu komponentda sichqoncha ostidagi pin (boshqa komponentniki emas). */
  const hoveredId = useMemo(() => {
    const prefix = `${node.id}:`;
    return hoveredPin?.startsWith(prefix) ? hoveredPin.slice(prefix.length) : null;
  }, [hoveredPin, node.id]);

  /*
   * Bosish sohasi qimirlamaydi — joylashuv bir marta yoziladi.
   */
  const hits = useRef<InstancedMesh>(null);
  useEffect(() => {
    const mesh = hits.current;
    if (!mesh) return;
    const matrix = new Matrix4();
    pins.forEach((pin, i) => {
      mesh.setMatrixAt(i, matrix.makeTranslation(pin.at.x, pin.at.y, pin.at.z));
    });
    mesh.instanceMatrix.needsUpdate = true;
    mesh.count = pins.length;
  }, [pins]);

  /*
   * Ko'rinadigan nuqtalar: sichqoncha ostidagisi kattalashadi.
   *
   * Bu React render EMAS — instansiya matritsasi to'g'ridan-to'g'ri
   * yoziladi, shuning uchun 336 ta nuqtani qayta joylashtirish ham
   * bitta amal.
   */
  useEffect(() => {
    const mesh = dots.current;
    if (!mesh) return;

    const matrix = new Matrix4();
    const position = new Vector3();
    const quaternion = new Quaternion();
    const scale = new Vector3();

    pins.forEach((pin, i) => {
      const grow = pin.id === hoveredId ? HOVER_SCALE : 1;
      scale.setScalar(grow);
      mesh.setMatrixAt(
        i,
        matrix.compose(position.set(pin.at.x, pin.at.y, pin.at.z), quaternion, scale),
      );
    });
    mesh.instanceMatrix.needsUpdate = true;
    mesh.count = pins.length;
  }, [pins, hoveredId]);

  /* Ranglar holat o'zgarganda yangilanadi. */
  useEffect(() => {
    const mesh = dots.current;
    if (!mesh) return;
    const color = new Color();

    pins.forEach((pin, i) => {
      const level = runtime?.pins?.[pin.id];

      let next: string = PIN_COLORS.default;
      if (pendingWire?.nodeId === node.id && pendingWire.pinId === pin.id)
        next = PIN_COLORS.pending;
      else if (hoveredId === pin.id) next = PIN_COLORS.hover;
      else if (level !== undefined && level > 0) next = PIN_COLORS.high;
      else if (connectedPins.has(pin.id)) next = PIN_COLORS.connected;

      mesh.setColorAt(i, color.set(next));
    });

    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [pins, node.id, runtime, connectedPins, hoveredId, pendingWire]);

  if (pins.length === 0) return null;

  const pinIdAt = (index: number | undefined) =>
    index === undefined ? null : (pins[index]?.id ?? null);

  const hoveredAt = hoveredId ? pins.find((pin) => pin.id === hoveredId)?.at : undefined;

  return (
    <>
      {/* Ko'rinadigan kontakt nuqtasi — hodisalarni ushlamaydi */}
      <instancedMesh
        ref={dots}
        args={[undefined, undefined, pins.length]}
        // Bosish uchun pastdagi kattaroq shar javob beradi; bu meshga
        // nur tushirilsa ikkalasi bir-birini to'sib qo'yardi.
        raycast={() => null}
      >
        <sphereGeometry args={[DOT_RADIUS, 10, 8]} />
        <meshStandardMaterial roughness={0.35} metalness={0.6} />
      </instancedMesh>

      {/* Bosish sohasi — ko'rinmas, lekin nur tushadi (§17) */}
      <instancedMesh
        ref={hits}
        args={[undefined, undefined, pins.length]}
        onPointerOver={(event) => {
          event.stopPropagation();
          const id = pinIdAt(event.instanceId);
          if (id) setHoveredPin(`${node.id}:${id}`);
        }}
        onPointerMove={(event) => {
          // Bitta mesh ichida pindan pinga o'tishda `over` qayta chaqirilmaydi.
          const id = pinIdAt(event.instanceId);
          if (id) setHoveredPin(`${node.id}:${id}`);
        }}
        onPointerOut={() => setHoveredPin(null)}
        /*
         * Hodisa bu yerda TO'XTATILMAYDI — buni `onPinDown` hal qiladi.
         *
         * Ilgari u shartsiz `stopPropagation()` qilardi, `onPinDown` esa
         * sim asbobi tanlanmagan bo'lsa jim chiqib ketardi. Natijada
         * «tanlash» rejimida pin ustiga bosish O'LIK edi: komponent na
         * tanlanardi, na sudralardi. Arduinoda bu ayniqsa yomon —
         * plataning katta qismi header, ya'ni deyarli butun plata
         * bosilmasdi. Endi hodisani faqat haqiqatan ishlatilganda
         * to'xtatamiz, aks holda u pastdagi komponentga o'tadi.
         */
        onPointerDown={(event) => {
          const id = pinIdAt(event.instanceId);
          if (!id) return;
          onPinDown(id, event);
        }}
      >
        <sphereGeometry args={[HIT_RADIUS, 8, 6]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </instancedMesh>

      {showPinNames && hoveredId && hoveredAt && (
        <PinTooltip
          nodeType={node.type}
          pinId={hoveredId}
          at={hoveredAt}
          runtime={runtime}
          advanced={mode === "advanced"}
        />
      )}
    </>
  );
}

/* ─────────────────────────── Tooltip ─────────────────────────── */

/**
 * Pin ustidagi izoh (§17, §39, §40).
 *
 * Matn KATALOGDAN olinadi — plataning silkscreen yozuvi, pin nomi va
 * turi. Ya'ni bola 3D da o'qigan narsa 2D chizmadagi yozuv bilan bir xil.
 *
 * «Ilg'or» rejimda qo'shimcha ravishda pinning JORIY holati ko'rsatiladi:
 * u simulyatordan keladi, ya'ni kod ishlayotganda haqiqatda o'zgaradi.
 */
function PinTooltip({
  nodeType,
  pinId,
  at,
  runtime,
  advanced,
}: {
  nodeType: string;
  pinId: string;
  at: Vec3;
  runtime: ComponentRuntimeState | undefined;
  advanced: boolean;
}) {
  const pin = getDefinition(nodeType)?.pins.find((p) => p.id === pinId);
  if (!pin) return null;

  const uno = unoPinHint(pinId);
  const title = nodeType === "arduino-uno" && uno ? uno.silk : pin.id;
  const note = nodeType === "arduino-uno" && uno ? uno.note : ROLE_NOTE[pin.role];

  return (
    <Html
      position={[at.x, at.y + 0.55, at.z]}
      center
      distanceFactor={16}
      // Izoh sichqonchani ushlab qolmasin — ostidagi pin bosilsin.
      style={{ pointerEvents: "none" }}
    >
      <div className="lab3d-pin-tip">
        <strong>{title}</strong>
        <span>{pin.label}</span>
        <span>{note}</span>
        {advanced && (
          <span className="lab3d-pin-tip-live">{liveState(pin.role, pinId, runtime)}</span>
        )}
      </div>
    </Html>
  );
}

/** Pinning joriy holati — simulyator ma'lumotidan. */
function liveState(
  role: PinRole,
  pinId: string,
  runtime: ComponentRuntimeState | undefined,
): string {
  const level = runtime?.pins?.[pinId];
  if (level === undefined) return "Holat: simulyatsiya ishlamayapti";

  const mode = runtime?.pinModes?.[pinId];
  const modeText = mode ? `, ${mode}` : ", pinMode() chaqirilmagan";

  // Analog kirish 0–1023 oralig'ida — uni HIGH/LOW ga aylantirish yolg'on bo'lardi.
  if (role === "analog") return `Qiymat: ${Math.round(level)}${modeText}`;
  return `${level > 0 ? "HIGH" : "LOW"} (${level})${modeText}`;
}
