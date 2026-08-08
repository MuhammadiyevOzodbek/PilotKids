import path from "node:path";

/**
 * lint-staged sozlamasi.
 *
 * ── Nega JSON emas, .mjs ────────────────────────────────────────────────
 * Sozlama `package.json` da turganda lint-staged fayllarni TO'LIQ yo'l
 * bilan uzatadi. Loyiha yo'lining o'zi uzun
 * (`C:\Users\...\Рабочий стол\PilotKids` — 45 belgi), shuning uchun
 * 90 dan ortiq fayl o'zgargan katta commitda buyruq ~10 000 belgiga
 * yetardi. Windows'da `cmd.exe` chegarasi 8 191 — natijada commit
 * "Слишком длинная командная строка" xatosi bilan yiqilardi va bu
 * xato kodga umuman aloqador emasligi bilan chalg'itardi.
 *
 * Bu yerda ikkita himoya bor:
 *   1. yo'llar NISBIY qilinadi (~110 belgi o'rniga ~45);
 *   2. ro'yxat baribir uzun bo'lsa, buyruq bir necha bo'lakka bo'linadi.
 *
 * Shu sababli commit hajmidan qat'i nazar ishlaydi.
 */

/**
 * Bitta buyruqning eng katta uzunligi.
 *
 * Windows chegarasi 8 191, lekin unga `cmd.exe` ning o'z qobig'i va
 * muhit o'zgaruvchilari ham kiradi. 6 000 — xavfsiz zaxira.
 */
const MAX_COMMAND_CHARS = 6000;

/** Bo'sh joy bo'lsa qo'shtirnoqqa oladi. */
function quote(file) {
  return /[\s"']/.test(file) ? `"${file}"` : file;
}

/** To'liq yo'llarni loyiha ildiziga nisbatan qisqartiradi. */
function toRelative(files) {
  return files.map((file) => quote(path.relative(process.cwd(), file).split(path.sep).join("/")));
}

/**
 * Fayllarni bir necha buyruqqa bo'ladi.
 *
 * Har bir bo'lak `MAX_COMMAND_CHARS` dan oshmaydi. Bo'lak soni
 * ahamiyatsiz: lint-staged ularni ketma-ket bajaradi.
 */
function batched(prefix, files) {
  const commands = [];
  let current = [];
  let length = prefix.length;

  for (const file of files) {
    const cost = file.length + 1;
    if (current.length > 0 && length + cost > MAX_COMMAND_CHARS) {
      commands.push(`${prefix} ${current.join(" ")}`);
      current = [];
      length = prefix.length;
    }
    current.push(file);
    length += cost;
  }

  if (current.length > 0) commands.push(`${prefix} ${current.join(" ")}`);
  return commands;
}

const config = {
  // Tartib muhim: avval ESLint tuzatadi, keyin Prettier formatlaydi.
  "*.{ts,tsx}": (files) => {
    const paths = toRelative(files);
    return [...batched("eslint --fix", paths), ...batched("prettier --write", paths)];
  },
  "*.{json,css,md,mjs,yml}": (files) => batched("prettier --write", toRelative(files)),
};

export default config;
