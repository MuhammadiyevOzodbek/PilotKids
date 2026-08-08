/**
 * Sinxron ishlaydigan inline skript (HTML tahlili paytida, birinchi bo'yashdan
 * oldin) — tema FOUC'iga qarshi ishlatiladi.
 *
 * Nima uchun `type` ikki xil: React ishlab chiqish rejimida render natijasida
 * `<script>` paydo bo'lsa ogohlantiradi ("Scripts inside React components are
 * never executed when rendering on the client"), chunki klient tomonda DOM'ga
 * qo'shilgan skript brauzerda bajarilmaydi. Serverda `text/javascript` beramiz
 * — u HTML'ga tushadi va o'qilishi bilan ishlaydi; klientda esa `text/plain`,
 * ya'ni skript emas, oddiy matn. `suppressHydrationWarning` esa shu `type`
 * farqini React'ga muammo emasligini bildiradi.
 *
 * Bu naqsh Next.js hujjatidan olingan (guides/preventing-flash-before-hydration).
 */
export function InlineScript({ html, nonce }: { html: string; nonce?: string }) {
  return (
    <script
      nonce={nonce}
      type={typeof window === "undefined" ? "text/javascript" : "text/plain"}
      suppressHydrationWarning
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
