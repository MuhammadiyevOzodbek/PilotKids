import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";
import { getServerSession } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Parolni tiklash" };

export default async function ForgotPasswordPage() {
  const session = await getServerSession();
  if (session) redirect("/dashboard");
  return <ForgotPasswordForm />;
}
