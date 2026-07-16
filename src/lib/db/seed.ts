/**
 * PilotKids DB seed — kontent (kategoriya, kurs, dars, nishon, lab, quiz) va
 * reyting uchun demo foydalanuvchilar. Ishga tushirish: `npm run db:seed`.
 *
 * O'zini-o'zi ta'minlaydi: dotenv'ni yuklab, o'z Neon ulanishini ochadi
 * (env.ts va better-auth'ga bog'liq emas — tsx alias muammosidan qochish uchun).
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { randomUUID } from "node:crypto";
import * as schema from "./schema";
import {
  categories as categoriesData,
  featured as featuredData,
  detailLessons,
  badges as badgesData,
  labProjects as labData,
  quizOptions,
  quizCorrect,
} from "../data";

const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql, { schema });

async function main() {
  console.log("🌱 Seed boshlandi…");

  // Idempotent: kontent jadvallarini tozalab, qayta to'ldiramiz.
  await db.delete(schema.quizQuestion);
  await db.delete(schema.lesson);
  await db.delete(schema.course);
  await db.delete(schema.category);
  await db.delete(schema.badge);
  await db.delete(schema.labProject);

  // 1) Kategoriyalar
  const catRows = categoriesData.map((c, i) => ({
    id: randomUUID(),
    slug: slugify(c.title),
    title: c.title,
    icon: c.icon,
    color: c.color,
    soft: c.soft,
    courseCount: c.count,
    sortOrder: i,
  }));
  await db.insert(schema.category).values(catRows);
  console.log(`  ✓ ${catRows.length} kategoriya`);

  // 2) Kurslar (featured) — mos kategoriyaga ulaymiz
  const catBySlug = new Map(catRows.map((c) => [c.slug, c.id]));
  const courseRows = featuredData.map((c, i) => ({
    id: randomUUID(),
    slug: slugify(c.title),
    title: c.title,
    description:
      "Robot to'plamini ochishdan tortib loyihani ishga tushirishgacha — bosqichma-bosqich, o'ynab o'rganamiz.",
    categoryId: guessCategoryId(c.title, catBySlug) ?? null,
    icon: c.icon,
    color: c.color,
    soft: c.soft,
    level: c.level,
    totalLessons: c.lessons,
    hours: c.hours,
    featured: true,
    sortOrder: i,
  }));
  await db.insert(schema.course).values(courseRows);
  console.log(`  ✓ ${courseRows.length} kurs`);

  // 3) Darslar — birinchi kurs ("Robototexnika 101") uchun to'liq ro'yxat
  const mainCourse = courseRows[0];
  const lessonRows = detailLessons.map((l) => ({
    id: randomUUID(),
    courseId: mainCourse.id,
    sortOrder: l.n,
    title: l.t,
    meta: l.meta,
    type: l.meta.includes("Kod") ? "code" : l.meta.includes("Quiz") ? "quiz" : "video",
    durationMin: parseInt(l.meta) || 8,
  }));
  await db.insert(schema.lesson).values(lessonRows);
  console.log(`  ✓ ${lessonRows.length} dars (${mainCourse.title})`);

  // 4) Quiz savoli (2-dars: motorlar/sensorlar)
  await db.insert(schema.quizQuestion).values({
    id: randomUUID(),
    courseId: mainCourse.id,
    lessonId: lessonRows[1]?.id ?? null,
    prompt: "Qaysi qism masofani sezib, robotning to'siqqa urilishiga yo'l qo'ymaydi?",
    options: quizOptions.map((o) => o.l),
    correctIndex: quizCorrect,
    sortOrder: 0,
  });
  console.log("  ✓ 1 quiz savoli");

  // 5) Nishonlar
  const badgeRows = badgesData.map((b, i) => ({
    id: randomUUID(),
    slug: slugify(b.name),
    name: b.name,
    icon: b.icon,
    color: b.color,
    soft: b.soft,
    sortOrder: i,
  }));
  await db.insert(schema.badge).values(badgeRows);
  console.log(`  ✓ ${badgeRows.length} nishon`);

  // 6) Lab loyihalari
  const labRows = labData.map((p, i) => ({
    id: randomUUID(),
    slug: slugify(p.title),
    title: p.title,
    description: p.desc,
    icon: p.icon,
    color: p.color,
    soft: p.soft,
    diff: p.diff,
    diffCol: p.diffCol,
    diffBg: p.diffBg,
    parts: p.parts,
    sortOrder: i,
  }));
  await db.insert(schema.labProject).values(labRows);
  console.log(`  ✓ ${labRows.length} lab loyiha`);

  // 7) Reyting uchun demo foydalanuvchilar (login qilmaydi — faqat XP ko'rsatkichi)
  const demoUsers = [
    { name: "Laylo Rahimova", xp: 1180, streak: 21 },
    { name: "Jasur Toshmatov", xp: 1090, streak: 15 },
    { name: "Nodira Saidova", xp: 980, streak: 12 },
    { name: "Sardor Mirzayev", xp: 910, streak: 9 },
    { name: "Malika Aliyeva", xp: 860, streak: 7 },
    { name: "Bekzod Xolmatov", xp: 820, streak: 6 },
    { name: "Dilnoza Qodirova", xp: 790, streak: 5 },
  ];
  // Avvalgi demo foydalanuvchilarni tozalaymiz (email suffiksi bo'yicha)
  for (const u of demoUsers) {
    const email = slugify(u.name) + "@demo.pilotkids.uz";
    await db
      .insert(schema.user)
      .values({
        id: randomUUID(),
        name: u.name,
        email,
        emailVerified: true,
        xp: u.xp,
        streak: u.streak,
        level: Math.max(1, Math.floor(u.xp / 300)),
        role: "student",
      })
      .onConflictDoNothing({ target: schema.user.email });
  }
  console.log(`  ✓ ${demoUsers.length} demo foydalanuvchi (reyting)`);

  console.log("✅ Seed tugadi.");
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/['’`]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function guessCategoryId(title: string, bySlug: Map<string, string>): string | undefined {
  const t = title.toLowerCase();
  if (t.includes("robot")) return bySlug.get("robototexnika");
  if (t.includes("scratch")) return bySlug.get("scratch");
  if (t.includes("micro")) return bySlug.get("microbit");
  if (t.includes("python")) return bySlug.get("python");
  return undefined;
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("❌ Seed xatosi:", err);
    process.exit(1);
  });
