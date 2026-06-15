import { useRef, useState, useCallback } from 'react'
import { motion, useMotionValue, useSpring } from 'framer-motion'

const variants = {
  primary: 'bg-gradient-to-r from-primary to-sky text-white shadow-lg shadow-primary/30',
  secondary: 'glass border border-white/30 text-white dark:border-slate-600',
  outline: 'border-2 border-primary text-primary dark:text-sky dark:border-sky',
  ghost: 'text-slate-600 dark:text-slate-300',
  accent: 'bg-gradient-to-r from-accent to-sky text-white shadow-lg shadow-accent/30',
}

const sizes = {
  sm: 'px-4 py-2 text-sm',
  md: 'px-6 py-3 text-base',
  lg: 'px-8 py-4 text-lg',
}

export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  className = '',
  magnetic = false,
  premium = false,
  onClick,
  ...props
}) {
  const ref = useRef(null)
  const [ripples, setRipples] = useState([])
  const [hovered, setHovered] = useState(false)
  const x = useMotionValue(0)
  const y = useMotionValue(0)
  const springX = useSpring(x, { stiffness: 300, damping: 20 })
  const springY = useSpring(y, { stiffness: 300, damping: 20 })

  const isPremium = premium || variant === 'primary' || variant === 'accent'

  const handleMouseMove = (e) => {
    if (!magnetic || !ref.current) return
    const rect = ref.current.getBoundingClientRect()
    x.set((e.clientX - rect.left - rect.width / 2) * 0.18)
    y.set((e.clientY - rect.top - rect.height / 2) * 0.18)
  }

  const handleMouseLeave = () => {
    setHovered(false)
    x.set(0)
    y.set(0)
  }

  const handleClick = useCallback((e) => {
    if (ref.current) {
      const rect = ref.current.getBoundingClientRect()
      const id = Date.now()
      setRipples((r) => [...r, { id, x: e.clientX - rect.left, y: e.clientY - rect.top }])
      setTimeout(() => setRipples((r) => r.filter((ripple) => ripple.id !== id)), 600)
    }
    onClick?.(e)
  }, [onClick])

  return (
    <motion.button
      ref={ref}
      style={magnetic ? { x: springX, y: springY } : undefined}
      whileHover={{ scale: 1.05, y: -3 }}
      whileTap={{ scale: 0.95 }}
      transition={{ type: 'spring', stiffness: 400, damping: 17, duration: 0.35 }}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
      className={`
        relative overflow-hidden inline-flex items-center justify-center gap-2 rounded-xl font-semibold
        transition-colors duration-300 ease-out
        hover:shadow-xl hover:shadow-primary/25
        focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2
        dark:focus-visible:ring-offset-slate-900
        ${variants[variant]}
        ${variant === 'ghost' ? 'hover:bg-slate-100 dark:hover:bg-slate-800' : ''}
        ${variant === 'outline' ? 'hover:bg-primary hover:text-white dark:hover:bg-sky dark:hover:text-white' : ''}
        ${variant === 'secondary' ? 'hover:bg-white/20' : ''}
        ${hovered && isPremium ? 'shadow-primary/40 glow-blue' : ''}
        ${sizes[size]}
        ${className}
      `}
      {...props}
    >
      {/* Shine sweep */}
      {isPremium && hovered && (
        <motion.span
          className="absolute inset-0 pointer-events-none"
          initial={{ x: '-100%' }}
          animate={{ x: '200%' }}
          transition={{ duration: 0.6, ease: 'easeInOut' }}
          style={{
            background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.25), transparent)',
            width: '50%',
          }}
        />
      )}

      {/* Energy line for premium CTA */}
      {isPremium && (
        <span
          className={`absolute bottom-0 left-0 h-[2px] bg-gradient-to-r from-transparent via-white to-transparent transition-all duration-500 ${
            hovered ? 'w-full opacity-80' : 'w-0 opacity-0'
          }`}
        />
      )}

      {/* Ripple effects */}
      {ripples.map((ripple) => (
        <motion.span
          key={ripple.id}
          className="absolute rounded-full bg-white/30 pointer-events-none"
          style={{ left: ripple.x, top: ripple.y, width: 10, height: 10, x: '-50%', y: '-50%' }}
          initial={{ scale: 0, opacity: 0.6 }}
          animate={{ scale: 20, opacity: 0 }}
          transition={{ duration: 0.55, ease: 'easeOut' }}
        />
      ))}

      <span className="relative z-10 flex items-center gap-2">{children}</span>
    </motion.button>
  )
}
