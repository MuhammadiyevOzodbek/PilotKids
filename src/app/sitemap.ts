import type { MetadataRoute } from "next";
import { publicEnv } from "@/lib/env";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = publicEnv.appUrl;
  const routes = ["", "/login", "/register", "/forgot-password"];
  return routes.map((route) => ({
    url: `${base}${route}`,
    lastModified: new Date("2026-07-04"),
    changeFrequency: route === "" ? "weekly" : "monthly",
    priority: route === "" ? 1 : 0.6,
  }));
}
