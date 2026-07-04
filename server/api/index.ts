import { handle } from 'hono/vercel'
import app from '../src/app.js'

// Vercel Serverless Function entry — barcha so'rovlar (vercel.json rewrite orqali)
// shu funksiyaga keladi va Hono app tomonidan boshqariladi. Baza Neon'da (HTTP
// driver serverless muhitga mos). DATABASE_URL/JWT_SECRET Vercel env'dan olinadi.
export const config = {
  runtime: 'nodejs',
}

export default handle(app)
