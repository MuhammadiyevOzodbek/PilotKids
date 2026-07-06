"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Cake, Image as ImageIcon, User } from "lucide-react";
import { FormField } from "@/components/ui/form-field";
import { Button } from "@/components/ui/button";
import { FormError, FormSuccess } from "@/components/auth/form-error";
import { updateProfile } from "@/lib/actions/profile";
import { profileSchema, type ProfileInput } from "@/lib/validations/profile";

interface ProfileFormProps {
  initial: { name: string; age: number | null; avatarUrl: string | null };
}

export function ProfileForm({ initial }: ProfileFormProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ProfileInput>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: initial.name,
      age: initial.age ?? undefined,
      avatarUrl: initial.avatarUrl ?? "",
    },
  });

  function onSubmit(values: ProfileInput) {
    setServerError(null);
    setSuccess(null);
    startTransition(async () => {
      const res = await updateProfile(values);
      if (res.ok) {
        setSuccess(res.message ?? "Saqlandi");
        router.refresh();
      } else {
        setServerError(res.error ?? "Xatolik yuz berdi");
      }
    });
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
      <FormError message={serverError} />
      <FormSuccess message={success} />

      <FormField
        label="Ism"
        id="name"
        icon={User}
        autoComplete="name"
        placeholder="Ismingiz"
        error={errors.name?.message}
        {...register("name")}
      />
      <FormField
        label="Yosh"
        id="age"
        type="number"
        inputMode="numeric"
        min={5}
        max={100}
        icon={Cake}
        placeholder="Masalan, 12"
        error={errors.age?.message}
        {...register("age")}
      />
      <FormField
        label="Avatar havolasi (ixtiyoriy)"
        id="avatarUrl"
        type="url"
        icon={ImageIcon}
        placeholder="https://…"
        error={errors.avatarUrl?.message}
        {...register("avatarUrl")}
      />

      <Button type="submit" variant="gradient" size="lg" disabled={pending} className="w-full">
        {pending ? "Saqlanmoqda…" : "O'zgarishlarni saqlash"}
      </Button>
    </form>
  );
}
