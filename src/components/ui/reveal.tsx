"use client";

import { motion } from "framer-motion";

/**
 * ScrollReveal — blok ko'rinishga kirganda silliq paydo bo'ladi, chiqib
 * ketganda qaytadi (once: false). Framer viewport ichida boshqaradi —
 * qo'shimcha re-render yo'q. reducedMotion="user" (MotionConfig) bilan
 * y-siljish avtomatik o'chadi.
 */
export function Reveal({
  children,
  delay = 0,
  y = 24,
  className,
}: {
  children: React.ReactNode;
  delay?: number;
  y?: number;
  className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: false, amount: 0.2, margin: "0px 0px -80px 0px" }}
      transition={{ duration: 0.5, ease: "easeOut", delay }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
