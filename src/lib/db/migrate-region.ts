/**
 * Ma'lumotlar bazasini boshqa Neon loyihasiga (masalan yaqinroq regionga) ko'chirish.
 *
 * Nima uchun kerak: hozirgi DB `us-east-1` da, O'zbekistondan har so'rov ~240ms
 * sof tarmoq vaqti oladi. Yevropa regioni (`eu-central-1`) bu vaqtni taxminan
 * uch barobar qisqartiradi va sahifalar shunga yarasha tez ochiladi.
 *
 * Ishlatish:
 *   1. Neon konsolida yangi loyiha yarating, region: Europe (Frankfurt).
 *   2. Yangi connection string'ni oling (`-pooler` bilan).
 *   3. Schema'ni yangi bazaga qo'llang:
 *        DATABASE_URL="<yangi-url>" npm run db:push
 *   4. Ma'lumotni ko'chiring:
 *        npm run db:migrate-region -- "<yangi-url>"
 *   5. `.env.local` dagi DATABASE_URL ni yangisiga almashtiring.
 *
 * Skript idempotent emas — yangi baza BO'SH bo'lishi kutiladi (4-qadamdan oldin
 * faqat `db:push` bajarilgan). Har jadval uchun avval nechta qator borligini
 * tekshiradi va bo'sh bo'lmasa to'xtaydi, ya'ni ma'lumot ustiga yozilmaydi.
 */
import { neon } from "@neondatabase/serverless";

/**
 * Ko'chirish tartibi — tashqi kalitlar buzilmasin.
 * Ota jadval har doim bolasidan oldin turadi.
 */
const TABLES = [
  "user",
  "session",
  "account",
  "verification",
  "category",
  "course",
  "lesson",
  "badge",
  "lab_project",
  "quiz_question",
  "enrollment",
  "lesson_progress",
  "user_badge",
  "certificate",
  "notification",
  "daily_activity",
  "chat_message",
  "quiz_attempt",
  "lesson_note",
  "lab_progress",
  "user_settings",
] as const;

/** Bir marta yuboriladigan qatorlar soni — juda katta paket so'rovni yiqitadi. */
const BATCH = 200;

const target = process.argv[2];
if (!target) {
  console.error('Ishlatish: npm run db:migrate-region -- "<yangi-DATABASE_URL>"');
  process.exit(1);
}
const source = process.env.DATABASE_URL;
if (!source) {
  console.error("DATABASE_URL topilmadi (.env.local ni tekshiring)");
  process.exit(1);
}
if (source === target) {
  console.error("Manba va manzil bir xil — ko'chirishga hojat yo'q");
  process.exit(1);
}

const from = neon(source);
const to = neon(target);

/** Identifikatorni xavfsiz qo'shtirnoqqa oladi. */
function q(name: string): string {
  return `"${name.replace(/"/g, '""')}"`;
}

async function main() {
  console.log("Manba:", source!.replace(/:[^:@]+@/, ":***@"));
  console.log("Manzil:", target!.replace(/:[^:@]+@/, ":***@"));
  console.log();

  // 1) Manzil bo'sh ekanini tekshiramiz — ma'lumot ustiga yozib yubormaylik.
  for (const t of TABLES) {
    const rows = (await to.query(`select count(*)::int as n from ${q(t)}`)) as { n: number }[];
    if ((rows[0]?.n ?? 0) > 0) {
      console.error(`❌ Manzildagi "${t}" jadvalida ${rows[0]!.n} ta qator bor.`);
      console.error("   Ko'chirish faqat BO'SH bazaga qilinadi. Avval uni tozalang.");
      process.exit(1);
    }
  }
  console.log("✓ Manzil bazasi bo'sh, ko'chirishni boshlaymiz\n");

  let grandTotal = 0;

  for (const t of TABLES) {
    const rows = (await from.query(`select * from ${q(t)}`)) as Record<string, unknown>[];
    if (rows.length === 0) {
      console.log(`  ${t}: bo'sh, o'tkazib yuborildi`);
      continue;
    }

    const cols = Object.keys(rows[0]!);
    const colList = cols.map(q).join(", ");

    for (let i = 0; i < rows.length; i += BATCH) {
      const chunk = rows.slice(i, i + BATCH);
      const params: unknown[] = [];
      const valueGroups = chunk.map((row) => {
        const placeholders = cols.map((c) => {
          params.push(row[c] ?? null);
          return `$${params.length}`;
        });
        return `(${placeholders.join(", ")})`;
      });

      await to.query(
        `insert into ${q(t)} (${colList}) values ${valueGroups.join(", ")} on conflict do nothing`,
        params,
      );
    }

    grandTotal += rows.length;
    console.log(`  ✓ ${t}: ${rows.length} ta qator`);
  }

  console.log(`\n✅ Jami ${grandTotal} ta qator ko'chirildi.`);
  console.log("Endi .env.local dagi DATABASE_URL ni yangi manzilga almashtiring.");
}

main().catch((err) => {
  console.error("\n❌ Ko'chirishda xatolik:", (err as Error).message);
  process.exit(1);
});
