import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, BookOpen, Trophy, Award, CreditCard, Settings, LogOut, Bot, ChevronLeft, ChevronRight, Crown,
} from 'lucide-react'
import { useState } from 'react'
import { motion } from 'framer-motion'
import { useAuth } from '../../context/AuthContext'

const menuItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/courses', icon: BookOpen, label: 'Kurslar' },
  { to: '/ranking', icon: Trophy, label: 'Ranking' },
  { to: '/dashboard#certificates', icon: Award, label: 'Sertifikatlar' },
  { to: '/subscription', icon: CreditCard, label: 'To\'lovlar' },
  { to: '/dashboard#settings', icon: Settings, label: 'Sozlamalar' },
]

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false)
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  return (
    <motion.aside
      animate={{ width: collapsed ? 80 : 260 }}
      className="hidden lg:flex flex-col fixed left-0 top-0 bottom-0 z-40 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 transition-all"
    >
      <div className="p-4 flex items-center justify-between border-b border-slate-200 dark:border-slate-800">
        {!collapsed && (
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center">
              <Bot className="w-5 h-5 text-white" />
            </div>
            <span className="font-display font-bold text-slate-900 dark:text-white">PilotKids</span>
          </div>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
        >
          {collapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
        </button>
      </div>

      {user?.isPremium && !collapsed && (
        <div className="mx-3 mt-4 px-3 py-2 rounded-xl bg-gradient-to-r from-amber-500/20 to-amber-600/20 border border-amber-500/30 flex items-center gap-2">
          <Crown className="w-4 h-4 text-amber-500" />
          <span className="text-xs font-semibold text-amber-600 dark:text-amber-400">Premium</span>
        </div>
      )}

      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {menuItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all ${
                isActive
                  ? 'bg-primary/10 text-primary dark:text-sky font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`
            }
          >
            <Icon className="w-5 h-5 shrink-0" />
            {!collapsed && <span className="text-sm">{label}</span>}
          </NavLink>
        ))}
      </nav>

      <div className="p-3 border-t border-slate-200 dark:border-slate-800">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
        >
          <LogOut className="w-5 h-5 shrink-0" />
          {!collapsed && <span className="text-sm font-medium">Chiqish</span>}
        </button>
      </div>
    </motion.aside>
  )
}
