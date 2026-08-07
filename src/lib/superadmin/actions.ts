"use server";

import { revalidatePath } from "next/cache";
import { and, eq, ne, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import {
  certificate,
  course,
  enrollment,
  lesson,
  lessonNote,
  lessonProgress,
  quizAttempt,
  quizQuestion,
  session,
} from "@/lib/db/schema";
import { getSession, requireSuperAdmin } from "@/lib/auth/session";
import { enforceLimit } from "@/lib/rate-limit";
import { writeSuperadminAudit } from "./audit";

type Result = { ok: true } | { ok: false; error: string };

const ok = { ok: true } as const;
const fail = (error: string): Result => ({ ok: false, error });

const idSchema = z.string().min(8).max(200);
const contentConfirmSchema = z.literal("KONTENTNI TOZALA");

export async function revokeAdminSession(sessionId: string): Promise<Result> {
  const me = await requireSuperAdmin();
  await enforceLimit("action", me.id);

  const parsed = idSchema.safeParse(sessionId);
  if (!parsed.success) return fail("Sessiya ID noto'g'ri");

  const current = await getSession();
  if (current?.session.id === parsed.data) {
    return fail("Joriy sessiyangizni bu yerdan tugatib bo'lmaydi");
  }

  const deleted = await db
    .delete(session)
    .where(
      and(
        eq(session.id, parsed.data),
        sql`${session.userId} in (select "id" from "user" where "role" in ('admin', 'superadmin'))`,
      ),
    )
    .returning({ id: session.id });

  if (!deleted.length) return fail("Sessiya topilmadi");
  await writeSuperadminAudit({
    actor: me,
    action: "session.revoke",
    target: parsed.data,
    impact: "high",
  });
  revalidatePath("/superadmin/xavfsizlik");
  revalidatePath("/superadmin/audit");
  return ok;
}

export async function revokeOtherAdminSessions(): Promise<Result> {
  const me = await requireSuperAdmin();
  await enforceLimit("action", me.id);

  const current = await getSession();
  if (!current?.session.id) return fail("Joriy sessiya topilmadi");

  const deleted = await db
    .delete(session)
    .where(
      and(
        ne(session.id, current.session.id),
        sql`${session.userId} in (select "id" from "user" where "role" in ('admin', 'superadmin'))`,
      ),
    )
    .returning({ id: session.id });

  await writeSuperadminAudit({
    actor: me,
    action: "session.revoke_many",
    target: `${deleted.length} ta boshqa admin sessiyasi`,
    impact: "high",
  });

  revalidatePath("/superadmin/xavfsizlik");
  revalidatePath("/superadmin/audit");
  return ok;
}

export async function clearLearningContent(confirmText: string): Promise<Result> {
  const me = await requireSuperAdmin();
  await enforceLimit("action", me.id);

  const parsed = contentConfirmSchema.safeParse(confirmText.trim());
  if (!parsed.success) return fail("Tasdiqlash matni noto'g'ri");

  const [{ coursesBefore }] = await db
    .select({ coursesBefore: sql<number>`count(*)::int` })
    .from(course);
  const [{ lessonsBefore }] = await db
    .select({ lessonsBefore: sql<number>`count(*)::int` })
    .from(lesson);
  const [{ questionsBefore }] = await db
    .select({ questionsBefore: sql<number>`count(*)::int` })
    .from(quizQuestion);

  await db.delete(quizAttempt);
  await db.delete(quizQuestion);
  await db.delete(lessonNote);
  await db.delete(lessonProgress);
  await db.delete(enrollment);
  await db.delete(certificate).where(sql`${certificate.courseId} is not null`);
  await db.delete(lesson);
  await db.delete(course);
  await db.delete(certificate).where(sql`${certificate.courseId} is null`);

  await writeSuperadminAudit({
    actor: me,
    action: "learning_content.clear",
    target: `${coursesBefore} kurs, ${lessonsBefore} dars, ${questionsBefore} test savoli`,
    impact: "high",
  });

  revalidatePath("/", "layout");
  revalidatePath("/superadmin/audit");
  return ok;
}
