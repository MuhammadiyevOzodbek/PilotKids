/**
 * Matematika bloklari (§8).
 *
 * Hammasi `value` shaklida: ular boshqa blokning uyasiga tushadi va ifoda
 * qaytaradi. Chiqadigan funksiyalar Arduino API'sining o'zi — `map`,
 * `constrain`, `random`, `min`, `max` — shuning uchun bola blokdan kodga
 * o'tganda begona nom ko'rmaydi.
 */

import { binaryFragment, numberLiteral } from "../generator";
import { PREC, type BlockDefinition, type Precedence } from "../types";

const ARITHMETIC_OPS = [
  { value: "+", label: "+" },
  { value: "-", label: "−" },
  { value: "*", label: "×" },
  { value: "/", label: "÷" },
  { value: "%", label: "%" },
];

const MIN_MAX_OPS = [
  { value: "min", label: "min" },
  { value: "max", label: "max" },
];

/** Operator darajasi; `rightMax` bir pog'ona kuchliroq (`a - (b - c)` uchun). */
const ARITHMETIC_PREC: Record<string, { prec: Precedence; rightMax: Precedence }> = {
  "+": { prec: PREC.ADD, rightMax: PREC.MUL },
  "-": { prec: PREC.ADD, rightMax: PREC.MUL },
  "*": { prec: PREC.MUL, rightMax: PREC.UNARY },
  "/": { prec: PREC.MUL, rightMax: PREC.UNARY },
  "%": { prec: PREC.MUL, rightMax: PREC.UNARY },
};

export const MATH_BLOCKS: BlockDefinition[] = [
  {
    type: "math_number",
    category: "math",
    shape: "value",
    level: "beginner",
    output: "number",
    messageKey: "blocks.math.number",
    tooltipKey: "blocks.math.number.tip",
    slots: [{ kind: "number", name: "NUM", default: 0 }],
    generateValue: (block, api) => {
      const code = numberLiteral(api.field(block, "NUM"));
      // Manfiy son `-` operatorining o'ng tomonida qavs talab qilishi mumkin,
      // shuning uchun u ATOM emas, UNARY darajasida beriladi.
      return { code, prec: code.startsWith("-") ? PREC.UNARY : PREC.ATOM };
    },
  },
  {
    type: "math_arithmetic",
    category: "math",
    shape: "value",
    level: "advanced",
    output: "number",
    messageKey: "blocks.math.arithmetic",
    tooltipKey: "blocks.math.arithmetic.tip",
    slots: [
      { kind: "value", name: "A", check: "number", inline: { kind: "number", default: 1 } },
      { kind: "dropdown", name: "OP", options: ARITHMETIC_OPS, default: "+" },
      { kind: "value", name: "B", check: "number", inline: { kind: "number", default: 1 } },
    ],
    generateValue: (block, api) => {
      const raw = api.field(block, "OP");
      const op = ARITHMETIC_PREC[raw] ? raw : "+";
      const rule = ARITHMETIC_PREC[op]!;
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
    type: "math_random",
    category: "math",
    shape: "value",
    level: "advanced",
    output: "number",
    messageKey: "blocks.math.random",
    tooltipKey: "blocks.math.random.tip",
    slots: [
      { kind: "value", name: "FROM", check: "number", inline: { kind: "number", default: 1 } },
      { kind: "value", name: "TO", check: "number", inline: { kind: "number", default: 10 } },
    ],
    generateValue: (block, api) => ({
      code: `random(${api.value(block, "FROM")}, ${api.value(block, "TO")})`,
      prec: PREC.ATOM,
    }),
  },
  {
    type: "math_map",
    category: "math",
    shape: "value",
    level: "beginner",
    output: "number",
    messageKey: "blocks.math.map",
    tooltipKey: "blocks.math.map.tip",
    slots: [
      { kind: "value", name: "VALUE", check: "number", inline: { kind: "number", default: 0 } },
      { kind: "number", name: "FROM_LOW", default: 0 },
      { kind: "number", name: "FROM_HIGH", default: 1023 },
      { kind: "number", name: "TO_LOW", default: 0 },
      { kind: "number", name: "TO_HIGH", default: 255 },
    ],
    generateValue: (block, api) => {
      const bounds = ["FROM_LOW", "FROM_HIGH", "TO_LOW", "TO_HIGH"]
        .map((name) => numberLiteral(api.field(block, name)))
        .join(", ");
      return { code: `map(${api.value(block, "VALUE")}, ${bounds})`, prec: PREC.ATOM };
    },
  },
  {
    type: "math_min_max",
    category: "math",
    shape: "value",
    level: "advanced",
    output: "number",
    messageKey: "blocks.math.minMax",
    tooltipKey: "blocks.math.minMax.tip",
    slots: [
      { kind: "value", name: "A", check: "number", inline: { kind: "number", default: 0 } },
      { kind: "value", name: "B", check: "number", inline: { kind: "number", default: 0 } },
      { kind: "dropdown", name: "OP", options: MIN_MAX_OPS, default: "min" },
    ],
    generateValue: (block, api) => ({
      code: `${api.field(block, "OP") === "max" ? "max" : "min"}(${api.value(block, "A")}, ${api.value(block, "B")})`,
      prec: PREC.ATOM,
    }),
  },
  {
    type: "math_constrain",
    category: "math",
    shape: "value",
    level: "advanced",
    output: "number",
    messageKey: "blocks.math.constrain",
    tooltipKey: "blocks.math.constrain.tip",
    slots: [
      { kind: "value", name: "VALUE", check: "number", inline: { kind: "number", default: 0 } },
      { kind: "value", name: "LOW", check: "number", inline: { kind: "number", default: 0 } },
      { kind: "value", name: "HIGH", check: "number", inline: { kind: "number", default: 255 } },
    ],
    generateValue: (block, api) => ({
      code: `constrain(${api.value(block, "VALUE")}, ${api.value(block, "LOW")}, ${api.value(block, "HIGH")})`,
      prec: PREC.ATOM,
    }),
  },
];
