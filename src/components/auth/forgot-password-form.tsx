"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, Mail } from "lucide-react";
import { FormField } from "@/components/ui/form-field";
import { Button } from "@/components/ui/button";
import { FormError, FormSuccess } from "@/components/auth/form-error";
import { authClient } from "@/lib/auth/client";
import { mapAuthError } from "@/lib/auth/errors";
import { forgotPasswordSchema, type ForgotPasswordInput } from "@/lib/validations/auth";

export function ForgotPasswordForm() {
  const [serverError, setServerError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
  });

  async function onSubmit(values: ForgotPasswordInput) {
    setServerError(null);
    const { error } = await authClient.requestPasswordReset({
      email: values.email,
      redirectTo: "/reset-password",
    });
    if (error) {
      setServerError(mapAuthError(error));
      return;
    }
    setSent(true);
  }

  function onInvalid() {
    setServerError("Barcha maydonlarni to'ldiring");
  }

  if (sent) {
    return (
      <div className="space-y-6 text-center">
        <div className="mx-auto flex size-16 items-center justify-center rounded-2xl bg-emerald-500/10">
          <Mail className="size-7 text-emerald-500" aria-hidden />
        </div>
        <div className="space-y-2">
          <h1 className="font-display text-3xl font-bold">Xat yuborildi!</h1>
          <p className="text-muted-foreground text-sm">
            Parolni tiklash havolasini emailingizga yubordik. Pochtangizni tekshiring.
          </p>
        </div>
        <FormSuccess message="Agar bunday hisob mavjud bo'lsa, xat bir necha daqiqada yetib boradi." />
        <Button asChild variant="glass" size="lg" className="w-full">
          <Link href="/login">
            <ArrowLeft className="size-4" /> Kirishga qaytish
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2 text-center">
        <h1 className="font-display text-3xl font-bold">Parolni tiklash</h1>
        <p className="text-muted-foreground text-sm">
          Emailingizni kiriting — tiklash havolasini yuboramiz
        </p>
      </div>

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
        <Button
          type="submit"
          variant="gradient"
          size="lg"
          disabled={isSubmitting}
          className="w-full"
        >
          {isSubmitting ? "Yuborilmoqda…" : "Havola yuborish"}
        </Button>
      </form>

      <p className="text-center">
        <Link
          href="/login"
          className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 text-sm transition-colors"
        >
          <ArrowLeft className="size-4" /> Kirishga qaytish
        </Link>
      </p>
    </div>
  );
}
