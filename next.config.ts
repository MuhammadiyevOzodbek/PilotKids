import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === "development";

/**
 * Loyiha ildizi. Yuqoridagi papkada (`C:\Users\javoh`) begona `package-lock.json`
 * bo'lgani uchun Turbopack ish maydoni ildizini noto'g'ri taxmin qilib
 * ogohlantirardi. Ildizni aniq shu papkaga bog'laymiz.
 */
const projectRoot = dirname(fileURLToPath(import.meta.url));

/*
 * CSP bu yerda EMAS — `src/lib/csp.ts` da, `proxy.ts` esa uni har so'rovda
 * yangi nonce bilan qo'yadi. Statik sarlavha nonce'ni bilolmagani uchun
 * `script-src` da 'unsafe-inline' saqlashga majbur bo'lardi.
 */
const securityHeaders = [
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
  // Turbopack ish maydoni ildizini aniq belgilaymiz (yuqoridagi begona
  // package-lock.json e'tiborga olinmasin).
  turbopack: { root: projectRoot },
  // `X-Powered-By: Next.js` sarlavhasini yashiramiz.
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
