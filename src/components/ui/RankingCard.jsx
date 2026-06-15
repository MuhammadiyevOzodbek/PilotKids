import { motion } from 'framer-motion'
import { Medal, Zap } from 'lucide-react'

const shimmerClass = {
  0: 'shimmer-gold',
  1: 'shimmer-silver',
  2: 'shimmer-bronze',
}

export function TopRankCard({ student, medal, height, glow, tab, index }) {
  return (
    <motion.div
      whileHover={{ y: -10, scale: 1.03 }}
      transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
      className="group/rank"
    >
      <div
        className={`
          relative rounded-2xl p-6 text-center flex flex-col justify-end overflow-hidden
          bg-white/80 dark:bg-slate-800/60 backdrop-blur-xl
          border border-slate-200/80 dark:border-slate-700/60
          shadow-lg hover:shadow-xl hover:shadow-primary/15
          hover:border-primary/30 transition-all duration-400
          ${height} ${shimmerClass[index] || ''}
          ${glow ? 'hover:glow-blue' : ''}
        `}
      >
        {/* Spark particles on hover */}
        <div className="absolute inset-0 opacity-0 group-hover/rank:opacity-100 transition-opacity duration-500 pointer-events-none">
          {[...Array(6)].map((_, i) => (
            <motion.span
              key={i}
              className="absolute w-1 h-1 rounded-full bg-sky"
              style={{ left: `${20 + i * 12}%`, top: `${30 + (i % 3) * 20}%` }}
              animate={{ y: [0, -20, 0], opacity: [0, 1, 0] }}
              transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.2 }}
            />
          ))}
        </div>

        <motion.span
          className="text-3xl mb-2 inline-block"
          whileHover={{ rotate: [0, -15, 15, 0], scale: 1.2 }}
          transition={{ duration: 0.5 }}
        >
          {medal}
        </motion.span>
        <div className="w-12 h-12 mx-auto rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white font-bold mb-2 group-hover/rank:shadow-lg group-hover/rank:shadow-primary/40 transition-shadow duration-400">
          {student.avatar}
        </div>
        <p className="font-semibold text-sm text-slate-900 dark:text-white">{student.name}</p>
        <p className="text-xs text-primary dark:text-sky flex items-center justify-center gap-1">
          <Zap className="w-3 h-3 group-hover/rank:text-amber-400 transition-colors" />
          {(tab === 'weekly' ? student.weeklyXp : student.xp).toLocaleString()} XP
        </p>
      </div>
    </motion.div>
  )
}

export function LeaderboardRow({ student, index, tab, getRankEmoji }) {
  const isTop3 = index < 3

  return (
    <motion.div
      whileHover={{ x: 4, scale: 1.01 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className={`
        group/row flex items-center gap-4 p-4 rounded-xl transition-all duration-300
        ${student.isCurrentUser
          ? 'bg-primary/10 border border-primary/30'
          : 'hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:shadow-md hover:shadow-primary/5'
        }
        ${isTop3 ? shimmerClass[index] : ''}
      `}
    >
      <span className={`w-8 text-center font-bold transition-transform duration-300 group-hover/row:scale-110 ${
        isTop3 ? 'text-amber-500' : 'text-slate-400'
      }`}>
        #{index + 1}
      </span>
      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/80 to-accent flex items-center justify-center text-white text-sm font-bold group-hover/row:shadow-lg group-hover/row:shadow-primary/30 transition-shadow">
        {student.avatar}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-slate-900 dark:text-white truncate">
          {student.name}
          {student.isCurrentUser && (
            <span className="ml-2 text-xs text-primary dark:text-sky">(Siz)</span>
          )}
        </p>
        <p className="text-xs text-slate-500 flex items-center gap-1">
          {getRankEmoji(student.rank)} {student.rank}
        </p>
      </div>
      <div className="hidden sm:block flex-1 max-w-[120px]">
        <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-primary to-accent rounded-full transition-all duration-500 group-hover/row:shadow-[0_0_10px_rgba(56,189,248,0.5)]"
            style={{ width: `${Math.min((student.xp / 12450) * 100, 100)}%` }}
          />
        </div>
      </div>
      <div className="text-right">
        <p className="font-bold text-slate-900 dark:text-white flex items-center gap-1 justify-end">
          <Zap className="w-4 h-4 text-amber-400 group-hover/row:scale-125 transition-transform duration-300" />
          {(tab === 'weekly' ? student.weeklyXp : student.xp).toLocaleString()}
        </p>
        <p className="text-xs text-slate-400 flex items-center gap-1 justify-end">
          <Medal className="w-3 h-3" /> {student.badges} badge
        </p>
      </div>
    </motion.div>
  )
}
