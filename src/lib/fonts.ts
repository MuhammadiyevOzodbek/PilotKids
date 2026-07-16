import { Sora, Plus_Jakarta_Sans } from "next/font/google";

// Display shrifti — sarlavhalar (dizaynda 'Sora')
export const sora = Sora({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-display",
  display: "swap",
});

// Asosiy matn shrifti (dizaynda 'Plus Jakarta Sans')
export const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-sans",
  display: "swap",
});
