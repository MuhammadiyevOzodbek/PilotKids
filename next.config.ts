import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === "development";

/**
 * Content-Security-Policy.
 * Dev'da Turbopack HMR uchun 'unsafe-eval' kerak; prod'da olib tashlanadi.
 * Loyiha inline `style={{...}}` dan foydalangani uchun style-src'da
 * 'unsafe-inline' qoladi.
 */
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline' https://telegram.org${isDev ? " 'unsafe-eval'" : ""}`,
  "script-src-attr 'none'",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com data:",
  "img-src 'self' data: blob: https:",
  // Dars videolari `<iframe>` orqali qo'yiladi — bu xostlarsiz YouTube/Vimeo
  // pleyeri CSP tomonidan bloklanadi (`src/lib/video.ts` faqat shu manzillarni
  // quradi).
  "frame-src https://oauth.telegram.org https://telegram.org https://www.youtube-nocookie.com https://www.youtube.com https://player.vimeo.com",
  `connect-src 'self'${isDev ? " ws: wss:" : ""}`,
  "media-src 'self' https:",
  "worker-src 'self' blob:",
  "manifest-src 'self'",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
  ...(isDev ? [] : ["upgrade-insecure-requests"]),
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-DNS-Prefetch-Control", value: "off" },
  { key: "X-Download-Options", value: "noopen" },
  { key: "X-Permitted-Cross-Domain-Policies", value: "none" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin-allow-popups" },
  { key: "Cross-Origin-Resource-Policy", value: "same-origin" },
  { key: "Origin-Agent-Cluster", value: "?1" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
  ...(isDev
    ? []
    : [
        { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
      ]),
];

const nextConfig: NextConfig = {
  // `X-Powered-By: Next.js` sarlavhasini yashiramiz.
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
