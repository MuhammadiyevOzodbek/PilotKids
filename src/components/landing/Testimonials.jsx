import { Star, Quote } from 'lucide-react'
import GlassCard from '../ui/GlassCard'
import { testimonials } from '../../data/mockData'

export default function Testimonials() {
  return (
    <section className="py-24 px-4 bg-slate-50 dark:bg-slate-900/50">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16" data-aos="fade-up">
          <span className="text-primary dark:text-sky font-semibold text-sm uppercase tracking-wider">Fikrlar</span>
          <h2 className="font-display text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white mt-2">
            Foydalanuvchilar Fikri
          </h2>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {testimonials.map((t, i) => (
            <GlassCard key={i} data-aos="fade-up" data-aos-delay={i * 100}>
              <Quote className="w-8 h-8 text-primary/30 dark:text-sky/30 mb-4" />
              <p className="text-slate-600 dark:text-slate-300 mb-6 leading-relaxed italic">
                "{t.text}"
              </p>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-slate-900 dark:text-white">{t.name}</p>
                  <p className="text-sm text-slate-500">{t.role}</p>
                </div>
                <div className="flex gap-0.5">
                  {Array.from({ length: t.rating }).map((_, j) => (
                    <Star key={j} className="w-4 h-4 fill-amber-400 text-amber-400" />
                  ))}
                </div>
              </div>
            </GlassCard>
          ))}
        </div>
      </div>
    </section>
  )
}
