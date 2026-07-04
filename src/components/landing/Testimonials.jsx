import { Star, Quote } from '../../lib/icons'
import GlassCard from '../ui/GlassCard'
import ScrollReveal from '../ui/ScrollReveal'
import { testimonials } from '../../data/mockData'

export default function Testimonials() {
  return (
    <section data-scroll-stage className="py-24 px-4 bg-slate-50/60 dark:bg-slate-900/40">
      <div className="max-w-7xl mx-auto">
        <ScrollReveal className="text-center mb-16">
          <span className="text-primary dark:text-sky font-semibold text-sm uppercase tracking-wider">Fikrlar</span>
          <h2 className="font-display text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white mt-2">
            Foydalanuvchilar Fikri
          </h2>
        </ScrollReveal>

        <div className="grid md:grid-cols-3 gap-6">
          {testimonials.map((t, i) => (
            <ScrollReveal key={t.name} index={i} className="h-full">
            <GlassCard className="h-full">
              <Quote className="w-8 h-8 text-primary/30 dark:text-sky/30 mb-4" aria-hidden="true" />
              <p className="text-slate-600 dark:text-slate-300 mb-6 leading-relaxed italic">
                "{t.text}"
              </p>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-slate-900 dark:text-white">{t.name}</p>
                  <p className="text-sm text-slate-500 dark:text-slate-400">{t.role}</p>
                </div>
                <div className="flex gap-0.5" role="img" aria-label={`5 yulduzdan ${t.rating} yulduz`}>
                  {Array.from({ length: t.rating }).map((_, j) => (
                    <Star key={j} className="w-4 h-4 fill-amber-400 text-amber-400" aria-hidden="true" />
                  ))}
                </div>
              </div>
            </GlassCard>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  )
}
