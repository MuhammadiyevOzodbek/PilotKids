"use client";

import { forwardRef } from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { Magnetic } from "@/components/ui/magnetic";

export const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-xl font-semibold whitespace-nowrap transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98]",
  {
    variants: {
      variant: {
        gradient:
          "bg-gradient-signature text-white glow-blue hover:brightness-110 hover:-translate-y-0.5",
        primary: "bg-primary text-primary-foreground hover:bg-primary/90 hover:-translate-y-0.5",
        glass: "glass text-foreground hover:text-foreground hover:border-primary/40",
        outline: "border border-border bg-transparent text-foreground hover:bg-muted",
        ghost: "bg-transparent text-foreground/80 hover:bg-muted hover:text-foreground",
        danger: "bg-danger text-white hover:bg-danger/90",
      },
      size: {
        sm: "h-9 px-4 text-sm",
        md: "h-11 px-6 text-sm",
        lg: "h-13 px-8 text-base",
        icon: "size-11",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  /** Radix Slot orqali boshqa element (masalan <Link>) sifatida render qiladi */
  asChild?: boolean;
  /** Kursorga tortiladigan magnit effekt */
  magnetic?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant, size, asChild = false, magnetic = false, children, ...props },
  ref,
) {
  const Comp = asChild ? Slot : "button";
  const element = (
    <Comp ref={ref} className={cn(buttonVariants({ variant, size }), className)} {...props}>
      {children}
    </Comp>
  );

  return magnetic ? <Magnetic>{element}</Magnetic> : element;
});
