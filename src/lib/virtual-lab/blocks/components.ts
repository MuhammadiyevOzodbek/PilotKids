/**
 * Bloklarni SXEMADAGI komponentga bog'lash (§33).
 *
 * G'oya: bola «9-pinni HIGH qil» emas, «LED #1 ni yoq» deb o'ylaydi. Pin
 * raqami esa kod hosil bo'lganda SXEMADAN topiladi — LEDni boshqa pinga
 * ko'chirsa, blokka tegmasdan kod o'zgaradi.
 *
 * Blok komponentga NOMI bo'yicha emas, TURG'UN `nodeId` bo'yicha ishora
 * qiladi: nom o'zgarishi mumkin, id esa loyiha saqlanganda ham o'zgarmaydi.
 *
 * Bu modul ATAYLAB ikki qismga bo'lingan:
 *   • ro'yxat qurish va pin topish — generator uchun;
 *   • ulanish tekshiruvi — `validation.ts` uchun.
 * Generator sxemani TEKSHIRMAYDI, validator esa kod YOZMAYDI (§34).
 */

import { ANALOG_PIN_BASE, getDefinition, PWM_PINS } from "../catalog";
import { boardPinFor, buildNetlist, isGrounded, isPowered, type Netlist } from "../netlist";
import type { Circuit, CircuitNode } from "../types";
import type {
  BlockIssue,
  BlockNode,
  BlockValidationContext,
  DropdownOption,
  GenApi,
  SlotContext,
  SlotDef,
} from "./types";

/** Komponent tanlanadigan uyaning nomi — hamma component-aware blokda bir xil. */
export const NODE_SLOT = "NODE";

/**
 * Netlist keshi.
 *
 * `buildNetlist` butun sxemani kezib chiqadi. Bitta kod generatsiyasida
 * o'nlab blok pin so'raydi, ya'ni usiz o'nlab marta qayta hisoblanardi.
 * Kalit — sxema OBYEKTI: store uni har o'zgarishda yangisiga almashtiradi,
 * shuning uchun eski natija hech qachon eskirib qolmaydi.
 */
const NETLIST_CACHE = new WeakMap<Circuit, Netlist>();

export function netlistFor(circuit: Circuit): Netlist {
  const cached = NETLIST_CACHE.get(circuit);
  if (cached) return cached;
  const built = buildNetlist(circuit);
  NETLIST_CACHE.set(circuit, built);
  return built;
}

/* ─────────────────────────── Ro'yxat qurish ─────────────────────────── */

/**
 * Sxemadagi berilgan turdagi komponentlar ro'yxati.
 *
 * Yorliq katalogdagi nom va tartib raqamidan quriladi: «LED #1», «Servo #2».
 * Tartib sxemadagi joylashuv bo'yicha — bola ish maydonida ko'rgani bilan
 * bir xil.
 */
export function componentOptions(circuit: Circuit, types: readonly string[]): DropdownOption[] {
  const wanted = new Set(types);
  const counters = new Map<string, number>();
  const options: DropdownOption[] = [];

  for (const node of circuit.nodes) {
    if (!wanted.has(node.type)) continue;
    const index = (counters.get(node.type) ?? 0) + 1;
    counters.set(node.type, index);
    const name = getDefinition(node.type)?.name ?? node.type;
    options.push({ value: node.id, label: `${name} #${index}` });
  }
  return options;
}

/** Component-aware blokning birinchi uyasi. */
export function componentSlot(types: readonly string[]): SlotDef {
  return {
    kind: "dropdown",
    name: NODE_SLOT,
    options: (ctx: SlotContext) => componentOptions(ctx.circuit, types),
    // Bo'sh qiymat — «hali tanlanmagan». UI uni qizil ko'rsatadi.
    default: "",
  };
}

/* ─────────────────────────── Pin topish ─────────────────────────── */

/**
 * Pin raqamini KODDAGI ko'rinishga o'giradi.
 *
 * Netlist analog kirishlarni 14–19 raqamlari bilan biladi, kodda esa
 * `analogRead(A0)` yozilishi kerak — darslikdagi bilan bir xil bo'lsin.
 */
export function pinExpression(pin: number): string {
  return pin >= ANALOG_PIN_BASE ? `A${pin - ANALOG_PIN_BASE}` : String(pin);
}

/** Blok ishora qilayotgan komponent (topilmasa `null`). */
export function referencedNode(block: BlockNode, circuit: Circuit): CircuitNode | null {
  const id = block.fields[NODE_SLOT] ?? "";
  if (id === "") return null;
  return circuit.nodes.find((node) => node.id === id) ?? null;
}

export interface PinLookup {
  /** Kodga yoziladigan ifoda: `9` yoki `A0`. */
  code: string;
  /** Netlist bilgan raqam (A0 → 14). Topilmagan bo'lsa `null`. */
  number: number | null;
}

/**
 * Komponent pinini sxemadan topadi.
 *
 * Topilmasa ogohlantiradi va XAVFSIZ qiymat qaytaradi: kod baribir
 * kompilyatsiya bo'lishi va simulyator yiqilmasligi kerak. Nima
 * noto'g'ri ekanini `validation.ts` batafsil aytadi (§34).
 */
export function componentPin(
  block: BlockNode,
  api: GenApi,
  pinId: string,
  fallback: string,
): PinLookup {
  const node = referencedNode(block, api.circuit);
  if (!node) {
    api.warn({
      code: "component-missing",
      messageKey: "blocks.warn.componentMissing",
      blockId: block.id,
    });
    return { code: fallback, number: null };
  }

  const pin = boardPinFor(netlistFor(api.circuit), node.id, pinId);
  if (pin === null) {
    api.warn({
      code: "component-pin-missing",
      messageKey: "blocks.warn.componentPinMissing",
      params: { pin: pinId },
      blockId: block.id,
    });
    return { code: fallback, number: null };
  }
  return { code: pinExpression(pin), number: pin };
}

/* ─────────────────────────── Tekshiruv yordamchilari ─────────────────────────── */

function issue(
  block: BlockNode,
  severity: BlockIssue["severity"],
  messageKey: string,
  params?: Record<string, string | number>,
): BlockIssue {
  return { blockId: block.id, severity, messageKey, params };
}

/**
 * Komponentga bog'langan blok uchun umumiy tekshiruv.
 *
 * `signalPins` — Arduino piniga ulangan bo'lishi SHART bo'lgan pinlar.
 * `needsPower` — modul 5V va GND ga ulanganmi (sensorlar, servo, rele).
 * `pwmPins` — PWM talab qiladigan pinlar (`analogWrite`).
 */
export interface ComponentCheck {
  types: readonly string[];
  signalPins?: readonly string[];
  pwmPins?: readonly string[];
  needsPower?: { vcc: string; gnd: string };
}

export function validateComponentBlock(
  block: BlockNode,
  ctx: BlockValidationContext,
  check: ComponentCheck,
): BlockIssue[] {
  const node = referencedNode(block, ctx.circuit);
  if (!node) {
    return [issue(block, "error", "blocks.issue.componentMissing")];
  }
  if (!check.types.includes(node.type)) {
    return [issue(block, "error", "blocks.issue.componentWrongType")];
  }

  const issues: BlockIssue[] = [];
  const label = getDefinition(node.type)?.name ?? node.type;

  for (const pinId of [...(check.signalPins ?? []), ...(check.pwmPins ?? [])]) {
    const pin = boardPinFor(ctx.netlist, node.id, pinId);
    if (pin === null) {
      issues.push(
        issue(block, "error", "blocks.issue.pinNotConnected", { component: label, pin: pinId }),
      );
      continue;
    }
    if (check.pwmPins?.includes(pinId) && !PWM_PINS.has(pin)) {
      issues.push(
        issue(block, "error", "blocks.issue.notPwm", { pin: pinExpression(pin), slot: pinId }),
      );
    }
  }

  if (check.needsPower) {
    if (!isPowered(ctx.netlist, node.id, check.needsPower.vcc)) {
      issues.push(issue(block, "error", "blocks.issue.noPower", { component: label }));
    }
    if (!isGrounded(ctx.netlist, node.id, check.needsPower.gnd)) {
      issues.push(issue(block, "error", "blocks.issue.noGround", { component: label }));
    }
  }

  return issues;
}
