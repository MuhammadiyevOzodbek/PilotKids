/**
 * Breadboard geometriyasi — yagona manba.
 *
 * Katalog (pin koordinatalari) ham, chizma (teshiklar) ham shu fayldan
 * o'qiydi. Shu tufayli sim ulanadigan nuqta bilan ekranda ko'rinadigan
 * teshik hech qachon bir-biridan ajralib ketmaydi — plata (`uno-layout`)
 * da ishlagan yondashuvning aynan o'zi.
 *
 * Haqiqiy yarim o'lchamli breadboard: o'rtada kanal, uning ikki tomonida
 * beshtadan teshikli ustunlar (a–e va f–j), yuqori va pastda esa ikkitadan
 * quvvat relsi. Elektr qoidasi:
 *   • bitta ustunning besh teshigi o'zaro ulangan;
 *   • kanalning ikki tomoni ulanmagan (mikrosxema shuning uchun o'rnatiladi);
 *   • rels bo'ylab barcha teshiklar ulangan.
 */

/** Teshiklar orasidagi masofa (2.54 mm ga mos keladigan chizma birligi). */
export const BB_PITCH = 18;

/** Ustunlar soni. 24 — eski saqlangan sxemalardagi pin nomlari bilan mos. */
export const BB_COLUMNS = 24;

/** Har bir yarimdagi qatorlar: a–e va f–j. */
export const BB_ROWS = 5;

export const BB_VIEWBOX = { width: 480, height: 320 } as const;

/** Birinchi ustunning markazi. */
const COL_X0 = 32;

/** Qator markazlari — chizma ham, pinlar ham shu jadvalga tayanadi. */
export const BB_Y = {
  railTopPlus: 22,
  railTopMinus: 40,
  /** Yuqori yarimning birinchi qatori (a). Qolganlari +BB_PITCH. */
  topRow0: 76,
  /** Pastki yarimning birinchi qatori (f). */
  bottomRow0: 188,
  railBottomMinus: 282,
  railBottomPlus: 300,
} as const;

/** O'rtadagi kanal (mikrosxema oyoqchalari uchun). */
export const BB_CHANNEL = { y: 158, height: 20 } as const;

/** Yarim nomlari: chizmada a–e va f–j deb belgilanadi. */
export const BB_ROW_LABELS = {
  top: ["a", "b", "c", "d", "e"],
  bottom: ["f", "g", "h", "i", "j"],
} as const;

export type BreadboardHoleKind = "strip" | "rail";
export type BreadboardHalf = "top" | "bottom";

export interface BreadboardHole {
  /** Pin identifikatori — saqlangan sxemalardagi nom bilan bir xil. */
  id: string;
  /** Foydalanuvchiga ko'rsatiladigan nom: "a1", "+ (yuqori rels)". */
  label: string;
  kind: BreadboardHoleKind;
  x: number;
  y: number;
  /** Bir xil qiymatga ega teshiklar o'zaro ulangan. */
  group: string;
}

export function bbColumnX(col: number): number {
  return COL_X0 + col * BB_PITCH;
}

/**
 * Barcha teshiklar.
 *
 * Ustun teshiklarining nomi eski sxemadagidek `t{ustun}-{qator}` va
 * `b{ustun}-{qator}`: shunda ilgari saqlangan loyihalardagi simlar
 * uzilmaydi, chunki eski nomlar yangi to'plamning qismi bo'lib qoladi.
 */
export function breadboardHoles(): BreadboardHole[] {
  const holes: BreadboardHole[] = [];

  const halves: { half: BreadboardHalf; prefix: "t" | "b"; y0: number }[] = [
    { half: "top", prefix: "t", y0: BB_Y.topRow0 },
    { half: "bottom", prefix: "b", y0: BB_Y.bottomRow0 },
  ];

  for (const { half, prefix, y0 } of halves) {
    for (let col = 1; col <= BB_COLUMNS; col++) {
      for (let row = 1; row <= BB_ROWS; row++) {
        holes.push({
          id: `${prefix}${col}-${row}`,
          label: `${BB_ROW_LABELS[half][row - 1]}${col}`,
          kind: "strip",
          x: bbColumnX(col - 1),
          y: y0 + (row - 1) * BB_PITCH,
          group: `breadboard:${half}:${col}`,
        });
      }
    }
  }

  const rails: { id: string; label: string; y: number; group: string }[] = [
    { id: "pt", label: "+ (yuqori rels)", y: BB_Y.railTopPlus, group: "breadboard:rail:top-plus" },
    {
      id: "nt",
      label: "− (yuqori rels)",
      y: BB_Y.railTopMinus,
      group: "breadboard:rail:top-minus",
    },
    {
      id: "nb",
      label: "− (pastki rels)",
      y: BB_Y.railBottomMinus,
      group: "breadboard:rail:bottom-minus",
    },
    {
      id: "pb",
      label: "+ (pastki rels)",
      y: BB_Y.railBottomPlus,
      group: "breadboard:rail:bottom-plus",
    },
  ];

  for (const rail of rails) {
    for (let col = 1; col <= BB_COLUMNS; col++) {
      holes.push({
        id: `${rail.id}${col}`,
        label: `${rail.label} ${col}`,
        kind: "rail",
        x: bbColumnX(col - 1),
        y: rail.y,
        group: rail.group,
      });
    }
  }

  return holes;
}

/** Chizmadagi mutlaq koordinatani 0–1 nisbatga o'giradi. */
export function bbRatio(hole: { x: number; y: number }): { x: number; y: number } {
  return { x: hole.x / BB_VIEWBOX.width, y: hole.y / BB_VIEWBOX.height };
}
