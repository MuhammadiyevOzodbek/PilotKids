import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ThemeProvider } from './context/ThemeContext'
import { AuthProvider } from './context/AuthContext'
import ProtectedRoute from './components/layout/ProtectedRoute'
import PageLoader from './components/ui/PageLoader'

// API so'rovlari uchun yagona QueryClient — kesh, retry, loading/error boshqaruvi.
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 30_000,
    },
  },
})

// Route-level code splitting — har bir sahifa alohida chunk (recharts, three va h.k.
// faqat kerak bo'lgan sahifada yuklanadi, asosiy bundle sezilarli kichrayadi).
const LandingPage = lazy(() => import('./pages/LandingPage'))
const Dashboard = lazy(() => import('./pages/Dashboard'))
const Ranking = lazy(() => import('./pages/Ranking'))
const Courses = lazy(() => import('./pages/Courses'))
const Subscription = lazy(() => import('./pages/Subscription'))
const NotFound = lazy(() => import('./pages/NotFound'))
const Login = lazy(() => import('./pages/AuthPages').then((m) => ({ default: m.Login })))
const Register = lazy(() => import('./pages/AuthPages').then((m) => ({ default: m.Register })))
const ForgotPassword = lazy(() => import('./pages/AuthPages').then((m) => ({ default: m.ForgotPassword })))

function AnimatedRoutes() {
  const location = useLocation()

  return (
    <AnimatePresence mode="wait">
      <Suspense fallback={<PageLoader />}>
        <Routes location={location} key={location.pathname}>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/subscription" element={<Subscription />} />
          <Route
            path="/dashboard"
            element={<ProtectedRoute><Dashboard /></ProtectedRoute>}
          />
          <Route
            path="/ranking"
            element={<ProtectedRoute><Ranking /></ProtectedRoute>}
          />
          <Route
            path="/courses"
            element={<ProtectedRoute><Courses /></ProtectedRoute>}
          />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </AnimatePresence>
  )
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <BrowserRouter>
            <AnimatedRoutes />
          </BrowserRouter>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  )
}
