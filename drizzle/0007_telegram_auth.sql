-- Telegram authentication identity mapping.
-- Qo'llash: npx tsx src/lib/db/apply-sql.ts drizzle/0007_telegram_auth.sql

ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "telegram_id" text;
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "telegram_username" text;
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "telegram_first_name" text;
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "telegram_last_name" text;
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "telegram_photo_url" text;

CREATE UNIQUE INDEX IF NOT EXISTS "user_telegram_id_uq" ON "user" ("telegram_id");

-- A single external Telegram account must only map to one application user.
CREATE UNIQUE INDEX IF NOT EXISTS "account_provider_account_uq"
  ON "account" ("provider_id", "account_id");
