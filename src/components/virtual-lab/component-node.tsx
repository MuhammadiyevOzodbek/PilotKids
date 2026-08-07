"use client";

import { Fragment, memo, useCallback, useMemo } from "react";
import { Handle, Position, useStore, type NodeProps } from "@xyflow/react";
import { getDefinition } from "@/lib/virtual-lab/catalog";
import type { ComponentPin, ComponentRuntimeState, PinMode } from "@/lib/virtual-lab/types";
import { useCircuitStore, useSimulationStore } from "@/stores/virtual-lab";
import { ComponentSymbol } from "./symbols";
import type { BoardDetail, BoardPinState } from "./uno";

/**
 * Ish maydonidagi bitta komponent.
 *
 * Har bir pin — React Flow `Handle`i, ya'ni simni aynan shu nuqtadan tortish
 * mumkin. Pin katalogda 0–1 nisbatda saqlangani uchun komponent o'lchami
 * o'zgarsa ham joyida qoladi; plata uchun bu koordinatalar SVG chizmasi
 * bilan bitta manbadan (`uno-layout`) olinadi, shuning uchun ulanish nuqtasi
 * aynan header uyasining ustiga tushadi.
 *
 * `memo` — katta sxemada har kadrda hamma komponent qayta chizilmasin;
 * faqat `data` o'zgargani qayta render bo'ladi.
 */

/**
 * Pin roli → rang. Sxema, inspektor va izohlarda bir xil bo'lishi shart,
 * shuning uchun bitta joyda saqlanadi. "Yer" pini sof qora emas: tungi
 * mavzuda ko'rinmay qolardi.
 */
export const PIN_COLOR: Record<string, string> = {
  ground: "#64748b",
  power: "var(--danger)",
};

/** Foydalanuvchiga tushunarli rol nomi (tooltip uchun). */
const ROLE_LABEL: Record<string, string> = {
  digital: "Raqamli",
  pwm: "Raqamli · PWM",
  analog: "Analog kirish",
  power: "Quvvat",
  ground: "Yer",
  passive: "Passiv",
};

/** `pinMode()` qiymatlari — bola ko'radigan ko'rinishda. */
const MODE_LABEL: Record<PinMode, string> = {
  input: "INPUT",
  output: "OUTPUT",
  input_pullup: "INPUT_PULLUP",
  unset: "sozlanmagan",
};

export interface ComponentNodeData extends Record<string, unknown> {
  type: string;
  settings: Record<string, string | number | boolean>;
  rotation: number;
  runtime?: ComponentRuntimeState;
  /** Xato/ogohlantirish tegishli komponentni ajratib ko'rsatish uchun. */
  issue?: "error" | "warning";
  /** Simulyatsiya ishlayaptimi — plata indikatorlari uchun. */
  running?: boolean;
  /** Sim ulangan pinlar. */
  connected?: string[];
  /** Pin → u nimaga ulangan (tooltip uchun): `"D13" → "LED · Anod"`. */
  connectedTo?: Record<string, string>;
  /**
   * Sim tortilayotgan paytda: shu pinga ulash mumkinmi.
   * `undefined` — hozir hech narsa tortilmayapti.
   */
  connectable?: Record<string, boolean>;
}

/** Pinning hozirgi holati — ko'rinishi shunga qarab o'zgaradi. */
type PinState = BoardPinState;

function pinStateOf(pin: ComponentPin, data: ComponentNodeData): PinState {
  if (pin.connectable === false) return "disabled";

  // Sim tortilayotgan bo'lsa — ulash mumkinmi degan savol hammasidan muhim.
  const hint = data.connectable?.[pin.id];
  if (hint !== undefined) return hint ? "ok" : "error";

  const level = data.runtime?.pins?.[pin.id];
  if (level !== undefined && (pin.role === "digital" || pin.role === "pwm")) {
    return level === 1 ? "high" : "low";
  }
  return data.connected?.includes(pin.id) ? "connected" : "idle";
}

/**
 * Tooltip matni — bir necha qatordan iborat.
 *
 * Bolaga bir joyda hamma kerakli narsa ko'rinadi: pin nomi, turi, rejimi,
 * joriy qiymati va nimaga ulangani. Qatorlar `\n` bilan ajratiladi;
 * `aria-label` uchun ular nuqtali vergulga aylanadi.
 */
function pinTooltipLines(pin: ComponentPin, data: ComponentNodeData): string[] {
  const lines = [pin.label, ROLE_LABEL[pin.role] ?? pin.role];

  const mode = data.runtime?.pinModes?.[pin.id];
  if (mode) lines.push(`Rejim: ${MODE_LABEL[mode]}`);

  const level = data.runtime?.pins?.[pin.id];
  if (level !== undefined) {
    const value = pin.role === "analog" ? String(level) : level === 1 ? "HIGH" : "LOW";
    lines.push(`Qiymat: ${value}`);
  }

  const target = data.connectedTo?.[pin.id];
  if (target) lines.push(`Ulangan: ${target}`);
  else if (data.connected?.includes(pin.id)) lines.push("Ulangan");
  else lines.push("Ulanmagan");

  return lines;
}

/**
 * Sim pindan qaysi tomonga chiqadi.
 *
 * Ilgari hamma pin `Position.Top` edi. `smoothstep` yo'li shunda pastki
 * qatordagi pindan ham YUQORIGA burilib, komponentning ustidan o'tib
 * ketardi — komponentlar esa shaffof emas, natijada simning katta qismi
 * ularning tagida ko'rinmay qolardi.
 *
 * Endi yo'nalish pinning joyiga qarab tanlanadi:
 * - platalarda pin qaysi qatorda bo'lsa, o'sha tomonga (yuqori / pastki);
 * - gorizontal yotgan ikki oyoqli detallarda (rezistor) — chapga va o'ngga;
 * - qolganlarida oyoqlar pastga qaraydi.
 *
 * Natijada sim haqiqiy jumper kabi pindan tashqariga chiqadi.
 */
function handleSide(pin: ComponentPin, category: string): Position {
  // Oyoqlari yon tomonda bo'lgan detal: pin qutining o'rta chizig'ida yotadi.
  if (category !== "board" && Math.abs(pin.y - 0.5) < 0.15) {
    return pin.x < 0.5 ? Position.Left : Position.Right;
  }
  return pin.y < 0.5 ? Position.Top : Position.Bottom;
}

/**
 * Zoom → detal darajasi.
 *
 * Chegaralar tajriba bilan tanlangan: 0.45 dan pastda silkscreen o'qilmaydi,
 * 1.05 dan boshlab esa SMD va chip oyoqlari ko'rinadigan bo'ladi.
 */
function detailFor(zoom: number): BoardDetail {
  if (zoom < 0.45) return "low";
  if (zoom < 1.05) return "mid";
  return "high";
}

function ComponentNodeInner({ id, data, selected }: NodeProps) {
  const nodeData = data as ComponentNodeData;
  // Uzoqlashtirilganda mayda silkscreen yozuvlari o'qilmaydi — ularni
  // yashiramiz, shunda plata toza ko'rinadi va chizish ham tezlashadi.
  // `useStore` selektori qiymatni darajaga aylantiradi, shuning uchun zoom
  // uzluksiz o'zgarsa ham node faqat daraja almashganda qayta render bo'ladi.
  const detail = useStore((s) => detailFor(s.transform[2]));
  const def = getDefinition(nodeData.type);

  /**
   * Plataning RESET tugmasi. Simulyatsiya siklini to'xtatish `workbench`
   * qo'lida, shuning uchun store'ga so'rov qo'yamiz — u yerda kuzatilyapti.
   */
  const requestReset = useCallback(() => {
    useSimulationStore.getState().requestReset();
  }, []);

  const pinStates = useMemo(() => {
    if (!def?.isBoard) return undefined;
    const out: Record<string, BoardPinState> = {};
    for (const pin of def.pins) out[pin.id] = pinStateOf(pin, nodeData);
    return out;
  }, [def, nodeData]);

  if (!def) return null;

  const border =
    nodeData.issue === "error"
      ? "var(--danger)"
      : nodeData.issue === "warning"
        ? "var(--fun-amber)"
        : selected
          ? "var(--primary)"
          : "transparent";

  return (
    <div
      className="vlab-node"
      data-board={def.isBoard ? "true" : undefined}
      data-state={
        nodeData.issue === "error"
          ? "error"
          : selected
            ? "selected"
            : nodeData.running
              ? "running"
              : "idle"
      }
      role="group"
      aria-label={`${def.name}. Pinlar: ${def.pins.map((p) => p.label).join(", ")}`}
      style={{
        position: "relative",
        width: def.width,
        height: def.height,
        // Aylantirish faqat ko'rinishga ta'sir qiladi; pin koordinatalari
        // o'zgarmaydi, shuning uchun simlar joyida qoladi.
        transform: `rotate(${nodeData.rotation}deg)`,
        transition: "transform .2s ease",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: -7,
          borderRadius: 13,
          border: `2px solid ${border}`,
          background: selected
            ? "color-mix(in srgb, var(--primary) 9%, transparent)"
            : nodeData.issue
              ? `color-mix(in srgb, ${border} 8%, transparent)`
              : "transparent",
          boxShadow: selected ? "0 0 0 4px var(--ring)" : "none",
          transition: "border-color .15s ease, box-shadow .15s ease, background .15s ease",
          pointerEvents: "none",
        }}
      />

      {/* Nomi — sxemada nima turganini bir qarashda bilish uchun. */}
      <div
        style={{
          position: "absolute",
          left: "50%",
          bottom: -22,
          // Komponent aylantirilsa ham yozuv tik qoladi.
          transform: `translateX(-50%) rotate(${-nodeData.rotation}deg)`,
          padding: "1px 7px",
          borderRadius: 99,
          background: "color-mix(in srgb, var(--surface) 86%, transparent)",
          border: "1px solid var(--border)",
          color: "var(--text-3)",
          fontSize: 10.5,
          fontWeight: 700,
          whiteSpace: "nowrap",
          pointerEvents: "none",
          opacity: selected ? 1 : 0.75,
        }}
      >
        {def.name}
      </div>

      <ComponentSymbol
        type={nodeData.type}
        width={def.width}
        height={def.height}
        settings={nodeData.settings}
        runtime={nodeData.runtime}
        showDetail={detail !== "low"}
        detail={detail}
        pinStates={pinStates}
        hasError={nodeData.issue === "error"}
        onReset={requestReset}
      />

      {def.pins.map((pin) => {
        const state = pinStateOf(pin, nodeData);
        const lines = pinTooltipLines(pin, nodeData);
        const side = handleSide(pin, def.category);
        const pinStyle = {
          left: `${pin.x * 100}%`,
          top: `${pin.y * 100}%`,
          // Pin belgisi ham tik qoladi — aylantirilgan komponentda
          // yozuvlar teskari o'qilmasin.
          ["--vlab-pin-color" as string]: PIN_COLOR[pin.role] ?? "var(--primary)",
        };

        return (
          <Fragment key={pin.id}>
            <Handle
              id={pin.id}
              type="target"
              position={side}
              className={`vlab-pin vlab-pin-target vlab-pin-${state} nodrag nopan`}
              data-shape={def.category === "board" ? "socket" : "lead"}
              isConnectable={pin.connectable}
              aria-hidden
              tabIndex={-1}
              style={pinStyle}
            />
            <Handle
              id={pin.id}
              type="source"
              position={side}
              className={`vlab-pin vlab-pin-source vlab-pin-${state} nodrag nopan`}
              data-shape={def.category === "board" ? "socket" : "lead"}
              isConnectable={pin.connectable}
              aria-label={lines.join("; ")}
              tabIndex={0}
              // Klaviatura bilan: Tab bilan pinga o'tiladi, Enter/Bo'sh joy
              // komponentni tanlaydi (sichqonchadagi bosish bilan bir xil).
              onKeyDown={(e) => {
                if (e.key !== "Enter" && e.key !== " ") return;
                e.preventDefault();
                useCircuitStore.getState().setSelection([id]);
              }}
              onClick={() => useCircuitStore.getState().setSelection([id])}
              style={pinStyle}
            >
              <span
                className="vlab-pin-tip"
                style={{ transform: `rotate(${-nodeData.rotation}deg)` }}
              >
                {lines.map((line, i) => (
                  <span key={line} className={i === 0 ? "vlab-pin-tip-title" : undefined}>
                    {line}
                  </span>
                ))}
              </span>
            </Handle>
          </Fragment>
        );
      })}
    </div>
  );
}

export const ComponentNode = memo(ComponentNodeInner);
