import "server-only";
import { z } from "zod";

/** Server muhit o'zgaruvchilari — faqat serverda o'qiladi. */
const serverSchema = z.object({
  DATABASE_URL: z.string().url("DATABASE_URL noto'g'ri yoki yo'q"),
  BETTER_AUTH_SECRET: z.string().min(1, "BETTER_AUTH_SECRET kerak"),
  BETTER_AUTH_URL: z.string().url().default("http://localhost:3000"),
  GOOGLE_CLIENT_ID: z.string().optional().default(""),
  GOOGLE_CLIENT_SECRET: z.string().optional().default(""),
  GITHUB_CLIENT_ID: z.string().optional().default(""),
  GITHUB_CLIENT_SECRET: z.string().optional().default(""),
});

const parsed = serverSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("❌ Muhit o'zgaruvchilarida xatolik:", z.treeifyError(parsed.error));
  throw new Error("Muhit o'zgaruvchilari to'g'ri sozlanmagan (.env.local ni tekshiring)");
}

export const env = parsed.data;

export const publicEnv = {
  appUrl: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
};

/** OAuth provayder yoqilganmi (kalitlar to'ldirilganmi). */
export const oauth = {
  google: Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET),
  github: Boolean(env.GITHUB_CLIENT_ID && env.GITHUB_CLIENT_SECRET),
};
