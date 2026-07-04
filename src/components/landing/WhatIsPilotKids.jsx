import { motion } from 'framer-motion'
import { Cpu, CircuitBoard, Code, Wrench, Zap } from '../../lib/icons'
import GlassCard from '../ui/GlassCard'
import ScrollReveal from '../ui/ScrollReveal'

const icons = [
  { Icon: Cpu, label: 'Protsessor' },
  { Icon: CircuitBoard, label: 'Elektron plata' },
  { Icon: Code, label: 'Dasturlash' },
  { Icon: Wrench, label: 'Muhandislik' },
  { Icon: Zap, label: 'Energiya' },
]

export default function WhatIsPilotKids() {
  return (
    <section id="about" data-scroll-stage className="py-24 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* 3D robot uchun joy — fixed sahnada kamera bu bosqichda robotga
              yaqinlashib, uni chap tomonda ko'rsatadi. Ikonkalar ustida suzadi. */}
          <ScrollReveal direction="left" className="relative hidden lg:block h-[420px]">
            <div className="absolute top-0 left-0 flex gap-2 z-10 pointer-events-none">
              {icons.map(({ Icon, label }, i) => (
                <motion.div
                  key={label}
                  initial={{ opacity: 0, scale: 0 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.1 }}
                  className="w-10 h-10 rounded-lg glass flex items-center justify-center"
                >
                  <Icon className="w-5 h-5 text-primary dark:text-sky" aria-hidden="true" />
                </motion.div>
              ))}
            </div>
          </ScrollReveal>

          <ScrollReveal direction="right">
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
              ].map((item) => (
                <GlassCard key={item.title} className="!p-4" glow>
                  <h4 className="font-semibold text-slate-900 dark:text-white mb-1">{item.title}</h4>
                  <p className="text-sm text-slate-500 dark:text-slate-400">{item.desc}</p>
                </GlassCard>
              ))}
            </div>
          </ScrollReveal>
        </div>
      </div>
    </section>
  )
}
