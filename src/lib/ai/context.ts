import "server-only";
import { eq, and, desc, count } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  user,
  course,
  lesson,
  lessonProgress,
  enrollment,
  certificate,
  badge,
  userBadge,
  quizAttempt,
  labProject,
  labProgress,
} from "@/lib/db/schema";
import { firstName } from "@/lib/queries";

/**
 * Robo uchun foydalanuvchi konteksti.
 *
 * XAVFSIZLIK QOIDASI: bu yerda FAQAT `userId` ga tegishli ma'lumot yig'iladi.
 * Boshqa foydalanuvchilarning ismi, emaili, XP'si yoki har qanday shaxsiy
 * ma'lumoti hech qachon promptga tushmaydi. Email, parol hash, sessiya tokeni
 * va ichki identifikatorlar ham chiqarilmaydi — modelga faqat o'quv holati
 * ko'rinadi.
 */

export type RoboContext = {
  name: string;
  level: number;
  xp: number;
  streak: number;
  age: number | null;
  courses: { title: string; progress: number; level: string }[];
  currentLesson: { title: string; course: string; content: string } | null;
  doneLessons: number;
  badges: string[];
  nextBadges: string[];
  certificates: { title: string; state: string }[];
  quiz: { answered: number; correct: number };
  labs: { title: string; status: string }[];
};

export async function buildRoboContext(userId: string): Promise<RoboContext> {
  const [profile, myCourses, current, doneCount, earnedBadges, allBadges, certs, attempts, labs] =
    await Promise.all([
      db
        .select({
          name: user.name,
          level: user.level,
          xp: user.xp,
          streak: user.streak,
          age: user.age,
        })
        .from(user)
        .where(eq(user.id, userId))
        .limit(1),

      db
        .select({
          title: course.title,
          level: course.level,
          progress: enrollment.progressPercent,
        })
        .from(enrollment)
        .innerJoin(course, eq(enrollment.courseId, course.id))
        .where(eq(enrollment.userId, userId))
        .orderBy(course.sortOrder),

      db
        .select({
          title: lesson.title,
          content: lesson.content,
          courseTitle: course.title,
        })
        .from(lessonProgress)
        .innerJoin(lesson, eq(lessonProgress.lessonId, lesson.id))
        .innerJoin(course, eq(lesson.courseId, course.id))
        .where(and(eq(lessonProgress.userId, userId), eq(lessonProgress.status, "current")))
        .orderBy(lesson.sortOrder)
        .limit(1),

      db
        .select({ value: count() })
        .from(lessonProgress)
        .where(and(eq(lessonProgress.userId, userId), eq(lessonProgress.status, "done"))),

      db
        .select({ name: badge.name })
        .from(userBadge)
        .innerJoin(badge, eq(userBadge.badgeId, badge.id))
        .where(eq(userBadge.userId, userId))
        .orderBy(desc(userBadge.earnedAt)),

      db.select({ id: badge.id, name: badge.name }).from(badge).orderBy(badge.sortOrder),

      db
        .select({ title: certificate.title, state: certificate.state })
        .from(certificate)
        .where(eq(certificate.userId, userId))
        .orderBy(certificate.sortOrder),

      db
        .select({ correct: quizAttempt.correct })
        .from(quizAttempt)
        .where(eq(quizAttempt.userId, userId)),

      db
        .select({ title: labProject.title, status: labProgress.status })
        .from(labProgress)
        .innerJoin(labProject, eq(labProgress.projectId, labProject.id))
        .where(eq(labProgress.userId, userId)),
    ]);

  const p = profile[0];
  const earnedNames = earnedBadges.map((b) => b.name);
  const cur = current[0];

  return {
    name: firstName(p?.name ?? "do'stim"),
    level: p?.level ?? 1,
    xp: p?.xp ?? 0,
    streak: p?.streak ?? 0,
    age: p?.age ?? null,
    courses: myCourses.map((c) => ({ title: c.title, progress: c.progress, level: c.level })),
    currentLesson: cur
      ? { title: cur.title, course: cur.courseTitle, content: (cur.content ?? "").slice(0, 700) }
      : null,
    doneLessons: doneCount[0]?.value ?? 0,
    badges: earnedNames,
    nextBadges: allBadges
      .filter((b) => !earnedNames.includes(b.name))
      .map((b) => b.name)
      .slice(0, 3),
    certificates: certs.map((c) => ({ title: c.title, state: c.state })),
    quiz: {
      answered: attempts.length,
      correct: attempts.filter((a) => a.correct).length,
    },
    labs: labs.map((l) => ({ title: l.title, status: l.status })),
  };
}

/** Kontekstni model uchun ixcham matnga aylantiradi. */
export function renderContext(ctx: RoboContext): string {
  const lines: string[] = [];

  lines.push(`Ism: ${ctx.name}`);
  if (ctx.age) lines.push(`Yosh: ${ctx.age}`);
  lines.push(`Daraja: ${ctx.level} · XP: ${ctx.xp} · Streak: ${ctx.streak} kun`);
  lines.push(`Tugallangan darslar: ${ctx.doneLessons}`);

  if (ctx.courses.length) {
    lines.push(
      `Yozilgan kurslar: ${ctx.courses
        .map((c) => `${c.title} (${c.level}, ${c.progress}% tugallangan)`)
        .join("; ")}`,
    );
  } else {
    lines.push("Yozilgan kurslar: hali yo'q — kurs tanlashga yordam bera olasan.");
  }

  if (ctx.currentLesson) {
    lines.push(
      `Hozirgi dars: "${ctx.currentLesson.title}" ("${ctx.currentLesson.course}" kursida)`,
    );
    if (ctx.currentLesson.content) {
      lines.push(`Shu darsning mazmuni: ${ctx.currentLesson.content}`);
    }
  }

  if (ctx.badges.length) lines.push(`Qo'lga kiritgan nishonlar: ${ctx.badges.join(", ")}`);
  if (ctx.nextBadges.length) lines.push(`Hali olinmagan nishonlar: ${ctx.nextBadges.join(", ")}`);

  const doneCerts = ctx.certificates.filter((c) => c.state === "done");
  if (doneCerts.length) lines.push(`Sertifikatlar: ${doneCerts.map((c) => c.title).join(", ")}`);

  if (ctx.quiz.answered > 0) {
    lines.push(`Testlar: ${ctx.quiz.answered} ta javob, ${ctx.quiz.correct} tasi to'g'ri`);
  }

  const activeLabs = ctx.labs.filter((l) => l.status === "started");
  if (activeLabs.length) {
    lines.push(`Boshlangan lab loyihalari: ${activeLabs.map((l) => l.title).join(", ")}`);
  }

  return lines.join("\n");
}
