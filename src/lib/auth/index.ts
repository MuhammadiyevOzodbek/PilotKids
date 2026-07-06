import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { db } from "@/lib/db";
import * as schema from "@/lib/db/schema";
import { getServerEnv } from "@/lib/env";

const env = getServerEnv();

const google =
  env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET
    ? { google: { clientId: env.GOOGLE_CLIENT_ID, clientSecret: env.GOOGLE_CLIENT_SECRET } }
    : {};

const github =
  env.GITHUB_CLIENT_ID && env.GITHUB_CLIENT_SECRET
    ? { github: { clientId: env.GITHUB_CLIENT_ID, clientSecret: env.GITHUB_CLIENT_SECRET } }
    : {};

export const auth = betterAuth({
  secret: env.BETTER_AUTH_SECRET,
  baseURL: env.BETTER_AUTH_URL,
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      user: schema.users,
      session: schema.sessions,
      account: schema.accounts,
      verification: schema.verifications,
    },
  }),
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 6,
    autoSignIn: true,
    // Real email provideri Phase 12'da ulanadi; hozircha havolani logga chiqaramiz
    sendResetPassword: async ({ user, url }) => {
      console.log(`[PilotKids] Parolni tiklash havolasi (${user.email}): ${url}`);
    },
  },
  socialProviders: {
    ...google,
    ...github,
  },
  user: {
    additionalFields: {
      avatarUrl: { type: "string", required: false, input: false },
      age: { type: "number", required: false, input: true },
      xp: { type: "number", required: false, input: false, defaultValue: 0 },
      rankId: { type: "string", required: false, input: false },
    },
  },
  // nextCookies oxirgi plagin bo'lishi shart
  plugins: [nextCookies()],
});
