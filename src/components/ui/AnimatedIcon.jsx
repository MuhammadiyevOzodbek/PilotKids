import { motion } from 'framer-motion'

export default function AnimatedIcon({ icon: Icon, className = '', robotics = false }) {
  return (
    <motion.div
      whileHover={{ scale: 1.15, rotate: robotics ? 12 : 6 }}
      transition={{ type: 'spring', stiffness: 400, damping: 12 }}
      className={`inline-flex ${robotics ? 'animate-float' : ''} ${className}`}
    >
      <Icon className={`w-5 h-5 transition-all duration-300 hover:text-primary dark:hover:text-sky ${
        robotics ? 'hover:drop-shadow-[0_0_8px_rgba(56,189,248,0.8)]' : ''
      }`} />
    </motion.div>
  )
}
