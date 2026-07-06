"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Crown, Info, Sparkles } from "lucide-react";
import { GlassCard } from "@/components/ui/glass-card";
import { Button } from "@/components/ui/button";
import { FormError, FormSuccess } from "@/components/auth/form-error";
import { cancelPremium, upgradeToPremium } from "@/lib/actions/subscription";
import { PLANS } from "@/lib/data/landing";
import { cn } from "@/lib/utils";

export function PlanManager({
  isPremium,
  endDate,
}: {
  isPremium: boolean;
  endDate: string | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  function run(action: () => Promise<{ ok: boolean; message?: string; error?: string }>) {
    setError(null);
    setSuccess(null);
    startTransition(async () => {
      const res = await action();
      if (res.ok) setSuccess(res.message ?? null);
      else setError(res.error ?? "Xatolik yuz berdi");
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      <FormError message={error} />
      <FormSuccess message={success} />

      {/* Joriy holat */}
      <GlassCard padding="lg" className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span
            className={cn(
              "flex size-12 items-center justify-center rounded-2xl",
              isPremium ? "bg-gradient-signature glow-blue text-white" : "glass",
            )}
          >
            {isPremium ? <Crown className="size-6" /> : <Sparkles className="size-6" />}
          </span>
          <div>
            <p className="text-muted-foreground text-xs">Joriy reja</p>
            <p className="font-display text-lg font-bold">{isPremium ? "Premium" : "Bepul"}</p>
          </div>
        </div>
        {isPremium && endDate && (
          <p className="text-muted-foreground text-sm">
            Amal qiladi:{" "}
            <span className="text-foreground font-medium">
              {new Date(endDate).toLocaleDateString("uz-UZ")}
            </span>
          </p>
        )}
      </GlassCard>

      {/* To'lov mock eslatmasi */}
      <div className="glass text-muted-foreground flex items-start gap-2 rounded-xl p-4 text-sm">
        <Info className="mt-0.5 size-4.5 shrink-0" aria-hidden />
        <span>
          To'lov tizimi (Payme/Click) hozircha namoyish rejimida — «Premium olish» tugmasi obunani
          darhol faollashtiradi.
        </span>
      </div>

      {/* Rejalar */}
      <div className="grid items-stretch gap-6 md:grid-cols-2">
        {PLANS.map((plan) => {
          const isCurrent = plan.featured === isPremium;
          return (
            <GlassCard
              key={plan.name}
              variant={plan.featured ? "solid" : "glass"}
              padding="lg"
              className={cn("flex h-full flex-col", plan.featured && "border-primary/40 border")}
            >
              <div>
                <div className="flex items-center justify-between">
                  <h3 className="font-display text-xl font-bold">{plan.name}</h3>
                  {isCurrent && (
                    <span className="bg-primary/15 text-primary rounded-full px-2.5 py-0.5 text-xs font-semibold">
                      Joriy
                    </span>
                  )}
                </div>
                <p className="text-muted-foreground mt-1 text-sm">{plan.description}</p>
                <div className="mt-4 flex items-baseline gap-1">
                  <span className="font-display text-4xl font-bold">{plan.price}</span>
                  <span className="text-muted-foreground text-sm">{plan.period}</span>
                </div>
              </div>

              <ul className="mt-6 flex-1 space-y-3">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-sm">
                    <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-500">
                      <Check className="size-3.5" />
                    </span>
                    <span className="text-foreground/85">{f}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-8">
                {plan.featured ? (
                  isPremium ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="lg"
                      className="w-full"
                      disabled={pending}
                      onClick={() => run(cancelPremium)}
                    >
                      {pending ? "Bajarilmoqda…" : "Obunani bekor qilish"}
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      variant="gradient"
                      size="lg"
                      className="w-full"
                      disabled={pending}
                      onClick={() => run(upgradeToPremium)}
                    >
                      <Crown className="size-5" />
                      {pending ? "Faollashtirilmoqda…" : "Premium olish"}
                    </Button>
                  )
                ) : (
                  <Button
                    type="button"
                    variant="glass"
                    size="lg"
                    className="w-full"
                    disabled={!isPremium || pending}
                    onClick={() => run(cancelPremium)}
                  >
                    {isPremium ? "Bepulga qaytish" : "Joriy reja"}
                  </Button>
                )}
              </div>
            </GlassCard>
          );
        })}
      </div>
    </div>
  );
}
