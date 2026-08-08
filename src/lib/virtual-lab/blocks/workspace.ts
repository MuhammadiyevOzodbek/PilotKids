/**
 * Blok ish maydonining modeli.
 *
 * Bloklar YASSI jadvalda saqlanadi (`id → BlockNode`), ota-bola aloqasi esa
 * faqat bolaga qaragan havolalar orqali (`next`, `inputs`, `statements`).
 * Ota havolasi ATAYLAB saqlanmaydi: u ikkinchi haqiqat manbai bo'lardi va
 * sudrab-tashlash paytida ikkalasi bir-biridan uzilib qolardi. Ota kerak
 * bo'lganda `buildParentIndex` bilan hisoblanadi — bu O(n) va ish maydoni
 * yuzlab blokdan oshmaydi.
 *
 * Bu qatlam SOF: React ham, brauzer ham talab qilinmaydi, shuning uchun
 * to'liq test qilinadi.
 */

import { z } from "zod";
import { getBlockDefinition } from "./registry";
import {
  BLOCK_WORKSPACE_VERSION,
  type BlockNode,
  type BlockWorkspace,
  type SlotDef,
  type WorkspaceVariable,
} from "./types";

/* ─────────────────────────── Chegaralar ─────────────────────────── */

/** Bitta ish maydonidagi eng ko'p blok — juda katta workspace brauzerni qotirmasin. */
export const MAX_BLOCKS = 400;
/** O'zgaruvchilar soni. */
export const MAX_VARIABLES = 40;

/* ─────────────────────────── Yaratish ─────────────────────────── */

let seq = 0;

/** Yangi blok identifikatori. */
export function newBlockId(prefix = "b"): string {
  seq += 1;
  return `${prefix}-${Date.now().toString(36)}-${seq.toString(36)}`;
}

export function emptyWorkspace(): BlockWorkspace {
  return { version: BLOCK_WORKSPACE_VERSION, blocks: {}, tops: {}, variables: [] };
}

/** Ta'rifdagi boshlang'ich qiymatlar bilan yangi blok nusxasi. */
export function createBlock(type: string, id = newBlockId()): BlockNode | null {
  const def = getBlockDefinition(type);
  if (!def) return null;

  const fields: Record<string, string> = {};
  const inputs: Record<string, string | null> = {};
  const statements: Record<string, string | null> = {};

  for (const slot of def.slots) {
    switch (slot.kind) {
      case "dropdown":
        fields[slot.name] = slot.default;
        break;
      case "number":
        fields[slot.name] = String(slot.default);
        break;
      case "text":
        fields[slot.name] = slot.default;
        break;
      case "value":
        inputs[slot.name] = null;
        // Ichki qiymat (shadow) ham `fields` da yashaydi: uya bo'sh bo'lsa
        // shu ko'rsatiladi va shu koddan foydalaniladi.
        if (slot.inline) {
          fields[slot.name] =
            slot.inline.kind === "number" ? String(slot.inline.default) : slot.inline.default;
        }
        break;
      case "statement":
        statements[slot.name] = null;
        break;
    }
  }

  return { id, type, fields, inputs, statements, next: null };
}

/* ─────────────────────────── Kezish ─────────────────────────── */

/** Blokning bevosita bolalari (qiymat uyalari, ichki steklar va `next`). */
export function childIds(block: BlockNode): string[] {
  const out: string[] = [];
  for (const id of Object.values(block.inputs)) if (id) out.push(id);
  for (const id of Object.values(block.statements)) if (id) out.push(id);
  if (block.next) out.push(block.next);
  return out;
}

/** Blok va uning butun ostidagi daraxt (o'zi ham kiradi). */
export function subtreeIds(ws: BlockWorkspace, rootId: string): string[] {
  const out: string[] = [];
  const stack = [rootId];
  const seen = new Set<string>();

  while (stack.length > 0) {
    const id = stack.pop()!;
    if (seen.has(id)) continue;
    seen.add(id);
    const block = ws.blocks[id];
    if (!block) continue;
    out.push(id);
    stack.push(...childIds(block));
  }
  return out;
}

/** Stekdagi bloklar ketma-ketligi (`next` zanjiri). */
export function stackIds(ws: BlockWorkspace, firstId: string | null): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  let current = firstId;

  while (current) {
    // Halqadan himoya: buzuq faylda `next` o'ziga qaytishi mumkin.
    if (seen.has(current)) break;
    seen.add(current);
    out.push(current);
    current = ws.blocks[current]?.next ?? null;
  }
  return out;
}

export interface ParentLink {
  parentId: string;
  /** Qaysi joyga ulangan. */
  slot: { kind: "next" } | { kind: "input"; name: string } | { kind: "statement"; name: string };
}

/** Har bir blok uchun uni ushlab turgan blok va joy. */
export function buildParentIndex(ws: BlockWorkspace): Map<string, ParentLink> {
  const index = new Map<string, ParentLink>();

  for (const block of Object.values(ws.blocks)) {
    for (const [name, id] of Object.entries(block.inputs)) {
      if (id) index.set(id, { parentId: block.id, slot: { kind: "input", name } });
    }
    for (const [name, id] of Object.entries(block.statements)) {
      if (id) index.set(id, { parentId: block.id, slot: { kind: "statement", name } });
    }
    if (block.next) index.set(block.next, { parentId: block.id, slot: { kind: "next" } });
  }
  return index;
}

/** Blokning eng yuqoridagi ajdodi (ildiz). */
export function rootOf(ws: BlockWorkspace, id: string): string {
  const parents = buildParentIndex(ws);
  let current = id;
  const seen = new Set<string>([id]);

  for (;;) {
    const link = parents.get(current);
    if (!link || seen.has(link.parentId)) return current;
    seen.add(link.parentId);
    current = link.parentId;
  }
}

/* ─────────────────────────── O'zgartirishlar ─────────────────────────── */

/*
 * Barcha o'zgartiruvchi funksiyalar YANGI workspace qaytaradi va kirishga
 * tegmaydi. Shu sababli undo/redo tarixini saqlash arzon: eski nusxa
 * o'z-o'zidan buzilmaydi.
 */

/**
 * Ish maydonining YUZAKI nusxasi: blok obyektlari ULASHILADI.
 *
 * Ilgari bu yerda har bir blok chuqur nusxalanardi. Natijada bitta uyaga
 * son yozilganda ish maydonidagi HAMMA blok yangi obyektga aylanardi va
 * React ularning barchasini qayta chizardi — 100+ blokli maydonda sudrash
 * sezilarli sekinlashardi (§39).
 *
 * Endi o'zgargan blok `mutable()` bilan ALOHIDA nusxalanadi, qolganlari
 * eski havolada qoladi. Shuning uchun `React.memo` va zustand selektorlari
 * haqiqatan ishlaydi: o'zgarmagan blok qayta chizilmaydi.
 *
 * Muhim shart: `mutable()` dan O'TMAGAN blokka HECH QACHON yozilmaydi —
 * u eski (undo tarixidagi) ish maydoni bilan ulashilgan.
 */
function clone(ws: BlockWorkspace): BlockWorkspace {
  return {
    version: ws.version,
    blocks: { ...ws.blocks },
    tops: { ...ws.tops },
    variables: ws.variables,
  };
}

/** Blokni o'zgartirishga tayyorlaydi: birinchi murojaatda nusxa oladi. */
function mutable(ws: BlockWorkspace, id: string, source: BlockWorkspace): BlockNode | null {
  const block = ws.blocks[id];
  if (!block) return null;
  // Manba bilan bir xil havola — hali nusxalanmagan.
  if (block !== source.blocks[id]) return block;

  const copy: BlockNode = {
    ...block,
    fields: { ...block.fields },
    inputs: { ...block.inputs },
    statements: { ...block.statements },
  };
  ws.blocks[id] = copy;
  return copy;
}

/** Blokni ish maydoniga ildiz sifatida qo'yadi. */
export function addTopBlock(
  ws: BlockWorkspace,
  block: BlockNode,
  x: number,
  y: number,
): BlockWorkspace {
  if (Object.keys(ws.blocks).length >= MAX_BLOCKS) return ws;
  const next = clone(ws);
  next.blocks[block.id] = block;
  next.tops[block.id] = { x: Math.round(x), y: Math.round(y) };
  return next;
}

/** Blokni butun daraxti bilan qo'shadi (nusxalash va sudrab tashlash uchun). */
export function addSubtree(
  ws: BlockWorkspace,
  blocks: BlockNode[],
  rootId: string,
  x: number,
  y: number,
): BlockWorkspace {
  if (Object.keys(ws.blocks).length + blocks.length > MAX_BLOCKS) return ws;
  const next = clone(ws);
  for (const b of blocks) next.blocks[b.id] = b;
  next.tops[rootId] = { x: Math.round(x), y: Math.round(y) };
  return next;
}

/** Ildiz blokni ko'chiradi. */
export function moveTopBlock(ws: BlockWorkspace, id: string, x: number, y: number): BlockWorkspace {
  if (!ws.tops[id]) return ws;
  const next = clone(ws);
  next.tops[id] = { x: Math.round(x), y: Math.round(y) };
  return next;
}

/**
 * Blokni ota-blokidan uzadi va ildizga chiqaradi.
 *
 * Stekdan uzilganda uning PASTIDAGI bloklar u bilan birga ketadi — xuddi
 * qog'ozdan bir bo'lakni pastki qismi bilan uzgandek. Bu Entry/Scratch
 * uslubidagi kutilgan xatti-harakat.
 */
export function detachBlock(ws: BlockWorkspace, id: string, x: number, y: number): BlockWorkspace {
  const parents = buildParentIndex(ws);
  const link = parents.get(id);
  const next = clone(ws);

  if (link) {
    const parent = mutable(next, link.parentId, ws);
    if (parent) {
      if (link.slot.kind === "next") parent.next = null;
      else if (link.slot.kind === "input") parent.inputs[link.slot.name] = null;
      else parent.statements[link.slot.name] = null;
    }
  }

  next.tops[id] = { x: Math.round(x), y: Math.round(y) };
  return next;
}

/**
 * Ish maydonidagi joydan olib tashlaydi, lekin blokni o'chirmaydi.
 *
 * Faqat AYNAN shu blokka ishora qilayotgan ota nusxalanadi — qolgan
 * bloklar eski havolada qoladi.
 */
function unlinkFromParent(ws: BlockWorkspace, id: string, source: BlockWorkspace): void {
  for (const block of Object.values(ws.blocks)) {
    const holdsNext = block.next === id;
    const inputName = Object.entries(block.inputs).find(([, child]) => child === id)?.[0];
    const statementName = Object.entries(block.statements).find(([, child]) => child === id)?.[0];
    if (!holdsNext && inputName === undefined && statementName === undefined) continue;

    const editable = mutable(ws, block.id, source);
    if (!editable) continue;
    if (holdsNext) editable.next = null;
    if (inputName !== undefined) editable.inputs[inputName] = null;
    if (statementName !== undefined) editable.statements[statementName] = null;
  }
  delete ws.tops[id];
}

/** Stekning oxirgi bloki. */
function lastOfStack(ws: BlockWorkspace, firstId: string): string {
  const ids = stackIds(ws, firstId);
  return ids[ids.length - 1] ?? firstId;
}

/**
 * `movingId` stekini `targetId` dan keyin ulaydi.
 *
 * Agar `targetId` ning `next` i band bo'lsa, eski davomi ko'chirilayotgan
 * stekning OXIRIGA ulanadi: bola blokni o'rtaga qistirsa, pastdagi bloklar
 * yo'qolib qolmaydi.
 */
export function connectAfter(
  ws: BlockWorkspace,
  movingId: string,
  targetId: string,
): BlockWorkspace {
  if (movingId === targetId) return ws;
  // O'zining ichiga ulanish — halqa hosil bo'lardi.
  if (subtreeIds(ws, movingId).includes(targetId)) return ws;

  const next = clone(ws);
  unlinkFromParent(next, movingId, ws);

  const target = mutable(next, targetId, ws);
  const moving = next.blocks[movingId];
  if (!target || !moving) return ws;

  const tail = target.next;
  target.next = movingId;
  if (tail) {
    const movingLast = mutable(next, lastOfStack(next, movingId), ws);
    if (movingLast) movingLast.next = tail;
  }
  return next;
}

/** `movingId` stekini ichki stek uyasining boshiga ulaydi. */
export function connectIntoStatement(
  ws: BlockWorkspace,
  movingId: string,
  parentId: string,
  slotName: string,
): BlockWorkspace {
  if (movingId === parentId) return ws;
  if (subtreeIds(ws, movingId).includes(parentId)) return ws;

  const next = clone(ws);
  unlinkFromParent(next, movingId, ws);

  const parent = mutable(next, parentId, ws);
  const moving = next.blocks[movingId];
  if (!parent || !moving || !(slotName in parent.statements)) return ws;

  const existing = parent.statements[slotName];
  parent.statements[slotName] = movingId;
  if (existing) {
    const movingLast = mutable(next, lastOfStack(next, movingId), ws);
    if (movingLast) movingLast.next = existing;
  }
  return next;
}

/**
 * Qiymat blokini uyaga qo'yadi.
 *
 * Uya band bo'lsa, eski blok ish maydoniga chiqib qoladi (o'chirilmaydi) —
 * bola tasodifan yozgan ifodasini yo'qotmaydi.
 */
export function connectValue(
  ws: BlockWorkspace,
  movingId: string,
  parentId: string,
  slotName: string,
  displacedAt: { x: number; y: number } = { x: 40, y: 40 },
): BlockWorkspace {
  if (movingId === parentId) return ws;
  if (subtreeIds(ws, movingId).includes(parentId)) return ws;

  const next = clone(ws);
  unlinkFromParent(next, movingId, ws);

  const parent = mutable(next, parentId, ws);
  const moving = mutable(next, movingId, ws);
  if (!parent || !moving || !(slotName in parent.inputs)) return ws;

  const existing = parent.inputs[slotName];
  if (existing && existing !== movingId) {
    next.tops[existing] = { x: Math.round(displacedAt.x), y: Math.round(displacedAt.y) };
  }
  parent.inputs[slotName] = movingId;
  // Qiymat bloki stek emas: ulanganda `next` bo'lmasligi kerak.
  moving.next = null;
  return next;
}

/** Blokni butun daraxti bilan o'chiradi. */
export function removeBlock(ws: BlockWorkspace, id: string): BlockWorkspace {
  const doomed = new Set(subtreeIds(ws, id));
  const next = clone(ws);
  unlinkFromParent(next, id, ws);

  for (const doomedId of doomed) {
    delete next.blocks[doomedId];
    delete next.tops[doomedId];
  }
  // Yo'q bo'lgan bloklarga qolgan havolalarni tozalaymiz.
  for (const block of Object.values(next.blocks)) {
    const badNext = block.next !== null && doomed.has(block.next);
    const badInputs = Object.entries(block.inputs).filter(([, c]) => c && doomed.has(c));
    const badStatements = Object.entries(block.statements).filter(([, c]) => c && doomed.has(c));
    if (!badNext && badInputs.length === 0 && badStatements.length === 0) continue;

    const editable = mutable(next, block.id, ws);
    if (!editable) continue;
    if (badNext) editable.next = null;
    for (const [name] of badInputs) editable.inputs[name] = null;
    for (const [name] of badStatements) editable.statements[name] = null;
  }
  return next;
}

export interface BlockSubtree {
  blocks: BlockNode[];
  rootId: string;
}

/**
 * Blok ro'yxatini YANGI ID'lar bilan qayta yozadi.
 *
 * Ish maydonidan mustaqil: shu sababli u ham nusxalash uchun, ham
 * buferdan joylash uchun ishlaydi. Buferdagi daraxtni har joylashda
 * qayta belgilash SHART — aks holda bitta nusxani ikki marta joylaganda
 * ikkita blok bir xil ID bilan qolardi.
 */
export function remapSubtree(source: readonly BlockNode[], rootId: string): BlockSubtree {
  const remap = new Map(source.map((block) => [block.id, newBlockId()]));
  const link = (id: string | null) => (id ? (remap.get(id) ?? null) : null);

  const blocks = source.map(
    (block) =>
      ({
        id: remap.get(block.id)!,
        type: block.type,
        fields: { ...block.fields },
        inputs: Object.fromEntries(Object.entries(block.inputs).map(([k, v]) => [k, link(v)])),
        statements: Object.fromEntries(
          Object.entries(block.statements).map(([k, v]) => [k, link(v)]),
        ),
        next: link(block.next),
      }) satisfies BlockNode,
  );

  return { blocks, rootId: remap.get(rootId) ?? blocks[0]?.id ?? rootId };
}

/** Blok daraxtini yangi ID'lar bilan nusxalaydi. */
export function duplicateSubtree(ws: BlockWorkspace, id: string): BlockSubtree | null {
  const ids = subtreeIds(ws, id);
  if (ids.length === 0 || !ws.blocks[id]) return null;
  return remapSubtree(
    ids.map((old) => ws.blocks[old]!),
    id,
  );
}

/** Uya qiymatini yozadi (ro'yxat, son yoki matn). */
export function setField(
  ws: BlockWorkspace,
  id: string,
  name: string,
  value: string,
): BlockWorkspace {
  const block = ws.blocks[id];
  if (!block || block.fields[name] === value) return ws;
  const def = getBlockDefinition(block.type);
  const slot = def?.slots.find((s) => s.name === name);
  if (!slot) return ws;

  const next = clone(ws);
  mutable(next, id, ws)!.fields[name] = normalizeFieldValue(slot, value);
  return next;
}

/** Kiritilgan qiymatni uyaning turiga moslaydi. */
function normalizeFieldValue(slot: SlotDef, value: string): string {
  if (slot.kind === "number") {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return String(slot.default);
    const min = slot.min ?? Number.NEGATIVE_INFINITY;
    const max = slot.max ?? Number.POSITIVE_INFINITY;
    return String(Math.max(min, Math.min(max, parsed)));
  }
  if (slot.kind === "text") return value.slice(0, slot.maxLength ?? 120);
  if (slot.kind === "value" && slot.inline?.kind === "number") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? String(parsed) : String(slot.inline.default);
  }
  if (slot.kind === "value" && slot.inline?.kind === "text") return value.slice(0, 120);
  return value;
}

/* ─────────────────────────── O'zgaruvchilar ─────────────────────────── */

/** C++ da band bo'lgan nomlar — o'zgaruvchiga berib bo'lmaydi (§9). */
export const RESERVED_WORDS: ReadonlySet<string> = new Set([
  // C/C++ kalit so'zlari
  "alignas",
  "alignof",
  "and",
  "asm",
  "auto",
  "bool",
  "break",
  "case",
  "catch",
  "char",
  "class",
  "const",
  "constexpr",
  "continue",
  "default",
  "delete",
  "do",
  "double",
  "dynamic_cast",
  "else",
  "enum",
  "explicit",
  "export",
  "extern",
  "false",
  "float",
  "for",
  "friend",
  "goto",
  "if",
  "inline",
  "int",
  "long",
  "mutable",
  "namespace",
  "new",
  "not",
  "nullptr",
  "operator",
  "or",
  "private",
  "protected",
  "public",
  "register",
  "return",
  "short",
  "signed",
  "sizeof",
  "static",
  "struct",
  "switch",
  "template",
  "this",
  "throw",
  "true",
  "try",
  "typedef",
  "typeid",
  "typename",
  "union",
  "unsigned",
  "using",
  "virtual",
  "void",
  "volatile",
  "while",
  "xor",
  // Arduino API va konstantalari
  "setup",
  "loop",
  "pinMode",
  "digitalWrite",
  "digitalRead",
  "analogRead",
  "analogWrite",
  "delay",
  "delayMicroseconds",
  "millis",
  "micros",
  "map",
  "constrain",
  "random",
  "randomSeed",
  "tone",
  "noTone",
  "pulseIn",
  "shiftOut",
  "Serial",
  "String",
  "HIGH",
  "LOW",
  "INPUT",
  "OUTPUT",
  "INPUT_PULLUP",
  "LED_BUILTIN",
  "A0",
  "A1",
  "A2",
  "A3",
  "A4",
  "A5",
  "Servo",
  "LiquidCrystal",
  "DHT",
  "byte",
  "word",
  "boolean",
]);

export type VariableNameCheck =
  | { ok: true; name: string }
  | { ok: false; reason: "empty" | "invalid" | "reserved" | "duplicate" | "limit" };

/** O'zgaruvchi nomini tekshiradi: C++ identifikatori va band emasligi. */
export function checkVariableName(
  ws: BlockWorkspace,
  raw: string,
  ignoreId?: string,
): VariableNameCheck {
  const name = raw.trim();
  if (name.length === 0) return { ok: false, reason: "empty" };
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(name)) return { ok: false, reason: "invalid" };
  if (RESERVED_WORDS.has(name)) return { ok: false, reason: "reserved" };
  if (ws.variables.some((v) => v.name === name && v.id !== ignoreId)) {
    return { ok: false, reason: "duplicate" };
  }
  if (ws.variables.length >= MAX_VARIABLES && !ignoreId) return { ok: false, reason: "limit" };
  return { ok: true, name };
}

export function addVariable(
  ws: BlockWorkspace,
  name: string,
  type: WorkspaceVariable["type"] = "int",
): BlockWorkspace {
  const check = checkVariableName(ws, name);
  if (!check.ok) return ws;
  const next = clone(ws);
  // `variables` massivi ham ulashilgan — o'zgartirishdan oldin nusxalanadi.
  next.variables = [...ws.variables, { id: newBlockId("v"), name: check.name, type }];
  return next;
}

export function renameVariable(ws: BlockWorkspace, id: string, name: string): BlockWorkspace {
  const check = checkVariableName(ws, name, id);
  if (!check.ok) return ws;
  const source = ws.variables.find((v) => v.id === id);
  if (!source) return ws;
  const oldName = source.name;

  const next = clone(ws);
  next.variables = ws.variables.map((v) => (v.id === id ? { ...v, name: check.name } : v));

  // Nomga qarab ishlaydigan uyalarni ham yangilaymiz.
  for (const block of Object.values(next.blocks)) {
    const slots = Object.entries(block.fields).filter(([, value]) => value === oldName);
    if (slots.length === 0) continue;
    const editable = mutable(next, block.id, ws)!;
    for (const [slot] of slots) editable.fields[slot] = check.name;
  }
  return next;
}

export function removeVariable(ws: BlockWorkspace, id: string): BlockWorkspace {
  const next = clone(ws);
  next.variables = ws.variables.filter((v) => v.id !== id);
  return next;
}

/* ─────────────────────────── Saqlash ─────────────────────────── */

const blockNodeSchema = z.object({
  id: z.string().min(1).max(64),
  type: z.string().min(1).max(64),
  fields: z.record(z.string().max(64), z.string().max(200)),
  inputs: z.record(z.string().max(64), z.string().max(64).nullable()),
  statements: z.record(z.string().max(64), z.string().max(64).nullable()),
  next: z.string().max(64).nullable(),
});

export const blockWorkspaceSchema = z.object({
  version: z.number().int().min(1).max(1000),
  blocks: z.record(z.string().max(64), blockNodeSchema),
  tops: z.record(z.string().max(64), z.object({ x: z.number().finite(), y: z.number().finite() })),
  variables: z
    .array(
      z.object({
        id: z.string().min(1).max(64),
        name: z.string().min(1).max(64),
        type: z.enum(["int", "float", "bool", "String"]),
      }),
    )
    .max(MAX_VARIABLES),
});

/**
 * Kelajakdagi formatlarni joriy formatga o'tkazadi (§29).
 *
 * Hozircha bitta versiya bor, lekin joyi ochiq turadi: versiya oshgach
 * shu yerga bosqichma-bosqich migratsiya qo'shiladi.
 */
function migrate(ws: BlockWorkspace): BlockWorkspace {
  if (ws.version === BLOCK_WORKSPACE_VERSION) return ws;
  // Noma'lum (kelajakdagi) versiyani o'qishga urinmaymiz — bo'sh maydon
  // buzilgan maydondan yaxshi.
  if (ws.version > BLOCK_WORKSPACE_VERSION) return emptyWorkspace();
  return { ...ws, version: BLOCK_WORKSPACE_VERSION };
}

/**
 * Ishonchsiz ma'lumotni xavfsiz holatga keltiradi.
 *
 * Noma'lum blok turlari, yo'q blokka havolalar, halqalar va ta'rifda
 * bo'lmagan uyalar tashlab yuboriladi. Import qilingan fayl ilovani
 * yiqitmasligi kerak — `storage.ts` dagi qoida bu yerda ham amal qiladi.
 */
export function sanitizeWorkspace(input: BlockWorkspace): BlockWorkspace {
  const ws = migrate(input);
  const blocks: Record<string, BlockNode> = {};

  // 1-qadam: faqat ta'rifi bor bloklar qoladi, uyalar ta'rifga moslanadi.
  for (const [id, raw] of Object.entries(ws.blocks).slice(0, MAX_BLOCKS)) {
    if (raw.id !== id) continue;
    const def = getBlockDefinition(raw.type);
    if (!def) continue;

    const fresh = createBlock(raw.type, id);
    if (!fresh) continue;

    for (const slot of def.slots) {
      const value = raw.fields[slot.name];
      if (value !== undefined && slot.name in fresh.fields) {
        fresh.fields[slot.name] = normalizeFieldValue(slot, value);
      }
      if (slot.kind === "value") fresh.inputs[slot.name] = raw.inputs[slot.name] ?? null;
      if (slot.kind === "statement") {
        fresh.statements[slot.name] = raw.statements[slot.name] ?? null;
      }
    }
    fresh.next = raw.next;
    blocks[id] = fresh;
  }

  // 2-qadam: mavjud bo'lmagan blokka havolalar uziladi.
  for (const block of Object.values(blocks)) {
    if (block.next && !blocks[block.next]) block.next = null;
    for (const [name, child] of Object.entries(block.inputs)) {
      if (child && !blocks[child]) block.inputs[name] = null;
    }
    for (const [name, child] of Object.entries(block.statements)) {
      if (child && !blocks[child]) block.statements[name] = null;
    }
  }

  // 3-qadam: bitta blok faqat BITTA joyda tursin va halqa bo'lmasin.
  // Ildizlardan yurib chiqamiz; yetib borilmagan bloklar ildizga aylanadi.
  const claimed = new Set<string>();
  const clean: BlockWorkspace = {
    version: BLOCK_WORKSPACE_VERSION,
    blocks,
    tops: {},
    variables: [],
  };

  const walk = (id: string) => {
    const block = blocks[id];
    if (!block) return;
    const detach = (setter: () => void, childId: string | null) => {
      if (!childId) return;
      if (claimed.has(childId) || !blocks[childId]) setter();
      else {
        claimed.add(childId);
        walk(childId);
      }
    };
    for (const name of Object.keys(block.inputs)) {
      detach(() => (block.inputs[name] = null), block.inputs[name] ?? null);
    }
    for (const name of Object.keys(block.statements)) {
      detach(() => (block.statements[name] = null), block.statements[name] ?? null);
    }
    detach(() => (block.next = null), block.next);
  };

  // Avval e'lon qilingan ildizlar, keyin qolgan yetim bloklar.
  const declaredTops = Object.keys(ws.tops).filter((id) => blocks[id]);
  for (const id of declaredTops) {
    if (claimed.has(id)) continue;
    claimed.add(id);
    walk(id);
  }
  for (const id of Object.keys(blocks)) {
    if (claimed.has(id)) continue;
    claimed.add(id);
    walk(id);
  }

  // 4-qadam: hech kimga ulanmagan bloklar ildiz sifatida joylashtiriladi.
  const parents = buildParentIndex(clean);
  let fallbackY = 40;
  for (const id of Object.keys(blocks)) {
    if (parents.has(id)) continue;
    const at = ws.tops[id];
    if (at && Number.isFinite(at.x) && Number.isFinite(at.y)) {
      clean.tops[id] = { x: Math.round(at.x), y: Math.round(at.y) };
    } else {
      clean.tops[id] = { x: 40, y: fallbackY };
      fallbackY += 60;
    }
  }

  // 5-qadam: o'zgaruvchilar — nomi yaroqli va takrorlanmaydiganlari.
  const names = new Set<string>();
  for (const variable of ws.variables.slice(0, MAX_VARIABLES)) {
    const name = variable.name.trim();
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(name)) continue;
    if (RESERVED_WORDS.has(name) || names.has(name)) continue;
    names.add(name);
    clean.variables.push({ id: variable.id, name, type: variable.type });
  }

  return clean;
}

export function parseWorkspace(data: unknown): BlockWorkspace | null {
  const parsed = blockWorkspaceSchema.safeParse(data);
  if (!parsed.success) return null;
  return sanitizeWorkspace(parsed.data);
}

/** Ish maydonida umuman blok bormi. */
export function isEmptyWorkspace(ws: BlockWorkspace): boolean {
  return Object.keys(ws.blocks).length === 0;
}
