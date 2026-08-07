-- Laboratoriya loyihalari ikki turga bo'linadi:
--   online  — brauzerda bajariladi (simulyator, kod), qurilma kerak emas
--   offline — haqiqiy qurilma bilan (Arduino, sensor, LED)
-- Mavjud qatorlar uchun standart `offline`: ular apparat loyihalari edi.

ALTER TABLE "lab_project"
ADD COLUMN IF NOT EXISTS "kind" text DEFAULT 'offline' NOT NULL;

-- `DROP IF EXISTS` + `ADD` — Postgres'da `ADD CONSTRAINT IF NOT EXISTS` yo'q,
-- shu bois migratsiya qayta ishga tushirilsa ham xato bermasin.
ALTER TABLE "lab_project" DROP CONSTRAINT IF EXISTS "lab_project_kind_check";

ALTER TABLE "lab_project"
ADD CONSTRAINT "lab_project_kind_check"
CHECK ("kind" IN ('online', 'offline'));

CREATE INDEX IF NOT EXISTS "lab_project_kind_sort_idx"
ON "lab_project" ("kind", "sort_order");
