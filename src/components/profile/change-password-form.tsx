"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { PasswordField } from "@/components/ui/password-field";
import { Button } from "@/components/ui/button";
import { FormError, FormSuccess } from "@/components/auth/form-error";
import { authClient } from "@/lib/auth/client";
import { mapAuthError } from "@/lib/auth/errors";
import { changePasswordSchema, type ChangePasswordInput } from "@/lib/validations/auth";

/**
 * Tizimga kirgan foydalanuvchi parolini o'zgartiradi (Better Auth
 * changePassword). Joriy parol tekshiriladi, muvaffaqiyatda boshqa
 * sessiyalar bekor qilinadi.
 */
export function ChangePasswordForm() {
  const [serverError, setServerError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ChangePasswordInput>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { currentPassword: "", newPassword: "", confirmPassword: "" },
  });

  async function onSubmit(values: ChangePasswordInput) {
    setServerError(null);
    setSuccess(null);
    const { error } = await authClient.changePassword({
      currentPassword: values.currentPassword,
      newPassword: values.newPassword,
      revokeOtherSessions: true,
    });
    if (error) {
      setServerError(mapAuthError(error));
      return;
    }
    setSuccess("Parol muvaffaqiyatli o'zgartirildi ✅");
    reset();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
      <FormError message={serverError} />
      <FormSuccess message={success} />

      <PasswordField
        label="Joriy parol"
        id="currentPassword"
        autoComplete="current-password"
        placeholder="••••••••"
        error={errors.currentPassword?.message}
        {...register("currentPassword")}
      />
      <PasswordField
        label="Yangi parol"
        id="newPassword"
        autoComplete="new-password"
        placeholder="••••••••"
        error={errors.newPassword?.message}
        {...register("newPassword")}
      />
      <PasswordField
        label="Yangi parolni tasdiqlash"
        id="confirmPassword"
        autoComplete="new-password"
        placeholder="••••••••"
        error={errors.confirmPassword?.message}
        {...register("confirmPassword")}
      />

      <Button type="submit" variant="gradient" size="lg" disabled={isSubmitting} className="w-full">
        {isSubmitting ? "O'zgartirilmoqda…" : "Parolni o'zgartirish"}
      </Button>
    </form>
  );
}
