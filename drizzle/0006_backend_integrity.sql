-- Backend integrity hardening.
-- Qo'llash: npx tsx src/lib/db/apply-sql.ts drizzle/0006_backend_integrity.sql

-- Eski dublikat sertifikatlar bo'lsa, eng eskisini qoldirib qolganini tozalaymiz.
DELETE FROM "certificate" c
USING "certificate" keep
WHERE c."user_id" = keep."user_id"
  AND c."course_id" IS NOT DISTINCT FROM keep."course_id"
  AND (
    c."created_at" > keep."created_at"
    OR (c."created_at" = keep."created_at" AND c."id"::text > keep."id"::text)
  );

-- Har bir foydalanuvchi-kurs jufti uchun bitta sertifikat yozuvi.
CREATE UNIQUE INDEX IF NOT EXISTS "certificate_user_course_uq"
  ON "certificate" ("user_id", "course_id");
