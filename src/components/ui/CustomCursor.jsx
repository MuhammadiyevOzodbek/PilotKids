import { useEffect, useState } from 'react'
import { motion, useMotionValue, useSpring } from 'framer-motion'

// Faqat desktop (fine pointer, katta ekran) uchun. Bir marta boshlang'ich holatda aniqlanadi
// (effect ichida setState orqali emas) — shu bois qo'shimcha render bo'lmaydi.
function detectDesktop() {
  if (typeof window === 'undefined') return false
  const isTouch = window.matchMedia('(pointer: coarse)').matches
  return !isTouch && window.innerWidth >= 1024
}

export default function CustomCursor() {
  const [enabled] = useState(detectDesktop)
  const [hovering, setHovering] = useState(false)
  const cursorX = useMotionValue(-100)
  const cursorY = useMotionValue(-100)
  const ringX = useSpring(cursorX, { stiffness: 250, damping: 22 })
  const ringY = useSpring(cursorY, { stiffness: 250, damping: 22 })

  useEffect(() => {
    if (!enabled) return

    document.documentElement.classList.add('custom-cursor-active')

    const move = (e) => {
      cursorX.set(e.clientX)
      cursorY.set(e.clientY)
    }

    // Event delegation — SPA'da route almashganda paydo bo'lgan yangi element'lar ham
    // avtomatik hover effektini oladi (mount paytida querySelectorAll qilinmaydi).
    const isInteractive = (el) =>
      el && typeof el.closest === 'function' && el.closest('a, button, [data-cursor-hover]')

    const onOver = (e) => { if (isInteractive(e.target)) setHovering(true) }
    const onOut = (e) => { if (isInteractive(e.target)) setHovering(false) }

    window.addEventListener('mousemove', move)
    document.addEventListener('mouseover', onOver)
    document.addEventListener('mouseout', onOut)

    return () => {
      document.documentElement.classList.remove('custom-cursor-active')
      window.removeEventListener('mousemove', move)
      document.removeEventListener('mouseover', onOver)
      document.removeEventListener('mouseout', onOut)
    }
  }, [enabled, cursorX, cursorY])

  if (!enabled) return null

  return (
    <>
      <motion.div
        className="fixed top-0 left-0 z-[99999] pointer-events-none mix-blend-screen"
        style={{ x: cursorX, y: cursorY, translateX: '-50%', translateY: '-50%' }}
        aria-hidden="true"
      >
        <motion.div
          animate={{ scale: hovering ? 0.5 : 1, opacity: hovering ? 0.9 : 1 }}
          transition={{ duration: 0.25 }}
          className="w-2 h-2 rounded-full bg-sky shadow-[0_0_12px_4px_rgba(56,189,248,0.6)]"
        />
      </motion.div>
      <motion.div
        className="fixed top-0 left-0 z-[99998] pointer-events-none"
        style={{ x: ringX, y: ringY, translateX: '-50%', translateY: '-50%' }}
        aria-hidden="true"
      >
        <motion.div
          animate={{
            width: hovering ? 48 : 32,
            height: hovering ? 48 : 32,
            borderColor: hovering ? 'rgba(56,189,248,0.8)' : 'rgba(56,189,248,0.35)',
          }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          className="rounded-full border-2 border-sky/40"
        />
      </motion.div>
    </>
  )
}
