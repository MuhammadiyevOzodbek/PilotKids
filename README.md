# PilotKids — Robototexnika Akademiyasi

7–18 yoshli bolalar uchun onlayn robototexnika akademiyasi (EdTech).
**Shior:** _Kelajak muhandislari shu yerda boshlanadi._

## Stack

Next.js 16 (App Router, Turbopack) · React 19 · TypeScript (strict) · Tailwind CSS 4 ·
Framer Motion · Three.js · Zustand · Recharts · Zod · Neon PostgreSQL · Drizzle ORM ·
Better Auth · Nodemailer · Vercel.

## Ishga tushirish

```bash
npm install
cp .env.example .env.local   # qiymatlarni to'ldiring
npm run db:push              # schema'ni Neon'ga qo'llash
npm run db:seed              # demo ma'lumot + demo@pilotkids.uz / demo1234
npm run dev
```

## Skriptlar

| Skript | Vazifa |
|---|---|
| `npm run dev` | Dev server (Turbopack) |
| `npm run build` / `start` | Production build / server |
| `npm run lint` / `typecheck` / `format` | Sifat tekshiruvlari |
| `npm run db:generate` | Schema'dan migration yaratish |
| `npm run db:push` | Schema'ni to'g'ridan-to'g'ri Neon'ga sinxronlash (tavsiya) |
| `npm run db:seed` | Seed (idempotent) |
| `npm run db:studio` | Drizzle Studio |
| `npm run db:admin -- <email>` | Hisobga admin roli berish (ro'yxat uchun argumentsiz) |

> **Migration eslatmasi:** `drizzle-kit migrate` neon-http driver bilan jim no-op qiladi.
> Qo'lda SQL qo'llash uchun: `npx tsx --env-file=.env.local src/lib/db/apply-sql.ts drizzle/XXXX.sql`

## Kirish usullari

Foydalanuvchi bir necha yo'l bilan kira oladi. Google va Telegram tugmalari doim
ko'rinadi; kalitlar qo'yilmagan bo'lsa o'chirilgan holatda "tez orada" yozuvi
bilan turadi va kalit qo'yilgan zahoti o'zi faollashadi.

| Usul | Kerakli sozlama | Izoh |
|---|---|---|
| Email + parol | — | Har doim yoqiq |
| Email kod (parolsiz) | `SMTP_*` | Dev'da kod terminalga chiqadi |
| Telefon (SMS kod) | `ESKIZ_EMAIL`, `ESKIZ_PASSWORD` | O'zbekiston raqamlari (+998), dev'da kod terminalga |
| Google | `GOOGLE_CLIENT_ID/SECRET` | OAuth |
| Telegram | `TELEGRAM_BOT_TOKEN`, `TELEGRAM_BOT_USERNAME` | Login Widget, HMAC imzo tekshiriladi |

**Onboarding:** Google / Telegram / telefon orqali kelgan foydalanuvchida yosh va
ota-ona roziligi bo'lmaydi. Bunday hisob `onboarded: false` bo'lib qoladi va
`/welcome` sahifasidan nariga o'tolmaydi — yosh chegarasi (5–18) va rozilik
barcha usullar uchun majburiy bo'lib qoladi.

### Telegram sozlash

1. [@BotFather](https://t.me/BotFather) da bot yarating → tokenni oling.
2. `/setdomain` bilan saytingiz domenini bog'lang (lokalda `localhost` ishlamaydi —
   ngrok kabi tunnel kerak).
3. `TELEGRAM_BOT_TOKEN` va `TELEGRAM_BOT_USERNAME` ni `.env.local` ga yozing.

## Admin panel

`/admin` — foydalanuvchilar, kurslar, darslar va test savollarini boshqarish.

Birinchi adminni buyruq orqali tayinlaysiz (hech kim admin bo'lmasa, panel
orqali ham admin qo'shib bo'lmaydi):

```bash
npm run db:admin                    # hisoblar ro'yxati
npm run db:admin -- ali@misol.uz    # admin qilish
```

Admin roli **faqat shu buyruq orqali** beriladi. Ro'yxatdan o'tish oqimida hech
qachon admin berilmaydi: email/parol bilan kirishda manzil tasdiqlanmaydi, ya'ni
begona odam "admin" manzilini yozib panelga kirib olishi mumkin bo'lardi.

Rol har bir so'rovda ma'lumotlar bazasidan tekshiriladi (sessiya keshidan emas) —
shuning uchun adminlikni olib tashlaganingiz zahoti panel yopiladi.

Panel bo'limlari:

- **Umumiy** — foydalanuvchi/kurs/savol statistikasi, 14 kunlik ro'yxatdan o'tish grafigi
- **Foydalanuvchilar** — qidiruv, rol almashtirish, bloklash, o'chirish
- **Kurslar** — CRUD; har bir kurs ichida darslar (tartib almashtirish bilan)
- **Testlar** — savol CRUD; to'g'ri javob hech qachon brauzerga yuborilmaydi

## Muhit o'zgaruvchilari

`.env.local` (server-only; brauzerga chiqmaydi):

| O'zgaruvchi | Majburiy | Vazifa |
|---|---|---|
| `DATABASE_URL` | ha | Neon PostgreSQL connection string |
| `BETTER_AUTH_SECRET` | ha | `openssl rand -base64 32` |
| `BETTER_AUTH_URL` | ha | Ilova URL (prod: Vercel domeni) |
| `NEXT_PUBLIC_APP_URL` | ha | Ommaviy ilova URL |
| `GOOGLE_CLIENT_ID` / `_SECRET` | — | Google OAuth |
| `GITHUB_CLIENT_ID` / `_SECRET` | — | GitHub OAuth |
| `TELEGRAM_BOT_TOKEN` / `_USERNAME` | — | Telegram Login Widget |
| `ESKIZ_EMAIL` / `_PASSWORD` / `_FROM` | — | SMS OTP (eskiz.uz) |
| `SMTP_HOST` / `_PORT` / `_USER` / `_PASSWORD` / `_FROM` | — | Email OTP |
| `UPSTASH_REDIS_REST_URL` / `_TOKEN` | — | Rate limiting (yo'q bo'lsa jim o'chadi) |
| `GEMINI_API_KEY` | — | AI tutor (yo'q bo'lsa oflayn javoblar) |

## Vercel'ga deploy

1. Repozitoriyani GitHub'ga push qiling.
2. Vercel'da loyihani import qiling (Next.js avtomatik aniqlanadi).
3. **Environment Variables** bo'limiga yuqoridagilarni qo'shing. `BETTER_AUTH_URL` va
   `NEXT_PUBLIC_APP_URL` ni Vercel domeningizga tenglang.
4. OAuth ishlatilsa: Google/GitHub konsolida **Authorized redirect URI** sifatida
   `https://<domen>/api/auth/callback/google` (va `/github`) ni qo'shing.
5. Telegram ishlatilsa: BotFather'da `/setdomain` → Vercel domeni.

## Struktura

```
src/
├── app/
│   ├── (app)/          # himoyalangan ilova sahifalari (dashboard, kurslar, tutor…)
│   ├── admin/          # admin panel (requireAdmin bilan himoyalangan)
│   ├── login/ signup/ welcome/   # auth oqimi
│   ├── api/auth/       # better-auth handler + Telegram callback
│   └── page.tsx        # landing
├── components/
│   ├── admin/          # panel UI (Card, Modal, Button, forma maydonlari)
│   ├── app/            # sidebar, header, qidiruv, bildirishnomalar
│   └── auth/           # Field, ijtimoiy tugmalar, OTP formalari
└── lib/
    ├── admin/          # admin query va action'lari
    ├── auth/           # better-auth konfiguratsiyasi, sessiya, Telegram imzosi
    ├── db/             # schema, seed, migratsiya yordamchilari
    ├── notify/         # SMS (eskiz) va email (SMTP)
    └── actions/        # foydalanuvchi server action'lari
```

`src/proxy.ts` — Next.js 16 da `middleware.ts` shunday nomlanadi (arzon optimistik
tekshiruv; haqiqiy avtorizatsiya har doim server komponent/action ichida).

Demo hisob: **demo@pilotkids.uz** / **demo1234**
