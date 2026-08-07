import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/site";

/**
 * `/sitemap.xml` — faqat sessiya talab qilmaydigan sahifalar.
 *
 * Ilova sahifalari (kurs, dars, profil …) auth ortida, ular sitemap'ga
 * kirmaydi. Shu bois bu ro'yxat statik va DB'ga so'rov yubormaydi.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  return [
    { url: `${siteUrl}/`, lastModified: now, changeFrequency: "weekly", priority: 1 },
    { url: `${siteUrl}/signup`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${siteUrl}/login`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: `${siteUrl}/maxfiylik`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
    { url: `${siteUrl}/shartlar`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
  ];
}
