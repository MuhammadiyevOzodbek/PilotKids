import { betterAuth, APIError } from "better-auth";
import { createAuthMiddleware } from "better-auth/api";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { admin as adminPlugin } from "better-auth/plugins/admin";
import { adminAc, userAc } from "better-auth/plugins/admin/access";
import { phoneNumber } from "better-auth/plugins/phone-number";
import { emailOTP } from "better-auth/plugins/email-otp";
import { db } from "@/lib/db";
import { user, session, account, verification } from "@/lib/db/schema";
import { seedUserData } from "@/lib/db/starter";
import { env, oauth, publicEnv } from "@/lib/env";
import { sendSms } from "@/lib/notify/sms";
import { otpEmailTemplate, sendEmail } from "@/lib/notify/email";
import { firstError, signupSchema } from "@/lib/validation";
import { SUPER_ADMIN_ROLES } from "@/lib/auth/roles";
import { isInternalAuthCall } from "@/lib/auth/internal";

type SocialProviderConfig = {
  clientId: string;
  clientSecret: string;
  redirectURI?: string;
};

function originOf(url: string) {
  return new URL(url).origin;
}

function googleOAuthOrigin() {
  const url = new URL(env.BETTER_AUTH_URL);
  if (url.hostname === "www.pilotkids.uz") {
    url.hostname = "pilotkids.uz";
  }
  return url.origin;
}

const authOrigin = originOf(env.BETTER_AUTH_URL);
const appOrigin = originOf(publicEnv.appUrl);
const googleRedirectURI = `${googleOAuthOrigin()}/api/auth/callback/google`;

const socialProviders: Record<string, SocialProviderConfig> = {};
if (oauth.google) {
  socialProviders.google = {
    clientId: env.GOOGLE_CLIENT_ID,
    clientSecret: env.GOOGLE_CLIENT_SECRET,
    redirectURI: googleRedirectURI,
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
  trustedOrigins: Array.from(
    new Set([
      authOrigin,
      appOrigin,
      googleOAuthOrigin(),
      "https://pilotkids.uz",
      "https://www.pilotkids.uz",
    ]),
  ),
  hooks: {
    before: createAuthMiddleware(async (ctx) => {
      if (ctx.path !== "/sign-up/email") return;

      const body = ctx.body as Record<string, unknown> | undefined;
      const email = typeof body?.email === "string" ? body.email.toLowerCase() : "";

      /*
       * Ichki (sintetik) manzillar — Telegram va telefon oqimlari uchun.
       *
       * Bularga oddiy ro'yxatdan o'tish validatsiyasi (ism/yosh/rozilik)
       * qo'llanmaydi, chunki bu ma'lumotlar `/welcome` da so'raladi. Ammo
       * istisno faqat SERVER boshlagan chaqiruvda amal qiladi: aks holda
       * tashqi odam ixtiyoriy Telegram ID nomiga hisob ochib, haqiqiy egasini
       * o'z hisobidan mahrum qilishi mumkin edi (`@/lib/auth/internal`).
       */
      const RESERVED_DOMAINS = ["@telegram.pilotkids.uz", "@phone.pilotkids.uz"];
      if (RESERVED_DOMAINS.some((d) => email.endsWith(d))) {
        if (isInternalAuthCall(ctx.headers)) return;
        throw new APIError("BAD_REQUEST", {
          message: "Bu manzilda ro'yxatdan o'tib bo'lmaydi",
        });
      }

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
    /*
     * Hisoblagich BAZADA saqlanadi, jarayon xotirasida emas.
     *
     * Standart qiymat `memory`, ya'ni har bir server jarayoni o'z
     * hisobini yuritadi. Serverless yoki bir nechta instansiyali
     * deploy'da bu cheklovni instansiyalar soniga ko'paytirib yuborardi:
     * hujumchining so'rovlari turli jarayonlarga tushib, 5 daqiqada 8 ta
     * emas, ancha ko'p parol urinishi o'tib ketardi.
     */
    storage: "database",
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
        // Yangi foydalanuvchiga boshlang'ich sozlamalar va xush kelibsiz xabari.
        after: async (createdUser) => {
          await seedUserData(createdUser.id);
        },
      },
    },
  },
  plugins: [
    /**
     * Admin plagini — `banned` maydoni va foydalanuvchi boshqaruvi API'lari.
     *
     * DIQQAT: bu plagin O'ZINING HTTP endpointlarini ochadi
     * (`/api/auth/admin/set-role`, `/admin/set-user-password`,
     * `/admin/impersonate-user`, `/admin/remove-user` …). Ular ilovaning
     * `requireSuperAdmin()` tekshiruvidan O'TMAYDI — kim ularni chaqira
     * olishini faqat shu yerdagi `roles` va `adminRoles` belgilaydi.
     *
     * Shu sababli `admin` roliga `adminAc` BERILMAYDI: aks holda oddiy
     * kontent admini `/admin/set-role` orqali o'zini `superadmin` qilib
     * olishi yoki `/admin/set-user-password` bilan bosh adminning parolini
     * almashtirib, hisobini egallashi mumkin edi. Ilovaning admin/bosh admin
     * ajratmasi shunda butunlay ma'nosiz bo'lib qolardi.
     *
     * Oddiy admin faqat kontent bilan ishlaydi (kurs, dars, test) — buning
     * uchun bu endpointlar kerak emas. Foydalanuvchi boshqaruvi esa
     * `src/lib/admin/actions.ts` dagi `requireSuperAdmin()` bilan
     * himoyalangan action'lar orqali amalga oshiriladi.
     */
    adminPlugin({
      defaultRole: "student",
      roles: {
        student: userAc,
        parent: userAc,
        // Foydalanuvchi boshqaruvi huquqlarisiz — kontent admini.
        admin: userAc,
        superadmin: adminAc,
      },
      adminRoles: SUPER_ADMIN_ROLES,
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
