-- PilotKids: o'quv qatlamini to'liq backendga o'tkazish uchun schema kengaytmasi.
-- Idempotent — bir necha marta ishga tushirsa ham xavfsiz.

-- user: ota-ona roziligi va oxirgi faollik (streak hisoblash uchun)
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "parent_consent" boolean DEFAULT false NOT NULL;
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "last_active_at" timestamp;

-- lesson: dars kontenti, video va XP mukofoti
ALTER TABLE "lesson" ADD COLUMN IF NOT EXISTS "content" text DEFAULT '' NOT NULL;
ALTER TABLE "lesson" ADD COLUMN IF NOT EXISTS "video_url" text;
ALTER TABLE "lesson" ADD COLUMN IF NOT EXISTS "xp_reward" integer DEFAULT 40 NOT NULL;

-- quiz javob urinishlari
CREATE TABLE IF NOT EXISTS "quiz_attempt" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "question_id" uuid NOT NULL REFERENCES "quiz_question"("id") ON DELETE CASCADE,
  "selected_index" integer NOT NULL,
  "correct" boolean NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "quiz_attempt_user_question_uq" UNIQUE("user_id","question_id")
);

-- dars eslatmalari
CREATE TABLE IF NOT EXISTS "lesson_note" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "lesson_id" uuid NOT NULL REFERENCES "lesson"("id") ON DELETE CASCADE,
  "body" text NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "lesson_note_user_lesson_uq" UNIQUE("user_id","lesson_id")
);

-- lab loyihalari progressi
CREATE TABLE IF NOT EXISTS "lab_progress" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "project_id" uuid NOT NULL REFERENCES "lab_project"("id") ON DELETE CASCADE,
  "status" text DEFAULT 'started' NOT NULL,
  "started_at" timestamp DEFAULT now() NOT NULL,
  "completed_at" timestamp,
  CONSTRAINT "lab_progress_user_project_uq" UNIQUE("user_id","project_id")
);

-- Tez-tez ishlatiladigan so'rovlar uchun indekslar
CREATE INDEX IF NOT EXISTS "enrollment_user_idx" ON "enrollment" ("user_id");
CREATE INDEX IF NOT EXISTS "lesson_progress_user_idx" ON "lesson_progress" ("user_id");
CREATE INDEX IF NOT EXISTS "chat_message_user_created_idx" ON "chat_message" ("user_id","created_at");
CREATE INDEX IF NOT EXISTS "notification_user_created_idx" ON "notification" ("user_id","created_at");
CREATE INDEX IF NOT EXISTS "user_xp_idx" ON "user" ("xp" DESC);
