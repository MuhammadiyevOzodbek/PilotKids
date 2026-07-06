import { Inter, Space_Grotesk } from "next/font/google";

/** BODY: paragraf, tugma, forma, barcha interfeys matni */
export const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
  weight: ["400", "500", "600", "700", "800"],
});

/** DISPLAY: sarlavhalar, logotip, statistika (geometrik "muhandislik" xarakteri) */
export const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
  display: "swap",
  weight: ["400", "500", "600", "700"],
});
