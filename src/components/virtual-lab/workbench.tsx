"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  CircuitBoard,
  CopyPlus,
  Download,
  FileCode2,
  FilePlus2,
  Maximize,
  Minimize,
  Pause,
  PanelLeftClose,
  PanelLeftOpen,
  PanelRightClose,
  PanelRightOpen,
  Play,
  Redo2,
  Save,
  SlidersHorizontal,
  Square,
  Trash,
  Trash2,
  Undo2,
  Upload,
} from "lucide-react";
import { parseSketch } from "@/lib/virtual-lab/parser";
import { Simulator } from "@/lib/virtual-lab/simulator";
import { hasBlockingErrors, validateCircuit } from "@/lib/virtual-lab/validator";
import { checkLesson, getLesson } from "@/lib/virtual-lab/lessons";
import { exportProject, importProject } from "@/lib/virtual-lab/storage";
import type { Circuit, LessonResult, ParsedSketch, SimulationSpeed } from "@/lib/virtual-lab/types";
import {
  useCircuitStore,
  useEditorStore,
  useProjectStore,
  useSimulationStore,
} from "@/stores/virtual-lab";
import { CircuitCanvas } from "./canvas";
import { CodeEditor } from "./code-editor";
import { ComponentPalette } from "./palette";
import { Inspector } from "./inspector";
import { SerialMonitor } from "./serial-monitor";

/**
 * Laboratoriya ish stoli — barcha qismlarni bir joyga bog'laydi.
 *
 * Simulyatsiya sikli `requestAnimationFrame` da yuradi va React holatini
 * har kadrda emas, ~10 marta/soniya yangilaydi: shunda uzoq ishlaydigan
 * simulyatsiya ham interfeysni sekinlashtirmaydi.
 */

const SPEEDS: SimulationSpeed[] = [0.5, 1, 2, 5];
/** React holatini yangilash oralig'i (ms) — UI ni ortiqcha qayta chizmaslik uchun. */
const UI_SYNC_MS = 100;
const LIVE_SETTING_KEYS: Record<string, string> = {
  potentiometer: "value",
  ldr: "light",
  ultrasonic: "distance",
  "push-button": "pressed",
  tmp36: "temperature",
  "soil-moisture": "moisture",
  pir: "motion",
};

/** Tor ekranda bir vaqtda ko'rinadigan bo'lim. */
type MobileView = "palette" | "canvas" | "panel";

/** Simulyatsiya vaqtini `12.4s` ko'rinishida yozadi. */
function formatTime(ms: number): string {
  if (ms < 1000) return `${Math.round(ms)}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function needsSimulationRestart(
  previous: { circuit: Circuit; code: string },
  next: { circuit: Circuit; code: string },
): boolean {
  if (previous.code !== next.code) return true;
  if (previous.circuit.nodes.length !== next.circuit.nodes.length) return true;
  if (previous.circuit.wires.length !== next.circuit.wires.length) return true;

  for (let i = 0; i < previous.circuit.wires.length; i++) {
    const a = previous.circuit.wires[i]!;
    const b = next.circuit.wires[i]!;
    if (
      a.id !== b.id ||
      a.color !== b.color ||
      a.from.nodeId !== b.from.nodeId ||
      a.from.pinId !== b.from.pinId ||
      a.to.nodeId !== b.to.nodeId ||
      a.to.pinId !== b.to.pinId
    ) {
      return true;
    }
  }

  for (let i = 0; i < previous.circuit.nodes.length; i++) {
    const a = previous.circuit.nodes[i]!;
    const b = next.circuit.nodes[i]!;
    if (
      a.id !== b.id ||
      a.type !== b.type ||
      a.x !== b.x ||
      a.y !== b.y ||
      a.rotation !== b.rotation
    ) {
      return true;
    }

    const liveKey = LIVE_SETTING_KEYS[a.type];
    const keys = new Set([...Object.keys(a.settings), ...Object.keys(b.settings)]);
    for (const key of keys) {
      if (key === liveKey) continue;
      if (a.settings[key] !== b.settings[key]) return true;
    }
  }

  return false;
}

export function Workbench({ lessonSlug }: { lessonSlug?: string }) {
  const circuit = useCircuitStore((s) => s.circuit);
  const undo = useCircuitStore((s) => s.undo);
  const redo = useCircuitStore((s) => s.redo);
  const clear = useCircuitStore((s) => s.clear);
  const removeSelected = useCircuitStore((s) => s.removeSelected);
  const copySelection = useCircuitStore((s) => s.copySelection);
  const pasteClipboard = useCircuitStore((s) => s.pasteClipboard);
  const setSelection = useCircuitStore((s) => s.setSelection);
  const replaceCircuit = useCircuitStore((s) => s.replaceCircuit);

  const code = useEditorStore((s) => s.code);
  const fontSize = useEditorStore((s) => s.fontSize);
  const codeErrors = useEditorStore((s) => s.errors);
  const setCode = useEditorStore((s) => s.setCode);
  const setFontSize = useEditorStore((s) => s.setFontSize);
  const setCodeErrors = useEditorStore((s) => s.setErrors);
  const resetCode = useEditorStore((s) => s.resetCode);

  const status = useSimulationStore((s) => s.status);
  const simTime = useSimulationStore((s) => s.time);
  const speed = useSimulationStore((s) => s.speed);
  const logs = useSimulationStore((s) => s.logs);
  const sensors = useSimulationStore((s) => s.sensors);
  const setStatus = useSimulationStore((s) => s.setStatus);
  const setSpeed = useSimulationStore((s) => s.setSpeed);
  const setSensors = useSimulationStore((s) => s.setSensors);
  const publish = useSimulationStore((s) => s.publish);
  const setSimErrors = useSimulationStore((s) => s.setErrors);
  const clearLogs = useSimulationStore((s) => s.clearLogs);
  const resetSim = useSimulationStore((s) => s.reset);

  const projectName = useProjectStore((s) => s.name);
  const projects = useProjectStore((s) => s.projects);
  const currentId = useProjectStore((s) => s.currentId);
  const dirty = useProjectStore((s) => s.dirty);
  const lastProjectError = useProjectStore((s) => s.lastError);
  const setProjectName = useProjectStore((s) => s.setName);
  const saveProject = useProjectStore((s) => s.save);
  const newProject = useProjectStore((s) => s.newProject);
  const openProject = useProjectStore((s) => s.open);
  const duplicateProject = useProjectStore((s) => s.duplicate);
  const removeProject = useProjectStore((s) => s.remove);
  const hydrate = useProjectStore((s) => s.hydrate);
  const setLesson = useProjectStore((s) => s.setLesson);
  const addImported = useProjectStore((s) => s.addImported);
  const markProjectDirty = useProjectStore((s) => s.markDirty);

  const [lessonResult, setLessonResult] = useState<LessonResult | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  // Panellarni yig'ish — sxemaga ko'proq joy kerak bo'lganda.
  const [showLeft, setShowLeft] = useState(true);
  const [showRight, setShowRight] = useState(true);
  const [serialOpen, setSerialOpen] = useState(true);
  // Tor ekranda uch ustun sig'maydi: bir vaqtda bittasi ko'rsatiladi.
  const [mobileView, setMobileView] = useState<MobileView>("canvas");
  // Ish stolini butun ekranga ochish.
  const [isFullscreen, setIsFullscreen] = useState(false);

  const rootRef = useRef<HTMLDivElement>(null);
  const simRef = useRef<Simulator | null>(null);
  const rafRef = useRef<number | null>(null);
  const lastFrame = useRef(0);
  const lastSync = useRef(0);
  const sketchRef = useRef<ParsedSketch | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const dirtyWatchReady = useRef(false);
  const suppressNextDirty = useRef(false);
  const simulationDocumentRef = useRef<{ circuit: Circuit; code: string }>({ circuit, code });

  const lesson = lessonSlug ? getLesson(lessonSlug) : null;

  /* ── Boshlang'ich holat ── */
  useEffect(() => {
    hydrate();
    if (lesson) {
      suppressNextDirty.current = true;
      setLesson(lesson.slug);
      setProjectName(lesson.title, false);
      replaceCircuit(lesson.starterCircuit);
      setCode(lesson.starterCode);
      setSensors({});
    }
    // Faqat bir marta — dars almashsa sahifa ham qayta yuklanadi.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!dirtyWatchReady.current) {
      dirtyWatchReady.current = true;
      return;
    }
    if (suppressNextDirty.current) {
      suppressNextDirty.current = false;
      return;
    }
    markProjectDirty();
  }, [circuit, code, sensors, markProjectDirty]);

  /* ── Sxema tekshiruvi (har o'zgarishda) ── */
  const issues = useMemo(() => validateCircuit(circuit), [circuit]);

  const showToast = useCallback((message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(null), 2600);
  }, []);

  /* ── To'liq ekran ── */
  // Vendor prefikslari (Safari) uchun standart API'ni kengaytiramiz.
  const toggleFullscreen = useCallback(() => {
    const el = rootRef.current as
      (HTMLDivElement & { webkitRequestFullscreen?: () => Promise<void> | void }) | null;
    if (!el) return;
    const doc = document as Document & {
      webkitExitFullscreen?: () => Promise<void> | void;
      webkitFullscreenElement?: Element | null;
    };
    const active = document.fullscreenElement ?? doc.webkitFullscreenElement ?? null;
    const run = active
      ? (doc.exitFullscreen?.() ?? doc.webkitExitFullscreen?.())
      : (el.requestFullscreen?.() ?? el.webkitRequestFullscreen?.());
    if (run && typeof (run as Promise<void>).catch === "function") {
      (run as Promise<void>).catch(() => showToast("To'liq ekran rejimini ochib bo'lmadi"));
    }
  }, [showToast]);

  // Brauzer holatiga moslashamiz (Esc bilan chiqish yoki tashqi o'zgarish).
  useEffect(() => {
    const sync = () => {
      const doc = document as Document & { webkitFullscreenElement?: Element | null };
      setIsFullscreen((document.fullscreenElement ?? doc.webkitFullscreenElement ?? null) !== null);
    };
    document.addEventListener("fullscreenchange", sync);
    document.addEventListener("webkitfullscreenchange", sync);
    return () => {
      document.removeEventListener("fullscreenchange", sync);
      document.removeEventListener("webkitfullscreenchange", sync);
    };
  }, []);

  /* ── Simulyatsiya sikli ── */
  // Kadr callback'i o'zini qayta rejalashtiradi. To'g'ridan-to'g'ri `tick` ga
  // murojaat qilish o'zini-o'zi chaqirish bo'lardi, shuning uchun oxirgi
  // nusxasi ref'da saqlanadi.
  const tickRef = useRef<(now: number) => void>(() => {});

  const tick = useCallback(
    (now: number) => {
      const sim = simRef.current;
      if (!sim) return;

      const delta = Math.min(100, now - lastFrame.current);
      lastFrame.current = now;

      sim.updateSensors(useSimulationStore.getState().sensors);
      sim.advance(delta * useSimulationStore.getState().speed);

      if (sim.fatal) {
        setStatus("error");
        setSimErrors([sim.fatal]);
        publish({ time: sim.time, logs: [...sim.getLogs()], runtime: sim.getRuntimeState() });
        rafRef.current = null;
        return;
      }

      // UI ni har kadrda emas, ~10 Hz da yangilaymiz.
      if (now - lastSync.current >= UI_SYNC_MS) {
        lastSync.current = now;
        publish({ time: sim.time, logs: [...sim.getLogs()], runtime: sim.getRuntimeState() });
      }

      rafRef.current = requestAnimationFrame((t) => tickRef.current(t));
    },
    [publish, setStatus, setSimErrors],
  );

  // Har render'da eng yangi `tick` ref'ga yoziladi.
  useEffect(() => {
    tickRef.current = tick;
  }, [tick]);

  const stopLoop = useCallback(() => {
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
  }, []);

  const startSimulation = useCallback(() => {
    // Davom ettirish
    if (status === "paused" && simRef.current) {
      setStatus("running");
      lastFrame.current = performance.now();
      rafRef.current = requestAnimationFrame((t) => tickRef.current(t));
      return;
    }

    const parsed = parseSketch(code);
    if (!parsed.ok) {
      setCodeErrors(parsed.errors);
      setSimErrors(parsed.errors.map((e) => `${e.line}-qator: ${e.message}`));
      setStatus("error");
      showToast("Kodda xato bor — muharrirda qizil bilan belgilandi");
      return;
    }
    setCodeErrors([]);
    sketchRef.current = parsed.sketch;

    const circuitIssues = validateCircuit(circuit);
    if (hasBlockingErrors(circuitIssues)) {
      setSimErrors(circuitIssues.filter((i) => i.severity === "error").map((i) => i.message));
      setStatus("error");
      showToast("Simulyatsiyani boshlashdan oldin sxemani tekshiring");
      return;
    }

    setSimErrors([]);
    const sim = new Simulator({ circuit, sketch: parsed.sketch, sensors });
    sim.start();
    simRef.current = sim;
    setStatus("running");
    lastFrame.current = performance.now();
    lastSync.current = 0;
    rafRef.current = requestAnimationFrame(tick);
  }, [status, code, circuit, sensors, setCodeErrors, setSimErrors, setStatus, showToast, tick]);

  const pauseSimulation = useCallback(() => {
    stopLoop();
    setStatus("paused");
  }, [stopLoop, setStatus]);

  const stopSimulation = useCallback(() => {
    stopLoop();
    simRef.current = null;
    resetSim();
  }, [stopLoop, resetSim]);

  useEffect(() => {
    const previous = simulationDocumentRef.current;
    const next = { circuit, code };
    const changed = needsSimulationRestart(previous, next);
    simulationDocumentRef.current = next;

    if (!changed || (status !== "running" && status !== "paused")) return;
    stopSimulation();
    showToast("Sxema yoki kod o'zgardi — simulyatsiya qayta boshlanishi kerak");
  }, [circuit, code, status, stopSimulation, showToast]);

  // Sahifadan chiqilganda siklni to'xtatamiz — fon jarayoni qolib ketmasin.
  useEffect(() => stopLoop, [stopLoop]);

  /*
   * Plata ustidagi RESET tugmasi. Haqiqiy platadagidek: dastur boshidan
   * boshlanadi. Sikl shu komponent qo'lida bo'lgani uchun store faqat
   * "bosildi" degan hisoblagichni oshiradi, to'xtatib-boshlashni biz qilamiz.
   */
  // Store'ga obuna bo'lamiz, `resetToken` ni render'da kuzatmaymiz: aks holda
  // har bosishda effekt zanjiri hosil bo'lardi. Callback'lar ref orqali
  // yangilanadi, shuning uchun obuna bir marta o'rnatiladi.
  const resetHandlers = useRef({ stopSimulation, startSimulation, showToast });
  useEffect(() => {
    resetHandlers.current = { stopSimulation, startSimulation, showToast };
  });

  useEffect(
    () =>
      useSimulationStore.subscribe((state, previous) => {
        if (state.resetToken === previous.resetToken) return;
        const handlers = resetHandlers.current;
        const wasRunning = previous.status === "running";
        handlers.stopSimulation();
        if (wasRunning) handlers.startSimulation();
        handlers.showToast("Plata qayta ishga tushirildi");
      }),
    [],
  );

  /* ── Dars tekshiruvi ── */
  const runLessonCheck = useCallback(() => {
    if (!lesson) return;
    const parsed = parseSketch(code);
    const result = checkLesson(lesson, {
      circuit,
      code,
      sketch: parsed.ok ? parsed.sketch : null,
      observed: simRef.current?.observed ?? {
        pinsDrivenHigh: [],
        pinsDrivenLow: [],
        ledToggles: 0,
        usedDelay: false,
      },
    });
    setLessonResult(result);
  }, [lesson, code, circuit]);

  /* ── Saqlash / import / eksport ── */
  const handleSave = useCallback(() => {
    saveProject(circuit, code, sensors);
    const error = useProjectStore.getState().lastError;
    showToast(error ?? "Loyiha saqlandi");
  }, [saveProject, circuit, code, sensors, showToast]);

  const handleNewProject = useCallback(() => {
    suppressNextDirty.current = true;
    newProject();
    replaceCircuit({ nodes: [], wires: [] });
    resetCode();
    setSensors({});
    stopSimulation();
  }, [newProject, replaceCircuit, resetCode, setSensors, stopSimulation]);

  const handleOpenProject = useCallback(
    (id: string) => {
      if (!id) return;
      const project = openProject(id);
      if (!project) {
        showToast("Loyiha topilmadi");
        return;
      }
      suppressNextDirty.current = true;
      stopSimulation();
      replaceCircuit(project.circuit);
      setCode(project.code);
      setSensors(project.sensors);
      setLesson(project.lessonSlug);
      setLessonResult(null);
      showToast("Loyiha ochildi");
    },
    [openProject, replaceCircuit, setCode, setSensors, setLesson, showToast, stopSimulation],
  );

  const handleDuplicateProject = useCallback(() => {
    if (!currentId) {
      showToast("Avval saqlangan loyihani tanlang");
      return;
    }
    duplicateProject(currentId);
    showToast("Loyiha nusxalandi");
  }, [currentId, duplicateProject, showToast]);

  const handleRemoveProject = useCallback(() => {
    if (!currentId) {
      showToast("Avval saqlangan loyihani tanlang");
      return;
    }
    removeProject(currentId);
    showToast("Loyiha o'chirildi");
  }, [currentId, removeProject, showToast]);

  const handleExport = useCallback(() => {
    const json = exportProject({
      id: "export",
      name: projectName,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      circuit,
      code,
      lessonSlug: lesson?.slug ?? null,
      sensors,
    });
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${projectName.replace(/[^\p{L}\p{N}]+/gu, "-").toLowerCase()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [projectName, circuit, code, lesson, sensors]);

  const handleImportFile = useCallback(
    async (file: File) => {
      const text = await file.text();
      const result = importProject(text);
      if (!result.ok) {
        showToast(result.error);
        return;
      }
      const project = addImported(result.project);
      suppressNextDirty.current = true;
      replaceCircuit(project.circuit);
      setCode(project.code);
      setSensors(project.sensors);
      setLesson(project.lessonSlug);
      showToast("Loyiha yuklandi");
    },
    [addImported, replaceCircuit, setCode, setLesson, setSensors, showToast],
  );

  /* ── Klaviatura yorliqlari ── */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      // Matn kiritilayotgan bo'lsa aralashmaymiz.
      if (target && ["INPUT", "TEXTAREA"].includes(target.tagName)) return;
      if (target?.closest(".monaco-editor")) return;

      const mod = e.metaKey || e.ctrlKey;

      if (mod && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
        return;
      }
      if (mod && e.key.toLowerCase() === "s") {
        e.preventDefault();
        handleSave();
        return;
      }
      if (mod && e.key.toLowerCase() === "c") {
        copySelection();
        return;
      }
      if (mod && e.key.toLowerCase() === "v") {
        pasteClipboard();
        return;
      }
      if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        removeSelected();
        return;
      }
      if (e.key === " ") {
        e.preventDefault();
        if (status === "running") pauseSimulation();
        else startSimulation();
        return;
      }
      // `F` — to'liq ekranni ochish/yopish (Ctrl+F brauzer qidiruviga tegmaydi).
      if (!mod && e.key.toLowerCase() === "f") {
        e.preventDefault();
        toggleFullscreen();
        return;
      }
      if (e.key === "Escape") setSelection([]);
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [
    undo,
    redo,
    handleSave,
    copySelection,
    pasteClipboard,
    removeSelected,
    setSelection,
    status,
    startSimulation,
    pauseSimulation,
    toggleFullscreen,
  ]);

  const errorCount = issues.filter((i) => i.severity === "error").length;
  const warnCount = issues.filter((i) => i.severity === "warning").length;

  return (
    <div className="vlab-root" ref={rootRef}>
      {/* ───────── Yuqori panel ───────── */}
      <header className="vlab-toolbar">
        <div className="vlab-brand">
          <span className="vlab-brand-icon">
            <CircuitBoard size={17} />
          </span>
          <input
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            aria-label="Loyiha nomi"
            maxLength={80}
            className="vlab-name"
          />
        </div>

        <div className="vlab-tool-group">
          <ToolButton
            icon={<FilePlus2 size={16} />}
            label="Yangi loyiha"
            onClick={handleNewProject}
          />
          <ToolButton
            icon={<Save size={16} />}
            label={dirty ? "Saqlash *" : "Saqlash"}
            shortcut="⌘S"
            onClick={handleSave}
          />
        </div>

        <div className="vlab-tool-group">
          <select
            className="vlab-project-select"
            value={currentId ?? ""}
            onChange={(e) => handleOpenProject(e.target.value)}
            aria-label="Saqlangan loyihani ochish"
          >
            <option value="">Saqlangan loyihalar</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
          <ToolButton
            icon={<CopyPlus size={16} />}
            label="Loyihani nusxalash"
            onClick={handleDuplicateProject}
          />
          <ToolButton
            icon={<Trash size={16} />}
            label="Loyihani o'chirish"
            onClick={handleRemoveProject}
          />
        </div>

        <div className="vlab-tool-group">
          <ToolButton icon={<Undo2 size={16} />} label="Ortga" shortcut="⌘Z" onClick={undo} />
          <ToolButton icon={<Redo2 size={16} />} label="Oldinga" shortcut="⇧⌘Z" onClick={redo} />
          <ToolButton icon={<Trash2 size={16} />} label="Hammasini tozalash" onClick={clear} />
        </div>

        <div className="vlab-tool-group">
          <ToolButton
            icon={<Upload size={16} />}
            label="Fayldan yuklash"
            onClick={() => fileInput.current?.click()}
          />
          <ToolButton icon={<Download size={16} />} label="Faylga saqlash" onClick={handleExport} />
        </div>

        <div className="vlab-tool-group">
          <ToolButton
            icon={isFullscreen ? <Minimize size={16} /> : <Maximize size={16} />}
            label={isFullscreen ? "To'liq ekrandan chiqish" : "To'liq ekranni ochish"}
            pressed={isFullscreen}
            onClick={toggleFullscreen}
          />
        </div>

        <div className="vlab-sep" />

        {/* Panellarni yig'ish — tor ekranda o'rniga bo'lim tanlagich ishlaydi. */}
        <div className="vlab-tool-group vlab-collapse-group">
          <ToolButton
            icon={showLeft ? <PanelLeftClose size={16} /> : <PanelLeftOpen size={16} />}
            label={showLeft ? "Kutubxonani yig'ish" : "Kutubxonani ochish"}
            pressed={!showLeft}
            onClick={() => setShowLeft((v) => !v)}
          />
          <ToolButton
            icon={showRight ? <PanelRightClose size={16} /> : <PanelRightOpen size={16} />}
            label={showRight ? "Kod panelini yig'ish" : "Kod panelini ochish"}
            pressed={!showRight}
            onClick={() => setShowRight((v) => !v)}
          />
        </div>

        <input
          ref={fileInput}
          type="file"
          accept="application/json,.json"
          hidden
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void handleImportFile(file);
            e.target.value = "";
          }}
        />

        <div className="vlab-spacer" />

        {/* Sxema holati */}
        <div className="vlab-status">
          {status === "running" && (
            <span className="vlab-badge vlab-badge-ok vlab-badge-live">Ishlayapti</span>
          )}
          {status === "paused" && <span className="vlab-badge vlab-badge-warn">Pauza</span>}
          {errorCount > 0 && <span className="vlab-badge vlab-badge-error">{errorCount} xato</span>}
          {warnCount > 0 && errorCount === 0 && (
            <span className="vlab-badge vlab-badge-warn">{warnCount} ogohlantirish</span>
          )}
          {errorCount === 0 && warnCount === 0 && status === "stopped" && (
            <span className="vlab-badge vlab-badge-ok">Sxema toza</span>
          )}
          {lastProjectError && <span className="vlab-badge vlab-badge-error">Saqlanmadi</span>}
        </div>

        <span className="vlab-clock">{formatTime(simTime)}</span>

        {/* Tezlik */}
        <div className="vlab-speed" role="group" aria-label="Simulyatsiya tezligi">
          {SPEEDS.map((s) => (
            <button key={s} type="button" aria-pressed={speed === s} onClick={() => setSpeed(s)}>
              {s}x
            </button>
          ))}
        </div>

        {status === "running" ? (
          <button type="button" onClick={pauseSimulation} className="vlab-run vlab-run-pause">
            <Pause size={17} />
            Pauza
          </button>
        ) : (
          <button type="button" onClick={startSimulation} className="vlab-run vlab-run-start">
            <Play size={17} />
            {status === "paused" ? "Davom" : "Boshlash"}
          </button>
        )}
        <button
          type="button"
          onClick={stopSimulation}
          className="vlab-run vlab-run-stop"
          aria-label="To'xtatish"
        >
          <Square size={15} />
        </button>
      </header>

      {/* ───────── Tor ekran uchun bo'lim tanlagich ───────── */}
      <div className="vlab-tabs" role="group" aria-label="Bo'limlar">
        <button
          type="button"
          aria-pressed={mobileView === "palette"}
          onClick={() => setMobileView("palette")}
        >
          <FilePlus2 size={15} />
          Komponent
        </button>
        <button
          type="button"
          aria-pressed={mobileView === "canvas"}
          onClick={() => setMobileView("canvas")}
        >
          <CircuitBoard size={15} />
          Sxema
        </button>
        <button
          type="button"
          aria-pressed={mobileView === "panel"}
          onClick={() => setMobileView("panel")}
        >
          <FileCode2 size={15} />
          Kod
        </button>
      </div>

      {/* ───────── Asosiy uch qism ───────── */}
      <div
        className="vlab-body"
        data-left={showLeft ? "on" : "off"}
        data-right={showRight ? "on" : "off"}
      >
        {/* Yig'ilgan panel `inert` bo'ladi — ko'rinmasa Tab bilan ham tushmaydi. */}
        <aside
          className="vlab-col"
          data-mobile={mobileView === "palette" ? "shown" : "hidden"}
          inert={!showLeft}
        >
          <ComponentPalette />
        </aside>

        <main
          className="vlab-col vlab-center"
          data-serial={serialOpen ? "on" : "off"}
          data-mobile={mobileView === "canvas" ? "shown" : "hidden"}
        >
          <div className="vlab-canvas">
            <CircuitCanvas issues={issues} onConnectionRejected={showToast} />
          </div>
          <SerialMonitor
            logs={logs}
            collapsed={!serialOpen}
            onToggle={() => setSerialOpen((v) => !v)}
            onClear={clearLogs}
            onSend={(text) => simRef.current?.pushSerialInput(text)}
          />
        </main>

        <aside
          className="vlab-col vlab-right"
          data-mobile={mobileView === "panel" ? "shown" : "hidden"}
          inert={!showRight}
        >
          <Inspector issues={issues} />
          <CodeEditor
            code={code}
            fontSize={fontSize}
            errors={codeErrors}
            onChange={setCode}
            onFontSize={setFontSize}
            onReset={resetCode}
          />
        </aside>
      </div>

      {/* ───────── Dars paneli ───────── */}
      {lesson && (
        <div className="vlab-lesson">
          <SlidersHorizontal size={16} style={{ color: "var(--text-3)" }} />
          <span className="vlab-lesson-title">{lesson.title}</span>

          <button type="button" onClick={runLessonCheck} className="vlab-lesson-check">
            Topshiriqni tekshirish
          </button>

          {lessonResult && (
            <>
              <span className="vlab-progress">
                <i style={{ width: `${lessonResult.percent}%` }} />
              </span>
              <span className="vlab-result">
                <strong>{lessonResult.percent}%</strong> — {lessonResult.passed.length}/
                {lesson.rules.length} qadam
                {lessonResult.failed.length > 0 && (
                  <span className="vlab-result-hint"> · {lessonResult.failed[0]!.hint}</span>
                )}
              </span>
            </>
          )}
        </div>
      )}

      {toast && (
        <div className="vlab-toast" role="status">
          {toast}
        </div>
      )}
    </div>
  );
}

function ToolButton({
  icon,
  label,
  shortcut,
  pressed,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  shortcut?: string;
  pressed?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-pressed={pressed}
      className="vlab-tool"
    >
      {icon}
      <span className="vlab-tip">
        {label}
        {shortcut && <kbd>{shortcut}</kbd>}
      </span>
    </button>
  );
}
