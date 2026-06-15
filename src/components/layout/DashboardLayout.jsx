import { Link, useLocation } from 'react-router-dom'
import { LayoutDashboard, BookOpen, Trophy, Menu } from 'lucide-react'
import { useState } from 'react'
import Sidebar from './Sidebar'
const mobileNav = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/courses', icon: BookOpen, label: 'Kurslar' },
  { to: '/ranking', icon: Trophy, label: 'Ranking' },
]

export default function DashboardLayout({ children }) {
  const [mobileMenu, setMobileMenu] = useState(false)
  const location = useLocation()

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <Sidebar />

      {/* Mobile header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 z-30 glass-light dark:glass px-4 py-3 flex items-center justify-between">
        <span className="font-display font-bold text-slate-900 dark:text-white">PilotKids</span>
        <div className="flex items-center gap-2">
          <button onClick={() => setMobileMenu(!mobileMenu)} className="p-2 rounded-lg">
            <Menu className="w-6 h-6" />
          </button>
        </div>
      </header>

      {mobileMenu && (
        <div className="lg:hidden fixed inset-0 z-40 bg-black/50" onClick={() => setMobileMenu(false)}>
          <div className="absolute right-0 top-0 bottom-0 w-64 bg-white dark:bg-slate-900 p-4" onClick={(e) => e.stopPropagation()}>
            <nav className="space-y-2 mt-16">
              {mobileNav.map(({ to, icon: Icon, label }) => (
                <Link
                  key={to}
                  to={to}
                  onClick={() => setMobileMenu(false)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl ${
                    location.pathname === to ? 'bg-primary/10 text-primary' : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  {label}
                </Link>
              ))}
            </nav>
          </div>
        </div>
      )}

      <main className="lg:ml-[260px] pt-16 lg:pt-0 min-h-screen">
        <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
          {children}
        </div>
      </main>

      {/* Mobile bottom nav */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-30 glass-light dark:glass border-t border-slate-200 dark:border-slate-800 flex justify-around py-2">
        {mobileNav.map(({ to, icon: Icon, label }) => (
          <Link
            key={to}
            to={to}
            className={`flex flex-col items-center gap-0.5 px-4 py-1 text-xs ${
              location.pathname === to ? 'text-primary' : 'text-slate-500'
            }`}
          >
            <Icon className="w-5 h-5" />
            {label}
          </Link>
        ))}
      </nav>
    </div>
  )
}
