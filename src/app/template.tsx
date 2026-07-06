"use client";

import { motion } from "framer-motion";

/**
 * PageTransition — App Router'da har sahifa o'tishida fade/siljish beradi
 * (SPA "ilova" hissi). reducedMotion="user" (MotionConfig) bilan y-siljish
 * avtomatik o'chadi, faqat opacity qoladi.
 */
export default function Template({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
    >
      {children}
    </motion.div>
  );
}
