import { headers } from "next/headers";
import { NONCE_HEADER } from "@/lib/csp";

/**
 * schema.org JSON-LD blokini sahifaga qo'yadi.
 *
 * Nonce ATAYLAB berilyapti: `application/ld+json` brauzerda bajarilmaydi,
 * ammo CSP `script-src` baribir `<script>` elementiga qo'llanadi va nonce'siz
 * blok ba'zi brauzerlarda konsolda buzilish sifatida ko'rinadi. Nonce
 * `proxy.ts` dan `headers()` orqali keladi — `layout.tsx` dagi tema skripti
 * bilan bir xil yo'l.
 *
 * `JSON.stringify` natijasidagi `<` belgisi ekranlanadi: aks holda ma'lumot
 * ichidagi `</script>` HTML'ni erta yopib, XSS'ga yo'l ochardi.
 */
export async function JsonLd({ data }: { data: object }) {
  const nonce = (await headers()).get(NONCE_HEADER) ?? undefined;
  const json = JSON.stringify(data).replace(/</g, "\\u003c");

  return (
    <script type="application/ld+json" nonce={nonce} dangerouslySetInnerHTML={{ __html: json }} />
  );
}
