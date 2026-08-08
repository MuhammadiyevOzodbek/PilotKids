/**
 * Blok ro'yxatlaridagi Arduino pinlari.
 *
 * Ro'yxat `uno-layout.ts` dan olinadi — plata chizmasi bilan bitta manba.
 * Shu sababli dropdownda platada mavjud BO'LMAGAN pin hech qachon chiqmaydi
 * (§4), PWM ro'yxatida esa faqat `~` belgili pinlar bo'ladi (§5).
 */

import { UNO_PINS } from "../uno-layout";
import type { DropdownOption } from "./types";

/**
 * Raqamli pinlar: D0–D13 (PWM ham raqamli).
 *
 * `~` belgisi yorliqda saqlanadi — platadagi silkscreen bilan bir xil,
 * shunda bola "qaysi pinga analogWrite ishlaydi?" degan savolga ro'yxatning
 * o'zidan javob topadi.
 */
export const DIGITAL_PIN_OPTIONS: readonly DropdownOption[] = UNO_PINS.filter(
  (p) => p.kind === "digital" || p.kind === "pwm",
).map((p) => ({
  value: String(pinNumber(p.id)),
  label: p.kind === "pwm" ? `${p.id} ~` : p.id,
}));

/** PWM (`analogWrite`) qo'llaydigan pinlar: ~3, ~5, ~6, ~9, ~10, ~11. */
export const PWM_PIN_OPTIONS: readonly DropdownOption[] = UNO_PINS.filter(
  (p) => p.kind === "pwm",
).map((p) => ({ value: String(pinNumber(p.id)), label: `${p.id} ~` }));

/**
 * Analog kirishlar: A0–A5.
 *
 * Qiymat sifatida `A0` matni saqlanadi, raqam emas. Sabab: hosil bo'lgan
 * kodda `analogRead(A0)` yozilishi kerak — bola darslikdagi kod bilan
 * bir xilini ko'radi. Parser `A0` ni tanishga qodir.
 */
export const ANALOG_PIN_OPTIONS: readonly DropdownOption[] = UNO_PINS.filter(
  (p) => p.kind === "analog",
).map((p) => ({ value: p.id, label: p.id }));

function pinNumber(id: string): number {
  return Number(id.slice(1));
}

/** Raqamli pin ro'yxatidagi qiymat haqiqiy pinmi. */
export function isDigitalPin(value: string): boolean {
  return DIGITAL_PIN_OPTIONS.some((o) => o.value === value);
}

export function isPwmPin(value: string): boolean {
  return PWM_PIN_OPTIONS.some((o) => o.value === value);
}

export function isAnalogPin(value: string): boolean {
  return ANALOG_PIN_OPTIONS.some((o) => o.value === value);
}
