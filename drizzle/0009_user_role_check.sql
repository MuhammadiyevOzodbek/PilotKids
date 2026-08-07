-- Keep application roles constrained at the database layer.
UPDATE "user"
SET "role" = 'student'
WHERE "role" NOT IN ('student', 'parent', 'admin', 'superadmin');

ALTER TABLE "user" DROP CONSTRAINT IF EXISTS "user_role_check";

ALTER TABLE "user"
ADD CONSTRAINT "user_role_check"
CHECK ("role" IN ('student', 'parent', 'admin', 'superadmin'));
