"use server";

import { or, ilike } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { course, lesson } from "@/lib/db/schema";
import { requireUser } from "@/lib/auth/session";
import { enforceLimit, RateLimitError } from "@/lib/rate-limit";
import { firstError } from "@/lib/validation";

/** Qidiruv so'rovi — juda qisqa/uzun so'rovlar bazaga umuman bormaydi. */
const querySchema = z.string().trim().min(2, "Kamida 2 belgi kiriting").max(60, "So'rov juda uzun");

export type SearchHit =
  | { kind: "course"; id: string; title: string; subtitle: string; href: string; icon: string }
  | { kind: "lesson"; id: string; title: string; subtitle: string; href: string; icon: string };

export type SearchResult = { ok: true; data: SearchHit[] } | { ok: false; error: string };

/** ILIKE uchun maxsus belgilarni ekranlaydi (`%` va `_` wildcard bo'lib qolmasin). */
function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, (ch) => `\\${ch}`);
}

/**
 * Kurslar (sarlavha/tavsif) va darslar (sarlavha) bo'yicha global qidiruv.
 * Har bir turdan 5 tadan natija qaytadi.
 */
export async function searchContent(query: string): Promise<SearchResult> {
  try {
    const u = await requireUser();
    await enforceLimit("action", u.id);

    const parsed = querySchema.safeParse(query);
    if (!parsed.success) return { ok: false, error: firstError(parsed.error) };

    const pattern = `%${escapeLike(parsed.data)}%`;

    const [courses, lessons] = await Promise.all([
      db
        .select({
          id: course.id,
          slug: course.slug,
          title: course.title,
          level: course.level,
          icon: course.icon,
        })
        .from(course)
        .where(or(ilike(course.title, pattern), ilike(course.description, pattern)))
        .limit(5),
      db
        .select({ id: lesson.id, title: lesson.title, meta: lesson.meta })
        .from(lesson)
        .where(ilike(lesson.title, pattern))
        .limit(5),
    ]);

    const hits: SearchHit[] = [
      ...courses.map((c) => ({
        kind: "course" as const,
        id: c.id,
        title: c.title,
        subtitle: c.level,
        href: `/courses/${c.slug}`,
        icon: c.icon || "school",
      })),
      ...lessons.map((l) => ({
        kind: "lesson" as const,
        id: l.id,
        title: l.title,
        subtitle: l.meta,
        href: `/lesson/${l.id}`,
        icon: "play_circle",
      })),
    ];

    return { ok: true, data: hits };
  } catch (err) {
    if (err instanceof RateLimitError) return { ok: false, error: err.message };
    // `redirect()` Next.js ichida xato sifatida tashlanadi — uni o'tkazib yuboramiz.
    if (err && typeof err === "object" && "digest" in err) throw err;
    console.error("[search] xato:", err);
    return { ok: false, error: "Qidiruvda xatolik yuz berdi" };
  }
}
