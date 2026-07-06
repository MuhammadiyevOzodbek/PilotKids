import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/auth/login-form";
import { getServerSession } from "@/lib/auth/session";
import { getEnabledProviders } from "@/lib/auth/providers";

export const metadata: Metadata = { title: "Kirish" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackURL?: string }>;
}) {
  const session = await getServerSession();
  if (session) redirect("/dashboard");
  const { callbackURL } = await searchParams;
  return <LoginForm callbackURL={callbackURL} providers={getEnabledProviders()} />;
}
