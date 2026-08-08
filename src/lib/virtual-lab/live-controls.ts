/**
 * Simulyatsiya PAYTIDA o'zgartiriladigan sozlamalar.
 *
 * Ba'zi komponentlar tashqi dunyoni ifodalaydi: potensiometr burilgan,
 * xonada yorug'lik shuncha, tugma bosilgan. Ularning qiymati sxemaning
 * bir qismi emas — u foydalanuvchi qo'lida va simulyatsiya ketayotganda
 * ham o'zgarishi kerak.
 *
 * Bu jadval IKKI joyda ishlatiladi:
 *
 *   1. Inspektor — qaysi komponentga "jonli" boshqaruv chizish kerak;
 *   2. Qayta ishga tushirish tekshiruvi — qaysi sozlama o'zgarsa
 *      simulyatorni QAYTA QURISH shart emas (`needsSimulationRestart`).
 *
 * Ilgari bu ro'yxat ikkala laboratoriyada alohida yozilgandi va 3D
 * versiyasi umuman yo'q edi — natijada 3D da potensiometrni burish
 * simulyatorga yetib bormasdi.
 */

export interface LiveControl {
  /** `CircuitNode.settings` dagi kalit. */
  key: string;
  label: string;
  /** Suriluvchi qiymatmi yoki yoqib-o'chiriladiganmi. */
  kind: "range" | "toggle";
  min: number;
  max: number;
  unit?: string;
}

/**
 * Komponent turi → jonli boshqaruv.
 *
 * `min`/`max` boshqaruv turiga qarab o'qiladi: `toggle` uchun ular
 * 0 va 1, ya'ni simulyatorga yuboriladigan qiymatlar.
 */
export const LIVE_CONTROLS: Readonly<Record<string, LiveControl>> = {
  potentiometer: { key: "value", label: "Buralish", kind: "range", min: 0, max: 1023 },
  ldr: { key: "light", label: "Yorug'lik", kind: "range", min: 0, max: 1023 },
  ultrasonic: { key: "distance", label: "Masofa", kind: "range", min: 2, max: 400, unit: "sm" },
  tmp36: { key: "temperature", label: "Harorat", kind: "range", min: -40, max: 125, unit: "°C" },
  "soil-moisture": { key: "moisture", label: "Namlik", kind: "range", min: 0, max: 100, unit: "%" },
  "push-button": { key: "pressed", label: "Bosilgan", kind: "toggle", min: 0, max: 1 },
  pir: { key: "motion", label: "Harakat", kind: "toggle", min: 0, max: 1 },
};

/** Faqat suriluvchi boshqaruvlar — inspektorda slayder sifatida chiziladi. */
export const SENSOR_CONTROLS: Readonly<Record<string, LiveControl>> = Object.fromEntries(
  Object.entries(LIVE_CONTROLS).filter(([, control]) => control.kind === "range"),
);

/**
 * Tur → jonli sozlama kaliti.
 *
 * Shu kalitning o'zgarishi simulyatorni qayta qurishga MAJBUR QILMAYDI:
 * u sensor qiymati sifatida ishlayotgan simulyatorga uzatiladi.
 */
export const LIVE_SETTING_KEYS: Readonly<Record<string, string>> = Object.fromEntries(
  Object.entries(LIVE_CONTROLS).map(([type, control]) => [type, control.key]),
);

export function liveControlFor(type: string): LiveControl | undefined {
  return LIVE_CONTROLS[type];
}
