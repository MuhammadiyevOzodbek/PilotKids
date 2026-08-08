/**
 * Ish maydonining SXEMA bilan mosligini tekshiradi (§34).
 *
 * Bu generatordan MUTLAQO alohida qatlam va u bilan hech qanday aloqasi
 * yo'q: generator kod yozadi, validator esa «bu kod haqiqiy sxemada
 * ishlaydimi?» degan savolga javob beradi. Ikkalasi bir-birini chaqirmaydi.
 *
 * Sabab oddiy: kodni yozib bo'lmaydigan holat bilan «kod to'g'ri, lekin
 * sim ulanmagan» holati butunlay boshqa narsa. Ularni bitta funksiyaga
 * qo'shsak, «xato bormi?» degan savolga javob berish uchun kod hosil
 * qilish kerak bo'lardi va aksincha.
 *
 * Natija DETERMINISTIK: bloklar id bo'yicha tartiblanadi, shuning uchun
 * bir xil ish maydoni har doim bir xil ro'yxat beradi.
 */

import { boardPinFor } from "../netlist";
import { DIGITAL_PIN_OPTIONS, PWM_PIN_OPTIONS } from "./pins";
import { getBlockDefinition } from "./registry";
import type { BlockIssue, BlockValidationContext, BlockWorkspace, SlotDef } from "./types";

/**
 * `Serial` D0 va D1 pinlarini band qiladi (RX/TX).
 *
 * Ular bir vaqtda ishlatilsa Serial monitor «axlat» ko'rsatadi yoki plata
 * kod yuklashni rad etadi — bu bolani uzoq vaqt boshi berk ko'chaga olib
 * kiradigan xato, shuning uchun alohida ogohlantiriladi.
 */
const SERIAL_RESERVED_PINS = new Set(["0", "1"]);

/** Uya raqamli pin tanlaydimi (ro'yxat AYNAN pin ro'yxati bo'lsa). */
function isDigitalPinSlot(slot: SlotDef): boolean {
  return (
    slot.kind === "dropdown" &&
    (slot.options === DIGITAL_PIN_OPTIONS || slot.options === PWM_PIN_OPTIONS)
  );
}

/**
 * Ish maydonidagi barcha muammolar.
 *
 * Blokka xos tekshiruvlar `BlockDefinition.validate` da — har bir blok
 * o'zi haqidagi qoidani o'zi biladi. Bu yerda faqat BLOKLAR ORASIDAGI
 * va sxema darajasidagi qoidalar qoladi.
 */
export function validateWorkspace(ws: BlockWorkspace, ctx: BlockValidationContext): BlockIssue[] {
  const issues: BlockIssue[] = [];
  const ids = Object.keys(ws.blocks).sort();

  let usesSerial = false;
  const serialPinBlocks: { blockId: string; pin: string }[] = [];
  const motorBlockIds: string[] = [];

  for (const id of ids) {
    const block = ws.blocks[id]!;
    const def = getBlockDefinition(block.type);
    if (!def) continue;

    if (def.category === "serial") usesSerial = true;
    if (def.category === "motors") motorBlockIds.push(id);

    for (const slot of def.slots) {
      if (!isDigitalPinSlot(slot)) continue;
      const value = block.fields[slot.name] ?? "";
      if (SERIAL_RESERVED_PINS.has(value)) serialPinBlocks.push({ blockId: id, pin: value });
    }

    issues.push(...(def.validate?.(block, ctx) ?? []));
  }

  // D0/D1 faqat Serial bilan BIRGA ishlatilganda muammo bo'ladi.
  if (usesSerial) {
    for (const { blockId, pin } of serialPinBlocks) {
      issues.push({
        blockId,
        severity: "warning",
        messageKey: "blocks.issue.serialPinConflict",
        params: { pin },
      });
    }
  }

  issues.push(...directMotorIssues(ctx, motorBlockIds));
  return issues;
}

/**
 * DC motor to'g'ridan-to'g'ri Arduino piniga ulanganmi.
 *
 * Arduino pini ~20 mA beradi, oddiy DC motor esa yuz milliamperlar
 * talab qiladi: motor aylanmaydi va plata shikastlanishi mumkin. Shuning
 * uchun bu XATO emas, OGOHLANTIRISH — sxema ishlaydi, lekin haqiqiy
 * platada ishlamaydi va bola buni bilishi kerak.
 *
 * Ogohlantirish motor bloklariga biriktiriladi: ish maydonida motor bloki
 * bo'lmasa, bu sxema kamchiligi hali dasturga aloqador emas.
 */
function directMotorIssues(ctx: BlockValidationContext, motorBlockIds: string[]): BlockIssue[] {
  if (motorBlockIds.length === 0) return [];

  const direct = ctx.circuit.nodes.some(
    (node) =>
      node.type === "dc-motor" &&
      (boardPinFor(ctx.netlist, node.id, "t1") !== null ||
        boardPinFor(ctx.netlist, node.id, "t2") !== null),
  );
  if (!direct) return [];

  return motorBlockIds.map((blockId) => ({
    blockId,
    severity: "warning" as const,
    messageKey: "blocks.issue.motorNeedsDriver",
  }));
}

/** Blok id → shu blokdagi eng jiddiy muammo (UI blokni bo'yash uchun). */
export function issuesByBlock(issues: readonly BlockIssue[]): Map<string, BlockIssue["severity"]> {
  const map = new Map<string, BlockIssue["severity"]>();
  for (const issue of issues) {
    if (issue.severity === "error" || !map.has(issue.blockId)) {
      map.set(issue.blockId, issue.severity);
    }
  }
  return map;
}
