import type { Metadata } from "next";
import { Award, BookOpen, CheckCircle2, Lock, Mail, Zap } from "lucide-react";
import { requireUser } from "@/lib/auth/session";
import { getProfileData } from "@/lib/db/queries";
import { GlassCard } from "@/components/ui/glass-card";
import { ProfileForm } from "@/components/profile/profile-form";
import { ChangePasswordForm } from "@/components/profile/change-password-form";

export const metadata: Metadata = { title: "Profil" };

export default async function ProfilePage() {
  const sessionUser = await requireUser();
  const data = await getProfileData(sessionUser.id);

  if (!data) {
    return (
      <div className="py-16 text-center">
        <p className="text-muted-foreground">Profilni yuklab bo'lmadi. Qaytadan urinib ko'ring.</p>
      </div>
    );
  }

  const { user, rankInfo, stats } = data;
  const joined = user.createdAt.toLocaleDateString("uz-UZ", {
    year: "numeric",
    month: "long",
  });

  return (
    <div className="mx-auto max-w-3xl space-y-6 py-6">
      <header>
        <h1 className="font-display text-2xl font-bold sm:text-3xl">Profil</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Shaxsiy ma'lumotlaringizni ko'ring va tahrirlang.
        </p>
      </header>

      {/* Profil sarlavhasi */}
      <GlassCard padding="lg" className="flex flex-wrap items-center gap-5">
        <div className="bg-gradient-signature glow-blue font-display flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl text-2xl font-bold text-white">
          {user.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={user.avatarUrl}
              alt={`${user.name} avatari`}
              className="size-full object-cover"
            />
          ) : (
            <span aria-hidden>{user.name.charAt(0).toUpperCase()}</span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-display truncate text-xl font-bold">{user.name}</p>
          <p className="text-muted-foreground flex items-center gap-1.5 truncate text-sm">
            <Mail className="size-4 shrink-0" aria-hidden />
            {user.email}
          </p>
          <p className="text-muted-foreground mt-1 text-xs">A'zo bo'ldi: {joined}</p>
        </div>
        <div className="glass flex items-center gap-2 rounded-xl px-4 py-2">
          <span className="text-2xl" aria-hidden>
            {rankInfo.current?.badge ?? "🎯"}
          </span>
          <div>
            <p className="text-muted-foreground text-xs">Daraja</p>
            <p className="text-sm font-semibold">{rankInfo.current?.name ?? "—"}</p>
          </div>
        </div>
      </GlassCard>

      {/* Statistika */}
      <div className="grid gap-4 sm:grid-cols-3">
        <GlassCard padding="md" className="flex items-center gap-3">
          <Zap className="text-accent size-6 shrink-0" aria-hidden />
          <div>
            <p className="font-display text-xl font-bold">{user.xp}</p>
            <p className="text-muted-foreground text-xs">Umumiy XP</p>
          </div>
        </GlassCard>
        <GlassCard padding="md" className="flex items-center gap-3">
          <BookOpen className="text-accent size-6 shrink-0" aria-hidden />
          <div>
            <p className="font-display text-xl font-bold">{stats.enrolledCount}</p>
            <p className="text-muted-foreground text-xs">Kurslar</p>
          </div>
        </GlassCard>
        <GlassCard padding="md" className="flex items-center gap-3">
          <CheckCircle2 className="text-accent size-6 shrink-0" aria-hidden />
          <div>
            <p className="font-display text-xl font-bold">{stats.completedCount}</p>
            <p className="text-muted-foreground text-xs">Tugatilgan</p>
          </div>
        </GlassCard>
      </div>

      {/* Tahrirlash formasi */}
      <GlassCard padding="lg" className="space-y-5">
        <div className="flex items-center gap-2">
          <Award className="text-accent size-5" aria-hidden />
          <h2 className="font-display text-lg font-semibold">Ma'lumotlarni tahrirlash</h2>
        </div>
        <ProfileForm initial={{ name: user.name, age: user.age, avatarUrl: user.avatarUrl }} />
      </GlassCard>

      {/* Xavfsizlik — parolni o'zgartirish */}
      <GlassCard padding="lg" className="space-y-5">
        <div className="flex items-center gap-2">
          <Lock className="text-accent size-5" aria-hidden />
          <h2 className="font-display text-lg font-semibold">Xavfsizlik</h2>
        </div>
        <ChangePasswordForm />
      </GlassCard>
    </div>
  );
}
