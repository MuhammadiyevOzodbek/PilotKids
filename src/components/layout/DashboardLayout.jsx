import { Link, useLocation } from 'react-router-dom'
import { Menu, X } from '../../lib/icons'
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Sidebar from './Sidebar'
import { mobileNav } from '../../data/navigation'

export default function DashboardLayout({ children }) {
  const [mobileMenu, setMobileMenu] = useState(false)
  const [collapsed, setCollapsed] = useState(false)
  const location = useLocation()

  // Escape bosilganda mobil menyuni yopish (a11y).
  useEffect(() => {
    if (!mobileMenu) return
    const onKey = (e) => {
      if (e.key === 'Escape') setMobileMenu(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [mobileMenu])

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((c) => !c)} />

      {/* Mobile header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 z-30 glass-light dark:glass px-4 py-3 flex items-center justify-between">
        <span className="font-display font-bold text-slate-900 dark:text-white">PilotKids</span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setMobileMenu(!mobileMenu)}
            aria-label={mobileMenu ? 'Menyuni yopish' : 'Menyuni ochish'}
            aria-expanded={mobileMenu}
            aria-controls="dashboard-mobile-menu"
            className="p-2 rounded-lg text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <Menu className="w-6 h-6" />
          </button>
        </div>
      </header>

      <AnimatePresence>
        {mobileMenu && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="lg:hidden fixed inset-0 z-40 bg-black/50"
            onClick={() => setMobileMenu(false)}
          >
            <motion.div
              id="dashboard-mobile-menu"
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'tween', duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
              className="absolute right-0 top-0 bottom-0 w-64 bg-white dark:bg-slate-900 p-4"
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-modal="true"
              aria-label="Navigatsiya menyusi"
            >
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => setMobileMenu(false)}
                  aria-label="Menyuni yopish"
                  className="p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              <nav className="space-y-2 mt-4" aria-label="Mobil navigatsiya">
                {mobileNav.map(({ to, icon: Icon, label }) => (
                  <Link
                    key={to}
                    to={to}
                    onClick={() => setMobileMenu(false)}
                    aria-current={location.pathname === to ? 'page' : undefined}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl ${
                      location.pathname === to ? 'bg-primary/10 text-primary' : 'text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    <Icon className="w-5 h-5" aria-hidden="true" />
                    {label}
                  </Link>
                ))}
              </nav>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <main
        className={`pt-16 lg:pt-0 pb-24 lg:pb-8 min-h-screen transition-[margin] duration-300 ${
          collapsed ? 'lg:ml-[80px]' : 'lg:ml-[260px]'
        }`}
      >
        <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
          {children}
        </div>
      </main>

      {/* Mobile bottom nav */}
      <nav
        className="lg:hidden fixed bottom-0 left-0 right-0 z-30 glass-light dark:glass border-t border-slate-200 dark:border-slate-800 flex justify-around py-2"
        aria-label="Pastki navigatsiya"
      >
        {mobileNav.map(({ to, icon: Icon, label }) => (
          <Link
            key={to}
            to={to}
            aria-current={location.pathname === to ? 'page' : undefined}
            className={`flex flex-col items-center gap-0.5 px-4 py-1 text-xs ${
              location.pathname === to ? 'text-primary' : 'text-slate-500 dark:text-slate-400'
            }`}
          >
            <Icon className="w-5 h-5" aria-hidden="true" />
            {label}
          </Link>
        ))}
      </nav>
    </div>
  )
}
