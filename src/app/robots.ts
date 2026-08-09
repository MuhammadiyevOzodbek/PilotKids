import type { MetadataRoute } from "next";
import { canonicalOrigin } from "@/lib/site";

/**
 * `/robots.txt`.
 *
 * Faqat ochiq sahifalar indekslanadi. Quyidagi bo'limlar `proxy.ts` da
 * `PROTECTED` ro'yxatida — sessiyasiz kirilsa `/login`ga yo'naltiriladi, ya'ni
 * robot uchun u yerda indekslashga arziydigan kontent YO'Q. Shu bois ular
 * ataylab yopiq: ro'yxatni o'zgartirishdan oldin `proxy.ts` ga qarang.
 *
 * `host` direktivasi ataylab yo'q — uni faqat Yandex tushunadi, Google
 * e'tiborsiz qoldiradi; kanoniklik `alternates.canonical` va `www` →
 * `www`siz 308 yo'naltirish (`next.config.ts`) orqali hal qilinadi.
 *
 * Manzil `siteUrl` emas, `canonicalOrigin`: bu fayl build vaqtida STATIK
 * pishiriladi, ya'ni `NEXT_PUBLIC_APP_URL` build muhitida noto'g'ri bo'lsa
 * (yoki umuman berilmasa) `Sitemap:` qatoriga `localhost` tushib qolardi.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/api/",
          "/admin",
          "/superadmin",
          "/dashboard",
          "/courses",
          "/lesson",
          "/quiz",
          "/lab",
          "/tutor",
          "/leaderboard",
          "/certificates",
          "/profile",
          "/parent",
          "/settings",
          "/boshlash",
          "/chiqish",
          "/welcome",
          "/bloklangan",
        ],
      },
    ],
    sitemap: `${canonicalOrigin}/sitemap.xml`,
  };
}
