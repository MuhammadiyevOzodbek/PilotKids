import { createContext, useContext, useState, useMemo, useCallback, useEffect } from 'react'
import { api, setToken, clearToken, getToken } from '../lib/api'

const AuthContext = createContext()
const USER_KEY = 'pilotkids_user'

export function AuthProvider({ children }) {
  // Boshlang'ich holat localStorage'dan (deterministik — SSR-mos, flash yo'q).
  const [user, setUser] = useState(() => {
    const token = getToken()
    const saved = localStorage.getItem(USER_KEY)
    if (token && saved) {
      try {
        return JSON.parse(saved)
      } catch {
        return null
      }
    }
    return null
  })

  const persist = useCallback((u) => {
    setUser(u)
    if (u) localStorage.setItem(USER_KEY, JSON.stringify(u))
    else localStorage.removeItem(USER_KEY)
  }, [])

  const login = useCallback(
    async (email, password) => {
      const { token, user: u } = await api.post(
        '/api/auth/login',
        { email, password },
        { auth: false }
      )
      setToken(token)
      persist(u)
      return u
    },
    [persist]
  )

  const register = useCallback(
    async (name, email, password) => {
      const { token, user: u } = await api.post(
        '/api/auth/register',
        { name, email, password },
        { auth: false }
      )
      setToken(token)
      persist(u)
      return u
    },
    [persist]
  )

  const logout = useCallback(() => {
    clearToken()
    persist(null)
  }, [persist])

  // Server ma'lumotini yangilash (XP/rank o'zgargach chaqiriladi)
  const refreshUser = useCallback(async () => {
    try {
      const { user: u } = await api.get('/api/auth/me')
      persist(u)
    } catch (e) {
      if (e?.status === 401) logout() // token muddati o'tgan
    }
  }, [persist, logout])

  // Mount'da token bo'lsa /me orqali tekshirish/yangilash. refreshUser barqaror
  // (useCallback) — effekt faqat bir marta ishlaydi. setState refreshUser ichida
  // await'dan KEYIN sodir bo'ladi (sinxron emas), shu bois qoida o'chiriladi.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (getToken()) refreshUser()
  }, [refreshUser])

  const value = useMemo(
    () => ({ user, login, register, logout, refreshUser, isAuthenticated: !!user }),
    [user, login, register, logout, refreshUser]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => useContext(AuthContext)
