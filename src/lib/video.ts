/**
 * Video havolasini tanib olish.
 *
 * Admin dars formasiga oddiy havola qo'yadi (YouTube'dan nusxa olingan manzil,
 * yoki to'g'ridan-to'g'ri `.mp4`). Bu modul o'sha havolani nima ekanini
 * aniqlaydi va uni ko'rsatish uchun kerakli manzillarga aylantiradi.
 *
 * `server-only` EMAS: admin formasidagi jonli ko'rish (klient) va dars
 * sahifasi (server) bir xil mantiqdan foydalanadi.
 */

export type VideoKind = "youtube" | "vimeo" | "file";

export interface VideoSource {
  kind: VideoKind;
  /** `<iframe>` yoki `<video>` ga beriladigan manzil. */
  embedUrl: string;
  /** Muqova rasmi — faqat YouTube'da bepul mavjud. */
  thumbnailUrl: string | null;
  /** Adminga ko'rsatish uchun manba nomi. */
  label: string;
}

/** YouTube video identifikatori — qat'iy 11 belgi. */
const YT_ID = /^[A-Za-z0-9_-]{11}$/;

const YT_HOSTS = new Set([
  "youtube.com",
  "www.youtube.com",
  "m.youtube.com",
  "music.youtube.com",
  "youtube-nocookie.com",
  "www.youtube-nocookie.com",
  "youtu.be",
  "www.youtu.be",
]);

const VIMEO_HOSTS = new Set(["vimeo.com", "www.vimeo.com", "player.vimeo.com"]);

/** URL'dan YouTube ID'ini ajratadi (turli ko'rinishdagi havolalar uchun). */
function youtubeId(url: URL): string | null {
  const parts = url.pathname.split("/").filter(Boolean);

  // youtu.be/ID
  if (url.hostname.endsWith("youtu.be")) return parts[0] ?? null;

  // youtube.com/watch?v=ID
  if (parts[0] === "watch") return url.searchParams.get("v");

  // youtube.com/embed/ID · /shorts/ID · /live/ID · /v/ID
  if (parts.length >= 2 && ["embed", "shorts", "live", "v"].includes(parts[0]!)) {
    return parts[1] ?? null;
  }

  return null;
}

/**
 * Havolani tanib oladi. Tanib bo'lmasa yoki xavfli bo'lsa `null`.
 *
 * MUHIM: embed manzili faqat ajratib olingan ID'dan QAYTA quriladi, hech
 * qachon foydalanuvchi kiritgan satr to'g'ridan-to'g'ri `<iframe src>` ga
 * berilmaydi — aks holda `javascript:` kabi manzillar o'tib ketardi.
 */
export function parseVideoUrl(raw: string | null | undefined): VideoSource | null {
  const trimmed = raw?.trim();
  if (!trimmed) return null;

  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return null;
  }

  // Faqat http(s) — `javascript:`, `data:` va boshqalar rad etiladi.
  if (url.protocol !== "https:" && url.protocol !== "http:") return null;

  if (YT_HOSTS.has(url.hostname)) {
    const id = youtubeId(url);
    if (!id || !YT_ID.test(id)) return null;
    return {
      kind: "youtube",
      // `-nocookie` — bolalar platformasi uchun kuzatuv kamroq bo'lsin.
      embedUrl: `https://www.youtube-nocookie.com/embed/${id}?rel=0&modestbranding=1`,
      thumbnailUrl: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
      label: "YouTube",
    };
  }

  if (VIMEO_HOSTS.has(url.hostname)) {
    const id = url.pathname.split("/").filter(Boolean).pop();
    if (!id || !/^\d+$/.test(id)) return null;
    return {
      kind: "vimeo",
      embedUrl: `https://player.vimeo.com/video/${id}`,
      thumbnailUrl: null,
      label: "Vimeo",
    };
  }

  // Qolgani — to'g'ridan-to'g'ri fayl (`.mp4`, `.webm`, …).
  return {
    kind: "file",
    embedUrl: url.toString(),
    thumbnailUrl: null,
    label: "Video fayl",
  };
}

/** Daqiqani "12:05" ko'rinishiga o'giradi (dars ro'yxatidagi yorliq uchun). */
export function formatDuration(minutes: number): string {
  if (!minutes || minutes < 0) return "—";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h > 0 ? `${h} soat ${m} daq` : `${m} daq`;
}
