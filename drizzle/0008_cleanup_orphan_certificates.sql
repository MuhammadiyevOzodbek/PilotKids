-- Remove stale certificates left by deleted/reseeded courses.
-- Qo'llash: npx tsx src/lib/db/apply-sql.ts drizzle/0008_cleanup_orphan_certificates.sql

DELETE FROM "certificate" WHERE "course_id" IS NULL;
