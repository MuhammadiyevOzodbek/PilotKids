"use client";

import dynamic from "next/dynamic";

/**
 * Grafik uchun yuklanish o'rindig'i (skeleton).
 *
 * Balandligi grafikning o'zi bilan bir xil (240px) — shunda grafik kelganda
 * sahifa sakramaydi (layout shift bo'lmaydi).
 */
function ChartSkeleton() {
  return (
    <div
      role="status"
      aria-label="Grafik yuklanmoqda"
      style={{
        width: "100%",
        height: 240,
        borderRadius: 14,
        background:
          "linear-gradient(90deg,var(--surface-2) 25%,var(--surface-3) 37%,var(--surface-2) 63%)",
        backgroundSize: "400px 100%",
        animation: "shimmer 1.4s linear infinite",
      }}
    />
  );
}

/**
 * Oxirgi 14 kunlik ro'yxatdan o'tishlar grafigi.
 *
 * `recharts` ~350 KB — u admin paneli birinchi yuklamasini sekinlashtirmasin,
 * shu bois grafik alohida chunk sifatida keyin keladi. Grafik faqat brauzerda
 * o'lchamga qarab chiziladi (`ResponsiveContainer`), server'da render qilib
 * foyda yo'q — shuning uchun `ssr: false`.
 */
export const SignupChart = dynamic(() => import("./signup-chart-view"), {
  ssr: false,
  loading: () => <ChartSkeleton />,
});
