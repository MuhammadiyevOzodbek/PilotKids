import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Tailwind klasslarni xavfsiz birlashtiradi (konfliktlarni hal qiladi). */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
