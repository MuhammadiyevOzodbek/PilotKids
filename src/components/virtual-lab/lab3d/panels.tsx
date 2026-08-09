"use client";

import { useMemo, useState } from "react";
import { Icon } from "@/components/icon";
import { CATALOG, CATEGORY_LABELS, getDefinition } from "@/lib/virtual-lab/catalog";
import { LESSONS } from "@/lib/virtual-lab/lessons";
import { liveControlFor, type LiveControl } from "@/lib/virtual-lab/live-controls";
import type { CircuitNode, SimulationSpeed } from "@/lib/virtual-lab/types";
import { useCircuitStore, useProjectStore, useSimulationStore } from "@/stores/virtual-lab";
import { WIRE_COLORS, useLab3DStore, type CameraView } from "@/stores/lab3d";
import { WIRE_HEX } from "./wires-3d";

/**
 * 3D laboratoriyaning yon panellari (§17, §19, §25, §26).
 *
 * Panellar sxemani `useCircuitStore` orqali o'zgartiradi — ya'ni 2D
 * laboratoriyadagi bilan bir xil amallar, bir xil undo/redo va bir xil
 * ulanish qoidalari.
 */

/* ═══════════════════════ Yuqori panel (§25) ═══════════════════════ */

const VIEW_BUTTONS: { view: CameraView | "fit"; icon: string; label: string }[] = [
  { view: "perspective", icon: "deployed_code", label: "Istiqbolli ko'rinish" },
  { view: "top", icon: "vertical_align_top", label: "Tepadan" },
  { view: "front", icon: "crop_landscape", label: "Oldindan" },
  { view: "left", icon: "chevron_left", label: "Chapdan" },
  { view: "right", icon: "chevron_right", label: "O'ngdan" },
  { view: "fit", icon: "fit_screen", label: "Hammasini sig'dirish" },
];

export function Toolbar({
  onStart,
  onPause,
  onStop,
  onSave,
  onNew,
  onOpen,
  paletteOpen,
  onTogglePalette,
  serialVisible,
  onToggleSerial,
  isFullscreen,
  onToggleFullscreen,
}: {
  onStart: () => void;
  onPause: () => void;
  onStop: () => void;
  onSave: () => void;
  onNew: () => void;
  onOpen: (id: string) => void;
  paletteOpen: boolean;
  onTogglePalette: () => void;
  serialVisible: boolean;
  onToggleSerial: () => void;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
}) {
  const tool = useLab3DStore((s) => s.tool);
  const setTool = useLab3DStore((s) => s.setTool);
  const wireColor = useLab3DStore((s) => s.wireColor);
  const setWireColor = useLab3DStore((s) => s.setWireColor);
  const requestCamera = useLab3DStore((s) => s.requestCamera);
  const mode = useLab3DStore((s) => s.mode);
  const setMode = useLab3DStore((s) => s.setMode);

  const undo = useCircuitStore((s) => s.undo);
  const redo = useCircuitStore((s) => s.redo);
  const status = useSimulationStore((s) => s.status);
  const running = status === "running";

  return (
    <div className="lab3d-toolbar">
      {/*
        Loyiha boshqaruvi.

        Ilgari 3D da faqat «Saqlash» bor edi — saqlangan loyihani qayta
        ochib bo'lmasdi va yangisini boshlash uchun 2D ga o'tish kerak
        edi. Loyihalar ro'yxati 2D bilan BITTA (`useProjectStore`).
      */}
      <ProjectControls onNew={onNew} onOpen={onOpen} />

      <span className="lab3d-sep" />

      <button
        type="button"
        className="lab3d-btn"
        aria-pressed={paletteOpen}
        onClick={onTogglePalette}
      >
        <Icon name="widgets" size={16} />
        Komponentlar
      </button>

      {/*
        Serial Monitor'ni butunlay olib tashlash.

        Sarlavhani bosish uni YIG'ADI (chiziq bo'lib qoladi), bu tugma esa
        umuman yashiradi — sxema yig'ayotganda 3D sahnaga to'liq joy
        kerak bo'ladi.
      */}
      <button
        type="button"
        className="lab3d-btn"
        aria-pressed={serialVisible}
        onClick={onToggleSerial}
        title={serialVisible ? "Serial Monitorni yashirish" : "Serial Monitorni ko'rsatish"}
      >
        <Icon name="terminal" size={16} />
      </button>

      <span className="lab3d-sep" />

      <div className="lab3d-group" role="group" aria-label="Asbob">
        <button
          type="button"
          aria-pressed={tool === "select"}
          onClick={() => setTool("select")}
          title="Tanlash va ko'chirish"
        >
          <Icon name="arrow_selector_tool" size={15} />
        </button>
        <button
          type="button"
          aria-pressed={tool === "wire"}
          onClick={() => setTool("wire")}
          title="Sim ulash"
        >
          <Icon name="cable" size={15} />
        </button>
      </div>

      {/* Sim rangi — faqat sim asbobida kerak (§14) */}
      {tool === "wire" && (
        <div className="lab3d-colors" role="group" aria-label="Sim rangi">
          {WIRE_COLORS.map((color) => (
            <button
              key={color}
              type="button"
              className="lab3d-swatch"
              aria-label={`Sim rangi: ${color}`}
              aria-pressed={wireColor === color}
              style={{ background: WIRE_HEX[color] }}
              onClick={() => setWireColor(color)}
            />
          ))}
        </div>
      )}

      <span className="lab3d-sep" />

      <div className="lab3d-group" role="group" aria-label="Tarix">
        <button type="button" onClick={undo} title="Ortga (Ctrl+Z)">
          <Icon name="undo" size={15} />
        </button>
        <button type="button" onClick={redo} title="Oldinga (Ctrl+Shift+Z)">
          <Icon name="redo" size={15} />
        </button>
      </div>

      <div className="lab3d-group" role="group" aria-label="Kamera">
        {VIEW_BUTTONS.map((item) => (
          <button
            key={item.view}
            type="button"
            onClick={() => requestCamera(item.view)}
            title={item.label}
            aria-label={item.label}
          >
            <Icon name={item.icon} size={15} />
          </button>
        ))}
      </div>

      {/*
        To'liq ekran (§4).

        3D sahnada balandlik hamma narsadan qimmat: stol ustidagi
        komponentga past burchakdan qarash uchun joy kerak. Ilova
        qobig'idan chiqib, laboratoriya butun ekranni oladi.
      */}
      <button
        type="button"
        className="lab3d-btn"
        aria-pressed={isFullscreen}
        onClick={onToggleFullscreen}
        title={isFullscreen ? "To'liq ekrandan chiqish (F)" : "To'liq ekranni ochish (F)"}
        aria-label={isFullscreen ? "To'liq ekrandan chiqish" : "To'liq ekranni ochish"}
      >
        <Icon name={isFullscreen ? "fullscreen_exit" : "fullscreen"} size={16} />
      </button>

      <span className="vlab-spacer" style={{ flex: 1 }} />

      {/* Daraja: pin tooltiplari qanchalik texnik bo'lsin (§39, §40) */}
      <div className="lab3d-group" role="group" aria-label="Daraja">
        <button
          type="button"
          aria-pressed={mode === "beginner"}
          onClick={() => setMode("beginner")}
        >
          Boshlang&apos;ich
        </button>
        <button
          type="button"
          aria-pressed={mode === "advanced"}
          onClick={() => setMode("advanced")}
        >
          Kengaytirilgan
        </button>
      </div>

      <button
        type="button"
        className="lab3d-btn lab3d-btn-primary"
        onClick={running ? onPause : onStart}
      >
        <Icon name={running ? "pause" : "play_arrow"} size={17} />
        {running ? "Pauza" : "Ishga tushirish"}
      </button>
      <button type="button" className="lab3d-btn" onClick={onStop} title="To'xtatish va tiklash">
        <Icon name="stop" size={17} />
      </button>
      <button type="button" className="lab3d-btn" onClick={onSave} title="Saqlash (Ctrl+S)">
        <Icon name="save" size={16} />
      </button>
    </div>
  );
}

/**
 * Loyiha nomi, saqlangan loyihalar ro'yxati va «yangi».
 *
 * Ro'yxat `useProjectStore` dan — 2D laboratoriyada saqlangan loyiha shu
 * yerda ham chiqadi va aksincha (§42).
 */
function ProjectControls({ onNew, onOpen }: { onNew: () => void; onOpen: (id: string) => void }) {
  const name = useProjectStore((s) => s.name);
  const setName = useProjectStore((s) => s.setName);
  const projects = useProjectStore((s) => s.projects);
  const currentId = useProjectStore((s) => s.currentId);
  const dirty = useProjectStore((s) => s.dirty);

  return (
    <div className="lab3d-project">
      <input
        className="lab3d-project-name"
        value={name}
        onChange={(event) => setName(event.target.value)}
        aria-label="Loyiha nomi"
        maxLength={80}
        // Saqlanmagan o'zgarish borligini yulduzcha aytadi.
        title={dirty ? "Saqlanmagan o'zgarishlar bor" : name}
        data-dirty={dirty ? "yes" : "no"}
      />
      <select
        className="lab3d-project-open"
        value={currentId ?? ""}
        onChange={(event) => onOpen(event.target.value)}
        aria-label="Saqlangan loyihani ochish"
      >
        <option value="">Saqlangan loyihalar</option>
        {projects.map((project) => (
          <option key={project.id} value={project.id}>
            {project.name}
          </option>
        ))}
      </select>
      <button type="button" className="lab3d-btn" onClick={onNew} title="Yangi loyiha">
        <Icon name="note_add" size={16} />
      </button>
    </div>
  );
}

/* ═══════════════════════ Komponent paneli (§17) ═══════════════════════ */

export function ComponentPalette3D({
  onAdd,
  onTemplate,
}: {
  onAdd: (type: string) => void;
  onTemplate: (slug: string) => void;
}) {
  const [query, setQuery] = useState("");

  /** Kategoriya → komponentlar, qidiruvga qarab filtrlangan. */
  const groups = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const map = new Map<string, typeof CATALOG>();
    for (const component of CATALOG) {
      if (needle && !`${component.name} ${component.type}`.toLowerCase().includes(needle)) continue;
      const list = map.get(component.category) ?? [];
      list.push(component);
      map.set(component.category, list);
    }
    return [...map.entries()];
  }, [query]);

  return (
    <aside className="lab3d-palette" aria-label="Komponentlar">
      <div className="lab3d-search">
        <Icon name="search" size={16} />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Komponent qidirish…"
          aria-label="Komponent qidirish"
        />
      </div>

      <div className="lab3d-palette-body">
        {/*
          Tayyor sxemalar (§41).

          Ular DARSLARNING boshlang'ich sxemasi — ya'ni 2D laboratoriya
          bilan bitta manbadan. Usiz 3D da har safar noldan yig'ish kerak
          edi: o'nlab sim, har biri ikki bosishda. Bir bosishda ishlaydigan
          sxema ochilishi butun zanjirni (sxema → kod → simulyator →
          3D ko'rinish) darhol ko'rsatadi.
        */}
        {!query && (
          <section>
            <h3>Tayyor sxemalar</h3>
            {LESSONS.map((lesson) => (
              <button
                key={lesson.slug}
                type="button"
                className="lab3d-part lab3d-template"
                onClick={() => onTemplate(lesson.slug)}
                title={`${lesson.title} — tayyor sxema va kod`}
              >
                <span className="lab3d-part-name">{lesson.title}</span>
                <Icon name="bolt" size={15} />
              </button>
            ))}
          </section>
        )}

        {groups.length === 0 && <p className="lab3d-empty">Hech narsa topilmadi</p>}
        {groups.map(([category, items]) => (
          <section key={category}>
            <h3>{CATEGORY_LABELS[category] ?? category}</h3>
            {items.map((component) => (
              <button
                key={component.type}
                type="button"
                className="lab3d-part"
                onClick={() => onAdd(component.type)}
                title={component.description}
              >
                <span className="lab3d-part-name">{component.name}</span>
                <Icon name="add" size={15} />
              </button>
            ))}
          </section>
        ))}
      </div>
    </aside>
  );
}

/* ═══════════════════════ Inspektor (§19, §29) ═══════════════════════ */

export function Inspector3D() {
  const circuit = useCircuitStore((s) => s.circuit);
  const selectedIds = useCircuitStore((s) => s.selectedIds);
  const updateSetting = useCircuitStore((s) => s.updateSetting);
  const rotateNode = useCircuitStore((s) => s.rotateNode);
  const removeSelected = useCircuitStore((s) => s.removeSelected);
  const removeWire = useCircuitStore((s) => s.removeWire);
  const setWireColorFor = useCircuitStore((s) => s.setWireColor);

  const runtime = useSimulationStore((s) => s.runtime);
  const setSelection = useCircuitStore((s) => s.setSelection);
  const selectedWireId = useLab3DStore((s) => s.selectedWireId);
  const selectWire = useLab3DStore((s) => s.selectWire);

  const wire = circuit.wires.find((w) => w.id === selectedWireId);
  const node = circuit.nodes.find((n) => n.id === selectedIds[0]);

  /**
   * Pinning KATALOGDAGI yozuvi — `gnd` emas, «VSS (GND)».
   *
   * Ro'yxatda xom ID ko'rsatish LCD kabi ko'p oyoqli modullarda
   * chalkashtirardi: 3D dagi tooltip bir nomni, inspektor esa boshqasini
   * aytardi.
   */
  const pinLabel = (type: string | undefined, pinId: string) =>
    getDefinition(type ?? "")?.pins.find((p) => p.id === pinId)?.label ?? pinId;

  /* ── Sim tanlangan (§29) ── */
  if (wire) {
    const label = (end: { nodeId: string; pinId: string }) => {
      const target = circuit.nodes.find((n) => n.id === end.nodeId);
      const name = target ? (getDefinition(target.type)?.name ?? target.type) : "?";
      return `${name} · ${pinLabel(target?.type, end.pinId)}`;
    };

    return (
      <aside className="lab3d-inspector" aria-label="Sim">
        <h2>Sim</h2>
        <dl>
          <dt>Qayerdan</dt>
          <dd>{label(wire.from)}</dd>
          <dt>Qayerga</dt>
          <dd>{label(wire.to)}</dd>
        </dl>

        <label className="lab3d-field">
          <span>Rang</span>
          <div className="lab3d-colors">
            {WIRE_COLORS.map((color) => (
              <button
                key={color}
                type="button"
                className="lab3d-swatch"
                aria-label={color}
                aria-pressed={wire.color === color}
                style={{ background: WIRE_HEX[color] }}
                onClick={() => setWireColorFor(wire.id, color)}
              />
            ))}
          </div>
        </label>

        <button
          type="button"
          className="lab3d-btn lab3d-btn-danger"
          onClick={() => {
            removeWire(wire.id);
            selectWire(null);
          }}
        >
          <Icon name="delete" size={16} />
          Simni o&apos;chirish
        </button>
      </aside>
    );
  }

  /* ── Hech narsa tanlanmagan ── */
  if (!node) {
    return (
      <aside className="lab3d-inspector" aria-label="Xossalar">
        <p className="lab3d-empty">
          Komponentni bosing — uning sozlamalari va ulanishlari shu yerda ko&apos;rinadi.
        </p>
      </aside>
    );
  }

  /* ── Komponent tanlangan (§19) ── */
  const def = getDefinition(node.type);
  const live = liveControlFor(node.type);
  const state = runtime[node.id];
  const wiresOf = circuit.wires.filter((w) => w.from.nodeId === node.id || w.to.nodeId === node.id);

  return (
    <aside className="lab3d-inspector" aria-label="Xossalar">
      <h2>{def?.name ?? node.type}</h2>

      {/*
        Jonli boshqaruv — sensor, potensiometr, tugma (§29).

        Bu ODDIY sozlama emas: qiymat `setSensor` orqali ishlayotgan
        simulyatorga uzatiladi va natija darhol ko'rinadi. Ilgari 3D da
        faqat `updateSetting` chaqirilardi — sozlama o'zgarardi-yu,
        simulyator undan bexabar qolardi, ya'ni potensiometrni burish
        yoki tugmani bosish hech narsa qilmasdi.
      */}
      {live && <LiveControlField node={node} control={live} />}

      {/* Qolgan sozlamalar — katalogdagi ta'rifdan quriladi, qo'lda yozilmaydi */}
      {def?.settings
        .filter((setting) => setting.key !== live?.key)
        .map((setting) => (
          <label key={setting.key} className="lab3d-field">
            <span>{setting.label}</span>
            {setting.kind === "boolean" ? (
              <input
                type="checkbox"
                checked={node.settings[setting.key] === true}
                onChange={(event) => updateSetting(node.id, setting.key, event.target.checked)}
              />
            ) : setting.kind === "select" ? (
              <select
                value={String(node.settings[setting.key] ?? "")}
                onChange={(event) => updateSetting(node.id, setting.key, event.target.value)}
              >
                {setting.options.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            ) : (
              <span className="lab3d-slider">
                <input
                  type="range"
                  min={setting.min}
                  max={setting.max}
                  step={setting.step}
                  value={Number(node.settings[setting.key] ?? setting.min)}
                  onChange={(event) =>
                    updateSetting(node.id, setting.key, Number(event.target.value))
                  }
                />
                <output>
                  {Number(node.settings[setting.key] ?? setting.min)}
                  {setting.unit ?? ""}
                </output>
              </span>
            )}
          </label>
        ))}

      {/* Simulyatsiya holati — bezak emas, `Simulator` bergan qiymatlar (§46) */}
      {state && <RuntimeFacts state={state} />}

      {/* Ulanishlar */}
      <h3>Ulanishlar</h3>
      {wiresOf.length === 0 ? (
        <p className="lab3d-empty">Hali ulanmagan</p>
      ) : (
        <ul className="lab3d-links">
          {wiresOf.map((w) => {
            const near = w.from.nodeId === node.id ? w.from : w.to;
            const far = w.from.nodeId === node.id ? w.to : w.from;
            const farNode = circuit.nodes.find((n) => n.id === far.nodeId);
            return (
              <li key={w.id}>
                <button
                  type="button"
                  onClick={() => {
                    // Sim va komponent bir vaqtda tanlangan bo'lmaydi: aks
                    // holda inspektor simni ko'rsatib turganda stolda
                    // komponent ramkasi qolib ketardi.
                    selectWire(w.id);
                    setSelection([]);
                  }}
                >
                  <span className="lab3d-dot" style={{ background: WIRE_HEX[w.color] }} />
                  {pinLabel(node.type, near.pinId)} →{" "}
                  {getDefinition(farNode?.type ?? "")?.name ?? "?"} ·{" "}
                  {pinLabel(farNode?.type, far.pinId)}
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <div className="lab3d-actions">
        <button type="button" className="lab3d-btn" onClick={() => rotateNode(node.id)}>
          <Icon name="rotate_right" size={16} />
          Burish
        </button>
        <button type="button" className="lab3d-btn lab3d-btn-danger" onClick={removeSelected}>
          <Icon name="delete" size={16} />
          O&apos;chirish
        </button>
      </div>
    </aside>
  );
}

/**
 * Simulyatsiya paytida o'zgartiriladigan qiymat.
 *
 * Qiymat IKKI joyga yoziladi va bu ataylab:
 *   `updateSetting` — sxemada saqlanadi, loyiha bilan birga yoziladi;
 *   `setSensor`     — ishlayotgan simulyatorga uzatiladi.
 *
 * Faqat birinchisi bo'lsa qiymat saqlanardi-yu, simulyatsiyaga ta'sir
 * qilmasdi; faqat ikkinchisi bo'lsa esa loyihani qayta ochganda
 * yo'qolardi.
 */
function LiveControlField({ node, control }: { node: CircuitNode; control: LiveControl }) {
  const updateSetting = useCircuitStore((s) => s.updateSetting);
  const setSensor = useSimulationStore((s) => s.setSensor);
  const sensors = useSimulationStore((s) => s.sensors);

  if (control.kind === "toggle") {
    const on = node.settings[control.key] === true;
    return (
      <label className="lab3d-field lab3d-field-live">
        <span>{control.label}</span>
        <input
          type="checkbox"
          checked={on}
          onChange={(event) => {
            updateSetting(node.id, control.key, event.target.checked);
            setSensor(node.id, event.target.checked ? control.max : control.min);
          }}
        />
      </label>
    );
  }

  const value = sensors[node.id] ?? Number(node.settings[control.key] ?? control.min);
  return (
    <label className="lab3d-field lab3d-field-live">
      <span>{control.label}</span>
      <span className="lab3d-slider">
        <input
          type="range"
          min={control.min}
          max={control.max}
          value={value}
          onChange={(event) => {
            const next = Number(event.target.value);
            updateSetting(node.id, control.key, next);
            setSensor(node.id, next);
          }}
        />
        <output>
          {value}
          {control.unit ? ` ${control.unit}` : ""}
        </output>
      </span>
    </label>
  );
}

/** Simulyatordan kelgan qiymatlarni o'qiladigan qatorlarga aylantiradi. */
function RuntimeFacts({
  state,
}: {
  state: NonNullable<ReturnType<typeof useSimulationStore.getState>["runtime"][string]>;
}) {
  const facts: [string, string][] = [];
  if (state.angle !== undefined) facts.push(["Burchak", `${Math.round(state.angle)}°`]);
  if (state.brightness !== undefined)
    facts.push(["Yorqinlik", `${Math.round(state.brightness * 100)} %`]);
  if (state.voltage !== undefined) facts.push(["Kuchlanish", `${state.voltage.toFixed(2)} V`]);
  if (state.speed !== undefined) facts.push(["Tezlik", `${Math.round(state.speed * 100)} %`]);
  if (state.milliamps !== undefined) facts.push(["Tok", `${state.milliamps.toFixed(1)} mA`]);
  if (state.digit) facts.push(["Raqam", state.digit]);
  if (state.lines?.length) facts.push(["Ekran", state.lines.join(" ⏎ ").trimEnd() || "—"]);
  /*
   * LCD ning quvvati, yoritishi va kontrasti.
   *
   * Aynan shu uchtasi «ekran yonyapti, lekin matn yo'q» holatini
   * tushuntiradi: kontrast nolga tushgan bo'lsa VO ga ulangan
   * potensiometr aybdor, yoritish o'chgan bo'lsa — A/K simlari.
   */
  if (state.backlight !== undefined)
    facts.push(["Orqa yoritish", state.backlight ? "Yonmoqda" : "O'chiq"]);
  if (state.contrast !== undefined)
    facts.push(["Kontrast", `${Math.round(state.contrast * 100)} %`]);
  if (facts.length === 0) return null;

  return (
    <>
      <h3>Simulyatsiya</h3>
      <dl>
        {facts.map(([key, value]) => (
          <span key={key} style={{ display: "contents" }}>
            <dt>{key}</dt>
            <dd>{value}</dd>
          </span>
        ))}
      </dl>
    </>
  );
}

/* ═══════════════════════ Pastki qator (§26) ═══════════════════════ */

const STATUS_LABEL: Record<string, string> = {
  stopped: "To'xtagan",
  running: "Ishlayapti",
  paused: "Pauzada",
  error: "Xato",
};

/** Simulyatsiya tezliklari — 2D laboratoriyadagi bilan bir xil. */
const SPEEDS: SimulationSpeed[] = [0.5, 1, 2, 5];

export function StatusBar({ problems }: { problems: number }) {
  const circuit = useCircuitStore((s) => s.circuit);
  const status = useSimulationStore((s) => s.status);
  const time = useSimulationStore((s) => s.time);
  const speed = useSimulationStore((s) => s.speed);
  const setSpeed = useSimulationStore((s) => s.setSpeed);
  const settings = useLab3DStore((s) => s.settings);
  const toggleSetting = useLab3DStore((s) => s.toggleSetting);

  return (
    <div className="lab3d-status">
      <span>Komponentlar: {circuit.nodes.length}</span>
      <span>Simlar: {circuit.wires.length}</span>
      <span data-state={status}>Simulyatsiya: {STATUS_LABEL[status] ?? status}</span>
      {status !== "stopped" && <span>{(time / 1000).toFixed(1)} s</span>}
      {problems > 0 ? (
        <span data-state="error">{problems} muammo</span>
      ) : (
        <span data-state="clean">Sxema toza</span>
      )}

      {/* Tezlik — sekinlashtirilgan simulyatsiyada nima bo'layotgani ko'rinadi */}
      <div className="lab3d-group lab3d-speed" role="group" aria-label="Simulyatsiya tezligi">
        {SPEEDS.map((value) => (
          <button
            key={value}
            type="button"
            aria-pressed={speed === value}
            onClick={() => setSpeed(value)}
          >
            {value}x
          </button>
        ))}
      </div>

      <span className="vlab-spacer" style={{ flex: 1 }} />

      {/* Ko'rsatish sozlamalari (§27) */}
      {(
        [
          ["showGrid", "Panjara"],
          ["snapToGrid", "Panjaraga tegish"],
          ["showLabels", "Nomlar"],
          ["showPinNames", "Pin izohi"],
          /*
           * Tok oqimi (§24) — simda yurgan nuqtalar.
           *
           * Ilgari bu sozlama do'konda bor edi, lekin uni YOQADIGAN joy
           * yo'q edi: kod hech qachon o'qimasdi ham. Endi katakcha ham,
           * animatsiya ham bor.
           */
          ["showCurrentFlow", "Tok oqimi"],
        ] as const
      ).map(([key, label]) => (
        <label key={key} className="lab3d-toggle">
          <input type="checkbox" checked={settings[key]} onChange={() => toggleSetting(key)} />
          {label}
        </label>
      ))}
    </div>
  );
}
