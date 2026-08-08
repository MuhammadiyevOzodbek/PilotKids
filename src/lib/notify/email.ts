import "server-only";
import nodemailer from "nodemailer";
import { env } from "@/lib/env";

/**
 * SMTP orqali email yuborish (Gmail, Yandex, Mailgun — bari SMTP beradi).
 *
 * SMS bilan bir xil siyosat: sozlanmagan bo'lsa dev'da konsolga chiqadi,
 * ishlab chiqarishda xatolik.
 */

let transport: nodemailer.Transporter | null = null;

function getTransport(): nodemailer.Transporter {
  if (transport) return transport;
  const port = Number(env.SMTP_PORT) || 587;
  transport = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port,
    // 465 — implicit TLS, qolganlari STARTTLS bilan ko'tariladi.
    secure: port === 465,
    auth: { user: env.SMTP_USER, pass: env.SMTP_PASSWORD },
    /*
     * Muddat chegaralari SHART.
     *
     * Nodemailer standart qiymatlari juda uzun (bir necha daqiqa). SMTP
     * server javob bermay qolsa, email kod so'ragan har bir so'rov shu
     * muddatgacha osilib turardi va serverless funksiya vaqti tugaguncha
     * resursni band qilardi.
     */
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 15_000,
  });
  return transport;
}

export async function sendEmail(to: string, subject: string, html: string, text: string) {
  const configured = Boolean(env.SMTP_HOST && env.SMTP_USER);

  if (!configured) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("SMTP sozlanmagan (SMTP_HOST / SMTP_USER)");
    }
    console.info(`\n✉️  [DEV EMAIL] → ${to}\n   ${subject}\n   ${text}\n`);
    return;
  }

  await getTransport().sendMail({
    from: env.SMTP_FROM || env.SMTP_USER,
    to,
    subject,
    text,
    html,
  });
}

/** Bir martalik kod xati — bolaga tushunarli, qisqa matn. */
export function otpEmailTemplate(code: string) {
  const html = `
    <div style="font-family:system-ui,sans-serif;max-width:440px;margin:0 auto;padding:32px 24px">
      <div style="font-size:22px;font-weight:800;color:#0F172A;margin-bottom:8px">PilotKids</div>
      <p style="color:#4A5A70;font-size:16px;line-height:1.6;margin:0 0 24px">
        Salom! Kirish uchun bir martalik kodingiz:
      </p>
      <div style="font-size:34px;font-weight:800;letter-spacing:.18em;color:#2F6BF3;
                  background:#E9F0FE;border-radius:16px;padding:20px;text-align:center">
        ${code}
      </div>
      <p style="color:#94A3B8;font-size:14px;line-height:1.6;margin:24px 0 0">
        Kod 5 daqiqa amal qiladi. Agar buni siz so'ramagan bo'lsangiz, bu xatni e'tiborsiz qoldiring
        va ota-onangizga ayting.
      </p>
    </div>`;
  const text = `PilotKids kirish kodi: ${code}\nKod 5 daqiqa amal qiladi.`;
  return { html, text };
}
