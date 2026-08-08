/**
 * Kun kalitlari — kunlik faollik va ekran vaqti hisobi uchun.
 *
 * ── Nega server vaqti emas ──────────────────────────────────────────────
 * Server O'zbekistonda turmasligi mumkin (Vercel odatda UTC). Agar "bugun"
 * server vaqtidan olinsa, Toshkentda soat 02:00 da o'qigan bola uchun bu
 * hali KECHAGI kun bo'lardi — kunlik chegara va grafik bir necha soatga
 * siljib ketardi.
 *
 * Foydalanuvchi brauzeridagi vaqtga ham ishonib bo'lmaydi: uni o'zgartirib
 * ekran vaqti chegarasini chetlab o'tish mumkin edi. Shu bois kun
 * TOSHKENT mintaqasi bo'yicha, serverda hisoblanadi.
 */

/** Toshkent — UTC+5, yozgi vaqtga o'tish yo'q. */
export const TASHKENT_OFFSET_MINUTES = 5 * 60;

/** Hafta kunlari — 0 dan boshlanadi va DUSHANBADAN, yakshanbadan emas. */
export const WEEKDAY_LABELS = ["Du", "Se", "Ch", "Pa", "Ju", "Sh", "Ya"] as const;

/** Toshkent mintaqasidagi shu lahzaga mos `Date` (UTC maydonlari orqali o'qish uchun). */
function shifted(at: Date): Date {
  return new Date(at.getTime() + TASHKENT_OFFSET_MINUTES * 60_000);
}

/**
 * Kun kaliti: `YYYY-MM-DD` (Toshkent bo'yicha).
 *
 * Postgres `date` ustuni aynan shu ko'rinishni kutadi.
 */
export function dayKey(at: Date = new Date()): string {
  return shifted(at).toISOString().slice(0, 10);
}

/**
 * Hafta kuni indeksi: 0 = Dushanba … 6 = Yakshanba.
 *
 * JavaScript'da 0 = Yakshanba, bizda esa hafta dushanbadan boshlanadi —
 * grafik ham shunday chiziladi.
 */
export function weekdayIndex(at: Date = new Date()): number {
  return (shifted(at).getUTCDay() + 6) % 7;
}

/**
 * Oxirgi `count` kunning kalitlari — eng eskisidan bugungacha.
 *
 * Grafik shu tartibda chiziladi: chapda eng eski kun, o'ngda bugun.
 */
export function recentDays(count: number, at: Date = new Date()): string[] {
  const days: string[] = [];
  for (let back = count - 1; back >= 0; back -= 1) {
    days.push(dayKey(new Date(at.getTime() - back * 86_400_000)));
  }
  return days;
}

/** Kun kalitidan hafta kuni yorlig'i (`"Du"`, `"Se"` …). */
export function labelForDay(key: string): string {
  // Kalit UTC yarim tunini bildiradi, shuning uchun siljitish shart emas.
  const index = (new Date(`${key}T00:00:00Z`).getUTCDay() + 6) % 7;
  return WEEKDAY_LABELS[index] ?? "";
}
