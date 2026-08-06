/**
 * Klient va serverda birdek ishlaydigan matn yordamchilari.
 *
 * `@/lib/queries` `server-only` — undagi shu nomdagi funksiyalarni klient
 * komponentda import qilib bo'lmaydi, shuning uchun ular shu yerda ham bor.
 */

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || "?";
}

export function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] ?? name;
}

export function formatXp(n: number): string {
  return n.toLocaleString("ru-RU").replace(/,/g, " ");
}
