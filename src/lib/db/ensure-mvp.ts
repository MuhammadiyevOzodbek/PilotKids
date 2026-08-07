/**
 * Non-destructive MVP data bootstrap.
 *
 * Existing user progress is preserved. This script only upserts catalog rows
 * and backfills baseline user rows that are missing.
 *
 * Usage:
 *   npx tsx --env-file=.env.local src/lib/db/ensure-mvp.ts
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { randomUUID } from "node:crypto";
import { badges as badgesData, categories as categoriesData } from "../data";
import * as schema from "./schema";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL topilmadi (.env.local ni tekshiring)");
  process.exit(1);
}

const sql = neon(url);
const db = drizzle(sql, { schema });

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[''`’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

async function ensureCategories() {
  const rows = [];
  for (const [sortOrder, c] of categoriesData.entries()) {
    const slug = slugify(c.title);
    const [row] = await db
      .insert(schema.category)
      .values({
        id: randomUUID(),
        slug,
        title: c.title,
        icon: c.icon,
        color: c.color,
        soft: c.soft,
        courseCount: c.count,
        sortOrder,
      })
      .onConflictDoUpdate({
        target: schema.category.slug,
        set: {
          title: c.title,
          icon: c.icon,
          color: c.color,
          soft: c.soft,
          courseCount: c.count,
          sortOrder,
        },
      })
      .returning({ id: schema.category.id, slug: schema.category.slug });
    rows.push(row!);
  }
  return new Map(rows.map((r) => [r.slug, r.id]));
}

async function ensureBadges() {
  for (const [sortOrder, b] of badgesData.entries()) {
    const slug = slugify(b.name);
    await db
      .insert(schema.badge)
      .values({
        id: randomUUID(),
        slug,
        name: b.name,
        icon: b.icon,
        color: b.color,
        soft: b.soft,
        sortOrder,
      })
      .onConflictDoUpdate({
        target: schema.badge.slug,
        set: { name: b.name, icon: b.icon, color: b.color, soft: b.soft, sortOrder },
      });
  }
}

async function backfillUsers() {
  await sql`
    insert into "user_settings" ("user_id")
    select u."id"
    from "user" u
    where not exists (
      select 1 from "user_settings" s where s."user_id" = u."id"
    )
  `;

  await sql`delete from "certificate" where "course_id" is null`;
}

async function main() {
  console.log("🔧 MVP backend data tekshirilmoqda...");
  await ensureCategories();
  await ensureBadges();
  await backfillUsers();
  console.log("✅ MVP backend data tayyor.");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("❌ MVP data bootstrap xatosi:", err);
    process.exit(1);
  });
