import { Cpu, Users, Trophy, Zap, Shield, TrendingUp, Star } from '../../lib/icons'
import GlassCard from '../ui/GlassCard'
import AnimatedIcon from '../ui/AnimatedIcon'
import ScrollReveal from '../ui/ScrollReveal'
import { benefits } from '../../data/mockData'

// Aniq (statik) map — dinamik namespace kirishi tree-shaking'ni buzardi.
const BENEFIT_ICONS = { Cpu, Users, Trophy, Zap, Shield, TrendingUp }

export default function Benefits() {
  return (
    <section id="benefits" data-scroll-stage className="py-24 px-4">
      <div className="max-w-7xl mx-auto">
        <ScrollReveal className="text-center mb-16">
          <span className="text-primary dark:text-sky font-semibold text-sm uppercase tracking-wider">Afzalliklar</span>
          <h2 className="font-display text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white mt-2">
            Nima uchun PilotKids?
          </h2>
          <p className="text-slate-500 dark:text-slate-400 mt-4 max-w-2xl mx-auto">
            Kelajak muhandislarini tayyorlash uchun eng zamonaviy usullar
          </p>
        </ScrollReveal>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {benefits.map((benefit, i) => {
            const Icon = BENEFIT_ICONS[benefit.icon] || Star
            return (
              <ScrollReveal key={benefit.title} index={i} className="h-full">
                <GlassCard glow className="group h-full">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center mb-4 group-hover:from-primary/30 group-hover:to-accent/30 transition-colors duration-400">
                    <AnimatedIcon icon={Icon} robotics />
                  </div>
                  <h3 className="font-display font-semibold text-lg text-slate-900 dark:text-white mb-2">
                    {benefit.title}
                  </h3>
                  <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed">
                    {benefit.desc}
                  </p>
                </GlassCard>
              </ScrollReveal>
            )
          })}
        </div>
      </div>
    </section>
  )
}
