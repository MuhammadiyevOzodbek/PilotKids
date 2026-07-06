"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bot } from "lucide-react";
import { cn } from "@/lib/utils";

/** PilotKids logotipi — Bot ikonka + gradient nom. */
export function Logo({
  href = "/",
  className,
  showText = true,
}: {
  href?: string;
  className?: string;
  showText?: boolean;
}) {
  const pathname = usePathname();

  // Allaqachon manzil sahifasida bo'lsak — bosilganda eng yuqoriga skroll qilamiz
  const handleClick = () => {
    if (pathname === href) {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  return (
    <Link
      href={href}
      onClick={handleClick}
      className={cn("group inline-flex items-center gap-2", className)}
      aria-label="PilotKids bosh sahifasi"
    >
      <span className="bg-gradient-signature glow-blue flex size-9 items-center justify-center rounded-xl text-white transition-transform group-hover:scale-105">
        <Bot className="size-5" aria-hidden />
      </span>
      {showText && (
        <span className="font-display text-xl font-bold tracking-tight">
          Pilot<span className="text-gradient">Kids</span>
        </span>
      )}
    </Link>
  );
}
