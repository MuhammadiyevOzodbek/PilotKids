import { eq, and } from "drizzle-orm";
import { db } from "@/lib/db";
import { certificate } from "@/lib/db/schema";
import { getSession } from "@/lib/auth/session";
import { checkLimit } from "@/lib/rate-limit";
import { uuidSchema } from "@/lib/validation";

/**
 * Sertifikatni SVG fayl sifatida yuklab berish.
 *
 * Xavfsizlik: sertifikat FAQAT egasiga beriladi — so'rov sessiyadagi
 * foydalanuvchi bilan `userId` bo'yicha cheklanadi (IDOR'ning oldini oladi).
 */

/** SVG ichiga qo'yiladigan matnni xavfsiz qiladi (XSS oldini oladi). */
function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) {
    return new Response("Avtorizatsiya talab qilinadi", { status: 401 });
  }

  const { id } = await params;

  // UUID bo'lmagan qiymat Postgres'da 22P02 xatosini bergani uchun oldindan tekshiramiz.
  const parsed = uuidSchema.safeParse(id);
  if (!parsed.success) return new Response("Sertifikat topilmadi", { status: 404 });

  // SVG generatsiyasini spam qilishning oldini olamiz.
  if (!(await checkLimit("action", session.user.id))) {
    return new Response("Juda ko'p so'rov. Biroz kutib qayta urinib ko'ring.", { status: 429 });
  }

  const [cert] = await db
    .select({
      title: certificate.title,
      color: certificate.color,
      state: certificate.state,
      issuedLabel: certificate.issuedLabel,
    })
    .from(certificate)
    .where(and(eq(certificate.id, parsed.data), eq(certificate.userId, session.user.id)))
    .limit(1);

  if (!cert) return new Response("Sertifikat topilmadi", { status: 404 });
  if (cert.state !== "done") {
    return new Response("Bu sertifikat hali berilmagan", { status: 403 });
  }

  const name = escapeXml(session.user.name);
  const title = escapeXml(cert.title);
  const issued = escapeXml(cert.issuedLabel);
  const color = /^#[0-9a-f]{3,8}$/i.test(cert.color) ? cert.color : "#2F6BF3";
  const date = new Date().toLocaleDateString("uz-UZ", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="850" viewBox="0 0 1200 850">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#0B1220"/>
      <stop offset="100%" stop-color="#16224a"/>
    </linearGradient>
    <linearGradient id="accent" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="${color}"/>
      <stop offset="100%" stop-color="#5b8cff"/>
    </linearGradient>
  </defs>

  <rect width="1200" height="850" fill="url(#bg)"/>
  <rect x="40" y="40" width="1120" height="770" rx="24" fill="none" stroke="${color}" stroke-width="3" opacity="0.55"/>
  <rect x="58" y="58" width="1084" height="734" rx="18" fill="none" stroke="#ffffff" stroke-width="1" opacity="0.14"/>
  <rect x="0" y="0" width="1200" height="10" fill="url(#accent)"/>

  <text x="600" y="150" text-anchor="middle" font-family="Georgia, serif" font-size="30" fill="${color}" letter-spacing="9">PILOTKIDS</text>
  <text x="600" y="240" text-anchor="middle" font-family="Georgia, serif" font-size="56" font-weight="bold" fill="#EAF0FB">SERTIFIKAT</text>
  <line x1="450" y1="275" x2="750" y2="275" stroke="${color}" stroke-width="2"/>

  <text x="600" y="345" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-size="22" fill="#AEBBD4">Ushbu sertifikat</text>
  <text x="600" y="425" text-anchor="middle" font-family="Georgia, serif" font-size="52" font-weight="bold" fill="#ffffff">${name}</text>
  <line x1="300" y1="455" x2="900" y2="455" stroke="#ffffff" stroke-width="1" opacity="0.25"/>

  <text x="600" y="510" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-size="22" fill="#AEBBD4">quyidagi kursni muvaffaqiyatli tamomlaganini tasdiqlaydi:</text>
  <text x="600" y="580" text-anchor="middle" font-family="Georgia, serif" font-size="38" font-weight="bold" fill="${color}">${title}</text>

  <text x="600" y="655" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-size="18" fill="#8fa3c4">${issued}</text>

  <text x="220" y="740" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-size="16" fill="#AEBBD4">${date}</text>
  <line x1="120" y1="712" x2="320" y2="712" stroke="#ffffff" stroke-width="1" opacity="0.3"/>
  <text x="220" y="768" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-size="13" fill="#6b7d9c">Sana</text>

  <text x="980" y="740" text-anchor="middle" font-family="Georgia, serif" font-size="20" fill="#EAF0FB">PilotKids</text>
  <line x1="880" y1="712" x2="1080" y2="712" stroke="#ffffff" stroke-width="1" opacity="0.3"/>
  <text x="980" y="768" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-size="13" fill="#6b7d9c">O'quv markazi</text>

  <circle cx="600" cy="735" r="42" fill="none" stroke="${color}" stroke-width="2" opacity="0.6"/>
  <text x="600" y="743" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-size="26" fill="${color}">★</text>
</svg>`;

  // Fayl nomida faqat xavfsiz belgilar qoldiramiz.
  const safeName = cert.title.replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-|-$/g, "");

  return new Response(svg, {
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      "Content-Disposition": `attachment; filename="PilotKids-${safeName || "sertifikat"}.svg"`,
      "Cache-Control": "private, no-store",
    },
  });
}
