"use client";

import { memo } from "react";
import {
  BaseEdge,
  EdgeLabelRenderer,
  getSmoothStepPath,
  useStore,
  type EdgeProps,
} from "@xyflow/react";
import { Trash2 } from "lucide-react";
import type { WireColor } from "@/lib/virtual-lab/types";
import { useCircuitStore } from "@/stores/virtual-lab";

/**
 * Sim va uning tez menyusi.
 *
 * Simning ustiga bosilganda o'ng paneldagi sozlamalarga borish shart emas:
 * rang va o'chirish tugmasi bevosita simning yonida chiqadi. Bola sichqoncha
 * yo'lini uzmasdan tuzata oladi.
 *
 * Menyu `EdgeLabelRenderer` ichida chiziladi — u React Flow ning zoom va
 * siljish o'zgarishlarini o'zi hisobga oladi, shuning uchun menyu simdan
 * ajralib qolmaydi.
 */

/** Sim ranglari: ekrandagi qiymat va o'zbekcha nomi. */
export const WIRE_CHOICES: { color: WireColor; label: string; swatch: string }[] = [
  { color: "red", label: "Qizil — quvvat", swatch: "#e5484d" },
  { color: "black", label: "Qora — yer (GND)", swatch: "#64748b" },
  { color: "blue", label: "Ko'k — signal", swatch: "#2f6bf3" },
  { color: "green", label: "Yashil", swatch: "#0fa46e" },
  { color: "yellow", label: "Sariq", swatch: "#f5a524" },
  { color: "orange", label: "To'q sariq", swatch: "#ea6a0e" },
];

export interface WireEdgeData extends Record<string, unknown> {
  color: WireColor;
  /** Simdagi tok (mA). Menyuda ko'rsatiladi. */
  milliamps?: number;
}

function WireEdgeInner({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style,
  selected,
  data,
}: EdgeProps) {
  const [path, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    borderRadius: 8,
  });

  const wire = data as WireEdgeData | undefined;

  /*
   * Menyu sxema bilan birga kattalashmasligi kerak — u interfeys elementi,
   * sxemaning bir qismi emas. `EdgeLabelRenderer` idishi zoom bilan
   * masshtablanadi, shuning uchun uni teskari koeffitsiyent bilan bekor
   * qilamiz. Selektor faqat sim tanlanganda kuzatiladi: aks holda har bir
   * sim zoom o'zgarishida qayta chizilardi.
   */
  const zoom = useStore((s) => (selected ? s.transform[2] : 1));

  return (
    <>
      <BaseEdge id={id} path={path} style={style} />

      {selected && (
        <EdgeLabelRenderer>
          <div
            /*
             * `nodrag`/`nopan` — menyu ustidagi bosish sxemani siljitmasin.
             * Joylashuv React Flow bergan yorliq nuqtasiga qo'yiladi: bu
             * simning o'rtasi, ya'ni menyu doim ko'rinib turadi.
             */
            className="vlab-wire-menu nodrag nopan"
            style={{
              transform: `translate(${labelX}px, ${labelY}px) translate(-50%, -50%) scale(${1 / zoom})`,
            }}
            role="group"
            aria-label="Sim sozlamalari"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="vlab-wire-menu-colors" role="radiogroup" aria-label="Sim rangi">
              {WIRE_CHOICES.map((choice) => (
                <button
                  key={choice.color}
                  type="button"
                  className="vlab-wire-swatch"
                  role="radio"
                  aria-checked={wire?.color === choice.color}
                  data-active={wire?.color === choice.color}
                  aria-label={choice.label}
                  title={choice.label}
                  style={{ ["--wire-color" as string]: choice.swatch }}
                  onClick={() => useCircuitStore.getState().setWireColor(id, choice.color)}
                />
              ))}
            </div>

            {/* Tok o'lchovi — simulyatsiya ishlayotganda foydali. */}
            {wire?.milliamps !== undefined && (
              <span className="vlab-wire-menu-current">{wire.milliamps.toFixed(1)} mA</span>
            )}

            <button
              type="button"
              className="vlab-wire-menu-delete"
              aria-label="Simni o'chirish"
              title="Simni o'chirish (Delete)"
              onClick={() => {
                useCircuitStore.getState().removeWire(id);
                useCircuitStore.getState().setSelection([]);
              }}
            >
              <Trash2 size={14} />
            </button>
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}

export const WireEdge = memo(WireEdgeInner);
