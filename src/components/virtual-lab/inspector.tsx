"use client";

import { MousePointerClick, RotateCw, SlidersHorizontal, Trash2 } from "lucide-react";
import {
  BATTERY_PRESETS,
  RESISTOR_PRESETS,
  formatOhms,
  getDefinition,
  getPin,
} from "@/lib/virtual-lab/catalog";
import type { CircuitIssue, WireColor, WireEndpoint } from "@/lib/virtual-lab/types";
import { useCircuitStore, useSimulationStore } from "@/stores/virtual-lab";
import { PIN_COLOR } from "./component-node";

/**
 * Tanlangan komponent sozlamalari va sensor boshqaruvi (o'ng panel).
 *
 * Sensor qiymatlari simulyatsiya ishlayotgan paytda ham o'zgartiriladi —
 * natija darhol ko'rinadi.
 */

/** Sensor qiymati sozlama emas, alohida boshqariladigan komponentlar. */
const SENSOR_CONTROL: Record<
  string,
  { key: string; label: string; min: number; max: number; unit?: string }
> = {
  potentiometer: { key: "value", label: "Buralish", min: 0, max: 1023 },
  ldr: { key: "light", label: "Yorug'lik", min: 0, max: 1023 },
  ultrasonic: { key: "distance", label: "Masofa", min: 2, max: 400, unit: "sm" },
};

const WIRE_OPTIONS: Array<{ color: WireColor; label: string; value: string }> = [
  { color: "red", label: "Qizil", value: "#ef4444" },
  { color: "black", label: "Qora", value: "#111827" },
  { color: "blue", label: "Ko'k", value: "#2563eb" },
  { color: "green", label: "Yashil", value: "#16a34a" },
  { color: "yellow", label: "Sariq", value: "#eab308" },
  { color: "orange", label: "To'q sariq", value: "#f97316" },
];

export function Inspector({ issues }: { issues: CircuitIssue[] }) {
  const circuit = useCircuitStore((s) => s.circuit);
  const selectedIds = useCircuitStore((s) => s.selectedIds);
  const updateSetting = useCircuitStore((s) => s.updateSetting);
  const rotateNode = useCircuitStore((s) => s.rotateNode);
  const removeSelected = useCircuitStore((s) => s.removeSelected);
  const setWireColor = useCircuitStore((s) => s.setWireColor);
  const removeWire = useCircuitStore((s) => s.removeWire);
  const setSelection = useCircuitStore((s) => s.setSelection);
  const setSensor = useSimulationStore((s) => s.setSensor);
  const sensors = useSimulationStore((s) => s.sensors);

  const node = circuit.nodes.find((n) => n.id === selectedIds[0]) ?? null;
  const wire = !node ? (circuit.wires.find((w) => w.id === selectedIds[0]) ?? null) : null;
  const def = node ? getDefinition(node.type) : null;
  const nodeIssues = node ? issues.filter((i) => i.nodeIds.includes(node.id)) : [];

  const endpointLabel = (endpoint: WireEndpoint) => {
    const endpointNode = circuit.nodes.find((n) => n.id === endpoint.nodeId);
    if (!endpointNode) return endpoint.pinId;
    const endpointDef = getDefinition(endpointNode.type);
    const pin = getPin(endpointNode.type, endpoint.pinId);
    return `${endpointDef?.name ?? endpointNode.type} - ${pin?.label ?? endpoint.pinId}`;
  };

  return (
    <div className="vlab-panel vlab-right-inspector">
      <div className="vlab-panel-head">
        <span className="vlab-panel-title">
          <SlidersHorizontal size={15} />
          Sozlamalar
        </span>
        <span className="vlab-spacer" />
        {node && def && <span className="vlab-count">{def.name}</span>}
        {wire && <span className="vlab-count">Sim</span>}
      </div>

      <div className="vlab-panel-body">
        {wire ? (
          <div className="vlab-inspector">
            <div>
              <div className="vlab-insp-name">Sim</div>
              <div className="vlab-insp-desc">
                {endpointLabel(wire.from)} dan {endpointLabel(wire.to)} ga ulangan.
              </div>
            </div>

            <div>
              <div className="vlab-sub">Rang</div>
              <div className="vlab-wire-colors" role="radiogroup" aria-label="Sim rangi">
                {WIRE_OPTIONS.map((option) => (
                  <button
                    key={option.color}
                    type="button"
                    className="vlab-wire-swatch"
                    data-active={wire.color === option.color}
                    onClick={() => setWireColor(wire.id, option.color)}
                    aria-label={option.label}
                    aria-checked={wire.color === option.color}
                    role="radio"
                    style={{ ["--wire-color" as string]: option.value }}
                    title={option.label}
                  />
                ))}
              </div>
            </div>

            <div className="vlab-actions">
              <button
                type="button"
                onClick={() => {
                  removeWire(wire.id);
                  setSelection([]);
                }}
                className="vlab-btn vlab-btn-danger"
                title="Delete tugmasi bilan ham o'chadi"
              >
                <Trash2 size={15} />
                O&apos;chirish
              </button>
            </div>
          </div>
        ) : !node || !def ? (
          <div className="vlab-empty">
            <MousePointerClick
              size={26}
              style={{ display: "block", margin: "0 auto 10px", color: "var(--text-3)" }}
            />
            Komponentni tanlang —<br />
            uning sozlamalari shu yerda chiqadi.
          </div>
        ) : (
          <div className="vlab-inspector">
            <div>
              <div className="vlab-insp-name">{def.name}</div>
              <div className="vlab-insp-desc">{def.description}</div>
            </div>

            {nodeIssues.length > 0 && (
              <div style={{ display: "grid", gap: 8 }}>
                {nodeIssues.map((i) => (
                  <div key={i.id} className={`vlab-issue vlab-issue-${i.severity}`}>
                    <strong>{i.message}</strong>
                    {i.hint}
                  </div>
                ))}
              </div>
            )}

            {/*
              Batareya uchun tayyor kuchlanishlar: bola raqam terishi shart
              emas, bir bosishda 1.5 / 3 / 5 / 9 / 12 V ni tanlaydi. Quyidagi
              umumiy «Kuchlanish» maydoni esa oraliqdagi qiymatlar uchun
              qoladi — ikkalasi bitta `voltage` sozlamasini yozadi.
            */}
            {node.type === "battery" && (
              <div>
                <div className="vlab-sub">Tayyor kuchlanishlar</div>
                <div className="vlab-volt-presets">
                  {BATTERY_PRESETS.map((volts) => (
                    <button
                      key={volts}
                      type="button"
                      className="vlab-volt-preset"
                      aria-pressed={Number(node.settings.voltage) === volts}
                      onClick={() => updateSetting(node.id, "voltage", volts)}
                    >
                      {volts}V
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Rezistor uchun standart nominal qiymatlar. */}
            {node.type === "resistor" && (
              <div>
                <div className="vlab-sub">Standart nominal</div>
                <div className="vlab-volt-presets">
                  {RESISTOR_PRESETS.map((ohms) => (
                    <button
                      key={ohms}
                      type="button"
                      className="vlab-volt-preset"
                      aria-pressed={Number(node.settings.ohms) === ohms}
                      onClick={() => updateSetting(node.id, "ohms", ohms)}
                    >
                      {formatOhms(ohms)}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Sensor boshqaruvi — simulyatsiya paytida ham ishlaydi */}
            {SENSOR_CONTROL[node.type] &&
              (() => {
                const ctrl = SENSOR_CONTROL[node.type]!;
                const value = sensors[node.id] ?? Number(node.settings[ctrl.key] ?? 0);
                return (
                  <label className="vlab-label">
                    <span className="vlab-label-row">
                      <span>{ctrl.label}</span>
                      <span className="vlab-label-value">
                        {value}
                        {ctrl.unit ? ` ${ctrl.unit}` : ""}
                      </span>
                    </span>
                    <input
                      type="range"
                      className="vlab-range"
                      min={ctrl.min}
                      max={ctrl.max}
                      value={value}
                      onChange={(e) => {
                        const v = Number(e.target.value);
                        setSensor(node.id, v);
                        updateSetting(node.id, ctrl.key, v);
                      }}
                    />
                  </label>
                );
              })()}

            {/* Umumiy sozlamalar */}
            {def.settings
              .filter((s) => s.key !== SENSOR_CONTROL[node.type]?.key)
              .map((setting) =>
                setting.kind === "boolean" ? (
                  <label key={setting.key} className="vlab-check-row">
                    <input
                      type="checkbox"
                      checked={node.settings[setting.key] === true}
                      onChange={(e) => {
                        updateSetting(node.id, setting.key, e.target.checked);
                        if (node.type === "push-button" && setting.key === "pressed") {
                          setSensor(node.id, e.target.checked ? 1 : 0);
                        }
                      }}
                    />
                    {setting.label}
                  </label>
                ) : setting.kind === "select" ? (
                  <label key={setting.key} className="vlab-label">
                    <span>{setting.label}</span>
                    <select
                      className="vlab-field"
                      value={String(node.settings[setting.key] ?? "")}
                      onChange={(e) => updateSetting(node.id, setting.key, e.target.value)}
                    >
                      {setting.options.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </label>
                ) : (
                  <label key={setting.key} className="vlab-label">
                    <span>
                      {setting.label}
                      {setting.unit ? ` (${setting.unit})` : ""}
                    </span>
                    <input
                      type="number"
                      className="vlab-field"
                      min={setting.min}
                      max={setting.max}
                      step={setting.step}
                      value={Number(node.settings[setting.key] ?? 0)}
                      onChange={(e) => updateSetting(node.id, setting.key, Number(e.target.value))}
                    />
                  </label>
                ),
              )}

            <div className="vlab-actions">
              <button type="button" onClick={() => rotateNode(node.id)} className="vlab-btn">
                <RotateCw size={15} />
                Aylantirish
              </button>
              <button
                type="button"
                onClick={removeSelected}
                className="vlab-btn vlab-btn-danger"
                title="Delete tugmasi bilan ham o'chadi"
              >
                <Trash2 size={15} />
                O&apos;chirish
              </button>
            </div>

            {/* Pinlar ro'yxati — qaysi oyoq nima ekanini bilish uchun */}
            <div>
              <div className="vlab-sub">Pinlar</div>
              <div className="vlab-pins">
                {def.pins.map((p) => (
                  <span key={p.id} className="vlab-pin">
                    <i style={{ background: PIN_COLOR[p.role] ?? "var(--primary)" }} />
                    {p.label}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
