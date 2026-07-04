import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowRight } from '../../lib/icons'
import Button from '../ui/Button'

// Yakuniy CTA — scroll sahnasining oxirgi bosqichi: 3D robot markazga qaytib
// qo'l silkitadi (SceneController WAVE_THRESHOLD orqali boshqaradi), matn esa
// pastroqda joylashadi — robot uchun tepada bo'sh joy qoldirilgan.
export default function FinalCTA() {
  return (
    <section
      id="cta"
      data-scroll-stage
      className="relative min-h-screen flex items-end justify-center px-4 pb-28 pt-[45vh]"
    >
      <div className="max-w-2xl mx-auto text-center">
        <motion.h2
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 0.6 }}
          className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold text-slate-900 dark:text-white mb-6"
        >
          Robototexnika sayohatingizni{' '}
          <span className="text-gradient">bugun boshlang</span>
        </motion.h2>

        <motion.p
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="text-lg text-slate-600 dark:text-slate-300 mb-10 leading-relaxed"
        >
          5,000+ o'quvchi allaqachon o'z robotlarini yaratmoqda. Birinchi darsingiz bepul —
          hoziroq qo'shiling!
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="flex flex-wrap gap-4 justify-center"
        >
          <Link to="/register">
            <Button size="lg" magnetic className="group shadow-[0_0_30px_rgba(56,189,248,0.35)]">
              Boshlash
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Button>
          </Link>
        </motion.div>
      </div>
    </section>
  )
}
