import { motion } from 'framer-motion'
import { Settings, Cog } from '../../lib/icons'

function Particle({ style, delay }) {
  return (
    <motion.div
      className="absolute w-1 h-1 rounded-full bg-sky"
      style={style}
      animate={{
        y: [0, -30, 0],
        opacity: [0.2, 0.8, 0.2],
      }}
      transition={{ duration: 4, repeat: Infinity, delay }}
    />
  )
}

// Zarrachalar joylashuvi bir marta (modul darajasida) hisoblanadi — har render'da
// qayta yaratilmaydi va render tanasida Math.random chaqirilmaydi (barqaror kalit uchun id).
const PARTICLES = Array.from({ length: 14 }, (_, i) => ({
  id: i,
  left: `${Math.random() * 100}%`,
  top: `${Math.random() * 100}%`,
  delay: Math.random() * 3,
}))

// Butun landing uchun YAGONA fixed atmosfera qatlami — 3D Canvas'ning ORQASIDA
// turadi (DOM tartibida undan oldin keladi). Theme-aware: light'da yorug'
// gradient, dark'da avvalgi HeroBackground uslubidagi tungi muhit.
export default function LandingBackdrop() {
  return (
    <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none" aria-hidden="true">
      <div className="absolute inset-0 bg-gradient-to-b from-slate-50 via-white to-slate-100 dark:from-dark dark:via-slate-900 dark:to-dark" />
      <div className="absolute inset-0 bg-grid opacity-20 dark:opacity-40" />
      <div className="absolute inset-0 bg-circuit" />

      {/* Glowing orbs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 dark:bg-primary/20 rounded-full blur-3xl animate-pulse-glow" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-accent/10 dark:bg-accent/15 rounded-full blur-3xl animate-pulse-glow" style={{ animationDelay: '1.5s' }} />

      {/* Circuit lines */}
      <svg className="absolute inset-0 w-full h-full opacity-5 dark:opacity-10" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="circuit" x="0" y="0" width="100" height="100" patternUnits="userSpaceOnUse">
            <path d="M10 50 H40 M60 50 H90 M50 10 V40 M50 60 V90" stroke="#38BDF8" strokeWidth="0.5" fill="none" />
            <circle cx="50" cy="50" r="3" fill="#06B6D4" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#circuit)" />
      </svg>

      {/* Floating gears */}
      <motion.div
        className="absolute top-32 right-[15%] text-primary/20 dark:text-sky/30"
        animate={{ rotate: 360 }}
        transition={{ duration: 25, repeat: Infinity, ease: 'linear' }}
      >
        <Cog className="w-16 h-16" />
      </motion.div>
      <motion.div
        className="absolute bottom-40 left-[10%] text-accent/20 dark:text-accent/25"
        animate={{ rotate: -360 }}
        transition={{ duration: 30, repeat: Infinity, ease: 'linear' }}
      >
        <Settings className="w-12 h-12" />
      </motion.div>

      {/* Particles */}
      {PARTICLES.map((p) => (
        <Particle key={p.id} style={{ left: p.left, top: p.top }} delay={p.delay} />
      ))}

      {/* Blue glow line */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-sky/50 to-transparent" />
    </div>
  )
}
