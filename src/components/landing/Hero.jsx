import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowRight, Play } from '../../lib/icons'
import Button from '../ui/Button'

// 3D robot endi alohida Canvas emas — LandingPage'dagi yagona fixed ScrollStage
// sahnasida o'ng tomonda turadi (keyframe 0). Bu yerda unga faqat joy qoldiriladi.
export default function Hero() {
  return (
    <section
      data-scroll-stage
      className="relative min-h-screen flex items-center justify-center overflow-hidden pt-24 pb-16 px-4"
    >
      <div className="relative z-10 max-w-7xl mx-auto grid lg:grid-cols-2 gap-12 items-center w-full">
        <div>
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full glass text-primary dark:text-sky text-sm font-medium mb-6">
              <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
              Robototexnika Akademiyasi
            </span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="font-display text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-bold text-slate-900 dark:text-white leading-tight mb-6"
          >
            Robototexnikani{' '}
            <span className="text-gradient">Onlayn O'rganing</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-lg sm:text-xl text-slate-600 dark:text-slate-300 mb-8 max-w-xl leading-relaxed"
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
                <p className="text-2xl font-bold text-slate-900 dark:text-white">{stat.value}</p>
                <p className="text-sm text-slate-500 dark:text-slate-400">{stat.label}</p>
              </div>
            ))}
          </motion.div>
        </div>

        {/* 3D robot uchun joy — fixed ScrollStage sahnasi shu hududda ko'rinadi */}
        <div className="hidden lg:block h-[480px]" aria-hidden="true" />
      </div>
    </section>
  )
}
