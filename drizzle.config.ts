import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

config({ path: ".env.local" });

/*
 * `!` ATAYLAB ishlatilmaydi.
 *
 * `DATABASE_URL` bo'lmasa drizzle-kit `undefined` ni ulanish satri
 * sifatida olib, "Cannot read properties of undefined" kabi tushunarsiz
 * ichki xato berardi. Bu yerdagi tekshiruv sababni darrov aytadi.
 */
const url = process.env.DATABASE_URL;
if (!url) {
  throw new Error("DATABASE_URL topilmadi — uni `.env.local` faylida ko'rsating.");
}

export default defineConfig({
  schema: "./src/lib/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: { url },
  verbose: true,
  strict: true,
});
