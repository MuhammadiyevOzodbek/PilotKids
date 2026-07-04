import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { HTTPException } from 'hono/http-exception'
import { env } from './lib/env.js'
import authRoutes from './routes/auth.js'
import coursesRoutes from './routes/courses.js'
import usersRoutes from './routes/users.js'
import rankingRoutes from './routes/ranking.js'

// Hono ilovasi — lokal dev (`index.ts` → @hono/node-server) va Vercel
// serverless (`api/index.ts` → hono/vercel) ikkalasi shu bitta app'ni ulashadi.
const app = new Hono()

app.use('*', logger())

// CORS — faqat ruxsat etilgan frontend origin(lar)dan so'rovlar. Auth uchun
// Authorization header'iga ruxsat beriladi.
app.use(
  '*',
  cors({
    origin: env.CORS_ORIGIN,
    allowMethods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  })
)

// Sog'liq tekshiruvi / hello
app.get('/', (c) =>
  c.json({
    name: 'PilotKids API',
    status: 'ok',
    version: '0.1.0',
  })
)

// Health check — Railway shu endpoint orqali server tirikligini tekshiradi.
app.get('/health', (c) => c.json({ status: 'ok', time: new Date().toISOString() }))
app.get('/api/health', (c) => c.json({ status: 'ok', time: new Date().toISOString() }))

// --- API route'lar ---
app.route('/api/auth', authRoutes)
app.route('/api/courses', coursesRoutes)
app.route('/api/users', usersRoutes)
app.route('/api/ranking', rankingRoutes)

// 404
app.notFound((c) => c.json({ error: 'Topilmadi' }, 404))

// Markaziy xato ishlovchi — HTTPException aniq status/xabar beradi,
// kutilmagan xatolar 500 bo'ladi (ichki tafsilot brauzerga chiqmaydi).
app.onError((err, c) => {
  if (err instanceof HTTPException) {
    return c.json({ error: err.message }, err.status)
  }
  console.error('[server error]', err)
  return c.json({ error: 'Server xatosi' }, 500)
})

export default app
