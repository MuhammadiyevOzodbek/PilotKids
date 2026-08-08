/**
 * Blok tizimining matnlari (§41).
 *
 * Blok ta'riflari va interfeys komponentlari ichida o'zbekcha satr
 * YOZILMAYDI — faqat shu jadvaldagi kalit ishlatiladi. Yangi til qo'shish
 * bitta jadval qo'shishga aylanadi, blok mantiqiga umuman tegilmaydi.
 *
 * Tarjimasi yo'q kalit uchun o'zbekcha matn qaytariladi (bo'sh joy emas):
 * yarim tarjima qilingan interfeysda bola nima bosayotganini baribir
 * tushunishi kerak.
 */

export type BlockLocale = "uz" | "ru" | "en";

export const BLOCK_LOCALES: readonly BlockLocale[] = ["uz", "ru", "en"];

type Messages = Record<string, string>;

/* ─────────────────────────── O'zbekcha ─────────────────────────── */

const uz: Messages = {
  /* Kategoriyalar */
  "blocks.category.events": "Boshlanish",
  "blocks.category.control": "Boshqaruv",
  "blocks.category.pins": "Arduino pinlari",
  "blocks.category.logic": "Mantiq",
  "blocks.category.math": "Matematika",
  "blocks.category.variables": "O'zgaruvchilar",
  "blocks.category.sensors": "Sensorlar",
  "blocks.category.output": "Chiqish",
  "blocks.category.motors": "Motorlar",
  "blocks.category.display": "Ekran",
  "blocks.category.serial": "Serial",
  "blocks.category.functions": "Funksiyalar",

  /* Boshlanish bloklari */
  "blocks.events.onStart": "Arduino ishga tushganda",
  "blocks.events.onStart.tip":
    "Ichidagi bloklar faqat bir marta — plata yoqilganda bajariladi. Arduino kodidagi setup() shu.",
  "blocks.events.forever": "Doim takrorla",
  "blocks.events.forever.tip":
    "Ichidagi bloklar to'xtovsiz qayta-qayta bajariladi. Arduino kodidagi loop() shu.",

  /* Pin bloklari */
  "blocks.pins.pinMode": "{pin} pinini {mode} qil",
  "blocks.pins.pinMode.tip":
    "Pin nima uchun ishlatilishini aytadi: OUTPUT — signal beradi, INPUT — signal o'qiydi.",
  "blocks.pins.digitalWrite": "{pin} ni {level} qil",
  "blocks.pins.digitalWrite.tip":
    "Pinga kuchlanish beradi (HIGH = 5V) yoki uzadi (LOW = 0V). LED shu bilan yonadi.",
  "blocks.pins.digitalRead": "{pin} qiymatini o'qi",
  "blocks.pins.digitalRead.tip": "Pinda kuchlanish bormi: bor bo'lsa 1, yo'q bo'lsa 0 qaytaradi.",

  /* Boshqaruv — vaqt */
  "blocks.control.waitSeconds": "{seconds} soniya kut",
  "blocks.control.waitSeconds.tip": "Ko'rsatilgan vaqt davomida hech narsa qilmay turadi.",
  "blocks.control.waitMillis": "{ms} millisekund kut",
  "blocks.control.waitMillis.tip": "1000 millisekund = 1 soniya.",
  "blocks.control.waitMicros": "{us} mikrosekund kut",
  "blocks.control.waitMicros.tip":
    "Juda qisqa kutish. 1000 mikrosekund = 1 millisekund. Sensorlar uchun kerak bo'ladi.",

  /* Ogohlantirishlar */
  "blocks.warn.orphan":
    "Bu blok «Arduino ishga tushganda» yoki «Doim takrorla» ichida emas — u bajarilmaydi.",
  "blocks.warn.duplicateStart":
    "«Arduino ishga tushganda» bloki bittadan ko'p. Faqat birinchisi ishlatildi.",
  "blocks.warn.duplicateForever":
    "«Doim takrorla» bloki bittadan ko'p. Faqat birinchisi ishlatildi.",
  "blocks.warn.emptySlot": "«{slot}» uyasi bo'sh — o'rniga {fallback} ishlatildi.",

  /* Interfeys */
  "blocks.ui.mode.block": "Bloklar",
  "blocks.ui.mode.code": "Kod",
  "blocks.ui.mode.split": "Ikkalasi",
  "blocks.ui.level.beginner": "Boshlang'ich",
  "blocks.ui.level.advanced": "Kengaytirilgan",
  "blocks.ui.title": "Dasturlash",
  "blocks.ui.generated": "Hosil bo'lgan Arduino kod",
  "blocks.ui.emptyWorkspace":
    "Chapdagi kategoriyadan blokni bu yerga sudrab tashlang. «Arduino ishga tushganda» blokidan boshlang.",
  "blocks.ui.deleteHint": "Blokni palitraga qaytarib tashlang — o'chadi",
  "blocks.ui.undo": "Ortga",
  "blocks.ui.redo": "Oldinga",
  "blocks.ui.clear": "Ish maydonini tozalash",
  "blocks.ui.zoomIn": "Kattalashtirish",
  "blocks.ui.zoomOut": "Kichraytirish",
  "blocks.ui.zoomReset": "Masshtabni tiklash",
  "blocks.ui.zoomFit": "Bloklarni ekranga sig'dirish",
  "blocks.ui.duplicate": "Nusxalash",
  "blocks.ui.delete": "O'chirish",
  "blocks.ui.codeModeWarning":
    "Qo'lda yozilgan kod bloklarga avtomatik qaytarilmasligi mumkin. Kod rejimida davom etasizmi?",
  "blocks.ui.codeModeContinue": "Kod rejimida davom etish",
  "blocks.ui.codeModeCancel": "Bekor qilish",
};

/*
 * Ruscha va inglizcha jadvallar Faza 5 da to'ldiriladi. Bo'sh qoldirilgani
 * ataylab: yarim to'ldirilgan jadval "qaysi kalit tarjima qilingan?" degan
 * savolni yashirardi, hozir esa `t()` ochiq-oydin o'zbekchaga tushadi.
 */
const ru: Messages = {};
const en: Messages = {};

const TABLES: Record<BlockLocale, Messages> = { uz, ru, en };

/**
 * Kalitni matnga aylantiradi.
 *
 * `{name}` ko'rinishidagi joy egallovchilar `params` dan to'ldiriladi.
 * Kalit topilmasa kalitning o'zi qaytadi — ekranda "blocks.foo.bar"
 * ko'rinishi tarjima yo'qolganini darhol bildiradi.
 */
export function t(
  key: string,
  params?: Record<string, string | number>,
  locale: BlockLocale = "uz",
): string {
  const raw = TABLES[locale][key] ?? uz[key] ?? key;
  if (!params) return raw;
  return raw.replace(/\{(\w+)\}/g, (match, name: string) => {
    const value = params[name];
    return value === undefined ? match : String(value);
  });
}

/** Shablondagi joy egallovchilar ro'yxati: `"{pin} ni {level} qil"` → `["pin","level"]`. */
export function templateSlots(template: string): string[] {
  return [...template.matchAll(/\{(\w+)\}/g)].map((m) => m[1]!);
}

/**
 * Yorliqni matn va uya bo'laklariga ajratadi — blokni chizish uchun.
 *
 * `"{pin} ni {level} qil"` →
 *   [{text:""},{slot:"pin"},{text:" ni "},{slot:"level"},{text:" qil"}]
 * Bo'sh matn bo'laklari tashlab yuboriladi.
 */
export type LabelPart = { kind: "text"; text: string } | { kind: "slot"; name: string };

export function splitLabel(
  key: string,
  params?: Record<string, string | number>,
  locale: BlockLocale = "uz",
): LabelPart[] {
  const raw = t(key, params, locale);
  const parts: LabelPart[] = [];
  let last = 0;

  for (const match of raw.matchAll(/\{(\w+)\}/g)) {
    const index = match.index;
    if (index > last) parts.push({ kind: "text", text: raw.slice(last, index) });
    parts.push({ kind: "slot", name: match[1]! });
    last = index + match[0].length;
  }
  if (last < raw.length) parts.push({ kind: "text", text: raw.slice(last) });

  // Bo'sh joylar ATAYLAB saqlanadi: ular blokdagi so'zlarni bir-biridan
  // ajratib turadi ("13 ni HIGH qil", "13niHIGHqil" emas).
  return parts;
}
