import { Link, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Menu, X, Bot } from 'lucide-react'
import { useState } from 'react'
import Button from '../ui/Button'
import NavLinkItem from '../ui/NavLinkItem'
import { useAuth } from '../../context/AuthContext'

const navLinks = [
  { to: '/#about', label: 'Biz haqimizda' },
  { to: '/#benefits', label: 'Afzalliklar' },
  { to: '/#roadmap', label: 'Yo\'l xaritasi' },
  { to: '/#pricing', label: 'Narxlar' },
  { to: '/courses', label: 'Kurslar', isRoute: true },
]

export default function Navbar() {
  const [open, setOpen] = useState(false)
  const location = useLocation()
  const { isAuthenticated } = useAuth()
  const isLanding = location.pathname === '/'

  return (
    <motion.nav
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
      className="fixed top-0 left-0 right-0 z-50 px-4 py-3"
    >
      <div className="max-w-7xl mx-auto glass-light dark:glass rounded-2xl px-4 sm:px-6 py-3 flex items-center justify-between transition-shadow duration-300 hover:shadow-xl hover:shadow-primary/5">
        <Link to="/" className="flex items-center gap-2 group" data-cursor-hover>
          <motion.div
            whileHover={{ scale: 1.08, rotate: 5 }}
            transition={{ type: 'spring', stiffness: 400, damping: 15 }}
            className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center group-hover:glow-cyan transition-shadow duration-300"
          >
            <Bot className="w-6 h-6 text-white" />
          </motion.div>
          <div>
            <span className="font-display font-bold text-lg text-slate-900 dark:text-white">PilotKids</span>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 hidden sm:block leading-tight">
              Kelajak muhandislari shu yerda boshlanadi
            </p>
          </div>
        </Link>

        {isLanding && (
          <div className="hidden lg:flex items-center gap-6">
            {navLinks.map((link) => (
              link.isRoute ? (
                <Link
                  key={link.to}
                  to={link.to}
                  className="relative text-sm font-medium text-slate-600 dark:text-slate-300 py-1 group"
                  data-cursor-hover
                >
                  <span className="transition-colors duration-300 group-hover:text-primary dark:group-hover:text-sky">
                    {link.label}
                  </span>
                  <motion.span
                    className="absolute bottom-0 left-1/2 h-[2px] bg-gradient-to-r from-primary to-sky rounded-full"
                    initial={{ width: 0, x: '-50%' }}
                    whileHover={{ width: '100%' }}
                    transition={{ duration: 0.35 }}
                  />
                </Link>
              ) : (
                <NavLinkItem key={link.to} href={link.to}>
                  {link.label}
                </NavLinkItem>
              )
            ))}
          </div>
        )}

        <div className="hidden md:flex items-center gap-3">
          {isAuthenticated ? (
            <Link to="/dashboard" data-cursor-hover>
              <Button size="sm" premium>Kabinet</Button>
            </Link>
          ) : (
            <>
              <Link to="/login" data-cursor-hover>
                <Button variant="ghost" size="sm">Kirish</Button>
              </Link>
              <Link to="/register" data-cursor-hover>
                <Button size="sm" magnetic premium>Boshlash</Button>
              </Link>
            </>
          )}
        </div>

        <div className="flex md:hidden items-center gap-2">
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => setOpen(!open)}
            className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            {open ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </motion.button>
        </div>
      </div>

      {open && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.3 }}
          className="md:hidden mt-2 max-w-7xl mx-auto glass-light dark:glass rounded-2xl p-4 space-y-3"
        >
          {isLanding && navLinks.map((link) => (
            <a
              key={link.to}
              href={link.isRoute ? undefined : link.to}
              onClick={() => setOpen(false)}
              className="block py-2 text-slate-600 dark:text-slate-300 hover:text-primary transition-colors duration-300"
            >
              {link.label}
            </a>
          ))}
          <div className="flex gap-2 pt-2">
            <Link to="/login" className="flex-1" onClick={() => setOpen(false)}>
              <Button variant="outline" size="sm" className="w-full">Kirish</Button>
            </Link>
            <Link to="/register" className="flex-1" onClick={() => setOpen(false)}>
              <Button size="sm" className="w-full" premium>Boshlash</Button>
            </Link>
          </div>
        </motion.div>
      )}
    </motion.nav>
  )
}
