import type { Metadata, Viewport } from "next";
import { inter, spaceGrotesk } from "@/lib/fonts";
import { themeInitScript } from "@/lib/theme-script";
import { ThemeProvider } from "@/components/theme-provider";
import { publicEnv } from "@/lib/env";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(publicEnv.appUrl),
  title: {
    default: "PilotKids — Robototexnika Akademiyasi",
    template: "%s · PilotKids",
  },
  description:
    "8–18 yoshli bolalar uchun onlayn robototexnika akademiyasi. Kelajak muhandislari shu yerda boshlanadi.",
  keywords: ["robototexnika", "bolalar", "onlayn kurs", "Arduino", "muhandislik", "PilotKids"],
  authors: [{ name: "PilotKids" }],
  openGraph: {
    type: "website",
    locale: "uz_UZ",
    title: "PilotKids — Robototexnika Akademiyasi",
    description: "Kelajak muhandislari shu yerda boshlanadi.",
    siteName: "PilotKids",
  },
  twitter: {
    card: "summary_large_image",
    title: "PilotKids — Robototexnika Akademiyasi",
    description: "Kelajak muhandislari shu yerda boshlanadi.",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f8fafc" },
    { media: "(prefers-color-scheme: dark)", color: "#0b1120" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="uz"
      suppressHydrationWarning
      className={`${inter.variable} ${spaceGrotesk.variable} h-full`}
    >
      <head>
        {/* FOUC'siz tema: DOM render'idan oldin <html> ga qo'llaymiz */}
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="flex min-h-full flex-col antialiased">
        {/* Lucide (stroke) ikonkalar uchun global gradient paint server.
            `.icon-gradient` sinfi shu id'ga murojaat qiladi — butun ilovada ishlaydi. */}
        <svg width="0" height="0" className="absolute" aria-hidden focusable="false">
          <defs>
            <linearGradient id="pk-icon-gradient" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#38bdf8" />
              <stop offset="50%" stopColor="#06b6d4" />
              <stop offset="100%" stopColor="#2563eb" />
            </linearGradient>
          </defs>
        </svg>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
