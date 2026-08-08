/**
 * Mantiq bloklari (§7).
 *
 * Ikki xil blok bor:
 *   • C-shaklli buyruqlar — `if` va `if/else`;
 *   • olti burchakli shart bloklari — taqqoslash, `&&`/`||`, inkor.
 *
 * Qavslar QO'LDA qo'yilmaydi: har bir operator o'z darajasini (`PREC`)
 * e'lon qiladi va `binaryFragment` kerak bo'lgan joyga qavs qo'yadi.
 * Shuning uchun `a < 5 && b > 2` toza chiqadi, `!(a < 5)` esa qavsli.
 */

import { binaryFragment, indent } from "../generator";
import { PREC, type BlockDefinition, type Precedence } from "../types";

/** Taqqoslash operatorlari — C++ belgilari, tarjima qilinmaydi. */
const COMPARE_OPS = [
  { value: "<", label: "<" },
  { value: ">", label: ">" },
  { value: "==", label: "==" },
  { value: "!=", label: "!=" },
  { value: "<=", label: "<=" },
  { value: ">=", label: ">=" },
];

const BOOLEAN_LITERALS = [
  { value: "true", label: "true" },
  { value: "false", label: "false" },
];

const AND_OR_OPS = [
  { value: "&&", label: "&&" },
  { value: "||", label: "||" },
];

/**
 * Operatorning darajasi va o'ng operand uchun chegara.
 *
 * `rightMax` doim bir pog'ona kuchliroq: operatorlar chapga bog'lanadi,
 * shuning uchun `a == (b == c)` qavssiz yozilsa MA'NOSI o'zgarardi.
 */
const COMPARE_PREC: Record<string, { prec: Precedence; rightMax: Precedence }> = {
  "<": { prec: PREC.REL, rightMax: PREC.SHIFT },
  ">": { prec: PREC.REL, rightMax: PREC.SHIFT },
  "<=": { prec: PREC.REL, rightMax: PREC.SHIFT },
  ">=": { prec: PREC.REL, rightMax: PREC.SHIFT },
  "==": { prec: PREC.EQ, rightMax: PREC.REL },
  "!=": { prec: PREC.EQ, rightMax: PREC.REL },
};

const AND_OR_PREC: Record<string, { prec: Precedence; rightMax: Precedence }> = {
  "&&": { prec: PREC.AND, rightMax: PREC.BIT_OR },
  "||": { prec: PREC.OR, rightMax: PREC.AND },
};

export const LOGIC_BLOCKS: BlockDefinition[] = [
  {
    type: "logic_if",
    category: "logic",
    shape: "statement",
    level: "beginner",
    messageKey: "blocks.logic.if",
    tooltipKey: "blocks.logic.if.tip",
    slots: [
      { kind: "value", name: "IF", check: "boolean", inline: null },
      { kind: "statement", name: "DO" },
    ],
    generateStatement: (block, api) => [
      `if (${api.value(block, "IF")}) {`,
      ...indent(api.body(block, "DO")),
      "}",
    ],
  },
  {
    type: "logic_if_else",
    category: "logic",
    shape: "statement",
    level: "beginner",
    messageKey: "blocks.logic.ifElse",
    tooltipKey: "blocks.logic.ifElse.tip",
    slots: [
      { kind: "value", name: "IF", check: "boolean", inline: null },
      { kind: "statement", name: "DO" },
      { kind: "statement", name: "ELSE", labelKey: "blocks.logic.else" },
    ],
    generateStatement: (block, api) => [
      `if (${api.value(block, "IF")}) {`,
      ...indent(api.body(block, "DO")),
      "} else {",
      ...indent(api.body(block, "ELSE")),
      "}",
    ],
  },
  {
    type: "logic_compare",
    category: "logic",
    shape: "boolean",
    level: "beginner",
    output: "boolean",
    messageKey: "blocks.logic.compare",
    tooltipKey: "blocks.logic.compare.tip",
    slots: [
      { kind: "value", name: "A", check: "number", inline: { kind: "number", default: 0 } },
      { kind: "dropdown", name: "OP", options: COMPARE_OPS, default: "<" },
      { kind: "value", name: "B", check: "number", inline: { kind: "number", default: 0 } },
    ],
    generateValue: (block, api) => {
      // Noma'lum operator (buzuq fayl) `<` ga tushadi — kod baribir yaroqli qolsin.
      const raw = api.field(block, "OP");
      const op = COMPARE_PREC[raw] ? raw : "<";
      const rule = COMPARE_PREC[op]!;
      return binaryFragment(api, block, {
        left: "A",
        right: "B",
        op,
        prec: rule.prec,
        rightMax: rule.rightMax,
      });
    },
  },
  {
    type: "logic_and_or",
    category: "logic",
    shape: "boolean",
    level: "advanced",
    output: "boolean",
    messageKey: "blocks.logic.andOr",
    tooltipKey: "blocks.logic.andOr.tip",
    slots: [
      { kind: "value", name: "A", check: "boolean", inline: null },
      { kind: "dropdown", name: "OP", options: AND_OR_OPS, default: "&&" },
      { kind: "value", name: "B", check: "boolean", inline: null },
    ],
    generateValue: (block, api) => {
      const raw = api.field(block, "OP");
      const op = AND_OR_PREC[raw] ? raw : "&&";
      const rule = AND_OR_PREC[op]!;
      return binaryFragment(api, block, {
        left: "A",
        right: "B",
        op,
        prec: rule.prec,
        rightMax: rule.rightMax,
      });
    },
  },
  {
    type: "logic_not",
    category: "logic",
    shape: "boolean",
    level: "advanced",
    output: "boolean",
    messageKey: "blocks.logic.not",
    tooltipKey: "blocks.logic.not.tip",
    slots: [{ kind: "value", name: "A", check: "boolean", inline: null }],
    generateValue: (block, api) => ({
      // `!` faqat ATOM/UNARY ga yopishadi — `!(a < 5)` qavsi shu yerdan chiqadi.
      code: `!${api.value(block, "A", PREC.UNARY)}`,
      prec: PREC.UNARY,
    }),
  },
  {
    type: "logic_boolean",
    category: "logic",
    shape: "boolean",
    level: "beginner",
    output: "boolean",
    messageKey: "blocks.logic.boolean",
    tooltipKey: "blocks.logic.boolean.tip",
    slots: [{ kind: "dropdown", name: "VAL", options: BOOLEAN_LITERALS, default: "true" }],
    generateValue: (block, api) => ({
      code: api.field(block, "VAL") === "false" ? "false" : "true",
      prec: PREC.ATOM,
    }),
  },
];
