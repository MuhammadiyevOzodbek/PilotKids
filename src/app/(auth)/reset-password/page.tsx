import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";
import { getServerSession } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Yangi parol" };

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; error?: string }>;
}) {
  const session = await getServerSession();
  if (session) redirect("/dashboard");
  const { token } = await searchParams;
  return <ResetPasswordForm token={token} />;
}
