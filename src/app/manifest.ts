import type { MetadataRoute } from "next";
import { siteName, siteDescription } from "@/lib/site";

/**
 * `/manifest.webmanifest` — telefonda "Bosh ekranga qo'shish" uchun.
 *
 * Ikonkalar `app/icon.svg` va `app/apple-icon.png` fayllaridan keladi (Next
 * ularni avtomatik chiqaradi), shu bois alohida PNG to'plami kerak emas.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${siteName} — Robototexnika Akademiyasi`,
    short_name: siteName,
    description: siteDescription,
    lang: "uz",
    dir: "ltr",
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    orientation: "portrait-primary",
    background_color: "#0B1220",
    theme_color: "#2F6BF3",
    categories: ["education", "kids"],
    icons: [
      { src: "/icon.svg", type: "image/svg+xml", sizes: "any", purpose: "any" },
      { src: "/apple-icon.png", type: "image/png", sizes: "180x180", purpose: "maskable" },
    ],
  };
}
