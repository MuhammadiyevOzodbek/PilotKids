/**
 * Bloklardan Arduino C/C++ kodi (§26).
 *
 * Talablar:
 *   • DETERMINISTIK — bir xil ish maydoni har doim bir xil matn beradi.
 *     Shu sababli bloklar hech qachon `Object.keys` tartibida emas,
 *     ish maydonidagi o'rni bo'yicha (y, keyin x, keyin id) kezib chiqiladi.
 *   • TAKRORLANMAYDI — `#include`, global e'lon va `setup()` qatorlari
 *     kalit bo'yicha yig'iladi, shuning uchun o'nta servo bloki bitta
 *     `#include <Servo.h>` beradi.
 *   • RUNTIME BILAN MOS — faqat `simulator.ts` tanish funksiyalar chiqadi.
 *
 * Generator sxemani ham ko'radi (component-aware bloklar uchun), lekin
 * SXEMANI TEKSHIRMAYDI: ulanish xatolari alohida `validation.ts` da.
 */

import type { Circuit } from "../types";
import { getBlockDefinition } from "./registry";
import { stackIds } from "./workspace";
import {
  PREC,
  type BlockNode,
  type BlockWorkspace,
  type CodeFragment,
  type GenApi,
  type GenWarning,
  type GeneratedProgram,
  type Precedence,
  type WorkspaceVariable,
} from "./types";

/** Boshlanish bloklarining turlari — generator ularni alohida biladi. */
export const START_BLOCK = "event_on_start";
export const FOREVER_BLOCK = "event_forever";

/** Ish maydoni bo'sh bo'lganda ham to'g'ri eskiz chiqsin. */
const EMPTY_SETUP_COMMENT = "// Bu yerga «Arduino ishga tushganda» bloklari tushadi";
const EMPTY_LOOP_COMMENT = "// Bu yerga «Doim takrorla» bloklari tushadi";

/* ─────────────────────────── Yordamchilar ─────────────────────────── */

export function indent(lines: readonly string[], by = "  "): string[] {
  // Bo'sh qatorga bo'shliq qo'shilmaydi — `prettier` va diff toza qoladi.
  return lines.map((line) => (line.length === 0 ? line : by + line));
}

/** C++ satr literaliga aylantiradi. */
export function quote(text: string): string {
  const escaped = text
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"')
    .replace(/\n/g, "\\n")
    .replace(/\r/g, "\\r")
    .replace(/\t/g, "\\t");
  return `"${escaped}"`;
}

/** Son literalini kodga yozish uchun tozalaydi. */
export function numberLiteral(raw: string, fallback = 0): string {
  const value = Number(raw);
  if (!Number.isFinite(value)) return String(fallback);
  return String(value);
}

/**
 * Ikki operandli ifoda — ortiqcha qavssiz.
 *
 * Operatorlar CHAPGA bog'lanadi, shuning uchun chap operand o'z darajasida
 * qavssiz qoladi (`a - b - c`), o'ng operand esa bir pog'ona kuchliroq
 * bo'lishi kerak (`a - (b - c)`). Shu ikki chegara `leftMax`/`rightMax`
 * sifatida beriladi — natijada `a < 5 && b > 2` qavssiz, `(a + 1) * 2` esa
 * qavs bilan chiqadi.
 */
export function binaryFragment(
  api: GenApi,
  block: BlockNode,
  options: {
    left: string;
    right: string;
    op: string;
    prec: Precedence;
    rightMax: Precedence;
  },
): CodeFragment {
  const left = api.value(block, options.left, options.prec);
  const right = api.value(block, options.right, options.rightMax);
  return { code: `${left} ${options.op} ${right}`, prec: options.prec };
}

/* ─────────────────────────── Yig'gich ─────────────────────────── */

class Collector {
  readonly includes = new Set<string>();
  readonly globals = new Map<string, string[]>();
  readonly setupLines = new Map<string, string[]>();
  readonly helpers = new Map<string, string[]>();
  readonly warnings: GenWarning[] = [];
  readonly usedNames = new Set<string>();
  readonly libraries = new Set<string>();
  /** Kutubxona obyektlari: kalit → C++ dagi nomi. */
  readonly objects = new Map<string, string>();
}

/** `#include <Servo.h>` → `Servo` (kutubxona ro'yxati uchun). */
function libraryOf(header: string): string {
  return header.replace(/\.h$/i, "");
}

/**
 * Blok e'lon qilgan kutubxonalarni ro'yxatga qo'shadi (§36).
 *
 * `#include` dan hisoblash yetarli emas: blok kutubxonani talab qilishi,
 * lekin sharoitga qarab (masalan komponent topilmaganda) `include`
 * chiqarmasligi mumkin. `requiresLibrary` esa ta'rifning o'zida turadi,
 * shuning uchun ro'yxat doim to'liq bo'ladi.
 */
function noteLibraries(collector: Collector, def: { requiresLibrary?: readonly string[] }): void {
  for (const library of def.requiresLibrary ?? []) collector.libraries.add(library);
}

/** `servo1`, `servo2` … — nom doim raqam bilan tugaydi. */
function numberedName(collector: Collector, base: string): string {
  const clean = base.replace(/[^A-Za-z0-9_]/g, "_").replace(/^(?=\d)/, "_");
  for (let i = 1; ; i++) {
    const candidate = `${clean}${i}`;
    if (!collector.usedNames.has(candidate)) {
      collector.usedNames.add(candidate);
      return candidate;
    }
  }
}

/* ─────────────────────────── Generator ─────────────────────────── */

export interface GenerateOptions {
  /** Component-aware bloklar shu sxemadan pin topadi. */
  circuit?: Circuit;
}

export function generateProgram(
  ws: BlockWorkspace,
  options: GenerateOptions = {},
): GeneratedProgram {
  const circuit: Circuit = options.circuit ?? { nodes: [], wires: [] };
  const collector = new Collector();

  for (const variable of ws.variables) collector.usedNames.add(variable.name);

  const api = createApi(ws, circuit, collector);

  /*
   * Ildizlarni turg'un tartibda ko'ramiz. Ish maydonidagi joylashuv
   * bo'yicha tartiblash bolaning ko'rgani bilan mos keladi: yuqoridagi
   * blok kodda ham yuqorida turadi.
   */
  const roots = Object.keys(ws.tops)
    .filter((id) => ws.blocks[id])
    .sort((a, b) => {
      const pa = ws.tops[a]!;
      const pb = ws.tops[b]!;
      return pa.y - pb.y || pa.x - pb.x || a.localeCompare(b);
    });

  const startHats = roots.filter((id) => ws.blocks[id]!.type === START_BLOCK);
  const foreverHats = roots.filter((id) => ws.blocks[id]!.type === FOREVER_BLOCK);

  if (startHats.length > 1) {
    collector.warnings.push({
      code: "duplicate-start",
      messageKey: "blocks.warn.duplicateStart",
      blockId: startHats[1],
    });
  }
  if (foreverHats.length > 1) {
    collector.warnings.push({
      code: "duplicate-forever",
      messageKey: "blocks.warn.duplicateForever",
      blockId: foreverHats[1],
    });
  }

  // Hech qaysi boshlanish blokiga ulanmagan buyruqlar — bajarilmaydi.
  for (const id of roots) {
    const type = ws.blocks[id]!.type;
    if (type === START_BLOCK || type === FOREVER_BLOCK) continue;
    const def = getBlockDefinition(type);
    if (!def || def.shape !== "statement") continue;
    collector.warnings.push({
      code: "orphan-block",
      messageKey: "blocks.warn.orphan",
      blockId: id,
    });
  }

  const setupBody = startHats[0] ? api.body(ws.blocks[startHats[0]]!, "DO") : [];
  const loopBody = foreverHats[0] ? api.body(ws.blocks[foreverHats[0]]!, "DO") : [];

  ensureSerialBegin(collector, setupBody, loopBody);

  return {
    code: assemble(collector, ws.variables, setupBody, loopBody),
    libraries: [...collector.libraries].sort(),
    warnings: collector.warnings,
  };
}

/* ─────────────────────────── Serial (§25) ─────────────────────────── */

/** `Serial.begin(9600);` uchun tanlangan tezlik — Arduino darsliklaridagi odatiy qiymat. */
const DEFAULT_BAUD = 9600;

/**
 * Serial ishlatilgan, lekin ochilmagan bo'lsa `setup()` ni o'zimiz to'ldiramiz.
 *
 * Bolaning eng ko'p uchraydigan xatosi shu: `Serial.println` bloki qo'yilgan,
 * «Serialni ... tezlikda och» bloki esa unutilgan. Kodni jim tuzatib qo'yish
 * ham, hech narsa chiqmasligi ham yomon — shuning uchun qator qo'shiladi VA
 * ogohlantirish beriladi.
 *
 * Blok turlariga emas, HOSIL BO'LGAN qatorlarga qaraladi: shunda kelajakda
 * qanday blok `Serial.` chiqarishidan qat'i nazar qoida ishlayveradi va
 * bajarilmaydigan (yetim) bloklar hisobga olinmaydi.
 */
function ensureSerialBegin(
  collector: Collector,
  setupBody: readonly string[],
  loopBody: readonly string[],
): void {
  const lines = [
    ...[...collector.setupLines.values()].flat(),
    ...[...collector.helpers.values()].flat(),
    ...setupBody,
    ...loopBody,
  ];

  let used = false;
  for (const line of lines) {
    if (/\bSerial\.begin\s*\(/.test(line)) return;
    if (/\bSerial\./.test(line)) used = true;
  }
  if (!used) return;

  collector.setupLines.set("serial-auto-begin", [`Serial.begin(${DEFAULT_BAUD});`]);
  collector.warnings.push({
    code: "serial-begin-missing",
    messageKey: "blocks.warn.serialBeginMissing",
    params: { baud: DEFAULT_BAUD },
  });
}

/* ─────────────────────────── API qurilishi ─────────────────────────── */

function createApi(ws: BlockWorkspace, circuit: Circuit, collector: Collector): GenApi {
  const api: GenApi = {
    circuit,
    variables: ws.variables,

    field(block, name) {
      return block.fields[name] ?? "";
    },

    value(block, name, maxPrec: Precedence = PREC.TERNARY) {
      const childId = block.inputs[name];
      if (childId) {
        const child = ws.blocks[childId];
        const def = child ? getBlockDefinition(child.type) : null;
        if (child && def?.generateValue) {
          noteLibraries(collector, def);
          const fragment = def.generateValue(child, api);
          return fragment.prec > maxPrec ? `(${fragment.code})` : fragment.code;
        }
      }

      // Uya bo'sh — ichki qiymat (shadow) ishlatiladi.
      const def = getBlockDefinition(block.type);
      const slot = def?.slots.find((s) => s.name === name);
      if (slot?.kind === "value" && slot.inline) {
        const raw = block.fields[name];
        if (slot.inline.kind === "number") {
          return numberLiteral(raw ?? String(slot.inline.default), slot.inline.default);
        }
        return quote(raw ?? slot.inline.default);
      }

      collector.warnings.push({
        code: "empty-slot",
        messageKey: "blocks.warn.emptySlot",
        params: { slot: name, fallback: "0" },
        blockId: block.id,
      });
      return "0";
    },

    textValue(block, name) {
      const childId = block.inputs[name];
      if (childId) {
        const child = ws.blocks[childId];
        const def = child ? getBlockDefinition(child.type) : null;
        if (child && def?.generateValue) {
          noteLibraries(collector, def);
          return def.generateValue(child, api).code;
        }
      }
      return quote(block.fields[name] ?? "");
    },

    body(block, name) {
      const first = block.statements[name] ?? null;
      const lines: string[] = [];
      for (const id of stackIds(ws, first)) {
        const child = ws.blocks[id];
        const def = child ? getBlockDefinition(child.type) : null;
        if (!child || !def?.generateStatement) continue;
        noteLibraries(collector, def);
        lines.push(...def.generateStatement(child, api));
      }
      return lines;
    },

    include(header) {
      collector.includes.add(header);
      collector.libraries.add(libraryOf(header));
    },

    global(key, lines) {
      if (collector.globals.has(key)) return;
      collector.globals.set(key, typeof lines === "string" ? [lines] : [...lines]);
    },

    setupLine(key, lines) {
      if (collector.setupLines.has(key)) return;
      collector.setupLines.set(key, typeof lines === "string" ? [lines] : [...lines]);
    },

    helper(key, lines) {
      if (collector.helpers.has(key)) return;
      collector.helpers.set(key, [...lines]);
    },

    uniqueName(base) {
      const clean = base.replace(/[^A-Za-z0-9_]/g, "_").replace(/^(?=\d)/, "_");
      if (!collector.usedNames.has(clean)) {
        collector.usedNames.add(clean);
        return clean;
      }
      for (let i = 2; ; i++) {
        const candidate = `${clean}${i}`;
        if (!collector.usedNames.has(candidate)) {
          collector.usedNames.add(candidate);
          return candidate;
        }
      }
    },

    declareObject(key, base, build, options) {
      const existing = collector.objects.get(key);
      if (existing) return existing;

      const name = options?.numbered ? numberedName(collector, base) : api.uniqueName(base);
      // Nomni AVVAL yozamiz: `build` ichida yana shu kalit so'ralsa
      // (masalan ichma-ich generatorlarda) cheksiz halqa bo'lmasin.
      collector.objects.set(key, name);

      const declaration = build(name);
      if (declaration.include) api.include(declaration.include);
      if (declaration.global) api.global(`object:${key}`, declaration.global);
      if (declaration.setup) api.setupLine(`object:${key}`, declaration.setup);
      if (declaration.helper) api.helper(`object:${key}`, declaration.helper);
      return name;
    },

    warn(warning) {
      collector.warnings.push(warning);
    },
  };

  return api;
}

/* ─────────────────────────── Yig'ish ─────────────────────────── */

/** C++ turini blok o'zgaruvchisidan oladi. */
function cppType(variable: WorkspaceVariable): string {
  switch (variable.type) {
    case "float":
      return "float";
    case "bool":
      return "bool";
    case "String":
      return "String";
    default:
      return "int";
  }
}

function assemble(
  collector: Collector,
  variables: readonly WorkspaceVariable[],
  setupBody: string[],
  loopBody: string[],
): string {
  const parts: string[] = [];

  // 1. Kutubxonalar — alifbo tartibida, takrorlanmaydi (§36).
  if (collector.includes.size > 0) {
    parts.push(
      [...collector.includes]
        .sort()
        .map((h) => `#include <${h}>`)
        .join("\n"),
    );
  }

  // 2. Kutubxona obyektlari va boshqa global e'lonlar.
  const globals = [...collector.globals.values()].flat();
  if (globals.length > 0) parts.push(globals.join("\n"));

  // 3. Foydalanuvchi o'zgaruvchilari.
  if (variables.length > 0) {
    parts.push(
      variables
        .map(
          (v) =>
            `${cppType(v)} ${v.name} = ${v.type === "String" ? '""' : v.type === "bool" ? "false" : "0"};`,
        )
        .join("\n"),
    );
  }

  // 4. Yordamchi funksiyalar.
  for (const helper of collector.helpers.values()) parts.push(helper.join("\n"));

  // 5. setup() — avval kutubxona sozlamalari, keyin bolaning bloklari.
  const setupLines = [...collector.setupLines.values()].flat();
  const setup = [...setupLines, ...setupBody];
  parts.push(
    ["void setup() {", ...indent(setup.length > 0 ? setup : [EMPTY_SETUP_COMMENT]), "}"].join("\n"),
  );

  // 6. loop()
  parts.push(
    ["void loop() {", ...indent(loopBody.length > 0 ? loopBody : [EMPTY_LOOP_COMMENT]), "}"].join(
      "\n",
    ),
  );

  return `${parts.join("\n\n")}\n`;
}

/* ─────────────────────────── Qulaylik ─────────────────────────── */

/** Faqat kod matni kerak bo'lganda. */
export function generateCode(ws: BlockWorkspace, options?: GenerateOptions): string {
  return generateProgram(ws, options).code;
}
