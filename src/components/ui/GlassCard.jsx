import { useRef, useState } from 'react'
import { motion } from 'framer-motion'

export default function GlassCard({
  children,
  className = '',
  hover = true,
  glow = false,
  spotlight = true,
  ...props
}) {
  const cardRef = useRef(null)
  const [spot, setSpot] = useState({ x: 50, y: 50, opacity: 0 })

  const handleMouseMove = (e) => {
    if (!spotlight || !cardRef.current) return
    const rect = cardRef.current.getBoundingClientRect()
    setSpot({
      x: ((e.clientX - rect.left) / rect.width) * 100,
      y: ((e.clientY - rect.top) / rect.height) * 100,
      opacity: 1,
    })
  }

  const handleMouseLeave = () => {
    setSpot((s) => ({ ...s, opacity: 0 }))
  }

  return (
    <motion.div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      whileHover={
        hover
          ? { y: -8, scale: 1.02, transition: { duration: 0.35, ease: [0.4, 0, 0.2, 1] } }
          : {}
      }
      transition={{ type: 'spring', stiffness: 300, damping: 22 }}
      className={`
        relative overflow-hidden rounded-2xl p-6
        bg-white/80 dark:bg-slate-800/60
        backdrop-blur-xl border border-slate-200/80 dark:border-slate-700/60
        shadow-lg shadow-slate-200/50 dark:shadow-black/20
        transition-shadow duration-400 ease-out
        hover:shadow-xl hover:shadow-primary/15 dark:hover:shadow-primary/10
        hover:border-primary/30 dark:hover:border-sky/30
        ${glow ? 'hover:glow-blue' : ''}
        ${className}
      `}
      style={
        spotlight && spot.opacity > 0
          ? {
              backgroundImage: `radial-gradient(circle at ${spot.x}% ${spot.y}%, rgba(56,189,248,0.12) 0%, transparent 55%)`,
            }
          : undefined
      }
      {...props}
    >
      {children}
    </motion.div>
  )
}
