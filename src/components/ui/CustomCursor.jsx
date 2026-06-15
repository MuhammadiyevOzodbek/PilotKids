import { useEffect, useState } from 'react'
import { motion, useMotionValue, useSpring } from 'framer-motion'

export default function CustomCursor() {
  const [visible, setVisible] = useState(false)
  const [hovering, setHovering] = useState(false)
  const cursorX = useMotionValue(-100)
  const cursorY = useMotionValue(-100)
  const ringX = useSpring(cursorX, { stiffness: 250, damping: 22 })
  const ringY = useSpring(cursorY, { stiffness: 250, damping: 22 })

  useEffect(() => {
    const isTouch = window.matchMedia('(pointer: coarse)').matches
    const isSmall = window.innerWidth < 1024
    if (isTouch || isSmall) return

    document.documentElement.classList.add('custom-cursor-active')
    setVisible(true)

    const move = (e) => {
      cursorX.set(e.clientX)
      cursorY.set(e.clientY)
    }

    const onEnter = () => setHovering(true)
    const onLeave = () => setHovering(false)

    window.addEventListener('mousemove', move)
    const interactives = document.querySelectorAll('a, button, [data-cursor-hover]')
    interactives.forEach((el) => {
      el.addEventListener('mouseenter', onEnter)
      el.addEventListener('mouseleave', onLeave)
    })

    return () => {
      document.documentElement.classList.remove('custom-cursor-active')
      window.removeEventListener('mousemove', move)
      interactives.forEach((el) => {
        el.removeEventListener('mouseenter', onEnter)
        el.removeEventListener('mouseleave', onLeave)
      })
    }
  }, [cursorX, cursorY])

  if (!visible) return null

  return (
    <>
      <motion.div
        className="fixed top-0 left-0 z-[99999] pointer-events-none mix-blend-screen"
        style={{ x: cursorX, y: cursorY, translateX: '-50%', translateY: '-50%' }}
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
