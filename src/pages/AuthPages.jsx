import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { Mail, User } from '../lib/icons'
import AuthLayout from '../components/layout/AuthLayout'
import Button from '../components/ui/Button'
import PageTransition from '../components/ui/PageTransition'
import { FormField, PasswordField } from '../components/ui/FormField'
import { useAuth } from '../context/AuthContext'

function SocialButtons() {
  return (
    <div className="grid grid-cols-2 gap-3 mb-6">
      <button type="button" aria-label="Google orqali kirish" className="flex items-center justify-center gap-2 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-sm font-medium text-slate-700 dark:text-slate-300">
        <svg className="w-5 h-5" viewBox="0 0 24 24" aria-hidden="true"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
        Google
      </button>
      <button type="button" aria-label="GitHub orqali kirish" className="flex items-center justify-center gap-2 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-sm font-medium text-slate-700 dark:text-slate-300">
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/></svg>
        GitHub
      </button>
    </div>
  )
}

function OrDivider() {
  return (
    <div className="relative mb-6">
      <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-200 dark:border-slate-700" /></div>
      <div className="relative flex justify-center text-sm"><span className="px-4 bg-slate-50 dark:bg-slate-950 text-slate-500 dark:text-slate-400">yoki</span></div>
    </div>
  )
}

function FormError({ children }) {
  if (!children) return null
  return (
    <div role="alert" className="p-3 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm">
      {children}
    </div>
  )
}

export function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const from = location.state?.from || '/dashboard'

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (!email || !password) {
      setError('Barcha maydonlarni to\'ldiring')
      return
    }
    if (!/\S+@\S+\.\S+/.test(email)) {
      setError('Email noto\'g\'ri formatda')
      return
    }
    setLoading(true)
    try {
      await login(email, password)
      navigate(from, { replace: true })
    } catch (err) {
      setError(err?.message || 'Kirishda xatolik yuz berdi')
    } finally {
      setLoading(false)
    }
  }

  return (
    <PageTransition>
      <AuthLayout title="Xush kelibsiz!" subtitle="Hisobingizga kiring">
        <SocialButtons />
        <OrDivider />

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <FormError>{error}</FormError>

          <FormField
            id="login-email"
            label="Email"
            type="email"
            icon={Mail}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="email@example.com"
            autoComplete="email"
            required
          />

          <PasswordField
            id="login-password"
            label="Parol"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
          />

          <div className="flex justify-end">
            <Link to="/forgot-password" className="text-sm text-primary dark:text-sky hover:underline">Parolni unutdingizmi?</Link>
          </div>

          <Button type="submit" className="w-full" size="lg" disabled={loading}>
            {loading ? 'Kirish...' : 'Kirish'}
          </Button>
        </form>

        <p className="text-center text-sm text-slate-500 dark:text-slate-400 mt-6">
          Hisobingiz yo'qmi?{' '}
          <Link to="/register" className="text-primary dark:text-sky font-semibold hover:underline">Ro'yxatdan o'ting</Link>
        </p>
      </AuthLayout>
    </PageTransition>
  )
}

export function Register() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { register } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (!name || !email || !password || !confirmPassword) {
      setError('Barcha maydonlarni to\'ldiring')
      return
    }
    if (!/\S+@\S+\.\S+/.test(email)) {
      setError('Email noto\'g\'ri formatda')
      return
    }
    if (password.length < 6) {
      setError('Parol kamida 6 ta belgidan iborat bo\'lishi kerak')
      return
    }
    if (password !== confirmPassword) {
      setError('Parollar mos kelmadi')
      return
    }
    setLoading(true)
    try {
      await register(name, email, password)
      navigate('/dashboard', { replace: true })
    } catch (err) {
      setError(err?.message || 'Ro\'yxatdan o\'tishda xatolik')
    } finally {
      setLoading(false)
    }
  }

  return (
    <PageTransition>
      <AuthLayout title="Ro'yxatdan o'ting" subtitle="Kelajak muhandisi bo'ling">
        <SocialButtons />
        <OrDivider />

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <FormError>{error}</FormError>

          <FormField
            id="register-name"
            label="Ism"
            icon={User}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ismingiz"
            autoComplete="name"
            required
          />

          <FormField
            id="register-email"
            label="Email"
            type="email"
            icon={Mail}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="email@example.com"
            autoComplete="email"
            required
          />

          <PasswordField
            id="register-password"
            label="Parol"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            required
          />

          <PasswordField
            id="register-confirm-password"
            label="Parolni tasdiqlang"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            autoComplete="new-password"
            required
          />

          <Button type="submit" className="w-full" size="lg" magnetic disabled={loading}>
            {loading ? 'Yuklanmoqda...' : 'Ro\'yxatdan o\'tish'}
          </Button>
        </form>

        <p className="text-center text-sm text-slate-500 dark:text-slate-400 mt-6">
          Hisobingiz bormi?{' '}
          <Link to="/login" className="text-primary dark:text-sky font-semibold hover:underline">Kirish</Link>
        </p>
      </AuthLayout>
    </PageTransition>
  )
}

export function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = (e) => {
    e.preventDefault()
    setError('')
    if (!email || !/\S+@\S+\.\S+/.test(email)) {
      setError('To\'g\'ri email kiriting')
      return
    }
    setSent(true)
  }

  return (
    <PageTransition>
      <AuthLayout title="Parolni tiklash" subtitle="Email manzilingizni kiriting">
        {sent ? (
          <div className="text-center p-6 rounded-2xl bg-emerald-50 dark:bg-emerald-900/20" role="status">
            <p className="text-emerald-700 dark:text-emerald-400 font-medium mb-2">Xat yuborildi!</p>
            <p className="text-sm text-slate-500 dark:text-slate-400">Parolni tiklash havolasi {email} manziliga yuborildi.</p>
            <Link to="/login" className="inline-block mt-4 text-primary dark:text-sky font-semibold hover:underline text-sm">
              Kirish sahifasiga qaytish
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <FormError>{error}</FormError>
            <FormField
              id="forgot-email"
              label="Email"
              type="email"
              icon={Mail}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@example.com"
              autoComplete="email"
              required
            />
            <Button type="submit" className="w-full" size="lg">Havolani yuborish</Button>
            <p className="text-center text-sm text-slate-500 dark:text-slate-400">
              <Link to="/login" className="text-primary dark:text-sky hover:underline">Kirish sahifasiga qaytish</Link>
            </p>
          </form>
        )}
      </AuthLayout>
    </PageTransition>
  )
}
