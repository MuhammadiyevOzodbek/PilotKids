"use client";

import { cn } from "@/lib/utils";

function GithubLogo({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden
      focusable="false"
    >
      <path d="M12 1C5.92 1 1 5.92 1 12c0 4.86 3.15 8.98 7.52 10.43.55.1.75-.24.75-.53v-1.86c-3.06.67-3.71-1.47-3.71-1.47-.5-1.28-1.22-1.62-1.22-1.62-1-.68.08-.67.08-.67 1.1.08 1.68 1.13 1.68 1.13.98 1.68 2.57 1.2 3.2.92.1-.71.38-1.2.7-1.47-2.44-.28-5.01-1.22-5.01-5.43 0-1.2.43-2.18 1.13-2.95-.11-.28-.49-1.4.11-2.91 0 0 .92-.3 3.02 1.13a10.5 10.5 0 0 1 5.5 0c2.1-1.43 3.02-1.13 3.02-1.13.6 1.51.22 2.63.11 2.91.7.77 1.13 1.75 1.13 2.95 0 4.22-2.58 5.15-5.03 5.42.4.34.75 1.01.75 2.04v3.03c0 .3.2.64.76.53A11.01 11.01 0 0 0 23 12c0-6.08-4.92-11-11-11Z" />
    </svg>
  );
}

function GoogleLogo({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden focusable="false">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1Z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.99.66-2.26 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84Z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84C6.71 7.3 9.14 5.38 12 5.38Z"
      />
    </svg>
  );
}

export interface SocialButtonsProps {
  onGoogle?: () => void;
  onGithub?: () => void;
  disabled?: boolean;
  className?: string;
  /** Qaysi provayderlar sozlangani — faqat shular ko'rsatiladi. */
  google?: boolean;
  github?: boolean;
}

/** Google + GitHub OAuth tugmalari (Better Auth ga ulanadi). */
export function SocialButtons({
  onGoogle,
  onGithub,
  disabled,
  className,
  google = true,
  github = true,
}: SocialButtonsProps) {
  const base =
    "glass flex h-11 items-center justify-center gap-2 rounded-xl text-sm font-medium text-foreground transition-all hover:-translate-y-0.5 hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:pointer-events-none disabled:opacity-50";

  // Hech qaysi provayder sozlanmagan bo'lsa — hech narsa chizmaymiz
  if (!google && !github) return null;

  return (
    <div className={cn("grid gap-3", google && github ? "grid-cols-2" : "grid-cols-1", className)}>
      {google && (
        <button
          type="button"
          onClick={onGoogle}
          disabled={disabled}
          aria-label="Google orqali davom etish"
          className={base}
        >
          <GoogleLogo className="size-5" />
          Google
        </button>
      )}
      {github && (
        <button
          type="button"
          onClick={onGithub}
          disabled={disabled}
          aria-label="GitHub orqali davom etish"
          className={base}
        >
          <GithubLogo className="size-5" />
          GitHub
        </button>
      )}
    </div>
  );
}
