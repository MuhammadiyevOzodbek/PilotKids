-- Kirish usullari (telefon, Telegram, Google) + admin paneli uchun maydonlar.
-- Qo'llash: npx tsx src/lib/db/apply-sql.ts drizzle/0005_auth_methods_admin.sql

-- Telefon orqali kirish (better-auth phone-number plugin)
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "phone_number" text;
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "phone_number_verified" boolean DEFAULT false NOT NULL;

-- Onboarding: yosh va ota-ona roziligi to'ldirilganmi.
-- Mavjud hisoblarda yosh allaqachon bor — ular uchun darhol true qo'yamiz,
-- aks holda hamma /welcome ga tushib qolardi.
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "onboarded" boolean DEFAULT false NOT NULL;

-- Admin plugin maydonlari
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "banned" boolean DEFAULT false NOT NULL;
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "ban_reason" text;
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "ban_expires" timestamp;
ALTER TABLE "session" ADD COLUMN IF NOT EXISTS "impersonated_by" text;

-- Telefon raqami takrorlanmasin (NULL qiymatlar cheklovga tushmaydi)
CREATE UNIQUE INDEX IF NOT EXISTS "user_phone_number_uq" ON "user" ("phone_number");

-- Eski hisoblar onboarding'dan o'tgan deb hisoblanadi
UPDATE "user" SET "onboarded" = true WHERE "age" IS NOT NULL;
