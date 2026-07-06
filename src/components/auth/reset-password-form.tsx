"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
import { PasswordField } from "@/components/ui/password-field";
import { Button } from "@/components/ui/button";
import { FormError } from "@/components/auth/form-error";
import { authClient } from "@/lib/auth/client";
import { mapAuthError } from "@/lib/auth/errors";
import { resetPasswordSchema, type ResetPasswordInput } from "@/lib/validations/auth";

export function ResetPasswordForm({ token }: { token?: string }) {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordInput>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { password: "", confirmPassword: "" },
  });

  async function onSubmit(values: ResetPasswordInput) {
    setServerError(null);
    if (!token) {
      setServerError("Havola yaroqsiz yoki muddati o'tgan. Qaytadan so'rov yuboring.");
      return;
    }
    const { error } = await authClient.resetPassword({ newPassword: values.password, token });
    if (error) {
      setServerError(mapAuthError(error));
      return;
    }
    setDone(true);
    setTimeout(() => router.push("/login"), 1500);
  }

  function onInvalid() {
    setServerError("Barcha maydonlarni to'ldiring");
  }

  if (done) {
    return (
      <div className="space-y-6 text-center">
        <div className="mx-auto flex size-16 items-center justify-center rounded-2xl bg-emerald-500/10">
          <CheckCircle2 className="size-7 text-emerald-500" aria-hidden />
        </div>
        <div className="space-y-2">
          <h1 className="font-display text-3xl font-bold">Parol yangilandi!</h1>
          <p className="text-muted-foreground text-sm">
            Endi yangi parolingiz bilan kirishingiz mumkin. Kirish sahifasiga yo'naltirilmoqda…
          </p>
        </div>
        <Button asChild variant="gradient" size="lg" className="w-full">
          <Link href="/login">Kirishga o'tish</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2 text-center">
        <h1 className="font-display text-3xl font-bold">Yangi parol</h1>
        <p className="text-muted-foreground text-sm">Hisobingiz uchun yangi parol o'rnating</p>
      </div>

      {!token && (
        <FormError message="Havola yaroqsiz yoki muddati o'tgan. Iltimos, qaytadan so'rov yuboring." />
      )}

      <form onSubmit={handleSubmit(onSubmit, onInvalid)} noValidate className="space-y-4">
        <FormError message={serverError} />
        <PasswordField
          label="Yangi parol"
          id="password"
          autoComplete="new-password"
          placeholder="••••••••"
          error={errors.password?.message}
          {...register("password")}
        />
        <PasswordField
          label="Parolni tasdiqlash"
          id="confirmPassword"
          autoComplete="new-password"
          placeholder="••••••••"
          error={errors.confirmPassword?.message}
          {...register("confirmPassword")}
        />
        <Button
          type="submit"
          variant="gradient"
          size="lg"
          disabled={isSubmitting || !token}
          className="w-full"
        >
          {isSubmitting ? "Saqlanmoqda…" : "Parolni yangilash"}
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
