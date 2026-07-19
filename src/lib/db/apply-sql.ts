/**
 * SQL migratsiya faylini app driver (neon-http) orqali qo'llash.
 *
 * Nima uchun kerak: `drizzle-kit migrate` neon-http driver bilan jim no-op
 * qiladi, shuning uchun migratsiya SQL'ini shu yerda qo'lda ijro etamiz.
 *
 * Ishlatish: npx tsx src/lib/db/apply-sql.ts drizzle/0003_learning_layer.sql
 */
import { readFileSync } from "node:fs";
import { neon } from "@neondatabase/serverless";

const file = process.argv[2];
if (!file) {
  console.error("Ishlatish: tsx src/lib/db/apply-sql.ts <fayl.sql>");
  process.exit(1);
}

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL topilmadi (.env.local ni tekshiring)");
  process.exit(1);
}

const sql = neon(url);
const raw = readFileSync(file, "utf8");

// Izohlarni olib tashlab, `;` bo'yicha bo'lamiz.
const statements = raw
  .split("\n")
  .filter((l) => !l.trim().startsWith("--"))
  .join("\n")
  .split(";")
  .map((s) => s.trim())
  .filter(Boolean);

async function main() {
  let ok = 0;
  for (const [i, stmt] of statements.entries()) {
    const label = stmt.replace(/\s+/g, " ").slice(0, 70);
    try {
      await sql.query(stmt);
      ok++;
      console.log(`✓ [${i + 1}/${statements.length}] ${label}`);
    } catch (err) {
      console.error(`✗ [${i + 1}/${statements.length}] ${label}`);
      console.error(`  ${(err as Error).message}`);
      process.exit(1);
    }
  }
  console.log(`\n✅ ${ok}/${statements.length} ta amal muvaffaqiyatli qo'llandi.`);
}

main();
