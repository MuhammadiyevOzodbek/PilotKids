import { serve } from '@hono/node-server'
import app from './app.js'
import { env } from './lib/env.js'

// Lokal ishga tushirish (`npm run dev`). Vercel'da bu fayl ishlatilmaydi —
// u yerda `api/index.ts` hono/vercel adapteri orqali xuddi shu app'ni serve qiladi.
// hostname 0.0.0.0 — Railway/konteynerda tashqi so'rovlarni qabul qilish uchun
// shart (localhost'ga bind bo'lsa platforma yeta olmaydi). PORT'ni Railway beradi.
serve({ fetch: app.fetch, port: env.PORT, hostname: '0.0.0.0' }, (info) => {
  console.log(`✅ PilotKids API http://localhost:${info.port} da ishlayapti`)
  if (!env.DATABASE_URL) {
    console.warn('⚠️  DATABASE_URL sozlanmagan — DB route\'lar ishlamaydi')
  }
})

export default app
