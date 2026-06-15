import { motion } from 'framer-motion'

const pageVariants = {
  initial: { opacity: 0, y: 20, filter: 'blur(8px)' },
  animate: {
    opacity: 1,
    y: 0,
    filter: 'blur(0px)',
    transition: { duration: 0.55, ease: [0.4, 0, 0.2, 1] },
  },
  exit: {
    opacity: 0,
    y: -12,
    filter: 'blur(6px)',
    transition: { duration: 0.4, ease: [0.4, 0, 1, 1] },
  },
}

export default function PageTransition({ children }) {
  return (
    <motion.div variants={pageVariants} initial="initial" animate="animate" exit="exit">
      {children}
    </motion.div>
  )
}
