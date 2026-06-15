import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'

export default function FooterLink({ to, href, children, className = '' }) {
  const isInternal = !!to

  const content = (
    <>
      <span className="transition-colors duration-300 group-hover:text-sky">{children}</span>
      <motion.span
        className="absolute -bottom-0.5 left-0 h-px bg-sky"
        initial={{ width: 0 }}
        whileHover={{ width: '100%' }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
      />
    </>
  )

  const classes = `relative inline-block group ${className}`

  if (isInternal) {
    return (
      <Link to={to} className={classes} data-cursor-hover>
        {content}
      </Link>
    )
  }

  return (
    <a href={href || '#'} className={classes} data-cursor-hover>
      {content}
    </a>
  )
}
