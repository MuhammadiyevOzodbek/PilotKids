"use client";

import { useEffect, useMemo, useRef } from "react";
import { Matrix4, type InstancedMesh } from "three";
import { getDefinition } from "@/lib/virtual-lab/catalog";
import { sizeOf } from "@/lib/virtual-lab/lab3d/layout";
import type { ComponentRuntimeState } from "@/lib/virtual-lab/types";
import { Box, M, mat } from "./model-kit";

/**
 * Breadboard — laboratoriyaning ikkinchi asosiy platasi.
 *
 * Arduino modeli `models-uno.tsx` da: unda o'ttizdan ortiq detal bor va
 * geometriyasi butunlay `uno-layout.ts` dagi o'lchov chizmasidan
 * quriladi, shuning uchun alohida faylda turadi.
 *
 * `ModelProps` shu yerda e'lon qilingan — barcha modellar shu interfeysni
 * import qiladi.
 */

export interface ModelProps {
  settings: Record<string, string | number | boolean>;
  runtime: ComponentRuntimeState | undefined;
}

/* ═══════════════════════ Breadboard ═══════════════════════ */

/**
 * Breadboard korpusi va 336 ta teshigi.
 *
 * Teshiklar ALOHIDA mesh sifatida chizilmaydi — bu 336 ta chizish
 * chaqiruvi bo'lardi va bitta taxta butun sahnadan qimmatga tushardi.
 * Ular bitta `instancedMesh` ga yig'iladi (§33).
 */
export function BreadboardModel() {
  const { w, d, h } = sizeOf("breadboard");
  const ref = useRef<InstancedMesh>(null);

  const holes = useMemo(() => {
    const def = getDefinition("breadboard");
    return (def?.pins ?? []).map(
      (pin) => [(pin.x - 0.5) * w, h + 0.005, (pin.y - 0.5) * d] as const,
    );
  }, [w, d, h]);

  useEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const matrix = new Matrix4();
    holes.forEach(([x, y, z], i) => {
      mesh.setMatrixAt(i, matrix.makeTranslation(x, y, z));
    });
    mesh.instanceMatrix.needsUpdate = true;
    mesh.count = holes.length;
  }, [holes]);

  return (
    <group>
      <Box pos={[0, h / 2, 0]} size={[w, h, d]} material={M.plasticWhite()} />

      {/* O'rtadagi ariq — ikki yarim taxtani elektr jihatdan ajratadi */}
      <Box pos={[0, h - 0.03, 0]} size={[w - 0.4, 0.1, 0.5]} material={mat("#d3d8e0")} />

      {/* Quvvat relslari: chetlari qizil (+), ichkarilari ko'k (−) */}
      {[
        { z: -d / 2 + 0.3, color: "#c8443c" },
        { z: -d / 2 + 0.62, color: "#2f5fb8" },
        { z: d / 2 - 0.62, color: "#2f5fb8" },
        { z: d / 2 - 0.3, color: "#c8443c" },
      ].map((rail) => (
        <Box
          key={rail.z}
          pos={[0, h + 0.002, rail.z]}
          size={[w - 0.6, 0.01, 0.045]}
          material={mat(rail.color)}
        />
      ))}

      <instancedMesh ref={ref} args={[undefined, undefined, Math.max(1, holes.length)]}>
        <boxGeometry args={[0.09, 0.02, 0.09]} />
        <primitive object={mat("#3d434c")} attach="material" />
      </instancedMesh>
    </group>
  );
}
