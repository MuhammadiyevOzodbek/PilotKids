CREATE TABLE IF NOT EXISTS "superadmin_audit_log" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "actor_id" text REFERENCES "user"("id") ON DELETE SET NULL,
  "actor_name" text NOT NULL,
  "actor_role" text NOT NULL,
  "action" text NOT NULL,
  "target" text NOT NULL,
  "ip_address" text,
  "impact" text DEFAULT 'low' NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "superadmin_audit_log_created_at_idx"
  ON "superadmin_audit_log" ("created_at" DESC);
