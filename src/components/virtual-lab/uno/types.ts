/**
 * PilotKids UNO chizmasining umumiy tiplari.
 *
 * Chizma bir nechta fayl orasida bo'lingani uchun ular shu yerda turadi —
 * har bir bo'lak bir xil "til"da gaplashadi.
 */

/**
 * Zoom darajasiga qarab qancha detal ko'rsatilishi.
 *
 * - `low`  — plata, header qatorlari, USB/DC, chip, brend. Uzoqdan shundan
 *   ortig'i baribir o'qilmaydi, chizish esa sekinlashadi.
 * - `mid`  — yozuvlar, indikatorlar, o'tkazgich yo'llari.
 * - `high` — SMD elementlar, lehim maydonchalari, via'lar, chip oyoqlari.
 */
export type BoardDetail = "low" | "mid" | "high";

/** `mid` va undan yuqori — ya'ni yozuvlarni ko'rsatsa bo'ladi. */
export function atLeastMid(detail: BoardDetail): boolean {
  return detail !== "low";
}

/** Faqat eng yaqin zoomda ko'rinadigan mayda detallar. */
export function isHigh(detail: BoardDetail): boolean {
  return detail === "high";
}

/**
 * Bitta chizma nusxasidagi SVG `id` lari.
 *
 * `id` hujjat bo'yicha global — bir nechta plata qo'yilganda gradientlar
 * to'qnashmasligi uchun har bir nusxa o'z prefiksini oladi.
 */
export interface BoardIds {
  pcb: string;
  pcbShade: string;
  metal: string;
  metalDark: string;
  chip: string;
  plastic: string;
  depth: string;
  clip: string;
}

export function makeBoardIds(uid: string): BoardIds {
  return {
    pcb: `${uid}-pcb`,
    pcbShade: `${uid}-pcb-shade`,
    metal: `${uid}-metal`,
    metalDark: `${uid}-metal-dark`,
    chip: `${uid}-chip`,
    plastic: `${uid}-plastic`,
    depth: `${uid}-depth`,
    clip: `${uid}-clip`,
  };
}

/**
 * Bitta pinning ko'rinish holati.
 *
 * `ok`/`error` — sim tortilayotgan paytdagi javob ("bu yerga ulasa bo'ladi"),
 * qolganlari esa pinning o'z holati. `disabled` — plata o'chirilgan.
 */
export type BoardPinState = "idle" | "connected" | "high" | "low" | "ok" | "error" | "disabled";

/** Silkscreen uchun texnik sans-serif. */
export const BOARD_FONT = "var(--font-sans), ui-sans-serif, system-ui, sans-serif";
