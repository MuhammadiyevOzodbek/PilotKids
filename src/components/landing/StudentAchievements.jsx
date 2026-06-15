import { Trophy, Medal } from 'lucide-react'
import GlassCard from '../ui/GlassCard'
import { achievements } from '../../data/mockData'

const medalColors = {
  'Oltin Medal': 'from-amber-400 to-amber-600',
  'Kumush Medal': 'from-slate-300 to-slate-500',
  'Bronza Medal': 'from-orange-400 to-orange-600',
  'Eng Yaxshi Loyiha': 'from-primary to-sky',
}

export default function StudentAchievements() {
  return (
    <section className="py-24 px-4 bg-slate-50 dark:bg-slate-900/50">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16" data-aos="fade-up">
          <span className="text-primary dark:text-sky font-semibold text-sm uppercase tracking-wider">Yutuqlar</span>
          <h2 className="font-display text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white mt-2">
            O'quvchilar Yutuqlari
          </h2>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {achievements.map((item, i) => (
            <GlassCard key={i} data-aos="fade-up" data-aos-delay={i * 100} className="text-center">
              <div className={`w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br ${medalColors[item.award] || 'from-primary to-sky'} flex items-center justify-center`}>
                <Medal className="w-8 h-8 text-white" />
              </div>
              <h3 className="font-semibold text-slate-900 dark:text-white">{item.student}</h3>
              <p className="text-sm text-primary dark:text-sky mt-1">{item.project}</p>
              <div className="flex items-center justify-center gap-1 mt-3 text-amber-500">
                <Trophy className="w-4 h-4" />
                <span className="text-xs font-medium">{item.award}</span>
              </div>
              <span className="text-xs text-slate-400 mt-2 block">{item.date}</span>
            </GlassCard>
          ))}
        </div>
      </div>
    </section>
  )
}
