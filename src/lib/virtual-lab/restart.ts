import { LIVE_SETTING_KEYS } from "./live-controls";
import type { Circuit } from "./types";

/**
 * Ishlab turgan simulyatsiyani qayta qurish kerakmi.
 *
 * `Simulator` sxemadan bir marta netlist quradi va uni ichida saqlaydi.
 * Demak sxema o'zgarsa — komponent qo'shilsa, sim ulansa, rezistor
 * qiymati almashsa — ishlayotgan simulyator ESKI sxemani hisoblashda
 * davom etadi. Ekranda esa yangi sxema turadi va bola yolg'on natijani
 * ko'radi.
 *
 * Shu sababli ikkala laboratoriya ham har o'zgarishda shu funksiyani
 * so'raydi va "ha" javobini olsa simulyatsiyani to'xtatadi.
 *
 * ── Nima QAYTA QURISHNI talab qilmaydi ──────────────────────────────────
 * Jonli sozlamalar (potensiometr buralishi, tugma bosilishi, yorug'lik)
 * — ular sensor qiymati sifatida ishlayotgan simulyatorga uzatiladi.
 * Ular uchun to'xtatish faqat xalaqit berardi: bola tugmani bosishi
 * bilan simulyatsiya uzilib qolardi.
 *
 * Komponentning ish maydonidagi O'RNI ham... o'zgarish hisoblanadi:
 * 2D da uni ko'chirish breadboarddagi ulanishni o'zgartirishi mumkin.
 */
export function needsSimulationRestart(
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
