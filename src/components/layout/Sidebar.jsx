import { NavLink, useNavigate } from 'react-router-dom'
import {
  LogOut, Bot, ChevronLeft, ChevronRight, Crown, Sun, Moon,
} from '../../lib/icons'
import { motion } from 'framer-motion'
import { useAuth } from '../../context/AuthContext'
import { useTheme } from '../../context/ThemeContext'
import { dashboardMenu } from '../../data/navigation'

export default function Sidebar({ collapsed, onToggle }) {
  const { user, logout } = useAuth()
  const { isDark, toggleTheme } = useTheme()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  return (
    <motion.aside
      animate={{ width: collapsed ? 80 : 260 }}
      className="hidden lg:flex flex-col fixed left-0 top-0 bottom-0 z-40 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 transition-all"
      aria-label="Asosiy navigatsiya"
    >
      <div className="p-4 flex items-center justify-between border-b border-slate-200 dark:border-slate-800">
        {!collapsed && (
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center">
              <Bot className="w-5 h-5 text-white" aria-hidden="true" />
            </div>
            <span className="font-display font-bold text-slate-900 dark:text-white">PilotKids</span>
          </div>
        )}
        <button
          type="button"
          onClick={onToggle}
          aria-label={collapsed ? 'Yon panelni ochish' : 'Yon panelni yig\'ish'}
          aria-expanded={!collapsed}
          className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300"
        >
          {collapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
        </button>
      </div>

      {user?.isPremium && !collapsed && (
        <div className="mx-3 mt-4 px-3 py-2 rounded-xl bg-gradient-to-r from-amber-500/20 to-amber-600/20 border border-amber-500/30 flex items-center gap-2">
          <Crown className="w-4 h-4 text-amber-500" aria-hidden="true" />
          <span className="text-xs font-semibold text-amber-600 dark:text-amber-400">Premium</span>
        </div>
      )}

      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {dashboardMenu.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/dashboard'}
            title={collapsed ? label : undefined}
            aria-label={collapsed ? label : undefined}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all ${
                collapsed ? 'justify-center' : ''
              } ${
                isActive
                  ? 'bg-primary/10 text-primary dark:text-sky font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`
            }
          >
            <Icon className="w-5 h-5 shrink-0" aria-hidden="true" />
            {!collapsed && <span className="text-sm">{label}</span>}
          </NavLink>
        ))}
      </nav>

      <div className="p-3 border-t border-slate-200 dark:border-slate-800 space-y-1">
        <button
          type="button"
          onClick={toggleTheme}
          aria-label={isDark ? 'Yorug\' rejimga o\'tish' : 'Qorong\'u rejimga o\'tish'}
          className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors ${
            collapsed ? 'justify-center' : ''
          }`}
        >
          {isDark ? <Sun className="w-5 h-5 shrink-0" /> : <Moon className="w-5 h-5 shrink-0" />}
          {!collapsed && <span className="text-sm font-medium">{isDark ? 'Yorug\' rejim' : 'Qorong\'u rejim'}</span>}
        </button>
        <button
          type="button"
          onClick={handleLogout}
          aria-label="Chiqish"
          className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors ${
            collapsed ? 'justify-center' : ''
          }`}
        >
          <LogOut className="w-5 h-5 shrink-0" aria-hidden="true" />
          {!collapsed && <span className="text-sm font-medium">Chiqish</span>}
        </button>
      </div>
    </motion.aside>
  )
}
