"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Mail } from "lucide-react";
import { FormField } from "@/components/ui/form-field";
import { PasswordField } from "@/components/ui/password-field";
import { Button } from "@/components/ui/button";
import { FormError } from "@/components/auth/form-error";
import { OrDivider } from "@/components/auth/or-divider";
import { SocialButtons } from "@/components/auth/social-buttons";
import { signIn } from "@/lib/auth/client";
import { mapAuthError } from "@/lib/auth/errors";
import { loginSchema, type LoginInput } from "@/lib/validations/auth";

export function LoginForm({
  callbackURL,
  providers = { google: true, github: true },
}: {
  callbackURL?: string;
  providers?: { google: boolean; github: boolean };
}) {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [social, setSocial] = useState<"google" | "github" | null>(null);
  const hasSocial = providers.google || providers.github;

  // Faqat ichki yo'lga ruxsat (ochiq redirect'ning oldini olamiz)
  const redirectTo = callbackURL && callbackURL.startsWith("/") ? callbackURL : "/dashboard";

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  async function onSubmit(values: LoginInput) {
    setServerError(null);
    const { error } = await signIn.email({
      email: values.email,
      password: values.password,
      callbackURL: redirectTo,
    });
    if (error) {
      setServerError(mapAuthError(error));
      return;
    }
    router.push(redirectTo);
    router.refresh();
  }

  function onInvalid() {
    setServerError("Barcha maydonlarni to'ldiring");
  }

  async function handleSocial(provider: "google" | "github") {
    setServerError(null);
    setSocial(provider);
    const { error } = await signIn.social({ provider, callbackURL: redirectTo });
    if (error) {
      setServerError(mapAuthError(error));
      setSocial(null);
    }
  }

  const busy = isSubmitting || social !== null;

  return (
    <div className="space-y-6">
      <div className="space-y-2 text-center">
        <h1 className="font-display text-3xl font-bold">Xush kelibsiz!</h1>
        <p className="text-muted-foreground text-sm">Hisobingizga kiring</p>
      </div>

      {hasSocial && (
        <>
          <SocialButtons
            disabled={busy}
            google={providers.google}
            github={providers.github}
            onGoogle={() => handleSocial("google")}
            onGithub={() => handleSocial("github")}
          />
          <OrDivider />
        </>
      )}

      <form onSubmit={handleSubmit(onSubmit, onInvalid)} noValidate className="space-y-4">
        <FormError message={serverError} />

        <FormField
          label="Email"
          id="email"
          type="email"
          icon={Mail}
          autoComplete="email"
          placeholder="siz@example.com"
          error={errors.email?.message}
          {...register("email")}
        />

        <div className="space-y-1.5">
          <PasswordField
            label="Parol"
            id="password"
            autoComplete="current-password"
            placeholder="••••••••"
            error={errors.password?.message}
            {...register("password")}
          />
          <div className="text-right">
            <Link
              href="/forgot-password"
              className="text-primary text-xs font-medium hover:underline"
            >
              Parolni unutdingizmi?
            </Link>
          </div>
        </div>

        <Button type="submit" variant="gradient" size="lg" disabled={busy} className="w-full">
          {isSubmitting ? "Kirish…" : "Kirish"}
        </Button>
      </form>

      <p className="text-muted-foreground text-center text-sm">
        Hisobingiz yo'qmi?{" "}
        <Link href="/register" className="text-primary font-medium hover:underline">
          Ro'yxatdan o'ting
        </Link>
      </p>
    </div>
  );
}
