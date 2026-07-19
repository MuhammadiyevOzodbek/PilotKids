import type { Metadata } from "next";
import Link from "next/link";
import { Icon } from "@/components/icon";

export const metadata: Metadata = {
  title: "Maxfiylik siyosati",
  description:
    "PilotKids qanday ma'lumot yig'adi, ularni qanday saqlaydi va bolalar maxfiyligini qanday himoya qiladi.",
};

const h2Style: React.CSSProperties = {
  fontFamily: "'Sora'",
  fontWeight: 700,
  fontSize: 22,
  letterSpacing: "-.01em",
  color: "var(--text)",
  margin: "40px 0 12px",
  scrollMarginTop: 90,
};
const pStyle: React.CSSProperties = {
  color: "var(--text-2)",
  fontSize: 16,
  lineHeight: 1.75,
  margin: "0 0 14px",
};
const liStyle: React.CSSProperties = {
  color: "var(--text-2)",
  fontSize: 16,
  lineHeight: 1.75,
  marginBottom: 8,
};

export default function MaxfiylikPage() {
  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)" }}>
      {/* Sarlavha (navy, landing hero uslubida) */}
      <section
        style={{
          background: "radial-gradient(120% 120% at 80% -10%,#16224a 0%,#0B1220 55%)",
          color: "#EAF0FB",
        }}
      >
        <div className="sec-x" style={{ maxWidth: 820, margin: "0 auto", padding: "28px 0 56px" }}>
          <Link
            href="/"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              color: "#AEBBD4",
              fontWeight: 600,
              fontSize: 14,
              textDecoration: "none",
              marginBottom: 30,
            }}
          >
            <Icon name="arrow_back" size={18} color="#AEBBD4" />
            Bosh sahifa
          </Link>
          <h1
            className="font-display"
            style={{
              fontWeight: 800,
              fontSize: "clamp(28px,5vw,42px)",
              letterSpacing: "-.02em",
              margin: "0 0 12px",
            }}
          >
            Maxfiylik siyosati
          </h1>
          <p style={{ color: "#AEBBD4", fontSize: 16, lineHeight: 1.7, margin: 0 }}>
            PilotKids — bolalar uchun ta&apos;lim platformasi. Quyida qanday ma&apos;lumot
            yig&apos;ishimizni, undan nima uchun foydalanishimizni va uni qanday himoya qilishimizni
            sodda til bilan tushuntiramiz.
          </p>
          <p style={{ color: "#6f82a3", fontSize: 13, margin: "18px 0 0" }}>
            Oxirgi yangilanish: 2026-yil 19-iyul
          </p>
        </div>
      </section>

      <article className="sec-x" style={{ maxWidth: 820, margin: "0 auto", padding: "8px 0 80px" }}>
        <h2 style={h2Style}>1. Qanday ma&apos;lumot yig&apos;amiz</h2>
        <p style={pStyle}>
          Platformadan foydalanish uchun zarur bo&apos;lgan minimal ma&apos;lumot:
        </p>
        <ul style={{ paddingLeft: 22, margin: "0 0 14px" }}>
          <li style={liStyle}>
            <strong>Akkaunt ma&apos;lumotlari:</strong> ism (yoki taxallus), elektron pochta manzili
            va parol (parol shifrlangan holda saqlanadi — biz uni hech qachon ko&apos;rmaymiz).
          </li>
          <li style={liStyle}>
            <strong>Yosh yoki yosh guruhi:</strong> mos kurslarni tavsiya qilish va yoshga mos
            kontent ko&apos;rsatish uchun.
          </li>
          <li style={liStyle}>
            <strong>O&apos;quv progressi:</strong> tugatilgan darslar, test natijalari, ballar,
            sertifikatlar va laboratoriyada saqlangan loyihalar.
          </li>
          <li style={liStyle}>
            <strong>AI tutor bilan suhbatlar:</strong> bolaning savollari va tutor javoblari
            (7-bo&apos;limga qarang).
          </li>
          <li style={liStyle}>
            <strong>Texnik ma&apos;lumot:</strong> seans (session) cookie&apos;lari va xatoliklar
            jurnali — xavfsizlik va nosozliklarni tuzatish uchun.
          </li>
        </ul>
        <p style={pStyle}>
          Biz bolalardan uy manzili, telefon raqami, joylashuv (GPS) yoki to&apos;lov
          ma&apos;lumotlarini <strong>so&apos;ramaymiz</strong>.
        </p>

        <h2 style={h2Style}>2. Ma&apos;lumotdan nima uchun foydalanamiz</h2>
        <ul style={{ paddingLeft: 22, margin: "0 0 14px" }}>
          <li style={liStyle}>Akkauntni yaratish va tizimga xavfsiz kirish uchun.</li>
          <li style={liStyle}>
            Darslar progressini saqlash va davom ettirish imkonini berish uchun.
          </li>
          <li style={liStyle}>Ota-ona paneliga bolaning natijalarini ko&apos;rsatish uchun.</li>
          <li style={liStyle}>Sertifikat berish va reyting (leaderboard) hisoblash uchun.</li>
          <li style={liStyle}>
            Platformani yaxshilash — qaysi darslar qiyin kechayotganini tushunish uchun.
          </li>
        </ul>
        <p style={pStyle}>
          Biz bolalarga <strong>reklama ko&apos;rsatmaymiz</strong> va ularning ma&apos;lumotlarini
          reklama maqsadida profillash uchun ishlatmaymiz.
        </p>

        <h2 style={h2Style}>3. Ota-ona roziligi</h2>
        <p style={pStyle}>
          13 yoshgacha bo&apos;lgan bolaning akkaunti ota-ona yoki qonuniy vakil roziligi bilan
          yaratiladi. Ro&apos;yxatdan o&apos;tishda rozilik tasdiqlanadi va ota-ona quyidagi
          huquqlarga ega:
        </p>
        <ul style={{ paddingLeft: 22, margin: "0 0 14px" }}>
          <li style={liStyle}>Bola akkaunti va progressini ota-ona panelida ko&apos;rish.</li>
          <li style={liStyle}>Saqlangan ma&apos;lumotlar nusxasini so&apos;rash.</li>
          <li style={liStyle}>
            Ma&apos;lumotlarni tuzatish yoki butunlay o&apos;chirishni talab qilish.
          </li>
          <li style={liStyle}>
            Rozilikni istalgan vaqtda qaytarib olish — bu holda akkaunt yopiladi.
          </li>
        </ul>

        <h2 id="bolalar" style={h2Style}>
          4. Bolalar maxfiyligi
        </h2>
        <p style={pStyle}>Bolalar uchun qo&apos;shimcha himoya choralari:</p>
        <ul style={{ paddingLeft: 22, margin: "0 0 14px" }}>
          <li style={liStyle}>
            Bolalar o&apos;rtasida ochiq chat, shaxsiy xabar yoki fayl almashish yo&apos;q.
          </li>
          <li style={liStyle}>
            Reytingda faqat ism (yoki taxallus) ko&apos;rinadi — elektron pochta hech qachon
            ko&apos;rsatilmaydi.
          </li>
          <li style={liStyle}>
            Bolalarning shaxsiy ma&apos;lumotlari uchinchi tomonlarga <strong>sotilmaydi</strong>.
          </li>
          <li style={liStyle}>
            AI tutor javoblari yosh guruhiga moslashtirilgan va xavfli mavzular cheklangan.
          </li>
        </ul>

        <h2 style={h2Style}>5. Ma&apos;lumot qancha saqlanadi</h2>
        <ul style={{ paddingLeft: 22, margin: "0 0 14px" }}>
          <li style={liStyle}>
            <strong>Akkaunt va progress:</strong> akkaunt faol bo&apos;lgan davrda saqlanadi.
          </li>
          <li style={liStyle}>
            <strong>Akkaunt o&apos;chirilganda:</strong> shaxsiy ma&apos;lumotlar 30 kun ichida
            o&apos;chiriladi (bu muddat xatolik bo&apos;lsa tiklash imkonini beradi).
          </li>
          <li style={liStyle}>
            <strong>AI tutor suhbatlari:</strong> akkaunt bilan birga o&apos;chiriladi.
          </li>
          <li style={liStyle}>
            <strong>Texnik jurnallar:</strong> ko&apos;pi bilan 90 kun.
          </li>
        </ul>

        <h2 style={h2Style}>6. Ma&apos;lumot kim bilan bo&apos;lishiladi</h2>
        <p style={pStyle}>
          Ma&apos;lumot faqat platforma ishlashi uchun zarur bo&apos;lgan xizmat
          ko&apos;rsatuvchilarga uzatiladi: ma&apos;lumotlar bazasi va hosting provayderi hamda AI
          tutor uchun Google Gemini. Ular ma&apos;lumotni faqat bizning topshirig&apos;imiz asosida
          qayta ishlaydi. Bundan tashqari ma&apos;lumot faqat qonun talab qilgan holatlarda yoki
          bolaning hayoti va xavfsizligiga real tahdid bo&apos;lganda oshkor qilinishi mumkin.
        </p>

        <h2 style={h2Style}>7. AI tutor (Google Gemini) qanday ishlaydi</h2>
        <p style={pStyle}>
          Bola AI tutorga savol yozganda, savol matni va dars konteksti (qaysi mavzu
          o&apos;rganilayotgani) javob olish uchun Google Gemini xizmatiga yuboriladi. Shuni bilib
          qo&apos;ying:
        </p>
        <ul style={{ paddingLeft: 22, margin: "0 0 14px" }}>
          <li style={liStyle}>
            Biz tutorga bolaning to&apos;liq ismi, elektron pochtasi yoki boshqa shaxsni
            aniqlaydigan ma&apos;lumotni <strong>yubormaymiz</strong>.
          </li>
          <li style={liStyle}>
            Suhbatlar sizning akkauntingizda saqlanadi, shunda bola oldingi savollariga qaytishi
            mumkin.
          </li>
          <li style={liStyle}>
            AI javoblari xato bo&apos;lishi mumkin. Tutor o&apos;qituvchi yoki ota-ona o&apos;rnini
            bosmaydi — muhim masalalarda kattalar bilan maslahatlashing.
          </li>
          <li style={liStyle}>
            Bolangizga tutorga shaxsiy ma&apos;lumot (manzil, telefon, maktab nomi) yozmaslikni
            tushuntiring.
          </li>
        </ul>

        <h2 id="cookie" style={h2Style}>
          8. Cookie fayllari
        </h2>
        <p style={pStyle}>
          Biz cookie&apos;lardan faqat platforma ishlashi uchun foydalanamiz — reklama yoki kuzatuv
          uchun emas:
        </p>
        <ul style={{ paddingLeft: 22, margin: "0 0 14px" }}>
          <li style={liStyle}>
            <strong>Seans cookie&apos;si:</strong> tizimga kirgan holatda qolish uchun. Bu cookie
            bo&apos;lmasa platformadan foydalanib bo&apos;lmaydi.
          </li>
          <li style={liStyle}>
            <strong>Tema sozlamasi:</strong> yorug&apos;/tungi rejim tanlovini eslab qolish uchun
            (brauzeringizda saqlanadi).
          </li>
        </ul>
        <p style={pStyle}>
          Brauzer sozlamalaridan cookie&apos;larni o&apos;chirishingiz mumkin, lekin bu holda
          tizimga kirish ishlamaydi.
        </p>

        <h2 style={h2Style}>9. Xavfsizlik</h2>
        <p style={pStyle}>
          Ma&apos;lumotlar shifrlangan ulanish (HTTPS) orqali uzatiladi, parollar bir tomonlama
          heshlanadi, ma&apos;lumotlar bazasiga kirish cheklangan. Shunga qaramay, internetda hech
          bir tizim 100% xavfsiz emas — parolingizni hech kim bilan bo&apos;lishmang.
        </p>

        <h2 style={h2Style}>10. O&apos;zgarishlar va bog&apos;lanish</h2>
        <p style={pStyle}>
          Ushbu siyosat yangilanishi mumkin. Muhim o&apos;zgarishlar haqida akkauntdagi elektron
          pochta orqali xabar beramiz. Savollar, ma&apos;lumot nusxasi yoki o&apos;chirish
          so&apos;rovi bo&apos;yicha profil sozlamalari sahifasidagi murojaat bo&apos;limi orqali
          bog&apos;laning.
        </p>

        <div
          style={{
            marginTop: 44,
            paddingTop: 24,
            borderTop: "1px solid var(--border)",
            display: "flex",
            gap: 24,
            flexWrap: "wrap",
          }}
        >
          <Link
            href="/shartlar"
            style={{
              fontSize: 14,
              color: "var(--primary)",
              fontWeight: 600,
              textDecoration: "none",
            }}
          >
            Foydalanish shartlari
          </Link>
          <Link
            href="/"
            style={{
              fontSize: 14,
              color: "var(--text-3)",
              fontWeight: 600,
              textDecoration: "none",
            }}
          >
            Bosh sahifa
          </Link>
        </div>
      </article>
    </div>
  );
}
