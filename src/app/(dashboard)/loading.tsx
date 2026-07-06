/** Dashboard bo'limi uchun umumiy yuklanish skeletoni (RSC navigatsiyasi paytida). */
export default function DashboardLoading() {
  return (
    <div className="space-y-6 py-6" aria-busy="true" aria-live="polite">
      <span className="sr-only">Yuklanmoqda…</span>

      {/* Sarlavha */}
      <div className="space-y-2">
        <div className="bg-muted h-8 w-56 animate-pulse rounded-lg" />
        <div className="bg-muted/70 h-4 w-72 animate-pulse rounded" />
      </div>

      {/* Statistika kartalari */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="glass h-24 animate-pulse rounded-2xl" />
        ))}
      </div>

      {/* Ikki ustunli bloklar */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="glass h-64 animate-pulse rounded-2xl" />
        <div className="glass h-64 animate-pulse rounded-2xl" />
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="glass h-56 animate-pulse rounded-2xl" />
        <div className="glass h-56 animate-pulse rounded-2xl" />
      </div>
    </div>
  );
}
