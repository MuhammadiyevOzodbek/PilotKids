import { Link } from 'react-router-dom'
import { Suspense } from 'react'
import { motion } from 'framer-motion'
import { ArrowRight, Play } from 'lucide-react'
import Button from '../ui/Button'
import HeroBackground from './HeroBackground'
import SceneFallback from '../three/SceneFallback'
import { HeroScene3D } from '../three/lazy'

export default function Hero() {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-24 pb-16 px-4">
      <HeroBackground />

      <div className="relative z-10 max-w-7xl mx-auto grid lg:grid-cols-2 gap-12 items-center">
        <div>
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full glass text-sky text-sm font-medium mb-6">
              <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
              Robototexnika Akademiyasi
            </span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="font-display text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-bold text-white leading-tight mb-6"
          >
            Robototexnikani{' '}
            <span className="text-gradient">Onlayn O'rganing</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-lg sm:text-xl text-slate-300 mb-8 max-w-xl leading-relaxed"
          >
            PilotKids orqali bolalar va o'smirlar robototexnika, elektronika va muhandislik asoslarini onlayn o'rganadilar.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="flex flex-wrap gap-4"
          >
            <Link to="/register">
              <Button size="lg" magnetic className="group">
                Boshlash
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
            <Link to="/register">
              <Button variant="secondary" size="lg" className="group">
                <Play className="w-5 h-5" />
                Bepul Sinov
              </Button>
            </Link>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="flex items-center gap-8 mt-12"
          >
            {[
              { value: '5,000+', label: 'O\'quvchilar' },
              { value: '50+', label: 'Kurslar' },
              { value: '98%', label: 'Mamnunlik' },
            ].map((stat) => (
              <div key={stat.label}>
                <p className="text-2xl font-bold text-white">{stat.value}</p>
                <p className="text-sm text-slate-400">{stat.label}</p>
              </div>
            ))}
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.3 }}
          className="hidden lg:block relative h-[420px] xl:h-[480px]"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-accent/20 rounded-3xl blur-3xl" />
          <div className="relative h-full rounded-3xl overflow-hidden border border-white/10">
            <Suspense fallback={<SceneFallback className="h-full rounded-3xl" />}>
              <HeroScene3D className="h-full" />
            </Suspense>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
