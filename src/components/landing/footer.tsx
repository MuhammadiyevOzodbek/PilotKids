import Link from "next/link";
import { Logo } from "@/components/ui/logo";

const PLATFORM_LINKS = [
  { label: "Afzalliklar", href: "/#benefits" },
  { label: "Yo'l xaritasi", href: "/#roadmap" },
  { label: "Narxlar", href: "/#pricing" },
  { label: "Kurslar", href: "/#courses" },
];

const COMPANY_LINKS = [
  { label: "Biz haqimizda", href: "/#about" },
  { label: "Fikrlar", href: "/#testimonials" },
  { label: "Savol-javob", href: "/#faq" },
];

function Social({
  href,
  label,
  children,
}: {
  href: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      className="glass text-foreground/80 hover:text-foreground hover:border-primary/40 flex size-10 items-center justify-center rounded-xl transition-colors"
    >
      {children}
    </a>
  );
}

export function Footer() {
  const year = 2026;
  return (
    <footer className="bg-grid border-border relative border-t">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-[1.5fr_1fr_1fr_1fr]">
        <div className="space-y-4">
          <Logo />
          <p className="text-muted-foreground max-w-xs text-sm">
            Kelajak muhandislari shu yerda boshlanadi. 8–18 yoshli bolalar uchun onlayn
            robototexnika akademiyasi.
          </p>
          <div className="flex gap-2">
            <Social href="https://t.me/pilotkids" label="Telegram">
              <svg viewBox="0 0 24 24" fill="currentColor" className="size-5" aria-hidden>
                <path d="M21.94 4.6 18.9 19c-.23 1.02-.84 1.27-1.7.79l-4.7-3.47-2.27 2.18c-.25.25-.46.46-.94.46l.33-4.78L18.4 5.9c.38-.34-.08-.53-.6-.19L6.98 12.9l-4.63-1.45c-1-.31-1.02-1 .21-1.48L20.65 3.2c.84-.31 1.57.2 1.29 1.4Z" />
              </svg>
            </Social>
            <Social href="https://instagram.com/pilotkids" label="Instagram">
              <svg viewBox="0 0 24 24" fill="currentColor" className="size-5" aria-hidden>
                <path d="M12 2c2.72 0 3.06.01 4.12.06 1.07.05 1.8.22 2.43.47.66.25 1.22.6 1.77 1.16.56.55.91 1.11 1.16 1.77.25.63.42 1.36.47 2.43.05 1.06.06 1.4.06 4.12s-.01 3.06-.06 4.12c-.05 1.07-.22 1.8-.47 2.43-.25.66-.6 1.22-1.16 1.77-.55.56-1.11.91-1.77 1.16-.63.25-1.36.42-2.43.47-1.06.05-1.4.06-4.12.06s-3.06-.01-4.12-.06c-1.07-.05-1.8-.22-2.43-.47a4.9 4.9 0 0 1-1.77-1.16 4.9 4.9 0 0 1-1.16-1.77c-.25-.63-.42-1.36-.47-2.43C2.01 15.06 2 14.72 2 12s.01-3.06.06-4.12c.05-1.07.22-1.8.47-2.43.25-.66.6-1.22 1.16-1.77.55-.56 1.11-.91 1.77-1.16.63-.25 1.36-.42 2.43-.47C8.94 2.01 9.28 2 12 2Zm0 5a5 5 0 1 0 0 10 5 5 0 0 0 0-10Zm0 8.2a3.2 3.2 0 1 1 0-6.4 3.2 3.2 0 0 1 0 6.4Zm5.2-8.4a1.17 1.17 0 1 1 0-2.34 1.17 1.17 0 0 1 0 2.34Z" />
              </svg>
            </Social>
            <Social href="https://youtube.com/@pilotkids" label="YouTube">
              <svg viewBox="0 0 24 24" fill="currentColor" className="size-5" aria-hidden>
                <path d="M23.5 6.5a3 3 0 0 0-2.1-2.1C19.5 3.9 12 3.9 12 3.9s-7.5 0-9.4.5A3 3 0 0 0 .5 6.5C0 8.4 0 12 0 12s0 3.6.5 5.5a3 3 0 0 0 2.1 2.1c1.9.5 9.4.5 9.4.5s7.5 0 9.4-.5a3 3 0 0 0 2.1-2.1c.5-1.9.5-5.5.5-5.5s0-3.6-.5-5.5ZM9.6 15.6V8.4l6.2 3.6-6.2 3.6Z" />
              </svg>
            </Social>
          </div>
        </div>

        <FooterColumn title="Platforma" links={PLATFORM_LINKS} />
        <FooterColumn title="Kompaniya" links={COMPANY_LINKS} />

        <div className="space-y-3">
          <h3 className="font-display text-sm font-semibold">Boshlash</h3>
          <ul className="space-y-2 text-sm">
            <li>
              <Link
                href="/register"
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                Ro'yxatdan o'tish
              </Link>
            </li>
            <li>
              <Link
                href="/login"
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                Kirish
              </Link>
            </li>
          </ul>
        </div>
      </div>

      <div className="border-border border-t">
        <div className="text-muted-foreground mx-auto flex max-w-7xl flex-col items-center justify-between gap-2 px-4 py-6 text-xs sm:flex-row sm:px-6">
          <p>© {year} PilotKids. Barcha huquqlar himoyalangan.</p>
          <p>Kelajak muhandislari shu yerda boshlanadi.</p>
        </div>
      </div>
    </footer>
  );
}

function FooterColumn({
  title,
  links,
}: {
  title: string;
  links: { label: string; href: string }[];
}) {
  return (
    <div className="space-y-3">
      <h3 className="font-display text-sm font-semibold">{title}</h3>
      <ul className="space-y-2 text-sm">
        {links.map((link) => (
          <li key={link.href}>
            <Link
              href={link.href}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
