import "server-only";

/**
 * Robo uchun xavfsizlik qatlami.
 *
 * Ikki tomonlama himoya:
 *  1. KIRISH — foydalanuvchi xabaridagi prompt injection urinishlarini aniqlash.
 *  2. CHIQISH — modelga tasodifan tushib qolgan sirlar (API kalit, connection
 *     string, token, boshqa foydalanuvchi emaili) javobda chiqib ketmasligi.
 *
 * Muhim: bu qatlam yagona himoya emas. Asosiy himoya — AI'ga DB'ga kirish
 * huquqi umuman berilmagan; u faqat serverda tayyorlangan, foydalanuvchining
 * O'ZIGA tegishli kontekstni ko'radi (`src/lib/ai/context.ts`).
 */

/* ─────────────────────────── Kirish: injection ─────────────────────────── */

const INJECTION_PATTERNS: RegExp[] = [
  // Ko'rsatmalarni bekor qilishga urinish (ingliz + o'zbek + rus)
  /ignore\s+(all\s+)?(previous|prior|above|earlier)\s+(instructions?|prompts?|rules?)/i,
  /disregard\s+(all\s+)?(previous|prior|your)\s+(instructions?|rules?)/i,
  /forget\s+(everything|all|your)\s+(you|instructions?|rules?)/i,
  /(oldingi|avvalgi|yuqoridagi)\s+(barcha\s+)?(ko['’]rsatma|qoida|buyruq)/i,
  /(qoidalar(ni|ing)?|ko['’]rsatmalar(ni|ing)?)\s+(unut|bekor\s*qil|e['’]tibor\s*berma)/i,
  /забудь\s+(все\s+)?(предыдущие\s+)?(инструкции|правила)/i,
  /игнорируй\s+(все\s+)?(предыдущие\s+)?(инструкции|правила)/i,

  // System prompt'ni oshkor qilishga urinish
  /(system|initial|original)\s+(prompt|instruction|message)/i,
  /(reveal|show|print|repeat|output|display)\s+(me\s+)?(your|the)\s+(system\s+)?(prompt|instructions?|rules?)/i,
  /(sistem|tizim)\s*(prompt|ko['’]rsatma)(ing|ini|ingni)?\s*(ayt|ko['’]rsat|chiqar|yoz)/i,

  // Rolni almashtirish
  /you\s+are\s+(now|no\s+longer)\s+/i,
  /(act|behave|pretend|roleplay)\s+as\s+(if\s+)?(a|an|the)?\s*(developer|admin|root|dan|jailbreak)/i,
  /\b(dan\s+mode|developer\s+mode|jailbreak|sudo\s+mode)\b/i,
  /(sen\s+endi|siz\s+endi)\s+.{0,25}(bo['’]l|hisoblan)/i,

  // Sirlarni so'rash
  /\b(api[\s_-]?key|secret[\s_-]?key|access[\s_-]?token|password|parol|maxfiy\s+kalit)\b.{0,40}\b(what|show|give|tell|ayt|ber|ko['’]rsat|nima)\b/i,
  /\b(what|show|give|tell|ayt|ber|ko['’]rsat|nima)\b.{0,40}\b(api[\s_-]?key|secret[\s_-]?key|access[\s_-]?token|connection\s+string|database\s+url|maxfiy\s+kalit)\b/i,

  // Boshqa foydalanuvchilar ma'lumoti
  /(boshqa|barcha)\s+(o['’]quvchi|foydalanuvchi|bola)lar(ning)?\s+.{0,25}(email|parol|ma[e'’]lumot|ism|telefon)/i,
  /(other|all)\s+(users?|students?|children)('s)?\s+.{0,25}(email|password|data|info|name|phone)/i,

  // Kodga/DB'ga kirish urinishlari
  /\b(select|insert|update|delete|drop)\s+.{0,20}\b(from|into|table)\b/i,
  /(process\.env|DATABASE_URL|GEMINI_API_KEY|BETTER_AUTH_SECRET)/i,
];

export type InputCheck =
  { safe: true } | { safe: false; reason: "injection" | "too_long" | "empty" };

/** Foydalanuvchi xabarini yuborishdan oldin tekshiradi. */
export function checkUserInput(text: string): InputCheck {
  const t = text.trim();
  if (!t) return { safe: false, reason: "empty" };
  if (t.length > 1000) return { safe: false, reason: "too_long" };
  if (INJECTION_PATTERNS.some((re) => re.test(t))) return { safe: false, reason: "injection" };
  return { safe: true };
}

/** Injection aniqlanganda foydalanuvchiga qaytariladigan xushmuomala javob. */
export const INJECTION_REPLY =
  "Kechirasiz, bu savolga javob bera olmayman 🙂 Men PilotKids'dagi o'quv yordamchisiman — " +
  "robototexnika, Arduino, sensorlar, motorlar yoki dasturlash bo'yicha istalgan savolingizni bering!";

/* ─────────────────────────── Chiqish: redaction ─────────────────────────── */

const SECRET_PATTERNS: { re: RegExp; label: string }[] = [
  // Postgres/Neon connection string
  { re: /postgres(?:ql)?:\/\/[^\s"'<>]+/gi, label: "[maxfiy]" },
  // Google API kalitlari (AIza... va AQ.... formatlari)
  { re: /\bAIza[0-9A-Za-z_-]{20,}\b/g, label: "[maxfiy]" },
  { re: /\bAQ\.[0-9A-Za-z_-]{20,}\b/g, label: "[maxfiy]" },
  // Bearer token / JWT
  { re: /\bBearer\s+[A-Za-z0-9._-]{20,}/gi, label: "[maxfiy]" },
  { re: /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/g, label: "[maxfiy]" },
  // Muhit o'zgaruvchisi ko'rinishidagi sirlar
  {
    re: /\b(DATABASE_URL|GEMINI_API_KEY|BETTER_AUTH_SECRET|UPSTASH_REDIS_REST_TOKEN|[A-Z_]*(?:SECRET|TOKEN|API_KEY|PASSWORD))\s*[:=]\s*\S+/g,
    label: "[maxfiy]",
  },
  // Email manzillar — bolalar platformasida chatda ko'rsatilmasin
  { re: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g, label: "[email yashirildi]" },
];

/** Model javobidan sirlarni tozalaydi. */
export function redactSecrets(text: string): string {
  let out = text;
  for (const { re, label } of SECRET_PATTERNS) out = out.replace(re, label);
  return out;
}

/** Bolalar uchun nomaqbul kontent belgilari (oxirgi zaxira filtri). */
const UNSAFE_OUTPUT = [
  /\b(o[']?ldir|suitsid|zaharla)\w*/i,
  /\b(suicide|self[\s-]?harm|kill\s+yourself)\b/i,
  /\b(porn|sexual|erotic)\w*/i,
];

export type OutputCheck = { text: string; blocked: boolean };

/** Model javobini foydalanuvchiga ko'rsatishdan oldin tozalaydi. */
export function sanitizeReply(text: string): OutputCheck {
  const redacted = redactSecrets(text);
  if (UNSAFE_OUTPUT.some((re) => re.test(redacted))) {
    return {
      text:
        "Bu mavzuda gaplasha olmayman. Agar biror narsa seni tashvishga solayotgan bo'lsa, " +
        "ota-onang yoki o'qituvching bilan gaplash. Kel, robototexnikaga qaytamiz! 🤖",
      blocked: true,
    };
  }
  return { text: redacted, blocked: false };
}
