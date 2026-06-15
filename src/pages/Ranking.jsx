import { useState, Suspense } from 'react'
import { motion } from 'framer-motion'
import { Medal, Star } from 'lucide-react'
import DashboardLayout from '../components/layout/DashboardLayout'
import GlassCard from '../components/ui/GlassCard'
import PageTransition from '../components/ui/PageTransition'
import SceneFallback from '../components/three/SceneFallback'
import { TopRankCard, LeaderboardRow } from '../components/ui/RankingCard'
import { TrophyScene3D } from '../components/three/lazy'
import { leaderboard, RANKS } from '../data/mockData'

export default function Ranking() {
  const [tab, setTab] = useState('monthly')

  const sorted = [...leaderboard].sort((a, b) =>
    tab === 'weekly' ? b.weeklyXp - a.weeklyXp : b.xp - a.xp
  )

  const getRankEmoji = (rankName) => {
    const rank = RANKS.find((r) => r.name === rankName)
    return rank?.emoji || '🥉'
  }

  return (
    <DashboardLayout>
      <PageTransition>
        <div className="text-center mb-8">
          <div className="max-w-md mx-auto mb-4 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700">
            <Suspense fallback={<SceneFallback className="h-48" />}>
              <TrophyScene3D />
            </Suspense>
          </div>
          <h1 className="font-display text-3xl font-bold text-slate-900 dark:text-white">Reyting Tizimi</h1>
          <p className="text-slate-500 mt-2">Eng yaxshi muhandislar bilan raqobatlashing</p>
        </div>

        {/* Rank tiers */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-8">
          {RANKS.map((rank, i) => (
            <GlassCard key={rank.name} className="!p-4 text-center" data-aos="fade-up">
              <span className="text-2xl">{rank.emoji}</span>
              <p className="text-xs font-semibold text-slate-900 dark:text-white mt-2">{rank.name}</p>
              <p className="text-[10px] text-slate-400">{rank.minXp.toLocaleString()}+ XP</p>
            </GlassCard>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex justify-center gap-2 mb-8">
          {[
            { id: 'monthly', label: 'Oylik Reyting' },
            { id: 'weekly', label: 'Haftalik Reyting' },
          ].map((t) => (
            <motion.button
              key={t.id}
              whileHover={{ scale: 1.05, y: -2 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setTab(t.id)}
              className={`px-6 py-2.5 rounded-xl font-medium text-sm transition-all duration-300 ${
                tab === t.id
                  ? 'bg-primary text-white shadow-lg shadow-primary/30'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 hover:shadow-md'
              }`}
            >
              {t.label}
            </motion.button>
          ))}
        </div>

        {/* Top 3 */}
        <div className="grid sm:grid-cols-3 gap-4 mb-8 max-w-3xl mx-auto">
          {sorted.slice(0, 3).map((student, i) => {
            const positions = [1, 0, 2]
            const pos = positions[i]
            const heights = ['h-32', 'h-40', 'h-28']
            const medals = ['🥈', '🥇', '🥉']
            return (
              <div
                key={student.id}
                className={`${pos === 0 ? 'order-first sm:order-none' : ''}`}
              >
                <TopRankCard
                  student={student}
                  medal={medals[i]}
                  height={heights[i]}
                  glow={i === 1}
                  tab={tab}
                  index={i}
                />
              </div>
            )
          })}
        </div>

        {/* Full leaderboard */}
        <GlassCard>
          <h2 className="font-display font-semibold text-lg text-slate-900 dark:text-white mb-4 flex items-center gap-2">
            <Star className="w-5 h-5 text-amber-400" />
            Top 10 O'quvchilar
          </h2>
          <div className="space-y-2">
            {sorted.map((student, i) => (
              <LeaderboardRow
                key={student.id}
                student={student}
                index={i}
                tab={tab}
                getRankEmoji={getRankEmoji}
              />
            ))}
          </div>
        </GlassCard>
      </PageTransition>
    </DashboardLayout>
  )
}
