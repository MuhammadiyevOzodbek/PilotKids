import type { Metadata } from "next";
import Link from "next/link";
import { Icon } from "@/components/icon";

export const metadata: Metadata = {
  title: "Foydalanish shartlari",
  description:
    "PilotKids platformasidan foydalanish qoidalari: akkaunt, ota-ona mas'uliyati, AI tutor va xatti-harakat qoidalari.",
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

export default function ShartlarPage() {
  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)" }}>
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
            Foydalanish shartlari
          </h1>
          <p style={{ color: "#AEBBD4", fontSize: 16, lineHeight: 1.7, margin: 0 }}>
            PilotKids&apos;dan foydalanish qoidalari. Akkaunt yaratish orqali siz — bola va ota-ona
            sifatida — quyidagi shartlarga rozilik bildirasiz.
          </p>
          <p style={{ color: "#6f82a3", fontSize: 13, margin: "18px 0 0" }}>
            Oxirgi yangilanish: 2026-yil 19-iyul
          </p>
        </div>
      </section>

      <article className="sec-x" style={{ maxWidth: 820, margin: "0 auto", padding: "8px 0 80px" }}>
        <h2 style={h2Style}>1. Platforma haqida</h2>
        <p style={pStyle}>
          PilotKids — 7–18 yoshli bolalar uchun robototexnika, dasturlash va STEM bo&apos;yicha
          onlayn ta&apos;lim platformasi. Platformada darslar, testlar, laboratoriya loyihalari, AI
          tutor va sertifikatlar mavjud.
        </p>

        <h2 style={h2Style}>2. Kim foydalana oladi</h2>
        <ul style={{ paddingLeft: 22, margin: "0 0 14px" }}>
          <li style={liStyle}>
            13 yoshgacha bo&apos;lgan bola akkauntini <strong>ota-ona yoki qonuniy vakil</strong>{" "}
            yaratadi va boshqaradi.
          </li>
          <li style={liStyle}>
            13–18 yoshdagi foydalanuvchi akkauntni o&apos;zi yaratishi mumkin, lekin ota-ona
            xabardor bo&apos;lishi tavsiya etiladi.
          </li>
          <li style={liStyle}>
            Ro&apos;yxatdan o&apos;tishda haqiqiy ma&apos;lumot kiritish kerak — yosh
            noto&apos;g&apos;ri ko&apos;rsatilsa, kontent bolaga mos bo&apos;lmasligi mumkin.
          </li>
        </ul>

        <h2 style={h2Style}>3. Akkaunt va xavfsizlik</h2>
        <p style={pStyle}>
          Parolni maxfiy saqlash sizning zimmangizda. Akkauntingiz orqali qilingan barcha harakatlar
          uchun siz javobgarsiz. Agar akkauntingizga begona kirganini sezsangiz, darhol parolni
          almashtiring. Bitta akkauntni bir nechta bola bilan bo&apos;lishmaslikni tavsiya qilamiz —
          progress va sertifikatlar aralashib ketadi.
        </p>

        <h2 style={h2Style}>4. Narx</h2>
        <p style={pStyle}>
          Hozirda platformadagi barcha kurslar, laboratoriya va AI tutor bepul; to&apos;lov karta
          ma&apos;lumotlari talab qilinmaydi. Kelajakda pullik imkoniyatlar qo&apos;shilsa, bu haqda
          oldindan xabar beramiz va mavjud bepul kontent avtomatik pullik bo&apos;lib qolmaydi.
        </p>

        <h2 style={h2Style}>5. Xatti-harakat qoidalari</h2>
        <p style={pStyle}>Platformadan foydalanganda quyidagilar taqiqlanadi:</p>
        <ul style={{ paddingLeft: 22, margin: "0 0 14px" }}>
          <li style={liStyle}>
            Haqorat, tahdid yoki boshqa foydalanuvchini xafa qiluvchi xatti-harakat.
          </li>
          <li style={liStyle}>
            Shaxsiy ma&apos;lumot (manzil, telefon, maktab nomi) yozish — o&apos;ziniki ham,
            boshqaniki ham.
          </li>
          <li style={liStyle}>
            Testlar va reyting natijalarini soxtalashtirish, avtomatlashtirilgan skript ishlatish.
          </li>
          <li style={liStyle}>
            Platformani buzishga urinish, xavfsizlik cheklovlarini aylanib o&apos;tish.
          </li>
          <li style={liStyle}>Kurs materiallarini ruxsatsiz nusxalab tarqatish yoki sotish.</li>
        </ul>
        <p style={pStyle}>
          Qoidalar buzilsa, akkauntni vaqtincha to&apos;xtatishimiz yoki yopishimiz mumkin. Jiddiy
          bo&apos;lmagan holatlarda avval ogohlantiramiz.
        </p>

        <h2 style={h2Style}>6. AI tutor</h2>
        <p style={pStyle}>
          AI tutor darslarni tushuntirish uchun yordamchi vosita bo&apos;lib, Google Gemini asosida
          ishlaydi. Uning javoblari <strong>xato bo&apos;lishi mumkin</strong> va u o&apos;qituvchi,
          shifokor yoki ota-ona maslahati o&apos;rnini bosmaydi. Tutorga shaxsiy ma&apos;lumot
          yozmang. Suhbatlar qanday qayta ishlanishi{" "}
          <Link href="/maxfiylik" style={{ color: "var(--primary)", fontWeight: 600 }}>
            Maxfiylik siyosati
          </Link>{" "}
          hujjatida batafsil yozilgan.
        </p>

        <h2 style={h2Style}>7. Laboratoriya va jismoniy xavfsizlik</h2>
        <p style={pStyle}>
          Robototexnika loyihalari elektronika, batareya va asboblar bilan ishlashni talab qilishi
          mumkin. Bunday loyihalar <strong>kattalar nazorati ostida</strong> bajarilishi kerak.
          PilotKids darslarni noto&apos;g&apos;ri bajarish natijasida yuzaga kelgan jismoniy zarar
          yoki jihoz shikastlanishi uchun javobgar emas.
        </p>

        <h2 style={h2Style}>8. Kontent va mualliflik huquqi</h2>
        <p style={pStyle}>
          Darslar, videolar, matnlar va dizayn PilotKids&apos;ga tegishli. Ulardan shaxsiy
          o&apos;quv maqsadida foydalanishingiz mumkin. Bolaning laboratoriyada yaratgan loyihalari
          esa o&apos;ziniki bo&apos;lib qoladi — biz ularni faqat platformada saqlash va
          ko&apos;rsatish uchun ishlatamiz.
        </p>

        <h2 style={h2Style}>9. Sertifikatlar</h2>
        <p style={pStyle}>
          Kursni tugatgan bola PilotKids sertifikatini oladi. Sertifikat platformadagi progressni
          tasdiqlaydi, ammo davlat tomonidan tan olingan rasmiy ta&apos;lim hujjati emas.
        </p>

        <h2 style={h2Style}>10. Akkauntni yopish</h2>
        <p style={pStyle}>
          Siz istalgan vaqtda akkauntni yopishingiz mumkin — ma&apos;lumotlar Maxfiylik siyosatida
          ko&apos;rsatilgan muddatda o&apos;chiriladi. Biz ham shartlar jiddiy buzilgan holatda
          akkauntni yopish huquqini saqlab qolamiz.
        </p>

        <h2 style={h2Style}>11. Xizmatdagi o&apos;zgarishlar</h2>
        <p style={pStyle}>
          Platforma doimiy rivojlanadi: darslar qo&apos;shilishi, o&apos;zgarishi yoki olib
          tashlanishi mumkin. Texnik ishlar vaqtida xizmat vaqtincha ishlamasligi mumkin. Ushbu
          shartlar yangilansa, muhim o&apos;zgarishlar haqida elektron pochta orqali xabar beramiz.
        </p>

        <h2 style={h2Style}>12. Bog&apos;lanish</h2>
        <p style={pStyle}>
          Savol yoki shikoyat bo&apos;lsa, profil sozlamalari sahifasidagi murojaat bo&apos;limi
          orqali bizga yozing.
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
            href="/maxfiylik"
            style={{
              fontSize: 14,
              color: "var(--primary)",
              fontWeight: 600,
              textDecoration: "none",
            }}
          >
            Maxfiylik siyosati
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
