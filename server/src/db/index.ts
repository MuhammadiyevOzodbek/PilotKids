import { neon } from '@neondatabase/serverless'
import { drizzle, type NeonHttpDatabase } from 'drizzle-orm/neon-http'
import { requireDatabaseUrl } from '../lib/env.js'
import * as schema from './schema.js'

// Lazy singleton — DB ulanishi birinchi ishlatilganda quriladi. Bu tufayli
// server DATABASE_URL bo'lmasa ham ko'tariladi (faqat DB'ga tegadigan so'rov
// aniq xato beradi), va Neon HTTP driver har so'rov uchun qayta ulanmaydi.
let _db: NeonHttpDatabase<typeof schema> | null = null

function init(): NeonHttpDatabase<typeof schema> {
  if (_db) return _db
  const sql = neon(requireDatabaseUrl())
  _db = drizzle(sql, { schema })
  return _db
}

// Proxy — `db.select(...)` chaqirilganda haqiqiy drizzle instansiga yo'naltiradi.
export const db = new Proxy({} as NeonHttpDatabase<typeof schema>, {
  get(_target, prop) {
    const real = init()
    const value = Reflect.get(real, prop)
    return typeof value === 'function' ? value.bind(real) : value
  },
})

export { schema }
