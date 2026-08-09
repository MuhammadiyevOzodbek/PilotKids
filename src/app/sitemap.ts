import type { MetadataRoute } from "next";
import { canonicalOrigin } from "@/lib/site";

/**
 * `/sitemap.xml` — faqat sessiya talab qilmaydigan, indekslashga arziydigan
 * sahifalar.
 *
 * Ilova sahifalari (kurs, dars, laboratoriya, profil …) `proxy.ts` da auth
 * ortida, ular sitemap'ga kirmaydi. Kirish/ro'yxatdan o'tish sahifalari ham
 * yo'q: ular qidiruv natijasi sifatida foydasiz va `noindex`.
 *
 * `lastModified` ATAYLAB qattiq belgilangan sana. Ilgari bu yerda
 * `new Date()` turardi — har so'rovda "sahifa hozir o'zgardi" degan yolg'on
 * signal ketardi va Google lastModified'ga umuman ishonmay qo'yadi. Sahifa
 * matni haqiqatan o'zgarganda shu sanani qo'lda yangilang.
 */
const LAST_MODIFIED = {
  home: new Date("2026-08-09"),
  maxfiylik: new Date("2026-08-06"),
  shartlar: new Date("2026-08-06"),
};

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: `${canonicalOrigin}/`,
      lastModified: LAST_MODIFIED.home,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${canonicalOrigin}/maxfiylik`,
      lastModified: LAST_MODIFIED.maxfiylik,
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${canonicalOrigin}/shartlar`,
      lastModified: LAST_MODIFIED.shartlar,
      changeFrequency: "yearly",
      priority: 0.3,
    },
  ];
}
