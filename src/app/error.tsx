"use client";

import { ErrorView } from "@/components/error-view";

/**
 * Ochiq sahifalar (landing, kirish, ro'yxatdan o'tish, huquqiy sahifalar)
 * uchun xato chegarasi.
 *
 * Busiz bu sahifalardagi xato to'g'ridan-to'g'ri `global-error`ga tushardi —
 * u esa layout'siz, tema/shriftsiz yalang'och sahifa ko'rsatadi.
 */
export default function RootError(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div style={{ minHeight: "70svh", display: "grid", placeItems: "center" }}>
      <ErrorView {...props} scope="root" homeHref="/" />
    </div>
  );
}
