"use client";

import { useEffect } from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/glass-card";

/**
 * Dashboard bo'limidagi kutilmagan xatoliklar uchun chegara. Server so'rovi
 * (DB) yiqilsa, foydalanuvchi standart Next xatosi o'rniga brend fallback'ni
 * ko'radi va qayta urinib ko'ra oladi.
 */
export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[dashboard] xatolik:", error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center py-10">
      <GlassCard padding="lg" className="max-w-md space-y-4 text-center">
        <div className="bg-danger/10 mx-auto flex size-14 items-center justify-center rounded-2xl">
          <AlertTriangle className="size-7 text-red-500" aria-hidden />
        </div>
        <h1 className="font-display text-xl font-bold">Nimadir noto'g'ri ketdi</h1>
        <p className="text-muted-foreground text-sm">
          Ma'lumotlarni yuklashda kutilmagan xatolik yuz berdi. Iltimos, qaytadan urinib ko'ring.
        </p>
        <Button type="button" variant="gradient" onClick={reset} className="mx-auto">
          <RotateCcw className="size-4" /> Qaytadan urinish
        </Button>
      </GlassCard>
    </div>
  );
}
