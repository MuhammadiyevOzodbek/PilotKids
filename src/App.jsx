import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import { ThemeProvider } from './context/ThemeContext'
import { AuthProvider } from './context/AuthContext'
import CustomCursor from './components/ui/CustomCursor'
import LandingPage from './pages/LandingPage'
import Dashboard from './pages/Dashboard'
import Ranking from './pages/Ranking'
import Courses from './pages/Courses'
import Subscription from './pages/Subscription'
import NotFound from './pages/NotFound'
import { Login, Register, ForgotPassword } from './pages/AuthPages'

function AnimatedRoutes() {
  const location = useLocation()

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/ranking" element={<Ranking />} />
        <Route path="/courses" element={<Courses />} />
        <Route path="/subscription" element={<Subscription />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </AnimatePresence>
  )
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <CustomCursor />
          <AnimatedRoutes />
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  )
}
