import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

// Autentifikatsiyadan o'tmagan foydalanuvchini /login ga yo'naltiradi.
// Kirgandan so'ng qaytish uchun mo'ljallangan sahifani state orqali uzatadi.
export default function ProtectedRoute({ children }) {
  const { isAuthenticated } = useAuth()
  const location = useLocation()

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  return children
}
