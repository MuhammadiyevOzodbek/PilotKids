import type { CSSProperties } from "react";

interface IconProps {
  name: string;
  size?: number;
  color?: string;
  className?: string;
  style?: CSSProperties;
}

/** Material Symbols Outlined ligaturasi orqali ikonka. */
export function Icon({ name, size = 22, color, className, style }: IconProps) {
  return (
    <span
      className={`ms${className ? " " + className : ""}`}
      style={{ fontSize: size, color, ...style }}
      aria-hidden
    >
      {name}
    </span>
  );
}
