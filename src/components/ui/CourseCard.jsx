import { motion } from 'framer-motion'
import { Clock, BarChart3, Play } from '../../lib/icons'
import GlassCard from './GlassCard'
import Button from './Button'

const thumbnails = {
  robotics: '🤖',
  arduino: '⚡',
  electronics: '🔌',
  sensors: '📡',
  engineering: '⚙️',
  '3d': '🎨',
  coding: '💻',
  'robot-arm': '🦾',
}

const difficultyColors = {
  'Boshlang\'ich': 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  'O\'rta': 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  'Yuqori': 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
}

export default function CourseCard({ course }) {
  return (
    <GlassCard className="!p-0 overflow-hidden h-full flex flex-col group/course" glow>
      <div className="h-40 bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center relative overflow-hidden">
        <div className="absolute inset-0 bg-grid opacity-20 transition-opacity duration-500 group-hover/course:opacity-40" />
        <motion.span
          className="text-6xl relative z-10"
          whileHover={{ scale: 1.15 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        >
          {thumbnails[course.thumbnail]}
        </motion.span>
        <div className="absolute inset-0 bg-gradient-to-t from-primary/20 to-transparent opacity-0 group-hover/course:opacity-100 transition-opacity duration-500" />
        <span className={`absolute top-3 right-3 px-2 py-1 rounded-lg text-xs font-medium z-10 ${difficultyColors[course.difficulty]}`}>
          {course.difficulty}
        </span>
      </div>
      <div className="p-5 flex-1 flex flex-col">
        <span className="text-xs text-primary dark:text-sky font-medium">{course.category}</span>
        <h3 className="font-display font-semibold text-slate-900 dark:text-white mt-1 mb-3 group-hover/course:text-primary dark:group-hover/course:text-sky transition-colors duration-300">
          {course.title}
        </h3>
        <div className="flex items-center gap-4 text-xs text-slate-500 mb-4">
          <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {course.duration}</span>
          <span className="flex items-center gap-1"><BarChart3 className="w-3.5 h-3.5" /> {course.lessons} dars</span>
        </div>
        {course.progress > 0 && (
          <div className="mb-4 group/progress">
            <div className="flex justify-between text-xs mb-1">
              <span className="text-slate-500">Progress</span>
              <span className="text-primary dark:text-sky font-medium">{course.progress}%</span>
            </div>
            <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-primary to-accent rounded-full group-hover/progress:shadow-[0_0_12px_rgba(56,189,248,0.6)] transition-shadow duration-400"
                style={{ width: `${course.progress}%` }}
                whileHover={{ scaleY: 1.3 }}
              />
            </div>
          </div>
        )}
        <Button size="sm" className="mt-auto w-full group-hover/course:shadow-primary/40" premium>
          <Play className="w-4 h-4 transition-transform duration-300 group-hover/course:translate-x-0.5" />
          {course.progress > 0 ? 'Davom etish' : 'Boshlash'}
        </Button>
      </div>
    </GlassCard>
  )
}
