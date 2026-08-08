-- ═══════════════════════════════════════════════════════════════════
-- 1. Better Auth brute-force hisoblagichi
-- ═══════════════════════════════════════════════════════════════════
--
-- Hisoblagich standart holatda jarayon XOTIRASIDA saqlanadi, ya'ni har
-- bir server nusxasi o'z hisobini yuritadi. Serverless yoki bir nechta
-- instansiyali deploy'da parol tanlash cheklovi (5 daqiqada 8 urinish)
-- instansiyalar soniga ko'paytirilgan holda ishlardi.
--
-- Ustun nomlari better-auth adapteri kutgan ko'rinishda — o'zgartirilsa
-- u jadvalni topa olmaydi.

CREATE TABLE IF NOT EXISTS "rateLimit" (
  "id" text PRIMARY KEY,
  "key" text NOT NULL,
  "count" integer NOT NULL,
  -- Millisekundlar (Unix) — `integer` 2038-yilda to'lib qoladi.
  "lastRequest" bigint NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "rateLimit_key_uq" ON "rateLimit" ("key");

-- ═══════════════════════════════════════════════════════════════════
-- 2. Yetishmayotgan indekslar
-- ═══════════════════════════════════════════════════════════════════

-- Sessiya jadvali eng tez o'sadiganlardan biri (foydalanuvchi × qurilma).
-- `/superadmin/adminlar` har bir admin uchun uchta korrelyatsiyalangan
-- pastki so'rov yuboradi — indekssiz har biri to'liq skanerlash edi.
CREATE INDEX IF NOT EXISTS "session_user_id_idx" ON "session" ("user_id");
CREATE INDEX IF NOT EXISTS "session_expires_at_idx" ON "session" ("expires_at");

-- Test savollari kurs bo'yicha filtrlanadi (`/quiz`, admin paneli, seed).
CREATE INDEX IF NOT EXISTS "quiz_question_course_idx" ON "quiz_question" ("course_id");

-- Sertifikat kurs bo'yicha o'chiriladi va qidiriladi.
CREATE INDEX IF NOT EXISTS "certificate_course_idx" ON "certificate" ("course_id");

-- Adminlar soni kam, shuning uchun QISMAN indeks: u butun jadval
-- bo'yicha emas, faqat admin qatorlari bo'yicha quriladi va kichik
-- bo'lib qoladi.
CREATE INDEX IF NOT EXISTS "user_admin_role_idx"
ON "user" ("role")
WHERE "role" IN ('admin', 'superadmin');

-- ═══════════════════════════════════════════════════════════════════
-- 3. Kunlik faollikka SANA ustuni
-- ═══════════════════════════════════════════════════════════════════
--
-- Ilgari jadvalda faqat `weekday` (0..6) bor edi va daqiqalar ustiga
-- qo'shilaverardi — ya'ni "dushanba" qatori HECH QACHON nolga qaytmasdi.
-- Har dushanba 20 daqiqa o'qigan bola o'n hafta o'tib "bugun 200 daqiqa"
-- ko'rsatardi va ota-onaning kunlik chegarasi doimiy oshgan bo'lib
-- turardi.
--
-- Eski qatorlar ko'chirilmaydi: ularda sana yo'q, ya'ni qaysi kunga
-- tegishli ekanini bilish IMKONSIZ. Ularni saqlab qolish yolg'on
-- ma'lumotni davom ettirardi, shuning uchun ular o'chiriladi va hisob
-- toza sanadan boshlanadi.

DELETE FROM "daily_activity";

ALTER TABLE "daily_activity" DROP CONSTRAINT IF EXISTS "daily_activity_user_day_uq";
ALTER TABLE "daily_activity" DROP COLUMN IF EXISTS "weekday";

ALTER TABLE "daily_activity"
ADD COLUMN IF NOT EXISTS "day" date NOT NULL DEFAULT CURRENT_DATE;

-- Standart qiymat faqat ustunni qo'shish uchun kerak edi; yangi qatorlar
-- sanani kod bilan (Toshkent mintaqasi bo'yicha) beradi.
ALTER TABLE "daily_activity" ALTER COLUMN "day" DROP DEFAULT;

CREATE UNIQUE INDEX IF NOT EXISTS "daily_activity_user_date_uq"
ON "daily_activity" ("user_id", "day");

CREATE INDEX IF NOT EXISTS "daily_activity_user_day_idx"
ON "daily_activity" ("user_id", "day");

-- ═══════════════════════════════════════════════════════════════════
-- 4. XP berilganini belgilovchi bayroq
-- ═══════════════════════════════════════════════════════════════════
--
-- Faqat `status` ga qarab bo'lmaydi: dars "done" bo'lib, XP beruvchi
-- so'rov uzilib qolishi mumkin edi — keyingi urinishda tizim
-- "allaqachon bajarilgan" deb XP ni ABADIY bermay qo'yardi.
--
-- Mavjud tugallangan darslar uchun bayroq DARROV `true` qilinadi: ular
-- XP ni allaqachon olgan va bu yerda `false` qoldirilsa keyingi bosishda
-- ikkinchi marta berilardi.

ALTER TABLE "lesson_progress"
ADD COLUMN IF NOT EXISTS "xp_awarded" boolean DEFAULT false NOT NULL;

UPDATE "lesson_progress" SET "xp_awarded" = true WHERE "status" = 'done';
