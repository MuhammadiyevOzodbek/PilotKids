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

// Ishonchli originlar — production domeni bilan localhost mos kelmasa,
// better-auth CSRF/origin tekshiruvi so'rovni 403 bilan rad etadi.
// BETTER_AUTH_URL va NEXT_PUBLIC_APP_URL dan originlarni yig'amiz.
const trustedOrigins = [env.BETTER_AUTH_URL, process.env.NEXT_PUBLIC_APP_URL]
  .filter((v): v is string => Boolean(v))
  .map((url) => {
    try {
      return new URL(url).origin;
    } catch {
      return null;
    }
  })
  .filter((v): v is string => Boolean(v));

export const auth = betterAuth({
  secret: env.BETTER_AUTH_SECRET,
  baseURL: env.BETTER_AUTH_URL,
  trustedOrigins: Array.from(new Set(trustedOrigins)),
  // Xatolarni server loglariga to'liq chiqaramiz (deploy platformasida ko'rinadi)
  logger: {
    level: "debug",
  },
  onAPIError: {
    onError: (error) => {
      console.error("[PilotKids][better-auth] API xatosi:", error);
    },
  },
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
