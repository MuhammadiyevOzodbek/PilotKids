import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { env } from "@/lib/env";
import * as schema from "./schema";

const sql = neon(env.DATABASE_URL);

export const db = drizzle(sql, { schema });

/**
 * Ulanishni oldindan isitish.
 *
 * O'lchov: `us-east-1` dagi bazaga birinchi so'rov ~750 ms, keyingilari
 * ~230 ms oladi. Bu ~520 ms farq — TLS qo'l berishi va Neon compute'ini
 * uyquda bo'lsa uyg'otish narxi. Uni foydalanuvchi so'rovi to'lamasligi
 * uchun jarayon ko'tarilishi bilan bo'sh so'rov yuboramiz: birinchi
 * sahifani ochgan odam allaqachon isigan ulanishga tushadi.
 *
 * Ataylab `await` qilinmaydi va xatosi yutiladi — bu optimizatsiya, ilova
 * ishga tushishi unga bog'liq emas. Baza yetib bormasa, oddiy so'rovlar
 * o'z xatosini o'zi qaytaradi.
 */
void sql`select 1`.catch(() => {});

export * from "./schema";
