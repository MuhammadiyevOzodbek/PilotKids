import { motion } from 'framer-motion'

export default function NavLinkItem({ href, children, isRoute = false, onClick }) {
  const Tag = isRoute ? motion.a : motion.a

  return (
    <Tag
      href={href}
      onClick={onClick}
      className="relative text-sm font-medium text-slate-600 dark:text-slate-300 py-1 group"
      whileHover={{ color: 'var(--color-primary)' }}
      data-cursor-hover
    >
      <span className="relative z-10 transition-colors duration-300 group-hover:text-primary dark:group-hover:text-sky">
        {children}
      </span>
      <motion.span
        className="absolute bottom-0 left-1/2 h-[2px] bg-gradient-to-r from-primary to-sky rounded-full"
        initial={{ width: 0, x: '-50%' }}
        whileHover={{ width: '100%' }}
        transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
      />
      <span className="absolute inset-0 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-primary/5 dark:bg-sky/5 -z-0" />
    </Tag>
  )
}
