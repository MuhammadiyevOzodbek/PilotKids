/**
 * Blokli dasturlash — asosiy turlar.
 *
 * Bu fayl blok tizimining shartnomasi. Uch qatlam bir-biridan mustaqil:
 *
 *   1. MODEL  (`workspace.ts`)  — bloklar qanday saqlanadi va ulanadi.
 *   2. TA'RIF (`defs/*.ts`)     — har bir blok nima ko'rinishda va qanday
 *                                 Arduino kodi hosil qiladi.
 *   3. GENERATOR (`generator.ts`) — modeldan matn quradi.
 *
 * Muhim qoida: ta'riflar ichida hech qachon o'zbekcha matn yozilmaydi —
 * faqat i18n kaliti (`messages.ts`). Shunda ru/en qo'shish bitta jadval
 * qo'shishga aylanadi.
 */

/* ─────────────────────────── Kategoriyalar ─────────────────────────── */

export type BlockCategoryId =
  | "events"
  | "control"
  | "pins"
  | "logic"
  | "math"
  | "variables"
  | "sensors"
  | "output"
  | "motors"
  | "display"
  | "serial"
  | "functions";

export const BLOCK_CATEGORIES: readonly BlockCategoryId[] = [
  "events",
  "control",
  "pins",
  "logic",
  "math",
  "variables",
  "sensors",
  "output",
  "motors",
  "display",
  "serial",
  "functions",
];

/**
 * Blok qaysi darajaga tegishli (§32).
 *
 * `beginner` — "LEDni yoq" uslubidagi yuqori darajali bloklar.
 * `advanced` — `pinMode`, `digitalWrite`, o'zgaruvchilar, mantiq.
 * Palitrada daraja filtri shu maydonga qaraydi.
 */
export type BlockLevel = "beginner" | "advanced";

/* ─────────────────────────── Blok shakli ─────────────────────────── */

/**
 * `hat`      — ustiga ulanmaydigan boshlanish bloki (`setup`, `loop`).
 * `statement` — buyruq: yuqoridan va pastdan ulanadi.
 * `value`     — son/matn qaytaradigan "reporter" (ovalsimon).
 * `boolean`   — shart qaytaradigan reporter (olti burchakli).
 */
export type BlockShape = "hat" | "statement" | "value" | "boolean";

/** Qiymat uyasiga nima ulanishi mumkinligi. */
export type ValueCheck = "number" | "boolean" | "string" | "any";

/* ─────────────────────────── Uyalar (slots) ─────────────────────────── */

export interface DropdownOption {
  value: string;
  /** Tayyor matn (pin nomi kabi) — tarjima talab qilmaydi. */
  label: string;
}

/**
 * Ro'yxat variantlari.
 *
 * Funksiya ko'rinishi component-aware bloklar uchun kerak: sxemadagi LEDlar
 * ro'yxati har o'zgarishda qayta hisoblanadi (§33).
 */
export type DropdownSource = readonly DropdownOption[] | ((ctx: SlotContext) => DropdownOption[]);

/** Ro'yxatni hisoblash uchun kerak bo'ladigan kontekst. */
export interface SlotContext {
  /** Sxemadagi komponentlar — component-aware ro'yxatlar uchun. */
  circuit: import("../types").Circuit;
  /** Ish maydonidagi o'zgaruvchilar. */
  variables: readonly WorkspaceVariable[];
}

export type SlotDef =
  | {
      kind: "dropdown";
      name: string;
      options: DropdownSource;
      default: string;
    }
  | {
      kind: "number";
      name: string;
      default: number;
      min?: number;
      max?: number;
      step?: number;
    }
  | {
      kind: "text";
      name: string;
      default: string;
      maxLength?: number;
    }
  | {
      kind: "value";
      name: string;
      check: ValueCheck;
      /**
       * Uya bo'sh turganda ko'rinadigan ichki qiymat.
       *
       * Scratch/Entry'dagi "shadow" g'oyasi: bola blokni ulamasdan ham
       * to'g'ridan-to'g'ri son yozishi mumkin. Qiymat `fields[name]` da
       * matn ko'rinishida saqlanadi.
       */
      inline: { kind: "number"; default: number } | { kind: "text"; default: string } | null;
    }
  | {
      kind: "statement";
      name: string;
    };

/* ─────────────────────────── Blok ta'rifi ─────────────────────────── */

/** Kod ifodasining bog'lanish kuchi — ortiqcha qavs qo'yilmasligi uchun. */
export const PREC = {
  ATOM: 0,
  UNARY: 1,
  MUL: 2,
  ADD: 3,
  SHIFT: 4,
  REL: 5,
  EQ: 6,
  BIT_AND: 7,
  BIT_XOR: 8,
  BIT_OR: 9,
  AND: 10,
  OR: 11,
  TERNARY: 12,
} as const;

export type Precedence = (typeof PREC)[keyof typeof PREC];

/** Qiymat bloki qaytaradigan natija. */
export interface CodeFragment {
  code: string;
  prec: Precedence;
}

export interface BlockDefinition {
  /** Turg'un identifikator — saqlangan loyihalarda shu yoziladi. */
  type: string;
  category: BlockCategoryId;
  shape: BlockShape;
  level: BlockLevel;
  /**
   * Yorliq shabloni uchun i18n kaliti.
   * Shablonda `{name}` ko'rinishidagi joy egallovchilar uyalarga mos keladi:
   * `"{pin} pinini {mode} qil"`.
   */
  messageKey: string;
  /** Tooltip i18n kaliti (§40). */
  tooltipKey?: string;
  slots: SlotDef[];
  /** `value`/`boolean` bloklar nima qaytaradi. */
  output?: ValueCheck;
  /** Bu blok talab qiladigan Arduino kutubxonalari (§36). */
  requiresLibrary?: readonly string[];
  /** Buyruq bloki uchun kod qatorlari. */
  generateStatement?: (block: BlockNode, api: GenApi) => string[];
  /** Qiymat bloki uchun ifoda. */
  generateValue?: (block: BlockNode, api: GenApi) => CodeFragment;
  /** Sxema bilan bog'liq tekshiruv (§34) — generatordan alohida. */
  validate?: (block: BlockNode, ctx: BlockValidationContext) => BlockIssue[];
}

/* ─────────────────────────── Model ─────────────────────────── */

/** Ish maydonidagi bitta blok nusxasi. */
export interface BlockNode {
  id: string;
  type: string;
  /** Ro'yxat/son/matn uyalarining qiymatlari (doim matn sifatida saqlanadi). */
  fields: Record<string, string>;
  /** Qiymat uyasi → ulangan blok id (bo'sh bo'lsa `null`). */
  inputs: Record<string, string | null>;
  /** Ichki stek uyasi → stekdagi birinchi blok id. */
  statements: Record<string, string | null>;
  /** Shu blokdan keyin keladigan blok (faqat `statement`/`hat` uchun). */
  next: string | null;
}

export interface WorkspaceVariable {
  id: string;
  name: string;
  type: "int" | "float" | "bool" | "String";
}

/** Ish maydonining joriy formati. Migratsiya uchun ortadi (§29). */
export const BLOCK_WORKSPACE_VERSION = 1;

export interface BlockWorkspace {
  version: number;
  blocks: Record<string, BlockNode>;
  /** Hech kimga ulanmagan (ildiz) bloklarning ish maydonidagi o'rni. */
  tops: Record<string, { x: number; y: number }>;
  variables: WorkspaceVariable[];
}

/* ─────────────────────────── Generator API ─────────────────────────── */

export interface GenWarning {
  /** Mashina o'qiy oladigan kod: `serial-begin-missing`, `orphan-block` … */
  code: string;
  /** i18n kaliti. */
  messageKey: string;
  /** Kalitga qo'yiladigan qiymatlar. */
  params?: Record<string, string | number>;
  /** Qaysi blokka tegishli (bo'lsa). */
  blockId?: string;
}

/**
 * Blok generatorlariga beriladigan yordamchi.
 *
 * Generatorlar hech qachon global holatga tegmaydi — hamma narsa shu
 * obyekt orqali o'tadi, shuning uchun natija deterministik (§26).
 */
export interface GenApi {
  /** Ro'yxat/son/matn uyasining xom qiymati. */
  field(block: BlockNode, name: string): string;
  /** Qiymat uyasini son ifodasi sifatida oladi. */
  value(block: BlockNode, name: string, maxPrec?: Precedence): string;
  /** Qiymat uyasini matn ifodasi sifatida oladi (qo'shtirnoq bilan). */
  textValue(block: BlockNode, name: string): string;
  /** Ichki stekning kod qatorlari. */
  body(block: BlockNode, name: string): string[];

  /** `#include <Servo.h>` — bir marta yoziladi. */
  include(header: string): void;
  /** Global e'lon: `key` bo'yicha takrorlanmaydi. */
  global(key: string, lines: string | string[]): void;
  /** `setup()` boshiga qo'shiladigan qator (masalan `servo1.attach(9);`). */
  setupLine(key: string, lines: string | string[]): void;
  /** Yordamchi funksiya (masalan HC-SR04 uchun masofa o'lchash). */
  helper(key: string, lines: string[]): void;
  /** Takrorlanmaydigan C++ identifikatori yaratadi. */
  uniqueName(base: string): string;
  warn(warning: GenWarning): void;

  /** Sxema — component-aware bloklar uchun. */
  readonly circuit: import("../types").Circuit;
  readonly variables: readonly WorkspaceVariable[];
}

export interface GeneratedProgram {
  code: string;
  /** Ishlatilgan kutubxonalar (`Servo`, `LiquidCrystal`, `DHT`). */
  libraries: string[];
  warnings: GenWarning[];
}

/* ─────────────────────────── Tekshiruv ─────────────────────────── */

export type BlockIssueSeverity = "error" | "warning";

export interface BlockIssue {
  blockId: string;
  severity: BlockIssueSeverity;
  messageKey: string;
  params?: Record<string, string | number>;
}

export interface BlockValidationContext {
  circuit: import("../types").Circuit;
  netlist: import("../netlist").Netlist;
  variables: readonly WorkspaceVariable[];
}
