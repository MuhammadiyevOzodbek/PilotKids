import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { db } from "@/lib/db";
import { user, session, account, verification } from "@/lib/db/schema";
import { seedUserData } from "@/lib/db/starter";
import { env, oauth } from "@/lib/env";

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
    minPasswordLength: 6,
  },
  socialProviders,
  user: {
    additionalFields: {
      age: { type: "number", required: false, input: true },
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
  },
  databaseHooks: {
    user: {
      create: {
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
