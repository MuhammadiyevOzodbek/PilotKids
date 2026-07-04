import 'dotenv/config'
import { defineConfig } from 'drizzle-kit'

// drizzle-kit (push/generate/studio) uchun konfiguratsiya.
// DATABASE_URL .env dan olinadi — kodda ochiq yozilmaydi.
// (Bu yerda env.ts import qilinmaydi: drizzle-kit yuklovchisi .js kengaytmali
// import'larni yechmaydi.)
const url = process.env.DATABASE_URL
if (!url) {
  throw new Error('DATABASE_URL sozlanmagan. server/.env fayliga qo\'shing.')
}

export default defineConfig({
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: { url },
  verbose: true,
  strict: true,
})
