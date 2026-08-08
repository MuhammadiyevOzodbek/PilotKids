/**
 * O'zgaruvchi bloklari (§9).
 *
 * O'zgaruvchi ish maydonining O'ZIDA yashaydi (`workspace.variables`), blok
 * esa faqat uning NOMIGA ishora qiladi. Shu sababli nomni o'zgartirish
 * bitta joyda bajariladi va bloklar o'z-o'zidan yangilanadi
 * (`renameVariable`).
 *
 * E'lon (`int hisob = 0;`) bu yerda emas — uni `generator.ts` ning
 * `assemble()` qismi ish maydonidagi ro'yxatdan chiqaradi. Shunday qilib
 * hech qachon "ishlatilgan, lekin e'lon qilinmagan" o'zgaruvchi bo'lmaydi.
 */

import {
  PREC,
  type BlockDefinition,
  type BlockNode,
  type GenApi,
  type SlotContext,
} from "../types";

/** Ro'yxat ish maydonidagi o'zgaruvchilardan quriladi (§33 dagi bilan bir uslub). */
function variableOptions(ctx: SlotContext) {
  return ctx.variables.map((variable) => ({ value: variable.name, label: variable.name }));
}

/**
 * Blok ishora qilayotgan o'zgaruvchi nomi.
 *
 * O'zgaruvchi o'chirilgan yoki hali tanlanmagan bo'lsa `null` qaytadi:
 * shunda generator buzuq `= 5;` qatorini yozib qo'ymaydi, balki
 * ogohlantiradi va qatorni butunlay tashlab ketadi.
 */
function variableName(block: BlockNode, api: GenApi): string | null {
  const name = api.field(block, "VAR");
  if (name.length > 0 && api.variables.some((variable) => variable.name === name)) return name;

  api.warn({
    code: "missing-variable",
    messageKey: "blocks.warn.missingVariable",
    params: { name },
    blockId: block.id,
  });
  return null;
}

export const VARIABLE_BLOCKS: BlockDefinition[] = [
  {
    type: "variables_get",
    category: "variables",
    shape: "value",
    level: "advanced",
    output: "number",
    messageKey: "blocks.variables.get",
    tooltipKey: "blocks.variables.get.tip",
    slots: [{ kind: "dropdown", name: "VAR", options: variableOptions, default: "" }],
    generateValue: (block, api) => {
      const name = variableName(block, api);
      return { code: name ?? "0", prec: PREC.ATOM };
    },
  },
  {
    type: "variables_set",
    category: "variables",
    shape: "statement",
    level: "advanced",
    messageKey: "blocks.variables.set",
    tooltipKey: "blocks.variables.set.tip",
    slots: [
      { kind: "dropdown", name: "VAR", options: variableOptions, default: "" },
      { kind: "value", name: "VALUE", check: "number", inline: { kind: "number", default: 0 } },
    ],
    generateStatement: (block, api) => {
      const name = variableName(block, api);
      if (!name) return [];
      return [`${name} = ${api.value(block, "VALUE")};`];
    },
  },
  {
    type: "variables_change",
    category: "variables",
    shape: "statement",
    level: "advanced",
    messageKey: "blocks.variables.change",
    tooltipKey: "blocks.variables.change.tip",
    slots: [
      { kind: "dropdown", name: "VAR", options: variableOptions, default: "" },
      { kind: "value", name: "DELTA", check: "number", inline: { kind: "number", default: 1 } },
    ],
    generateStatement: (block, api) => {
      const name = variableName(block, api);
      if (!name) return [];
      return [`${name} += ${api.value(block, "DELTA")};`];
    },
  },
];
