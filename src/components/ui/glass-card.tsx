import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const glassCardVariants = cva("rounded-2xl transition-all duration-300", {
  variants: {
    variant: {
      glass: "glass",
      light: "glass-light",
      solid: "bg-card border border-border",
    },
    glow: {
      none: "",
      blue: "hover:glow-blue",
      cyan: "hover:glow-cyan",
    },
    hover: {
      none: "",
      lift: "hover:-translate-y-1 hover:border-primary/40",
    },
    padding: {
      none: "",
      sm: "p-4",
      md: "p-6",
      lg: "p-8",
    },
  },
  defaultVariants: {
    variant: "glass",
    glow: "none",
    hover: "none",
    padding: "md",
  },
});

export interface GlassCardProps
  extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof glassCardVariants> {}

/** Yarim shaffof, blur panel — kartalar, panellar uchun asos. */
export function GlassCard({ className, variant, glow, hover, padding, ...props }: GlassCardProps) {
  return (
    <div
      className={cn(glassCardVariants({ variant, glow, hover, padding }), className)}
      {...props}
    />
  );
}
