import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/site";

/**
 * `/robots.txt`.
 *
 * Faqat ochiq sahifalar indekslanadi. Ilova (`/dashboard`, `/lesson` …) va
 * admin bo'limlari `proxy.ts` orqali sessiya talab qiladi — robot ularni ochsa
 * baribir `/login`ga tushadi, shuning uchun ularni umuman so'ramasin.
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
          "/welcome",
          "/bloklangan",
        ],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  };
}
