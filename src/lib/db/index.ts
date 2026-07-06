import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { getServerEnv } from "@/lib/env";
import * as schema from "./schema";

/**
 * Drizzle + Neon (HTTP serverless) ulanishi.
 * FAQAT server tomonida import qilinadi — connection string brauzerga chiqmaydi.
 */
const sql = neon(getServerEnv().DATABASE_URL);

export const db = drizzle(sql, { schema });

export * from "./schema";
