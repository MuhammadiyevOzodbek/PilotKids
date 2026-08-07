/**
 * Clears demo/admin-manageable learning content from the app.
 *
 * Users, auth, settings, badges and lab projects are preserved. Courses, lessons,
 * quiz questions and their dependent progress rows are removed so admins can add
 * the real content from the admin panel.
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import { neon } from "@neondatabase/serverless";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL topilmadi (.env.local ni tekshiring)");
  process.exit(1);
}

const sql = neon(url);

async function main() {
  console.log("Kurslar va testlar tozalanmoqda...");

  await sql`delete from "quiz_attempt"`;
  await sql`delete from "quiz_question"`;
  await sql`delete from "lesson_note"`;
  await sql`delete from "lesson_progress"`;
  await sql`delete from "enrollment"`;
  await sql`delete from "certificate" where "course_id" is not null`;
  await sql`delete from "lesson"`;
  await sql`delete from "course"`;
  await sql`delete from "certificate" where "course_id" is null`;

  console.log("Kurslar va testlar tozalandi. Endi kontent admin paneldan qo'shiladi.");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Kontentni tozalashda xatolik:", err);
    process.exit(1);
  });
