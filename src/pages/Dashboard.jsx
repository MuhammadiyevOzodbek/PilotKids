import { Suspense } from 'react'
import { motion } from 'framer-motion'
import {
  Bell, BookOpen, Award, Clock, Crown, TrendingUp, ChevronRight,
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import DashboardLayout from '../components/layout/DashboardLayout'
import GlassCard from '../components/ui/GlassCard'
import DashboardWidget from '../components/ui/DashboardWidget'
import PageTransition from '../components/ui/PageTransition'
import { useAuth } from '../context/AuthContext'
import {
  weeklyChartData, notifications, upcomingLessons, courses,
} from '../data/mockData'
import SceneFallback from '../components/three/SceneFallback'
import { AssistantScene } from '../components/three/lazy'

export default function Dashboard() {
  const { user } = useAuth()
  const completedCourses = courses.filter((c) => c.progress === 100).length
  const inProgress = courses.filter((c) => c.progress > 0 && c.progress < 100).length

  return (
    <DashboardLayout>
      <PageTransition>
        {/* Welcome Banner */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative rounded-2xl overflow-hidden mb-8 p-6 sm:p-8 bg-gradient-to-r from-primary via-sky to-accent"
        >
          <div className="absolute inset-0 bg-grid opacity-20" />
          <div className="relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="hidden sm:block w-24 h-24 rounded-2xl overflow-hidden bg-white/10 border border-white/20 shrink-0">
                <Suspense fallback={<SceneFallback className="h-full" />}>
                  <AssistantScene expression="happy" />
                </Suspense>
              </div>
              <div>
                <p className="text-white/80 text-sm mb-1">Xush kelibsiz 👋</p>
                <h1 className="font-display text-2xl sm:text-3xl font-bold text-white">
                  {user?.name || 'O\'quvchi'}
                </h1>
                <p className="text-white/70 mt-1">Bugun yangi narsa o'rganish uchun ajoyib kun!</p>
              </div>
            </div>
            {user?.isPremium && (
              <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/20 backdrop-blur-sm">
                <Crown className="w-5 h-5 text-amber-300" />
                <span className="text-white font-semibold text-sm">Premium Account</span>
              </div>
            )}
          </div>
        </motion.div>

        <div className="grid lg:grid-cols-3 gap-6 mb-8">
          <DashboardWidget delay={0.1} className="lg:col-span-1">
          <GlassCard className="h-full">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white text-xl font-bold">
                {user?.name?.split(' ').map((n) => n[0]).join('') || 'OK'}
              </div>
              <div>
                <h3 className="font-semibold text-slate-900 dark:text-white">{user?.name}</h3>
                <p className="text-sm text-slate-500">{user?.rank}</p>
                <p className="text-xs text-primary dark:text-sky font-medium mt-1">{user?.xp?.toLocaleString()} XP</p>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Daraja</span>
                <span className="font-medium text-slate-900 dark:text-white">{user?.rank}</span>
              </div>
              <div className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-primary to-accent rounded-full" style={{ width: '48%' }} />
              </div>
              <p className="text-xs text-slate-400">Keyingi darajaga 5150 XP qoldi</p>
            </div>
          </GlassCard>
          </DashboardWidget>

          <div className="lg:col-span-2 grid sm:grid-cols-3 gap-4">
            {[
              { icon: BookOpen, label: 'Kurslar', value: inProgress, color: 'from-blue-500 to-blue-600' },
              { icon: Award, label: 'Sertifikatlar', value: completedCourses, color: 'from-amber-500 to-amber-600' },
              { icon: TrendingUp, label: 'XP Ball', value: user?.xp?.toLocaleString(), color: 'from-emerald-500 to-emerald-600' },
            ].map((stat, i) => (
              <DashboardWidget key={i} delay={0.15 + i * 0.05}>
              <GlassCard className="!p-5 h-full group/stat">
                <motion.div
                  whileHover={{ scale: 1.1, rotate: 5 }}
                  className={`w-10 h-10 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center mb-3 transition-shadow duration-300 group-hover/stat:shadow-lg`}
                >
                  <stat.icon className="w-5 h-5 text-white" />
                </motion.div>
                <motion.p
                  className="text-2xl font-bold text-slate-900 dark:text-white"
                  whileHover={{ scale: 1.05 }}
                >
                  {stat.value}
                </motion.p>
                <p className="text-sm text-slate-500">{stat.label}</p>
              </GlassCard>
              </DashboardWidget>
            ))}
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6 mb-8">
          {/* Weekly Chart */}
          <GlassCard className="lg:col-span-2">
            <h3 className="font-display font-semibold text-lg text-slate-900 dark:text-white mb-4">
              Haftalik O'rganish
            </h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={weeklyChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} />
                  <XAxis dataKey="day" stroke="#94a3b8" fontSize={12} />
                  <YAxis stroke="#94a3b8" fontSize={12} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1e293b',
                      border: 'none',
                      borderRadius: '12px',
                      color: '#fff',
                    }}
                    formatter={(value) => [`${value} soat`, 'O\'rganish']}
                  />
                  <Bar dataKey="hours" fill="url(#barGradient)" radius={[8, 8, 0, 0]} />
                  <defs>
                    <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#38BDF8" />
                      <stop offset="100%" stopColor="#2563EB" />
                    </linearGradient>
                  </defs>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </GlassCard>

          {/* Notifications */}
          <GlassCard>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display font-semibold text-lg text-slate-900 dark:text-white flex items-center gap-2">
                <Bell className="w-5 h-5 text-primary" />
                Bildirishnomalar
              </h3>
            </div>
            <div className="space-y-3">
              {notifications.map((n) => (
                <div
                  key={n.id}
                  className={`p-3 rounded-xl text-sm ${
                    n.unread ? 'bg-primary/5 border border-primary/20' : 'bg-slate-50 dark:bg-slate-800/50'
                  }`}
                >
                  <p className="text-slate-700 dark:text-slate-300">{n.text}</p>
                  <p className="text-xs text-slate-400 mt-1">{n.time}</p>
                </div>
              ))}
            </div>
          </GlassCard>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Upcoming Lessons */}
          <GlassCard>
            <h3 className="font-display font-semibold text-lg text-slate-900 dark:text-white mb-4 flex items-center gap-2">
              <Clock className="w-5 h-5 text-accent" />
              Yaqinlashayotgan Darslar
            </h3>
            <div className="space-y-3">
              {upcomingLessons.map((lesson) => (
                <div
                  key={lesson.id}
                  className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group cursor-pointer"
                >
                  <div>
                    <p className="font-medium text-slate-900 dark:text-white">{lesson.title}</p>
                    <p className="text-xs text-slate-500">{lesson.course} · {lesson.time}</p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-primary transition-colors" />
                </div>
              ))}
            </div>
          </GlassCard>

          {/* Completed Courses */}
          <GlassCard id="certificates">
            <h3 className="font-display font-semibold text-lg text-slate-900 dark:text-white mb-4 flex items-center gap-2">
              <Award className="w-5 h-5 text-amber-500" />
              Tugallangan Kurslar
            </h3>
            <div className="space-y-3">
              {courses.filter((c) => c.progress >= 50).slice(0, 4).map((course) => (
                <div key={course.id} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                  <div className="flex justify-between mb-2">
                    <p className="font-medium text-sm text-slate-900 dark:text-white">{course.title}</p>
                    <span className="text-xs text-primary dark:text-sky font-medium">{course.progress}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-primary to-accent rounded-full transition-all"
                      style={{ width: `${course.progress}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </GlassCard>
        </div>
      </PageTransition>
    </DashboardLayout>
  )
}
