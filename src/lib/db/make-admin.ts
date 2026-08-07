/**
 * Mavjud hisobga admin rolini berish (yoki qaytarib olish).
 *
 * Admin panelga birinchi kirish uchun kerak: hech kim admin bo'lmasa,
 * panel orqali ham admin tayinlab bo'lmaydi.
 *
 * Ishlatish:
 *   npm run db:admin -- ali@misol.uz          # admin qilish
 *   npm run db:admin -- ali@misol.uz superadmin # bosh admin qilish
 *   npm run db:admin -- ali@misol.uz student  # rolni qaytarish
 *   npm run db:admin                          # hisoblar ro'yxati
 */
import { neon } from "@neondatabase/serverless";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL topilmadi (.env.local ni tekshiring)");
  process.exit(1);
}

const sql = neon(url);
const email = process.argv[2]?.trim().toLowerCase();
const role = process.argv[3]?.trim() ?? "admin";

async function list() {
  const rows = (await sql`
    select name, email, role, age, onboarded, banned
    from "user"
    order by created_at
    limit 30
  `) as Record<string, unknown>[];

  if (rows.length === 0) {
    console.log("Hali hisob yo'q. Avval saytdan ro'yxatdan o'ting.");
    return;
  }
  console.table(rows);
  console.log("\nAdmin qilish uchun: npm run db:admin -- <email>");
  console.log("Bosh admin qilish uchun: npm run db:admin -- <email> superadmin");
}

async function setRole() {
  if (!["student", "parent", "admin", "superadmin"].includes(role)) {
    console.error(`Noto'g'ri rol: ${role} (student | parent | admin | superadmin)`);
    process.exit(1);
  }

  const rows = (await sql`
    update "user"
    set role = ${role}, onboarded = true, updated_at = now()
    where lower(email) = ${email}
    returning name, email, role
  `) as Record<string, unknown>[];

  if (rows.length === 0) {
    console.error(`❌ ${email} topilmadi. Avval shu email bilan ro'yxatdan o'ting.`);
    process.exit(1);
  }

  console.log(`✅ ${rows[0]!.name} (${rows[0]!.email}) → rol: ${rows[0]!.role}`);
  if (role === "admin") console.log("   Admin panel: /admin");
  if (role === "superadmin") console.log("   Bosh admin panel: /superadmin");
}

(email ? setRole() : list()).catch((err) => {
  console.error("Xatolik:", (err as Error).message);
  process.exit(1);
});
