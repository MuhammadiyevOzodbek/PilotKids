"use client";

import {
  Component,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { Icon } from "@/components/icon";
import { getDefinition } from "@/lib/virtual-lab/catalog";
import { emptyWorkspace, isEmptyWorkspace } from "@/lib/virtual-lab/blocks";
import { getLesson } from "@/lib/virtual-lab/lessons";
import { parseSketch } from "@/lib/virtual-lab/parser";
import { validateCircuit } from "@/lib/virtual-lab/validator";
import { useBlocksStore } from "@/stores/blocks";
import {
  useCircuitStore,
  useEditorStore,
  useProjectStore,
  useSimulationStore,
} from "@/stores/virtual-lab";
import { useLab3DStore } from "@/stores/lab3d";
import { CodeEditor } from "../code-editor";
import { SerialMonitor } from "../serial-monitor";
import { useFullscreen } from "../use-fullscreen";
import { ComponentPalette3D, Inspector3D, StatusBar, Toolbar } from "./panels";
import { useLab3DSimulation } from "./use-lab3d-simulation";
import "./lab-3d.css";

/**
 * 3D Arduino laboratoriyasi.
 *
 * Uch qism: chapda komponentlar, o'rtada 3D stol, o'ngda kod va inspektor.
 * Sxema `useCircuitStore` da — 2D laboratoriya bilan bitta joyda, ya'ni
 * bir loyihani ikkalasida ochish mumkin (§42).
 */

/*
 * Sahna faqat brauzerda yuklanadi.
 *
 * three.js ~600 KB va WebGL kontekst talab qiladi — serverda uni chizib
 * bo'lmaydi. `ssr: false` bilan u alohida bo'lakka chiqadi va FAQAT shu
 * sahifa ochilganda yuklanadi; laboratoriyaning qolgan qismi esa darhol
 * ko'rinadi (§33).
 */
const LabScene = dynamic(() => import("./scene").then((m) => m.LabScene), {
  ssr: false,
  loading: () => (
    <div className="lab3d-loading">
      <Icon name="deployed_code" size={34} />
      <p>3D laboratoriya yuklanmoqda…</p>
    </div>
  ),
});

export function Lab3D() {
  const [toast, setToast] = useState<string | null>(null);
  const [paletteOpen, setPaletteOpen] = useState(true);
  /*
   * Serial Monitorning ikki bosqichi.
   *
   * `serialVisible` — panel umuman bormi (yuqoridagi tugma).
   * `serialOpen`    — ochiqmi yoki chiziq bo'lib yig'ilganmi (sarlavhani bosish).
   *
   * Ikki bosqich ataylab: log kelayotganini bilish uchun yig'ilgan chiziq
   * yetarli (unda loglar soni ko'rinadi), sxema yig'ayotganda esa uni
   * butunlay olib tashlash kerak bo'ladi.
   */
  const [serialVisible, setSerialVisible] = useState(true);
  const [serialOpen, setSerialOpen] = useState(false);

  const showToast = useCallback((message: string) => {
    setToast(message);
    window.setTimeout(() => setToast((current) => (current === message ? null : current)), 3200);
  }, []);

  const simulation = useLab3DSimulation(showToast);

  /*
   * To'liq ekran butun `.lab3d` qutisiga beriladi, faqat sahnaga emas:
   * aks holda asboblar paneli, palitra va kod muharriri ekran ortida
   * qolib, laboratoriya boshqarib bo'lmaydigan holga kelardi.
   */
  const rootRef = useRef<HTMLDivElement>(null);
  const { isFullscreen, toggle: toggleFullscreen } = useFullscreen(rootRef, showToast);

  const circuit = useCircuitStore((s) => s.circuit);
  const addNode = useCircuitStore((s) => s.addNode);
  const removeSelected = useCircuitStore((s) => s.removeSelected);
  const copySelection = useCircuitStore((s) => s.copySelection);
  const pasteClipboard = useCircuitStore((s) => s.pasteClipboard);
  const setSelection = useCircuitStore((s) => s.setSelection);
  const undo = useCircuitStore((s) => s.undo);
  const redo = useCircuitStore((s) => s.redo);

  const cancelWire = useLab3DStore((s) => s.cancelWire);
  const selectWire = useLab3DStore((s) => s.selectWire);
  const onboardingSeen = useLab3DStore((s) => s.onboardingSeen);
  const dismissOnboarding = useLab3DStore((s) => s.dismissOnboarding);
  const requestCamera = useLab3DStore((s) => s.requestCamera);

  const code = useEditorStore((s) => s.code);
  const setCode = useEditorStore((s) => s.setCode);
  const fontSize = useEditorStore((s) => s.fontSize);
  const setFontSize = useEditorStore((s) => s.setFontSize);
  const resetCode = useEditorStore((s) => s.resetCode);
  const setCodeErrors = useEditorStore((s) => s.setErrors);
  const codeErrors = useEditorStore((s) => s.errors);
  const simErrors = useSimulationStore((s) => s.errors);
  const logs = useSimulationStore((s) => s.logs);
  const clearLogs = useSimulationStore((s) => s.clearLogs);

  /**
   * Sahnada ko'rsatiladigan muammolar ro'yxati.
   *
   * UCHALA manba birlashtiriladi: sxema tekshiruvi, kod tahlili va
   * simulyator xatolari. Ilgari faqat oxirgisi ko'rinardi — ya'ni
   * noto'g'ri ulangan LED yoki yopilmagan qavs haqida «Ishga tushirish»
   * bosilmaguncha hech narsa aytilmasdi.
   */
  const problems = useMemo(() => {
    /*
     * Har bir yozuvda NOYOB `id` bor: xabarning o'zi kalit bo'la olmaydi,
     * chunki ikkita bir xil komponent («LED hech narsaga ulanmagan»)
     * so'zma-so'z bir xil matn beradi.
     */
    const list: { id: string; severity: "error" | "warning"; message: string }[] = [];
    for (const issue of validateCircuit(circuit)) {
      if (issue.severity === "error" || issue.severity === "warning") {
        list.push({ id: issue.id, severity: issue.severity, message: issue.message });
      }
    }
    codeErrors.forEach((error, i) => {
      list.push({
        id: `code-${i}`,
        severity: "error",
        message: `${error.line}-qator: ${error.message}`,
      });
    });
    simErrors.forEach((message, i) => list.push({ id: `sim-${i}`, severity: "error", message }));

    // Xatolar oldinda — ular ishga tushirishga to'sqinlik qiladi.
    return list.sort((a, b) => (a.severity === b.severity ? 0 : a.severity === "error" ? -1 : 1));
  }, [circuit, codeErrors, simErrors]);

  /**
   * Yangi komponent stolning bo'sh joyiga tushadi.
   *
   * O'rin `addNode` ning o'zida tanlanadi (2D dagi bilan bir xil mantiq),
   * shuning uchun bu yerda faqat taxminiy markaz beriladi.
   */
  const handleAdd = useCallback(
    (type: string) => {
      addNode(type, 420, 300);
      showToast(`${getDefinition(type)?.name ?? type} qo'shildi`);
    },
    [addNode, showToast],
  );

  /**
   * Loyihani saqlash (§31).
   *
   * 2D laboratoriya bilan BITTA tizim: o'sha `useProjectStore.save`,
   * o'sha `localStorage` kaliti, o'sha format. Shu sababli 3D da
   * saqlangan sxema `/lab/onlayn` da ham ochiladi.
   */
  const handleSave = useCallback(() => {
    const project = useProjectStore.getState();
    project.save(
      useCircuitStore.getState().circuit,
      useEditorStore.getState().code,
      useSimulationStore.getState().sensors,
      // Blok ish maydoni 3D da tahrirlanmaydi, lekin loyihada bo'lsa
      // saqlanib qolsin — aks holda 3D da saqlash uni o'chirib yuborardi.
      isEmptyWorkspace(useBlocksStore.getState().workspace)
        ? undefined
        : useBlocksStore.getState().workspace,
    );
    const error = useProjectStore.getState().lastError;
    showToast(error ?? "Loyiha saqlandi");
  }, [showToast]);

  /*
   * Kod tekshiruvi — yozish davomida.
   *
   * Ilgari sintaksis xatolari FAQAT «Ishga tushirish» bosilganda
   * hisoblanardi: bola qavsni yopmasa ham muharrirda hech narsa
   * ko'rinmasdi. Endi tahlil yozib bo'lgach ishlaydi va xato darhol
   * belgilanadi — 2D laboratoriyadagi bilan bir xil.
   */
  useEffect(() => {
    const timer = window.setTimeout(() => {
      const parsed = parseSketch(code);
      setCodeErrors(parsed.ok ? [] : parsed.errors);
    }, 450);
    return () => window.clearTimeout(timer);
  }, [code, setCodeErrors]);

  /*
   * «Saqlanmagan o'zgarish» belgisi.
   *
   * Birinchi render hisoblanmaydi (hali hech narsa o'zgarmagan), loyihani
   * ochish/yangilash ham hisoblanmaydi — ular foydalanuvchining tahriri
   * emas. Aks holda loyiha ochilishi bilanoq «saqlanmagan» bo'lib
   * turardi.
   */
  const dirtyReady = useRef(false);
  const suppressDirty = useRef(false);

  useEffect(() => {
    if (!dirtyReady.current) {
      dirtyReady.current = true;
      return;
    }
    if (suppressDirty.current) {
      suppressDirty.current = false;
      return;
    }
    useProjectStore.getState().markDirty();
  }, [circuit, code]);

  /**
   * Yangi loyiha — stol tozalanadi.
   *
   * Simulyatsiya ham to'xtatiladi: aks holda eski sxema bilan qurilgan
   * simulyator bo'sh stol ustida ishlashda davom etardi.
   */
  const handleNew = useCallback(() => {
    suppressDirty.current = true;
    simulation.stop();
    useProjectStore.getState().newProject();
    useCircuitStore.getState().replaceCircuit({ nodes: [], wires: [] });
    useEditorStore.getState().resetCode();
    useSimulationStore.getState().setSensors({});
    useBlocksStore.getState().replaceWorkspace(emptyWorkspace());
    showToast("Yangi loyiha");
  }, [showToast, simulation]);

  /**
   * Saqlangan loyihani ochish.
   *
   * Loyihalar ro'yxati 2D laboratoriya bilan BITTA, shuning uchun u
   * yerda yig'ilgan sxema shu yerda ham ochiladi (§42).
   */
  const handleOpen = useCallback(
    (id: string) => {
      if (!id) return;
      const project = useProjectStore.getState().open(id);
      if (!project) {
        showToast("Loyiha topilmadi");
        return;
      }
      suppressDirty.current = true;
      simulation.stop();
      useCircuitStore.getState().replaceCircuit(project.circuit);
      useEditorStore.getState().setCode(project.code);
      useSimulationStore.getState().setSensors(project.sensors);
      // Eski loyihada blok maydoni bo'lmasligi mumkin.
      useBlocksStore.getState().replaceWorkspace(project.blocks ?? emptyWorkspace());
      useCircuitStore.getState().setSelection([]);
      selectWire(null);
      showToast(`«${project.name}» ochildi`);
    },
    [selectWire, showToast, simulation],
  );

  /**
   * Tayyor sxemani ochish (§41).
   *
   * Sxema ham, kod ham darsdan olinadi — ya'ni bu «namuna uchun yozilgan»
   * emas, 2D laboratoriyada ishlaydigan haqiqiy dars. Ochilgandan keyin
   * «Ishga tushirish» bosilsa hamma narsa ishlashi kerak.
   */
  const handleTemplate = useCallback(
    (slug: string) => {
      const lesson = getLesson(slug);
      if (!lesson) return;
      suppressDirty.current = true;
      simulation.stop();
      useCircuitStore.getState().replaceCircuit(lesson.starterCircuit);
      useEditorStore.getState().setCode(lesson.starterCode);
      useSimulationStore.getState().setSensors({});
      useCircuitStore.getState().setSelection([]);
      selectWire(null);
      useProjectStore.getState().setName(lesson.title, false);
      // Namuna ochilgach kamera hamma narsani qamrab olsin.
      requestCamera("fit");
      dismissOnboarding();
      showToast(`«${lesson.title}» ochildi — «Ishga tushirish» ni bosing`);
    },
    [dismissOnboarding, requestCamera, selectWire, showToast, simulation],
  );

  /* ── Klaviatura (§18) ── */
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target && ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)) return;
      if (target?.closest(".monaco-editor")) return;

      const mod = event.metaKey || event.ctrlKey;
      const key = event.key.toLowerCase();

      // Saqlash — tugma yozuvida va'da qilingan, endi haqiqatan ishlaydi.
      if (mod && key === "s") {
        event.preventDefault();
        handleSave();
        return;
      }
      /*
       * Bo'shliq bu yerda YO'Q.
       *
       * 3D da u kamerani ko'taradi (`MOVE_KEYS`), shuning uchun bir vaqtda
       * simulyatsiyani ham boshlab yuborishi mumkin emas edi: stol bo'ylab
       * uchayotgan bola har safar kodni qayta ishga tushirardi. 2D
       * laboratoriyada bo'shliq o'z vazifasida qoladi.
       */
      if (mod && key === "z") {
        event.preventDefault();
        if (event.shiftKey) redo();
        else undo();
        return;
      }
      if (mod && key === "d") {
        event.preventDefault();
        copySelection();
        pasteClipboard();
        return;
      }
      if (mod && key === "c") return void copySelection();
      if (mod && key === "v") return void pasteClipboard();
      if (event.key === "Delete" || event.key === "Backspace") {
        event.preventDefault();
        /*
         * Tanlangan SIM ham o'chadi.
         *
         * Ilgari faqat komponentlar o'chardi: simni bosgan bola Delete
         * bosardi, hech nima bo'lmasdi va uni olib tashlash uchun
         * inspektordagi tugmani izlashga to'g'ri kelardi. Sim va
         * komponent bir vaqtda tanlangan bo'lmaydi (ikkalasi
         * bir-birining tanlovini bo'shatadi), shuning uchun tartib
         * muhim emas.
         */
        const wireId = useLab3DStore.getState().selectedWireId;
        if (wireId) {
          useCircuitStore.getState().removeWire(wireId);
          selectWire(null);
          return;
        }
        removeSelected();
        return;
      }
      /*
       * `F` — to'liq ekran (2D laboratoriyadagi bilan bir xil).
       *
       * Ataylab modifikatorsiz: `Ctrl+F` brauzerning o'z qidiruvi va uni
       * tortib olish noto'g'ri bo'lardi. `F` yurish tugmalari orasida
       * emas, shuning uchun kamera bilan to'qnashmaydi.
       */
      if (!mod && key === "f") {
        event.preventDefault();
        toggleFullscreen();
        return;
      }
      if (event.key === "Escape") {
        setSelection([]);
        selectWire(null);
        cancelWire();
      }
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [
    cancelWire,
    copySelection,
    handleSave,
    pasteClipboard,
    redo,
    removeSelected,
    selectWire,
    setSelection,
    toggleFullscreen,
    undo,
  ]);

  return (
    <div className="lab3d" ref={rootRef}>
      <Toolbar
        onStart={simulation.start}
        onPause={simulation.pause}
        onStop={simulation.stop}
        onSave={handleSave}
        onNew={handleNew}
        onOpen={handleOpen}
        paletteOpen={paletteOpen}
        onTogglePalette={() => setPaletteOpen((open) => !open)}
        serialVisible={serialVisible}
        onToggleSerial={() => setSerialVisible((visible) => !visible)}
        isFullscreen={isFullscreen}
        onToggleFullscreen={toggleFullscreen}
      />

      <div className="lab3d-body">
        {paletteOpen && <ComponentPalette3D onAdd={handleAdd} onTemplate={handleTemplate} />}

        {/*
          `data-serial` panelning balandligini boshqaradi (uslub faylida).
          Komponentning o'zi mazmunini yashiradi, lekin qutisi emas.
        */}
        <main className="lab3d-stage" data-serial={serialVisible && serialOpen ? "on" : "off"}>
          <div className="lab3d-viewport">
            <SceneBoundary>
              <LabScene onToast={showToast} />
            </SceneBoundary>

            {/* Bo'sh stol — nima qilish kerakligini aytadi (§38, §47) */}
            {circuit.nodes.length === 0 && !onboardingSeen && (
              <div className="lab3d-onboarding">
                <h2>3D laboratoriyaga xush kelibsiz</h2>
                <ol>
                  <li>Chapdagi ro&apos;yxatdan Arduino Uno&apos;ni qo&apos;shing.</li>
                  <li>LED va rezistor qo&apos;shing.</li>
                  <li>
                    Stol bo&apos;ylab yuring: <kbd>W</kbd> <kbd>A</kbd> <kbd>S</kbd> <kbd>D</kbd>,
                    aylantirish uchun o&apos;ng tugmani bosib torting.
                  </li>
                  <li>Yuqoridagi «sim» asbobini tanlab, pinlarni ulang.</li>
                  <li>O&apos;ngdagi muharrirda kod yozing.</li>
                  <li>«Ishga tushirish» tugmasini bosing.</li>
                </ol>
                <button type="button" className="lab3d-btn" onClick={dismissOnboarding}>
                  Tushunarli
                </button>
              </div>
            )}

            {problems.length > 0 && (
              <ul className="lab3d-errors" role="alert">
                {/*
                  Kalit — muammoning ID'si, MATNI emas: bir xil xabar bir
                  necha komponentga tegishli bo'lishi mumkin («LED hech
                  narsaga ulanmagan» ikkita LED uchun) va React takroriy
                  kalitdan shikoyat qilardi.
                */}
                {problems.slice(0, 4).map((problem) => (
                  <li key={problem.id} data-kind={problem.severity}>
                    <Icon name={problem.severity === "error" ? "error" : "warning"} size={15} />
                    {problem.message}
                  </li>
                ))}
                {problems.length > 4 && <li data-kind="more">…va yana {problems.length - 4} ta</li>}
              </ul>
            )}
          </div>

          {/*
            Serial Monitor — 2D laboratoriya bilan BITTA komponent.

            Usiz `Serial.println()` chiqishi hech qayerda ko'rinmasdi:
            simulyator loglarni yozar, lekin 3D da ularni o'qish imkoni
            yo'q edi. Arduino darslarining yarmi Serial bilan ishlaydi.
          */}
          {serialVisible && (
            <SerialMonitor
              logs={logs}
              collapsed={!serialOpen}
              onToggle={() => setSerialOpen((open) => !open)}
              onClear={clearLogs}
              onSend={simulation.send}
            />
          )}
        </main>

        <div className="lab3d-side">
          <Inspector3D />
          <div className="lab3d-code">
            <CodeEditor
              code={code}
              fontSize={fontSize}
              errors={codeErrors}
              onChange={setCode}
              onFontSize={setFontSize}
              onReset={resetCode}
            />
          </div>
        </div>
      </div>

      <StatusBar problems={problems.length} />

      {toast && <div className="lab3d-toast">{toast}</div>}
    </div>
  );
}

/* ═══════════════════════ Xatolarni ushlash (§48) ═══════════════════════ */

/**
 * WebGL yoki model yuklanmasa butun sahifa yiqilmasin.
 *
 * React'da xato chegarasi faqat sinf komponent bo'la oladi — bu yagona
 * joy shuning uchun sinf sifatida yozilgan.
 */
class SceneBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div className="lab3d-loading">
        <Icon name="error" size={34} />
        <p>3D laboratoriyani yuklab bo&apos;lmadi. Brauzeringizda WebGL yoqilganini tekshiring.</p>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            type="button"
            className="lab3d-btn"
            onClick={() => this.setState({ failed: false })}
          >
            Qayta urinish
          </button>
          <Link href="/lab/onlayn" className="lab3d-btn">
            2D laboratoriyaga o&apos;tish
          </Link>
        </div>
      </div>
    );
  }
}
