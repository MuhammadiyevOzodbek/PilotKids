import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import { NONCE_HEADER } from "@/lib/csp";
import { sora, jakarta } from "@/lib/fonts";
import { themeInitScript } from "@/lib/theme";
import { ThemeProvider } from "@/components/theme-provider";
import { InlineScript } from "@/components/inline-script";
import { siteUrl, siteName, siteTitle, siteDescription } from "@/lib/site";
import "./globals.css";

export const metadata: Metadata = {
  // Absolyut manzillarning asosi — busiz OG/Twitter rasmlari va canonical
  // havolalar nisbiy chiqadi va Telegram/WhatsApp ko'rinishi buziladi.
  metadataBase: new URL(siteUrl),
  title: {
    default: siteTitle,
    template: `%s · ${siteName}`,
  },
  description: siteDescription,
  keywords: ["robototexnika", "bolalar", "STEM", "Arduino", "kod", "PilotKids"],
  applicationName: siteName,
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    siteName,
    locale: "uz_UZ",
    url: "/",
    title: siteTitle,
    description: siteDescription,
  },
  twitter: {
    card: "summary_large_image",
    title: siteTitle,
    description: siteDescription,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large" },
  },
  // Standalone rejimda iOS'da o'z sarlavha paneli bilan ochiladi
  appleWebApp: { capable: true, title: siteName, statusBarStyle: "black-translucent" },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#EDF1F8" },
    { media: "(prefers-color-scheme: dark)", color: "#0B1220" },
  ],
  // Kirish/dars sahifalarida input fokuslanganda iOS sahifani kattalashtirmasin,
  // ammo foydalanuvchi o'zi zoom qila olishi kerak (WCAG 1.4.4).
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  // CSP nonce'ni `proxy.ts` so'rov sarlavhasiga qo'yadi. Nonce'siz bu skript
  // brauzerda bloklanadi va tema FOUC'i qaytadi.
  const nonce = (await headers()).get(NONCE_HEADER) ?? undefined;
  return (
    <html
      lang="uz"
      suppressHydrationWarning
      // `globals.css`da `scroll-behavior: smooth` bor (bo'limga yumshoq
      // sakrash uchun). Next shu atributni ko'rmasa, MARSHRUT almashganda
      // ham animatsiya bilan skroll qiladi — sahifalar orasida yurish
      // sekin tuyuladi. Bu atribut faqat navigatsiya uchun uni o'chiradi.
      data-scroll-behavior="smooth"
      className={`${sora.variable} ${jakarta.variable}`}
    >
      <head>
        {/* Material Symbols ikonka shrifti */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* Material Symbols ikonka shrifti — next/font ikonka shriftlarini qo'llab-quvvatlamaydi,
            shu bois <link> orqali yuklaymiz (ataylab). */}
        {/* eslint-disable-next-line @next/next/no-page-custom-font, @next/next/google-font-display */}
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0,0&display=block"
          rel="stylesheet"
        />
        {/* FOUC'siz tema: DOM render'idan oldin <html> ga qo'llaymiz */}
        <InlineScript html={themeInitScript} nonce={nonce} />
      </head>
      <body>
        {/* "Asosiy qismga o'tish" — body'dagi BIRINCHI fokuslanadigan element
            bo'lishi kerak, shu bois bir marta shu yerda beriladi. Har bir
            qobiq/sahifa o'z `<main>`iga `id="content"` qo'yadi. Odatda
            ko'rinmaydi, faqat Tab bosilganda chiqadi (globals.css). */}
        <a href="#content" className="skip-link">
          Asosiy qismga o&apos;tish
        </a>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
