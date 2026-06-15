import { motion } from 'framer-motion'

export default function DashboardWidget({ children, className = '', delay = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.45, ease: [0.4, 0, 0.2, 1] }}
      whileHover={{
        y: -6,
        transition: { duration: 0.35, ease: 'easeOut' },
      }}
      className={`group/widget ${className}`}
    >
      <div className="h-full transition-shadow duration-400 group-hover/widget:shadow-xl group-hover/widget:shadow-primary/10 rounded-2xl">
        {children}
      </div>
    </motion.div>
  )
}
