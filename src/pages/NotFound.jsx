import { Link } from 'react-router-dom'
import { Suspense } from 'react'
import { motion } from 'framer-motion'
import { Home } from '../lib/icons'
import Button from '../components/ui/Button'
import PageTransition from '../components/ui/PageTransition'
import SceneFallback from '../components/three/SceneFallback'
import { BrokenRobotScene } from '../components/three/lazy'

export default function NotFound() {
  return (
    <PageTransition>
      <div className="min-h-screen bg-dark relative overflow-hidden flex flex-col items-center justify-center px-4 py-12">
        <div className="absolute inset-0 bg-grid opacity-30" />
        <div className="absolute inset-0 bg-circuit" />
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-48 h-48 bg-accent/10 rounded-full blur-3xl" />

        <div className="relative z-10 w-full max-w-lg text-center">
          <div className="mb-6 rounded-2xl overflow-hidden border border-slate-700/50">
            <Suspense fallback={<SceneFallback className="h-64 sm:h-80" />}>
              <BrokenRobotScene />
            </Suspense>
          </div>

          <motion.h1
            className="font-display text-8xl sm:text-9xl font-bold text-gradient glitch mb-4"
            animate={{ opacity: [1, 0.8, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            404
          </motion.h1>

          <h2 className="font-display text-2xl sm:text-3xl font-bold text-white mb-4">
            Robotlar bu sahifani topa olmadi!
          </h2>
          <p className="text-slate-400 mb-8">
            Kechirasiz, qidirayotgan sahifangiz mavjud emas yoki ko'chirilgan.
          </p>

          <Link to="/">
            <Button size="lg" magnetic className="group">
              <Home className="w-5 h-5" />
              Bosh sahifaga qaytish
            </Button>
          </Link>
        </div>

        {[...Array(5)].map((_, i) => (
          <motion.span
            key={i}
            className="absolute text-sky/10 font-display font-bold text-6xl select-none pointer-events-none"
            style={{ left: `${10 + i * 20}%`, top: `${20 + (i % 3) * 25}%` }}
            animate={{ y: [0, -30, 0], opacity: [0.1, 0.3, 0.1] }}
            transition={{ duration: 4 + i, repeat: Infinity, delay: i * 0.5 }}
          >
            404
          </motion.span>
        ))}
      </div>
    </PageTransition>
  )
}
