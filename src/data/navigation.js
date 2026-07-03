import {
  LayoutDashboard, BookOpen, Trophy, Award, CreditCard, Settings,
} from '../lib/icons'

// Dashboard sidebar'i uchun to'liq menyu (bitta manba — Sidebar va DashboardLayout shu yerdan oladi)
export const dashboardMenu = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Boshqaruv' },
  { to: '/courses', icon: BookOpen, label: 'Kurslar' },
  { to: '/ranking', icon: Trophy, label: 'Reyting' },
  { to: '/dashboard#certificates', icon: Award, label: 'Sertifikatlar' },
  { to: '/subscription', icon: CreditCard, label: 'To\'lovlar' },
  { to: '/dashboard#settings', icon: Settings, label: 'Sozlamalar' },
]

// Mobil pastki navigatsiya uchun asosiy bo'limlar
export const mobileNav = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Boshqaruv' },
  { to: '/courses', icon: BookOpen, label: 'Kurslar' },
  { to: '/ranking', icon: Trophy, label: 'Reyting' },
]

// Landing sahifa navbar havolalari
export const landingLinks = [
  { to: '/#about', label: 'Biz haqimizda' },
  { to: '/#benefits', label: 'Afzalliklar' },
  { to: '/#roadmap', label: 'Yo\'l xaritasi' },
  { to: '/#pricing', label: 'Narxlar' },
  { to: '/courses', label: 'Kurslar', isRoute: true },
]
