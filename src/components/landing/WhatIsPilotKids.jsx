import { Suspense } from 'react'
import { motion } from 'framer-motion'
import { Cpu, CircuitBoard, Code, Wrench, Zap } from 'lucide-react'
import GlassCard from '../ui/GlassCard'
import SceneFallback from '../three/SceneFallback'
import { RoboticArmScene } from '../three/lazy'

const icons = [Cpu, CircuitBoard, Code, Wrench, Zap]

export default function WhatIsPilotKids() {
  return (
    <section id="about" className="py-24 px-4 bg-slate-50 dark:bg-slate-900/50">
      <div className="max-w-7xl mx-auto">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <motion.div
            data-aos="fade-right"
            className="relative"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-accent/20 rounded-3xl blur-2xl" />
            <div className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-dark to-slate-800 border border-slate-700">
              <div className="absolute inset-0 bg-grid opacity-20 pointer-events-none z-10" />
              <Suspense fallback={<SceneFallback className="h-[320px] sm:h-[380px] lg:h-[420px]" />}>
                <RoboticArmScene />
              </Suspense>
              <div className="absolute top-4 left-4 flex gap-2 z-20 pointer-events-none">
                {icons.map((Icon, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, scale: 0 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.1 }}
                    className="w-10 h-10 rounded-lg bg-slate-700/80 flex items-center justify-center"
                  >
                    <Icon className="w-5 h-5 text-sky" />
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>

          <div data-aos="fade-left">
            <span className="text-primary dark:text-sky font-semibold text-sm uppercase tracking-wider">
              PilotKids Nima?
            </span>
            <h2 className="font-display text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white mt-2 mb-6">
              Zamonaviy Ta'lim Platformasi
            </h2>
            <p className="text-slate-600 dark:text-slate-300 text-lg leading-relaxed mb-8">
              PilotKids — bu robototexnika va muhandislikni onlayn tarzda o'rgatuvchi zamonaviy ta'lim platformasi.
              O'quvchilar robotlar yaratish, sensorlar bilan ishlash, elektronika va dasturlash asoslarini amaliy
              loyihalar orqali o'rganadilar.
            </p>

            <div className="grid sm:grid-cols-2 gap-4">
              {[
                { title: 'Amaliy Loyihalar', desc: 'Haqiqiy robotlar yig\'ish' },
                { title: 'Video Darslar', desc: 'Professional kontent' },
                { title: 'Mentorlar', desc: 'Tajribali muhandislar' },
                { title: 'Sertifikatlar', desc: 'Rasmiy tasdiqlash' },
              ].map((item, i) => (
                <GlassCard key={i} className="!p-4" glow>
                  <h4 className="font-semibold text-slate-900 dark:text-white mb-1">{item.title}</h4>
                  <p className="text-sm text-slate-500 dark:text-slate-400">{item.desc}</p>
                </GlassCard>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
