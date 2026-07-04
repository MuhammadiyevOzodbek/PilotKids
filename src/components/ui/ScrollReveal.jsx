import { useRef } from 'react'
import { motion, useScroll, useTransform, useReducedMotion } from 'framer-motion'

// Scroll-scrub'langan reveal — AOS'dan farqli o'laroq bir martalik trigger emas:
// element harakati scroll pozitsiyasiga UZLUKSIZ bog'langan (yuqoriga qaytganda
// ham teskari o'ynaydi), xuddi 3D sahna kabi. MotionValue'lar orqali ishlaydi —
// scroll paytida React re-render bo'lmaydi.
//
// direction: 'up' (pastdan) | 'left' (chapdan) | 'right' (o'ngdan)
// index:     grid'dagi tartib — har keyingi element ozgina kechroq ochiladi (stagger)
export default function ScrollReveal({
  children,
  className = '',
  direction = 'up',
  distance = 48,
  index = 0,
}) {
  const ref = useRef(null)
  const reduced = useReducedMotion()

  // Stagger: keyingi elementlarning "ochilish oynasi" viewport'da pastroqdan boshlanadi
  const shift = Math.min(index * 0.03, 0.12)
  const { scrollYProgress } = useScroll({
    target: ref,
    // Element pasti viewport'ning ~98% nuqtasiga kirganda boshlanadi,
    // ~72% ga yetganda tugaydi — sahifa oxiridagi elementlar ham to'liq ochiladi
    offset: [`start ${0.98 - shift}`, `start ${0.72 - shift}`],
  })

  const from = direction === 'left' ? -distance : distance
  const offset = useTransform(scrollYProgress, [0, 1], [from, 0])
  const opacity = useTransform(scrollYProgress, [0, 1], [0, 1])
  const scale = useTransform(scrollYProgress, [0, 1], [0.96, 1])

  // Reduced-motion: hech qanday transform yo'q, kontent shunchaki ko'rinadi
  if (reduced) return <div className={className}>{children}</div>

  const style =
    direction === 'up' ? { y: offset, opacity, scale } : { x: offset, opacity, scale }

  return (
    <motion.div ref={ref} className={className} style={style}>
      {children}
    </motion.div>
  )
}
