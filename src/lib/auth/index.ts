import { betterAuth, APIError } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { db } from "@/lib/db";
import { user, session, account, verification } from "@/lib/db/schema";
import { seedUserData } from "@/lib/db/starter";
import { env, oauth, publicEnv } from "@/lib/env";

const socialProviders: Record<string, { clientId: string; clientSecret: string }> = {};
if (oauth.google) {
  socialProviders.google = {
    clientId: env.GOOGLE_CLIENT_ID,
    clientSecret: env.GOOGLE_CLIENT_SECRET,
  };
}
if (oauth.github) {
  socialProviders.github = {
    clientId: env.GITHUB_CLIENT_ID,
    clientSecret: env.GITHUB_CLIENT_SECRET,
  };
}

export const auth = betterAuth({
  baseURL: env.BETTER_AUTH_URL,
  secret: env.BETTER_AUTH_SECRET,
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: { user, session, account, verification },
  }),
  emailAndPassword: {
    enabled: true,
    autoSignIn: true,
    minPasswordLength: 8,
    maxPasswordLength: 128,
  },
  socialProviders,
  trustedOrigins: [env.BETTER_AUTH_URL, publicEnv.appUrl],
  // Better Auth ichki rate limiter — brute-force'ga qarshi birinchi qator.
  rateLimit: {
    enabled: true,
    window: 60,
    max: 30,
    customRules: {
      "/sign-in/email": { window: 300, max: 8 },
      "/sign-up/email": { window: 3600, max: 5 },
      "/forget-password": { window: 3600, max: 5 },
    },
  },
  advanced: {
    useSecureCookies: process.env.NODE_ENV === "production",
    defaultCookieAttributes: {
      httpOnly: true,
      sameSite: "lax",
    },
  },
  user: {
    additionalFields: {
      age: { type: "number", required: false, input: true },
      // Ota-ona roziligi — klientdan keladi, lekin serverda ham tekshiriladi.
      parentConsent: { type: "boolean", required: false, defaultValue: false, input: true },
      // role klient tomonidan yuborilmasin — signup'da o'zini "parent" qilib olmasin.
      role: { type: "string", required: false, defaultValue: "student", input: false },
      xp: { type: "number", required: false, defaultValue: 0, input: false },
      streak: { type: "number", required: false, defaultValue: 0, input: false },
      level: { type: "number", required: false, defaultValue: 1, input: false },
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 kun
    updateAge: 60 * 60 * 24, // 1 kun
    // Har sahifada DB'ga bormaslik uchun sessiyani cookie'da 5 daqiqa keshlaymiz.
    cookieCache: { enabled: true, maxAge: 300 },
  },
  databaseHooks: {
    user: {
      create: {
        /**
         * Yaratishdan OLDIN serverda tekshiramiz — klient formasi chetlab
         * o'tilsa ham yosh chegarasi va ota-ona roziligi majburiy qoladi.
         */
        before: async (newUser) => {
          const u = newUser as typeof newUser & { age?: number; parentConsent?: boolean };

          if (u.age === undefined || u.age === null || !Number.isInteger(u.age)) {
            throw new APIError("BAD_REQUEST", { message: "Yoshni kiriting" });
          }
          if (u.age < 5 || u.age > 18) {
            throw new APIError("BAD_REQUEST", {
              message: "PilotKids 5–18 yoshdagi o'quvchilar uchun",
            });
          }
          if (u.parentConsent !== true) {
            throw new APIError("BAD_REQUEST", {
              message: "Ota-ona roziligisiz hisob yaratib bo'lmaydi",
            });
          }
          return { data: newUser };
        },
        // Yangi foydalanuvchiga boshlang'ich ma'lumot (enrollment, nishon, sertifikat...)
        after: async (createdUser) => {
          await seedUserData(createdUser.id);
        },
      },
    },
  },
  plugins: [nextCookies()],
});

export type Session = typeof auth.$Infer.Session;
