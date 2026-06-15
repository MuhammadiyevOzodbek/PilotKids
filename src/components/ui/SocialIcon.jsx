import { motion } from 'framer-motion'

export default function SocialIcon({ icon: Icon, href = '#' }) {
  return (
    <motion.a
      href={href}
      whileHover={{ scale: 1.12, rotate: 8 }}
      whileTap={{ scale: 0.95 }}
      transition={{ type: 'spring', stiffness: 400, damping: 15 }}
      className="w-9 h-9 rounded-lg bg-slate-800 flex items-center justify-center text-slate-300 hover:text-white hover:bg-primary hover:shadow-lg hover:shadow-primary/40 transition-colors duration-300"
      data-cursor-hover
    >
      <Icon className="w-4 h-4" />
    </motion.a>
  )
}
