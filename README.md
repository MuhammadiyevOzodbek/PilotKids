# PilotKids — Robototexnika Akademiyasi

8–18 yoshli bolalar uchun onlayn robototexnika akademiyasi (EdTech).
**Shior:** _Kelajak muhandislari shu yerda boshlanadi._

## Stack

Next.js 16 (App Router, Turbopack) · React 19 · TypeScript (strict) · Tailwind CSS 4 ·
shadcn/ui · Framer Motion · Three.js + @react-three/fiber + drei · Zustand · Recharts ·
Lucide · React Hook Form + Zod · Neon PostgreSQL · Drizzle ORM · Better Auth · Vercel.

## Ishga tushirish

```bash
npm install
cp .env.example .env.local   # qiymatlarni to'ldiring
npm run db:migrate           # yoki: npm run db:push
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

## Muhit o'zgaruvchilari

`.env.local` (server-only; brauzerga chiqmaydi):

- `DATABASE_URL` — Neon PostgreSQL connection string
- `BETTER_AUTH_SECRET` — `openssl rand -base64 32`
- `BETTER_AUTH_URL` — ilova URL (prod: Vercel domeni)
- `NEXT_PUBLIC_APP_URL` — ommaviy ilova URL (prod: Vercel domeni)
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` — ixtiyoriy (OAuth)
- `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` — ixtiyoriy (OAuth)

## Vercel'ga deploy

1. Repozitoriyani GitHub'ga push qiling.
2. Vercel'da loyihani import qiling (Next.js avtomatik aniqlanadi).
3. **Environment Variables** bo'limiga yuqoridagilarni qo'shing. `BETTER_AUTH_URL` va
   `NEXT_PUBLIC_APP_URL` ni Vercel domeningizga tenglang (masalan `https://pilotkids.vercel.app`).
4. OAuth ishlatilsa: Google/GitHub konsolida **Authorized redirect URI** sifatida
   `https://<domen>/api/auth/callback/google` (va `/github`) ni qo'shing.
5. Deploy. Ma'lumotlar bazasi (Neon) allaqachon migratsiya + seed qilingan bo'lsa,
   qo'shimcha qadam kerak emas.

> Migration: bu loyihada schema Neon'ga qo'llab bo'lindi. Kelajakdagi schema
> o'zgarishlari uchun `npm run db:push` dan foydalaning.

## Struktura

```
src/
├── app/                # (marketing) landing · (auth) · (dashboard) · api/auth · SEO routelari
├── components/         # ui · landing · auth · dashboard · courses · subscription · three
├── lib/                # db (schema/queries/seed) · auth · actions · validations · data
├── store/              # useThemeStore · useScrollStore
├── hooks/              # useDevice · useMounted
└── middleware.ts       # route himoyasi
```

Demo hisob: **demo@pilotkids.uz** / **demo1234**
