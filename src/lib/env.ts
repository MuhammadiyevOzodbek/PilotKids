import { z } from "zod";

/**
 * Server-only muhit o'zgaruvchilari.
 *
 * Bu modul FAQAT server tomonida import qilinishi kerak (Server Actions,
 * Route Handlers, DB/Auth konfiguratsiyasi). Neon connection string va boshqa
 * maxfiy kalitlar hech qachon brauzerga chiqmasligi shart.
 */
const serverSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),

  // Neon PostgreSQL — faqat serverda
  DATABASE_URL: z.string().url("DATABASE_URL noto'g'ri formatda"),

  // Better Auth
  BETTER_AUTH_SECRET: z.string().min(1, "BETTER_AUTH_SECRET talab qilinadi"),
  BETTER_AUTH_URL: z.string().url().default("http://localhost:3000"),

  // OAuth (ixtiyoriy — bo'lmasa social login o'chadi)
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  GITHUB_CLIENT_ID: z.string().optional(),
  GITHUB_CLIENT_SECRET: z.string().optional(),
});

export type ServerEnv = z.infer<typeof serverSchema>;

let cachedEnv: ServerEnv | null = null;

/**
 * Muhit o'zgaruvchilarini validatsiya qilib qaytaradi. Xato bo'lsa aniq
 * xabar bilan to'xtaydi (build/runtime da darhol ma'lum bo'ladi).
 */
export function getServerEnv(): ServerEnv {
  if (cachedEnv) return cachedEnv;

  const parsed = serverSchema.safeParse(process.env);

  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((issue) => `  - ${issue.path.join(".")}: ${issue.message}`)
      .join("\n");
    throw new Error(`❌ Muhit o'zgaruvchilari noto'g'ri:\n${issues}`);
  }

  cachedEnv = parsed.data;
  return cachedEnv;
}

/**
 * Public (client) muhit o'zgaruvchilari — NEXT_PUBLIC_ prefiksi bilan.
 */
export const publicEnv = {
  appUrl: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
} as const;
