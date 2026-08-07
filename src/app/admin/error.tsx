"use client";

import { ErrorView } from "@/components/error-view";

/** Admin panelidagi kutilmagan xato — qobiq (sidebar) joyida qoladi. */
export default function AdminError(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <ErrorView {...props} scope="admin" homeHref="/admin" homeLabel="Admin paneli" />;
}
