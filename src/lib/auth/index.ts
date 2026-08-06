import { betterAuth, APIError } from "better-auth";
import { createAuthMiddleware } from "better-auth/api";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { admin as adminPlugin } from "better-auth/plugins/admin";
import { phoneNumber } from "better-auth/plugins/phone-number";
import { emailOTP } from "better-auth/plugins/email-otp";
import { db } from "@/lib/db";
import { user, session, account, verification } from "@/lib/db/schema";
import { seedUserData } from "@/lib/db/starter";
import { env, oauth, publicEnv } from "@/lib/env";
import { sendSms } from "@/lib/notify/sms";
import { otpEmailTemplate, sendEmail } from "@/lib/notify/email";
import { firstError, signupSchema } from "@/lib/validation";

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

/** O'zbekiston raqami: +998 va 9 ta raqam. */
export function isValidUzPhone(phone: string): boolean {
  return /^\+998\d{9}$/.test(phone.replace(/[\s-]/g, ""));
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
  hooks: {
    before: createAuthMiddleware(async (ctx) => {
      if (ctx.path !== "/sign-up/email") return;

      const body = ctx.body as Record<string, unknown> | undefined;
      const email = typeof body?.email === "string" ? body.email.toLowerCase() : "";

      // Telegram/phone synthetic accounts are created server-side and finish onboarding in /welcome.
      const serverSynthetic =
        email.endsWith("@telegram.pilotkids.uz") || email.endsWith("@phone.pilotkids.uz");
      if (serverSynthetic) return;

      const parsed = signupSchema.safeParse({
        name: body?.name,
        email: body?.email,
        age: body?.age,
        password: body?.password,
        consent: body?.parentConsent,
      });
      if (!parsed.success) {
        throw new APIError("BAD_REQUEST", { message: firstError(parsed.error) });
      }
    }),
  },
  // Better Auth ichki rate limiter — brute-force'ga qarshi birinchi qator.
  rateLimit: {
    enabled: true,
    window: 60,
    max: 30,
    customRules: {
      "/sign-in/email": { window: 300, max: 8 },
      "/sign-up/email": { window: 3600, max: 5 },
      "/forget-password": { window: 3600, max: 5 },
      // OTP yuborish qimmat (SMS pullik) va spam vektori — qattiq cheklaymiz.
      "/phone-number/send-otp": { window: 600, max: 5 },
      "/email-otp/send-verification-otp": { window: 600, max: 5 },
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
      // Quyidagilar klientdan hech qachon qabul qilinmaydi (input: false).
      onboarded: { type: "boolean", required: false, defaultValue: false, input: false },
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
         * Yaratishdan OLDIN serverda tekshiramiz.
         *
         * Email/parol bilan ro'yxatdan o'tishda forma yosh va ota-ona roziligini
         * yuboradi — ular shu yerda tasdiqlanadi (klient formasi chetlab o'tilsa ham).
         *
         * Google / Telegram / telefon orqali kelganda bu maydonlar bo'lmaydi.
         * Bunday foydalanuvchi yaratiladi, lekin `onboarded: false` bo'lib qoladi
         * va `/welcome` sahifasidan nariga o'tolmaydi — ya'ni yosh chegarasi va
         * ota-ona roziligi baribir majburiy, faqat keyinroq so'raladi.
         */
        before: async (newUser) => {
          const u = newUser as typeof newUser & {
            age?: number | null;
            parentConsent?: boolean;
            email?: string;
          };

          const hasAge = u.age !== undefined && u.age !== null;

          if (hasAge) {
            if (!Number.isInteger(u.age)) {
              throw new APIError("BAD_REQUEST", { message: "Yoshni to'g'ri kiriting" });
            }
            if (u.age! < 5 || u.age! > 18) {
              throw new APIError("BAD_REQUEST", {
                message: "PilotKids 5–18 yoshdagi o'quvchilar uchun",
              });
            }
            if (u.parentConsent !== true) {
              throw new APIError("BAD_REQUEST", {
                message: "Ota-ona roziligisiz hisob yaratib bo'lmaydi",
              });
            }
          }

          /**
           * Bu yerda HECH QACHON admin roli berilmaydi.
           *
           * Email manziliga qarab admin qilish xavfli edi: email/parol bilan
           * ro'yxatdan o'tishda manzil tasdiqlanmaydi, ya'ni begona odam
           * "admin" ro'yxatidagi manzilni yozib panelga kirib olardi.
           * Admin faqat `npm run db:admin -- <email>` orqali, ya'ni serverga
           * kirish huquqi bor odam tomonidan tayinlanadi.
           */
          return {
            data: {
              ...newUser,
              // Yosh + rozilik to'liq bo'lsagina ilovaga kirish ochiladi.
              onboarded: hasAge,
              role: "student",
            },
          };
        },
        // Yangi foydalanuvchiga boshlang'ich ma'lumot (enrollment, nishon, sertifikat...)
        after: async (createdUser) => {
          await seedUserData(createdUser.id);
        },
      },
    },
  },
  plugins: [
    /** Admin panel — rol tekshiruvi, foydalanuvchini bloklash, ro'yxat API'lari. */
    adminPlugin({
      defaultRole: "student",
      adminRoles: ["admin"],
    }),
    /**
     * Telefon orqali kirish (SMS OTP).
     * Tasdiqlangandan keyin foydalanuvchi avtomatik yaratiladi — bunda email
     * bo'lmagani uchun vaqtinchalik manzil beriladi va `onboarded: false`
     * bo'lib qoladi, ya'ni yosh/rozilik `/welcome` da so'raladi.
     */
    phoneNumber({
      otpLength: 6,
      expiresIn: 300,
      allowedAttempts: 3,
      phoneNumberValidator: isValidUzPhone,
      sendOTP: async ({ phoneNumber: phone, code }) => {
        await sendSms(phone, `PilotKids kirish kodi: ${code}. Kod 5 daqiqa amal qiladi.`);
      },
      signUpOnVerification: {
        getTempEmail: (phone) => `${phone.replace(/\D/g, "")}@phone.pilotkids.uz`,
        getTempName: () => "Yangi o'quvchi",
      },
    }),
    /** Email bo'yicha parolsiz kirish — bola parol eslab qolishi shart emas. */
    emailOTP({
      otpLength: 6,
      expiresIn: 300,
      allowedAttempts: 3,
      // Kod bilan kirganda hisob topilmasa yaratiladi (keyin /welcome).
      disableSignUp: false,
      sendVerificationOTP: async ({ email, otp }) => {
        const { html, text } = otpEmailTemplate(otp);
        await sendEmail(email, `PilotKids kirish kodi: ${otp}`, html, text);
      },
    }),
    nextCookies(),
  ],
});

export type Session = typeof auth.$Infer.Session;
