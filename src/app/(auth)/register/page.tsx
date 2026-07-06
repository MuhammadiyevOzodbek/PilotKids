import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { RegisterForm } from "@/components/auth/register-form";
import { getServerSession } from "@/lib/auth/session";
import { getEnabledProviders } from "@/lib/auth/providers";

export const metadata: Metadata = { title: "Ro'yxatdan o'tish" };

export default async function RegisterPage() {
  const session = await getServerSession();
  if (session) redirect("/dashboard");
  return <RegisterForm providers={getEnabledProviders()} />;
}
