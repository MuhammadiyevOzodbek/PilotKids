import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "PilotKids — Robototexnika Akademiyasi",
    short_name: "PilotKids",
    description: "8–18 yoshli bolalar uchun onlayn robototexnika akademiyasi.",
    start_url: "/",
    display: "standalone",
    background_color: "#0b1120",
    theme_color: "#2563eb",
    lang: "uz",
    categories: ["education", "kids"],
    icons: [
      {
        src: "/icon",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}
