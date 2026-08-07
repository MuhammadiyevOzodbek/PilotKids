"use client";

import { ErrorView } from "@/components/error-view";

/** Ilova sahifalarida kutilmagan xato yuz berganda ko'rsatiladi. */
export default function AppError(props: { error: Error & { digest?: string }; reset: () => void }) {
  return <ErrorView {...props} scope="app" homeHref="/dashboard" />;
}
