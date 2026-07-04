import { BookOpen, CircuitBoard, Radio, Bot, Award, Circle } from '../../lib/icons'
import ScrollReveal from '../ui/ScrollReveal'
import { roadmap } from '../../data/mockData'

// Aniq (statik) map — dinamik `Icons[name]` namespace kirishi tree-shaking'ni buzardi.
const ROADMAP_ICONS = { BookOpen, CircuitBoard, Radio, Bot, Award }

export default function LearningRoadmap() {
  return (
    <section id="roadmap" data-scroll-stage className="py-24 px-4 bg-slate-50/60 dark:bg-slate-900/40">
      <div className="max-w-7xl mx-auto">
        <ScrollReveal className="text-center mb-16">
          <span className="text-primary dark:text-sky font-semibold text-sm uppercase tracking-wider">Yo'l Xaritasi</span>
          <h2 className="font-display text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white mt-2">
            O'rganish Bosqichlari
          </h2>
        </ScrollReveal>

        <div className="relative">
          <div className="hidden lg:block absolute top-1/2 left-0 right-0 h-0.5 bg-gradient-to-r from-primary via-sky to-accent -translate-y-1/2" />

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
            {roadmap.map((item, i) => {
              const Icon = ROADMAP_ICONS[item.icon] || Circle
              return (
                <ScrollReveal
                  key={item.step}
                  index={i}
                  className="relative flex flex-col items-center text-center"
                >
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center mb-4 relative z-10 glow-cyan">
                    <Icon className="w-8 h-8 text-white" />
                  </div>
                  <span className="text-xs font-bold text-primary dark:text-sky mb-1">Bosqich {item.step}</span>
                  <h3 className="font-display font-semibold text-slate-900 dark:text-white mb-2">{item.title}</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400">{item.desc}</p>
                </ScrollReveal>
              )
            })}
          </div>
        </div>
      </div>
    </section>
  )
}
