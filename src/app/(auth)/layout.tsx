import Link from "next/link";
import { ArrowLeft, CircuitBoard, GraduationCap, Trophy } from "lucide-react";
import { Logo } from "@/components/ui/logo";
import { ThemeToggle } from "@/components/ui/theme-toggle";

const HIGHLIGHTS = [
  { icon: CircuitBoard, text: "Amaliy robototexnika loyihalari" },
  { icon: GraduationCap, text: "Tajribali mentorlar qo'llab-quvvatlashi" },
  { icon: Trophy, text: "XP, darajalar va yutuqlar tizimi" },
];

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Chap: brend paneli (faqat desktop) */}
      <aside className="bg-circuit relative hidden flex-col justify-between overflow-hidden p-12 lg:flex">
        <div className="bg-primary/20 pointer-events-none absolute -top-24 -left-24 size-72 rounded-full blur-3xl" />
        <div className="bg-accent/20 pointer-events-none absolute right-0 bottom-0 size-80 rounded-full blur-3xl" />

        <Logo />

        <div className="relative space-y-6">
          <h2 className="font-display text-4xl leading-tight font-bold">
            Kelajak muhandislari
            <br />
            <span className="text-gradient">shu yerda boshlanadi</span>
          </h2>
          <ul className="space-y-4">
            {HIGHLIGHTS.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-3">
                <span className="glass flex size-10 items-center justify-center rounded-xl">
                  <Icon className="text-accent size-5" aria-hidden />
                </span>
                <span className="text-foreground/85 text-sm">{text}</span>
              </li>
            ))}
          </ul>
        </div>

        <p className="text-muted-foreground relative text-sm">
          © 2026 PilotKids — Robototexnika Akademiyasi
        </p>
      </aside>

      {/* O'ng: forma */}
      <main className="relative flex flex-col">
        <div className="flex items-center justify-between p-4 sm:p-6">
          <Link
            href="/"
            className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 text-sm transition-colors"
          >
            <ArrowLeft className="size-4" aria-hidden />
            Bosh sahifa
          </Link>
          <ThemeToggle />
        </div>
        <div className="flex flex-1 items-center justify-center px-4 pb-10 sm:px-6">
          <div className="w-full max-w-md">{children}</div>
        </div>
      </main>
    </div>
  );
}
