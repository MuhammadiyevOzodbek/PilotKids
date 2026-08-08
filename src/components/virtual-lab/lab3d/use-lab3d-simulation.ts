"use client";

import { useCallback, useEffect, useRef } from "react";
import { parseSketch } from "@/lib/virtual-lab/parser";
import { Simulator } from "@/lib/virtual-lab/simulator";
import { hasBlockingErrors, validateCircuit } from "@/lib/virtual-lab/validator";
import { needsSimulationRestart } from "@/lib/virtual-lab/restart";
import { useCircuitStore, useEditorStore, useSimulationStore } from "@/stores/virtual-lab";

/**
 * 3D laboratoriyaning simulyatsiya haydovchisi (§21, §22, §46).
 *
 * MUHIM: bu yerda simulyatsiya MANTIG'I yo'q. Butun mantiq — Arduino
 * kodini bajarish, zanjirni yechish, LED yorqinligini hisoblash —
 * `Simulator` sinfida, ya'ni 2D laboratoriya bilan AYNAN bir joyda.
 * Bu modul faqat uni kadr-kadr oldinga suradi va natijani do'konga
 * yozadi:
 *
 *     kod → parseSketch → Simulator → useSimulationStore → 3D sahna
 *
 * Shu sababli `servo.write(120)` yozilsa, 3D dagi qanot aynan 120° ga
 * buriladi — bu animatsiya emas, simulyator hisoblagan holat.
 */

/**
 * Interfeysni yangilash oralig'i (ms).
 *
 * Simulyator har kadrda oldinga suriladi, lekin React holati sekundiga
 * ~12 marta yangilanadi. Har kadrda yangilash 3D sahnani ham qayta
 * chizishga majbur qilardi va foyda bermasdi — LED miltillashini ko'z
 * baribir shu tezlikda ko'radi (§22, §33).
 */
const UI_SYNC_MS = 80;

/** Bitta kadrda oldinga suriladigan eng katta vaqt — tab orqada qolsa sakramasin. */
const MAX_STEP_MS = 100;

export interface Lab3DSimulation {
  start: () => void;
  pause: () => void;
  stop: () => void;
  /** Serial monitorga foydalanuvchi kiritgan matn. */
  send: (text: string) => void;
}

export function useLab3DSimulation(onToast: (message: string) => void): Lab3DSimulation {
  const setStatus = useSimulationStore((s) => s.setStatus);
  const publish = useSimulationStore((s) => s.publish);
  const setErrors = useSimulationStore((s) => s.setErrors);
  const resetSim = useSimulationStore((s) => s.reset);
  const setCodeErrors = useEditorStore((s) => s.setErrors);

  const simRef = useRef<Simulator | null>(null);
  const rafRef = useRef<number | null>(null);
  const lastFrame = useRef(0);
  const lastSync = useRef(0);

  /*
   * Kadr callback'i o'zini qayta rejalashtiradi. To'g'ridan-to'g'ri
   * o'ziga murojaat qilish yopilma ichida eskirgan nusxani ushlab
   * qolardi, shuning uchun oxirgi nusxa ref'da turadi.
   */
  const tickRef = useRef<(now: number) => void>(() => {});

  const sync = useCallback(
    (sim: Simulator) => {
      publish({
        time: sim.time,
        logs: [...sim.getLogs()],
        runtime: sim.getRuntimeState(),
        wireFlow: sim.getWireFlow(),
      });
    },
    [publish],
  );

  const tick = useCallback(
    (now: number) => {
      const sim = simRef.current;
      if (!sim) return;

      const delta = Math.min(MAX_STEP_MS, now - lastFrame.current);
      lastFrame.current = now;

      sim.updateSensors(useSimulationStore.getState().sensors);
      sim.advance(delta * useSimulationStore.getState().speed);

      // Runtime xatosi — siklni to'xtatamiz, lekin oxirgi holatni ko'rsatamiz.
      if (sim.fatal) {
        setStatus("error");
        setErrors([sim.fatal]);
        sync(sim);
        rafRef.current = null;
        return;
      }

      if (now - lastSync.current >= UI_SYNC_MS) {
        lastSync.current = now;
        sync(sim);
      }

      rafRef.current = requestAnimationFrame((t) => tickRef.current(t));
    },
    [setErrors, setStatus, sync],
  );

  useEffect(() => {
    tickRef.current = tick;
  }, [tick]);

  const stopLoop = useCallback(() => {
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
  }, []);

  // Sahifadan chiqilganda sikl osilib qolmasin.
  useEffect(() => stopLoop, [stopLoop]);

  const start = useCallback(() => {
    const status = useSimulationStore.getState().status;

    // Pauzadan davom ettirish — simulyator qayta qurilmaydi.
    if (status === "paused" && simRef.current) {
      setStatus("running");
      lastFrame.current = performance.now();
      rafRef.current = requestAnimationFrame((t) => tickRef.current(t));
      return;
    }

    // 1-qadam: kodni tekshirish (§21).
    const code = useEditorStore.getState().code;
    const parsed = parseSketch(code);
    if (!parsed.ok) {
      setCodeErrors(parsed.errors);
      setErrors(parsed.errors.map((e) => `${e.line}-qator: ${e.message}`));
      setStatus("error");
      onToast("Kodda xato bor — muharrirda belgilandi");
      return;
    }
    setCodeErrors([]);

    // 2-qadam: sxemani tekshirish. Qoidalar 2D dagi validatordan (§23).
    const circuit = useCircuitStore.getState().circuit;
    const issues = validateCircuit(circuit);
    if (hasBlockingErrors(issues)) {
      setErrors(issues.filter((i) => i.severity === "error").map((i) => i.message));
      setStatus("error");
      onToast("Sxemada xato bor — pastdagi ro'yxatni ko'ring");
      return;
    }

    // 3-qadam: simulyatorni ishga tushirish.
    setErrors([]);
    const sim = new Simulator({
      circuit,
      sketch: parsed.sketch,
      sensors: useSimulationStore.getState().sensors,
    });
    sim.start();
    simRef.current = sim;

    setStatus("running");
    lastFrame.current = performance.now();
    lastSync.current = 0;
    rafRef.current = requestAnimationFrame((t) => tickRef.current(t));
  }, [onToast, setCodeErrors, setErrors, setStatus]);

  const pause = useCallback(() => {
    stopLoop();
    setStatus("paused");
  }, [setStatus, stopLoop]);

  const stop = useCallback(() => {
    stopLoop();
    simRef.current = null;
    resetSim();
  }, [resetSim, stopLoop]);

  const send = useCallback((text: string) => {
    simRef.current?.pushSerialInput(text);
  }, []);

  /*
   * Callback'lar ref orqali beriladi.
   *
   * Quyidagi ikki effekt do'konga OBUNA bo'ladi va sxemani kuzatadi.
   * Ular `start`/`stop` ni bevosita ro'yxatga olsa, har bir yangi
   * callback nusxasida obuna uzilib-ulanardi.
   */
  const handlers = useRef({ start, stop, onToast });
  useEffect(() => {
    handlers.current = { start, stop, onToast };
  });

  /*
   * Plata ustidagi RESET tugmasi (§9).
   *
   * Haqiqiy Arduino'da bu tugma mikrokontrollerni noldan ishga tushiradi:
   * `setup()` qayta bajariladi, o'zgaruvchilar boshlang'ich qiymatiga
   * qaytadi. Shu sababli simulyator TASHLAB YUBORILADI va qayta quriladi —
   * pauza yoki `time = 0` bilan cheklanmaydi.
   *
   * Buyruq UMUMIY do'konda: 3D dagi plata tugmasi ham, 2D dagi ham
   * `requestReset()` chaqiradi.
   */
  useEffect(
    () =>
      useSimulationStore.subscribe((state, previous) => {
        if (state.resetToken === previous.resetToken) return;
        const wasRunning = previous.status === "running";
        handlers.current.stop();
        if (wasRunning) handlers.current.start();
        handlers.current.onToast("Plata qayta ishga tushirildi");
      }),
    [],
  );

  /*
   * Sxema yoki kod o'zgarsa simulyatsiya to'xtaydi.
   *
   * `Simulator` netlistni bir marta quradi va ichida saqlaydi. Ya'ni
   * ishlayotganda komponent qo'shilsa yoki sim ulansa, u ESKI sxemani
   * hisoblashda davom etardi — ekranda yangi sxema, holat esa eskisiniki.
   * Bola buni ko'rib "simulyator yolg'on gapiryapti" degan xulosaga
   * kelardi (§46).
   *
   * Qoida 2D laboratoriya bilan bitta funksiyada — `needsSimulationRestart`.
   */
  const circuit = useCircuitStore((s) => s.circuit);
  const code = useEditorStore((s) => s.code);
  const document = useRef({ circuit, code });

  useEffect(() => {
    const previous = document.current;
    const next = { circuit, code };
    document.current = next;

    if (!needsSimulationRestart(previous, next)) return;
    const status = useSimulationStore.getState().status;
    if (status !== "running" && status !== "paused") return;

    handlers.current.stop();
    handlers.current.onToast("Sxema o'zgardi — simulyatsiyani qayta boshlang");
  }, [circuit, code]);

  return { start, pause, stop, send };
}
