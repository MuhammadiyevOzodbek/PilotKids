import Link from "next/link";
import { Bot, Home, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="bg-circuit relative flex min-h-screen flex-col items-center justify-center gap-8 px-4 text-center">
      <div className="bg-primary/20 pointer-events-none absolute top-1/4 left-1/4 size-72 rounded-full blur-3xl" />
      <div className="bg-accent/20 pointer-events-none absolute right-1/4 bottom-1/4 size-72 rounded-full blur-3xl" />

      {/* Buzilgan robot */}
      <div className="relative" aria-hidden>
        <div className="glass glow-cyan flex size-32 items-center justify-center rounded-3xl">
          <Bot className="text-gradient size-16 rotate-12" strokeWidth={1.5} />
        </div>
        <span className="bg-danger/20 text-danger animate-float absolute -top-3 -right-3 flex size-10 items-center justify-center rounded-xl">
          <Zap className="size-5" />
        </span>
      </div>

      <div className="relative space-y-3">
        <h1 className="font-display text-7xl font-bold">
          <span className="glitch text-gradient" data-text="404">
            404
          </span>
        </h1>
        <p className="font-display text-xl font-semibold">Sahifa topilmadi</p>
        <p className="text-muted-foreground mx-auto max-w-md">
          Robotimiz bu sahifani topa olmadi. Ehtimol u ko'chirilgan yoki mavjud emas.
        </p>
      </div>

      <div className="relative flex flex-wrap items-center justify-center gap-4">
        <Button asChild magnetic variant="gradient" size="lg">
          <Link href="/">
            <Home className="size-5" /> Bosh sahifaga
          </Link>
        </Button>
        <Button asChild variant="glass" size="lg">
          <Link href="/dashboard">Boshqaruv paneli</Link>
        </Button>
      </div>
    </main>
  );
}
