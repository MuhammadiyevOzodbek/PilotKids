-- Foydalanuvchi sozlamalari: til va kunlik ekran vaqti chegarasi.
ALTER TABLE "user_settings" ADD COLUMN IF NOT EXISTS "language" text DEFAULT 'uz' NOT NULL;
ALTER TABLE "user_settings" ADD COLUMN IF NOT EXISTS "daily_limit_min" integer DEFAULT 90 NOT NULL;
