"use client";

import { useCallback, useMemo } from "react";
import { Html } from "@react-three/drei";
import { BoxGeometry } from "three";
import type { ThreeEvent } from "@react-three/fiber";
import { getDefinition } from "@/lib/virtual-lab/catalog";
import { nodePosition, nodeRotationY, sizeOf } from "@/lib/virtual-lab/lab3d/layout";
import { liveControlFor } from "@/lib/virtual-lab/live-controls";
import type { CircuitNode, ComponentRuntimeState } from "@/lib/virtual-lab/types";
import { useCircuitStore, useSimulationStore } from "@/stores/virtual-lab";
import { useLab3DStore } from "@/stores/lab3d";
import { ComponentModel } from "./models";
import { PinField } from "./pin-field";

/**
 * Stol ustidagi bitta komponent.
 *
 * Bu qatlam KO'RINISHNI modeldan ajratib turadi: model faqat shaklni
 * biladi, bu yerda esa tanlov, hover, ko'chirish, pinlar va bosiladigan
 * komponentlar bor. Shu sababli yangi komponent qo'shish uchun faqat
 * model yozish yetarli.
 */

/** Tanlov va tekshiruv ramkasining ranglari. */
const OUTLINE = {
  selected: "#4c82f7",
  error: "#e5484d",
  warning: "#ffb03a",
} as const;

export function Component3D({
  node,
  runtime,
  selected,
  connectedPins,
  issue,
  onSelect,
  onDragStart,
  onPinDown,
}: {
  node: CircuitNode;
  runtime: ComponentRuntimeState | undefined;
  selected: boolean;
  connectedPins: ReadonlySet<string>;
  /** Tekshiruv shu komponentda muammo topganmi (§16). */
  issue: "error" | "warning" | undefined;
  onSelect: () => void;
  onDragStart: (event: ThreeEvent<PointerEvent>) => void;
  onPinDown: (pinId: string, event: ThreeEvent<PointerEvent>) => void;
}) {
  const showLabels = useLab3DStore((s) => s.settings.showLabels);
  const hoveredPin = useLab3DStore((s) => s.hoveredPin);
  const requestCamera = useLab3DStore((s) => s.requestCamera);

  const position = nodePosition(node);
  const rotation = nodeRotationY(node);
  const size = sizeOf(node.type);
  const name = getDefinition(node.type)?.name ?? node.type;

  const press = usePressable(node);

  /** Shu komponent ustida sichqoncha turibdimi (yorliq shunga qarab chiqadi). */
  const hovering = useMemo(
    () => hoveredPin?.startsWith(`${node.id}:`) ?? false,
    [hoveredPin, node.id],
  );

  const outline = selected
    ? OUTLINE.selected
    : issue === "error"
      ? OUTLINE.error
      : issue === "warning"
        ? OUTLINE.warning
        : null;

  return (
    <group position={[position.x, position.y, position.z]} rotation={[0, rotation, 0]}>
      {/* Model — sudrash uchun bosiladigan qism */}
      <group
        onPointerDown={(event) => {
          event.stopPropagation();
          onSelect();
          /*
           * Bosiladigan komponent (tugma) sudralmaydi.
           *
           * Aks holda tugmani bosish uni joyidan qimirlatib yuborardi va
           * bola nimani bosganini tushunmasdi.
           */
          if (press) press();
          else onDragStart(event);
        }}
        /*
         * Ikki marta bosish — komponentga yaqindan qarash (§21).
         * Kamera buyrug'i «focus» tanlangan komponentga qaraydi, shuning
         * uchun avval tanlab olinadi.
         */
        onDoubleClick={(event) => {
          event.stopPropagation();
          onSelect();
          requestCamera("focus");
        }}
      >
        <ComponentModel type={node.type} settings={node.settings} runtime={runtime} />
      </group>

      <PinField node={node} runtime={runtime} connectedPins={connectedPins} onPinDown={onPinDown} />

      {/*
        Ramka — komponent atrofidagi ingichka chiziq (§18).

        `BoxHelper` o'rniga oddiy qirralar: u soya tashlamaydi va
        materiallarni ko'paytirmaydi (§33). Tanlov ko'k, tekshiruv
        muammosi esa qizil yoki sariq — ikkalasi bir joyda ko'rinadi.
      */}
      {outline && (
        <lineSegments position={[0, size.h / 2 + 0.02, 0]}>
          <edgesGeometry args={[boxOutline(size.w + 0.3, size.h + 0.15, size.d + 0.3)]} />
          <lineBasicMaterial color={outline} />
        </lineSegments>
      )}

      {/* Nomi — hover yoki tanlanganda (§28) */}
      {showLabels && (selected || hovering) && (
        <Html
          position={[0, size.h + 0.9, 0]}
          center
          distanceFactor={22}
          // Yorliq sichqonchani ushlab qolmasin — ostidagi komponent bosilsin.
          style={{ pointerEvents: "none" }}
        >
          <span className="lab3d-tag">{name}</span>
        </Html>
      )}
    </group>
  );
}

/* ─────────────────────────── Bosiladigan komponentlar ─────────────────────────── */

/**
 * Sahnada bevosita bosiladigan komponent (tugma, PIR).
 *
 * Haqiqiy laboratoriyada tugmani bosish uchun inspektorda katakcha
 * qidirmaysiz — tugmaning O'ZINI bosasiz. 3D da ham shunday bo'lishi
 * kerak, aks holda uch o'lchamli ko'rinishning ma'nosi qolmaydi.
 *
 * Qiymat IKKI joyga yoziladi: sxemaga (`updateSetting`, loyiha bilan
 * saqlanadi) va ishlayotgan simulyatorga (`setSensor`). Faqat birinchisi
 * bo'lsa bosish simulyatsiyaga ta'sir qilmasdi.
 */
function usePressable(node: CircuitNode): (() => void) | null {
  const updateSetting = useCircuitStore((s) => s.updateSetting);
  const setSensor = useSimulationStore((s) => s.setSensor);

  const control = liveControlFor(node.type);
  const pressable = control?.kind === "toggle";

  const set = useCallback(
    (on: boolean) => {
      if (!control) return;
      updateSetting(node.id, control.key, on);
      setSensor(node.id, on ? control.max : control.min);
    },
    [control, node.id, setSensor, updateSetting],
  );

  /*
   * Qo'yib yuborishni OYNA kuzatadi, komponentning o'zi emas.
   *
   * `onPointerOut` ishonchsiz: model o'nlab meshdan iborat va sichqoncha
   * ular orasida yursa hodisa ishga tushib, tugma o'z-o'zidan
   * "qo'yib yuborilardi". Oynadagi `pointerup` esa kursor qayerda
   * bo'lishidan qat'i nazar aniq bir marta keladi.
   */
  const press = useCallback(() => {
    set(true);
    const release = () => {
      set(false);
      window.removeEventListener("pointerup", release);
      window.removeEventListener("pointercancel", release);
    };
    window.addEventListener("pointerup", release);
    window.addEventListener("pointercancel", release);
  }, [set]);

  return pressable ? press : null;
}

/* Ramka geometriyasi o'lcham bo'yicha keshlanadi — har render da yangisi kerak emas. */
const outlineCache = new Map<string, BoxGeometry>();

function boxOutline(w: number, h: number, d: number): BoxGeometry {
  const key = `${w}|${h}|${d}`;
  const cached = outlineCache.get(key);
  if (cached) return cached;
  const created = new BoxGeometry(w, h, d);
  outlineCache.set(key, created);
  return created;
}
