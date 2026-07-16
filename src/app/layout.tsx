import type { Metadata, Viewport } from "next";
import { sora, jakarta } from "@/lib/fonts";
import { themeInitScript } from "@/lib/theme";
import { ThemeProvider } from "@/components/theme-provider";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "PilotKids — Robototexnika Akademiyasi",
    template: "%s · PilotKids",
  },
  description:
    "7–18 yoshli bolalar uchun robototexnika, kod va STEM platformasi. O'ynab, qurib, kashf et.",
  keywords: ["robototexnika", "bolalar", "STEM", "Arduino", "kod", "PilotKids"],
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#EDF1F8" },
    { media: "(prefers-color-scheme: dark)", color: "#0B1220" },
  ],
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="uz" suppressHydrationWarning className={`${sora.variable} ${jakarta.variable}`}>
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
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
