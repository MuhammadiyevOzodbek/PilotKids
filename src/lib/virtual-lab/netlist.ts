import { batteryVoltage, getDefinition, pinIdToNumber } from "./catalog";
import type { Circuit, CircuitNode } from "./types";

/**
 * Sxemaning elektr bog'lanishlarini hisoblaydi.
 *
 * Simlar bilan bevosita yoki bilvosita ulangan pinlar bitta **tugun** (net)
 * hosil qiladi — xuddi haqiqiy sxemadagidek. Validator ham, simulyator ham
 * "bu pin nimaga ulangan?" degan savolga shu yerdan javob oladi.
 *
 * Ba'zi komponentlar ichida ham o'tkazuvchanlik bor: tugma faqat bosilganda
 * ulanadi, breadboard bir ustundagi teshiklarni birlashtiradi.
 *
 * Rezistor oddiy sim emas: u orqali signal yetib borishi mumkin, lekin uning
 * ikki tomoni bitta net bo'lib qolmaydi. Aks holda 5V -> rezistor -> GND ham
 * qisqa tutashuv deb noto'g'ri topiladi.
 */

/** "nodeId:pinId" ko'rinishidagi kalit. */
export type PinKey = string;

export function pinKey(nodeId: string, pinId: string): PinKey {
  return `${nodeId}:${pinId}`;
}

export function splitPinKey(key: PinKey): { nodeId: string; pinId: string } {
  const idx = key.indexOf(":");
  return { nodeId: key.slice(0, idx), pinId: key.slice(idx + 1) };
}

/** Komponent ichidagi o'tkazuvchi juftliklar. */
function internalLinks(node: CircuitNode): [string, string][] {
  const links: [string, string][] = [];
  const def = getDefinition(node.type);
  const groups = new Map<string, string[]>();

  for (const pin of def?.pins ?? []) {
    if (!pin.electricalGroupId) continue;
    const ids = groups.get(pin.electricalGroupId);
    if (ids) ids.push(pin.id);
    else groups.set(pin.electricalGroupId, [pin.id]);
  }

  for (const ids of groups.values()) {
    const [first, ...rest] = ids;
    if (!first) continue;
    for (const id of rest) links.push([first, id]);
  }

  switch (node.type) {
    // Rezistor netlarni birlashtirmaydi; u `passiveLinks` da alohida saqlanadi.
    case "resistor":
      return links;
    // Tugma — faqat bosilganda ulaydi.
    case "push-button":
      if (node.settings.pressed === true) links.push(["a", "b"]);
      return links;
    // Potensiometr va LDR — kuchlanish bo'luvchi: uchala oyoq bir zanjirda,
    // lekin signal chiqishi alohida hisoblanadi, shuning uchun bu yerda
    // vcc↔gnd ulanmaydi (aks holda qisqa tutashuv deb topilardi).
    default:
      return links;
  }
}

/** Birlashtiruvchi-topuvchi (union-find) — tugunlarni tez guruhlash uchun. */
class DisjointSet {
  private parent = new Map<string, string>();

  find(x: string): string {
    const p = this.parent.get(x);
    if (p === undefined) {
      this.parent.set(x, x);
      return x;
    }
    if (p === x) return x;
    const root = this.find(p);
    this.parent.set(x, root);
    return root;
  }

  union(a: string, b: string) {
    const ra = this.find(a);
    const rb = this.find(b);
    if (ra !== rb) this.parent.set(ra, rb);
  }
}

export interface Netlist {
  /** Pin → tugun identifikatori. */
  netOf: Map<PinKey, string>;
  /** Tugun → undagi barcha pinlar. */
  pinsOf: Map<string, PinKey[]>;
  /** GND'ga ulangan tugunlar. */
  groundNets: Set<string>;
  /** Doimiy musbat kuchlanishga ulangan tugunlar (5V rels yoki batareya). */
  powerNets: Set<string>;
  /**
   * Kuchlanish manbai ushlab turgan tugunlar: tugun → volt.
   *
   * `powerNets` faqat "musbat rels" degan ha/yo'q javobni beradi, bu esa
   * batareya uchun yetarli emas — 1.5 V va 12 V bir xil ko'rinardi.
   * Multimetr va LED yorqinligi aynan shu jadvaldan oziqlanadi.
   */
  sourceNets: Map<string, number>;
  /** Arduino pin raqami → tugun. */
  boardPinNets: Map<number, string>;
  /** Rezistor kabi passiv element orqali bog'langan net juftliklari. */
  passiveLinks: Array<[string, string]>;
}

export function buildNetlist(circuit: Circuit): Netlist {
  const ds = new DisjointSet();
  const nodeById = new Map(circuit.nodes.map((n) => [n.id, n]));

  // Har bir pin — o'z boshlang'ich tuguni.
  for (const node of circuit.nodes) {
    const def = getDefinition(node.type);
    if (!def) continue;
    for (const pin of def.pins) ds.find(pinKey(node.id, pin.id));
  }

  // Simlar bo'yicha birlashtiramiz.
  for (const wire of circuit.wires) {
    ds.union(pinKey(wire.from.nodeId, wire.from.pinId), pinKey(wire.to.nodeId, wire.to.pinId));
  }

  // Komponent ichidagi o'tkazuvchanlik.
  for (const node of circuit.nodes) {
    for (const [a, b] of internalLinks(node)) {
      ds.union(pinKey(node.id, a), pinKey(node.id, b));
    }
  }

  const netOf = new Map<PinKey, string>();
  const pinsOf = new Map<string, PinKey[]>();
  const groundNets = new Set<string>();
  const powerNets = new Set<string>();
  const sourceNets = new Map<string, number>();
  const boardPinNets = new Map<number, string>();
  const passiveLinks: Array<[string, string]> = [];

  for (const node of circuit.nodes) {
    const def = getDefinition(node.type);
    if (!def) continue;

    for (const pin of def.pins) {
      const key = pinKey(node.id, pin.id);
      const net = ds.find(key);
      netOf.set(key, net);

      const list = pinsOf.get(net);
      if (list) list.push(key);
      else pinsOf.set(net, [key]);

      if (def.isBoard && pin.role === "ground") groundNets.add(net);
      if (def.isBoard && pin.role === "power") powerNets.add(net);

      if (def.isBoard) {
        const number = pinIdToNumber(pin.id);
        if (number !== null) boardPinNets.set(number, net);
      }
    }
  }

  // `ground` / `power-5v` komponentlari ham tugunni belgilaydi.
  for (const node of circuit.nodes) {
    if (node.type === "ground") {
      const net = netOf.get(pinKey(node.id, "out"));
      if (net) groundNets.add(net);
    }
    if (node.type === "power-5v") {
      const net = netOf.get(pinKey(node.id, "out"));
      if (net) {
        powerNets.add(net);
        sourceNets.set(net, Math.max(sourceNets.get(net) ?? 0, 5));
      }
    }
    /*
     * Batareya — mustaqil kuchlanish manbai. Uning manfiy uchi zanjirning
     * sanoq nuqtasi (0 V) bo'ladi, musbat uchi esa tanlangan kuchlanishni
     * ushlab turadi. Teskari solingan batareyada ikkalasi almashadi —
     * shuning uchun LED yonmay qoladi va bola sababini ko'radi.
     */
    if (node.type === "battery") {
      const volts = batteryVoltage(node.settings);
      if (volts === 0) continue;

      const plusNet = netOf.get(pinKey(node.id, "plus"));
      const minusNet = netOf.get(pinKey(node.id, "minus"));
      const positive = volts > 0 ? plusNet : minusNet;
      const negative = volts > 0 ? minusNet : plusNet;

      if (negative) groundNets.add(negative);
      if (positive) {
        powerNets.add(positive);
        sourceNets.set(positive, Math.max(sourceNets.get(positive) ?? 0, Math.abs(volts)));
      }
    }
  }

  for (const node of circuit.nodes) {
    if (node.type !== "resistor") continue;
    const a = netOf.get(pinKey(node.id, "a"));
    const b = netOf.get(pinKey(node.id, "b"));
    if (a && b && a !== b) passiveLinks.push([a, b]);
  }

  void nodeById;
  return { netOf, pinsOf, groundNets, powerNets, sourceNets, boardPinNets, passiveLinks };
}

/** Berilgan pin qaysi tugunda ekanini qaytaradi. */
export function netFor(net: Netlist, nodeId: string, pinId: string): string | null {
  return net.netOf.get(pinKey(nodeId, pinId)) ?? null;
}

/** Rezistor kabi passiv elementlar orqali yetib boriladigan netlar. */
export function reachableNets(net: Netlist, start: string): Set<string> {
  const reachable = new Set<string>([start]);
  const queue = [start];

  for (let i = 0; i < queue.length; i++) {
    const current = queue[i]!;
    for (const [a, b] of net.passiveLinks) {
      const next = a === current ? b : b === current ? a : null;
      if (next === null || reachable.has(next)) continue;
      reachable.add(next);
      queue.push(next);
    }
  }

  return reachable;
}

/** Pin GND tugunidami? */
export function isGrounded(net: Netlist, nodeId: string, pinId: string): boolean {
  const n = netFor(net, nodeId, pinId);
  return n !== null && [...reachableNets(net, n)].some((id) => net.groundNets.has(id));
}

/** Pin doimiy 5V tugunidami? */
export function isPowered(net: Netlist, nodeId: string, pinId: string): boolean {
  const n = netFor(net, nodeId, pinId);
  return n !== null && [...reachableNets(net, n)].some((id) => net.powerNets.has(id));
}

/**
 * Pinni oziqlantirayotgan manba kuchlanishi (V).
 *
 * Rezistor orqali ham qaraydi — LED odatda rezistor orqali ulanadi.
 * Bir nechta manba bo'lsa eng kattasi olinadi. Musbat relsga ulanmagan
 * bo'lsa `null`.
 */
export function supplyVoltage(net: Netlist, nodeId: string, pinId: string): number | null {
  const start = netFor(net, nodeId, pinId);
  if (start === null) return null;

  let best: number | null = null;
  for (const id of reachableNets(net, start)) {
    const exact = net.sourceNets.get(id);
    if (exact !== undefined) best = best === null ? exact : Math.max(best, exact);
    // Eski 5V relsi (Arduino plataning 5V pini) jadvalda yo'q — u doim 5 V.
    else if (net.powerNets.has(id)) best = best === null ? 5 : Math.max(best, 5);
  }
  return best;
}

/**
 * Pin qaysi Arduino chiqishiga ulangan (bevosita yoki rezistor orqali).
 * Topilmasa `null`.
 */
export function boardPinFor(net: Netlist, nodeId: string, pinId: string): number | null {
  const target = netFor(net, nodeId, pinId);
  if (target === null) return null;
  const reachable = reachableNets(net, target);

  for (const [number, boardNet] of net.boardPinNets) {
    if (reachable.has(boardNet)) return number;
  }
  return null;
}
