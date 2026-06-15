import { motion } from 'framer-motion'
import { Check, Sparkles } from 'lucide-react'
import { Link } from 'react-router-dom'
import Button from './Button'

const features = [
  'To\'liq kurslarga kirish',
  'Robototexnika loyihalari',
  'Muhandislik vazifalari',
  'Sertifikatlar',
  'Premium qo\'llab-quvvatlash',
  'Reyting tizimiga kirish',
]

export default function PricingCard({ showLink = true, className = '' }) {
  return (
    <motion.div
      whileHover={{ y: -10, scale: 1.02 }}
      transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
      className={`relative max-w-md w-full group ${className}`}
      data-cursor-hover
    >
      {/* Animated energy border */}
      <div className="absolute -inset-[2px] rounded-3xl overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-primary via-sky to-accent opacity-60 group-hover:opacity-100 transition-opacity duration-500 animate-pulse-glow" />
        <div className="absolute inset-0 pricing-energy-border opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      </div>

      <div className="relative rounded-3xl p-8 bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-700/50 shadow-2xl group-hover:shadow-primary/20 transition-shadow duration-500">
        <motion.div
          className="absolute -top-4 left-1/2 -translate-x-1/2"
          animate={{ scale: [1, 1.05, 1] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        >
          <span className="inline-flex items-center gap-1 px-4 py-1.5 rounded-full bg-gradient-to-r from-primary to-accent text-white text-sm font-semibold shadow-lg shadow-primary/30">
            <Sparkles className="w-4 h-4" />
            Eng mashhur
          </span>
        </motion.div>

        <div className="text-center pt-4 mb-8">
          <h3 className="font-display text-2xl font-bold text-slate-900 dark:text-white mb-2">Premium</h3>
          <div className="flex items-baseline justify-center gap-1">
            <span className="text-4xl font-bold text-gradient">149,000</span>
            <span className="text-slate-500">UZS / oy</span>
          </div>
        </div>

        <ul className="space-y-3 mb-8">
          {features.map((f, i) => (
            <motion.li
              key={f}
              initial={{ opacity: 0, x: -10 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              className="flex items-center gap-3 text-slate-600 dark:text-slate-300"
            >
              <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/20 transition-colors duration-300">
                <Check className="w-3 h-3 text-primary" />
              </div>
              {f}
            </motion.li>
          ))}
        </ul>

        {showLink ? (
          <Link to="/subscription" className="block">
            <Button className="w-full" size="lg" magnetic premium>
              Obunani Boshlash
            </Button>
          </Link>
        ) : (
          <Button className="w-full" size="lg" magnetic premium>
            Obunani Boshlash
          </Button>
        )}
      </div>
    </motion.div>
  )
}
