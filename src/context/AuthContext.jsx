import { createContext, useContext, useState, useMemo, useCallback } from 'react'

const AuthContext = createContext()

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const token = localStorage.getItem('pilotkids_token')
    const saved = localStorage.getItem('pilotkids_user')
    if (token && saved) {
      try {
        return JSON.parse(saved)
      } catch {
        return null
      }
    }
    return null
  })

  // eslint-disable-next-line no-unused-vars -- password real API bilan almashtirilganda ishlatiladi
  const login = useCallback((email, password) => {
    // JWT-ready structure — replace with real API call
    const mockUser = {
      id: '1',
      name: 'Sardor Karimov',
      email,
      avatar: null,
      xp: 4850,
      rank: 'Robotics Explorer',
      isPremium: true,
    }
    const mockToken = 'mock_jwt_token_' + Date.now()
    localStorage.setItem('pilotkids_token', mockToken)
    localStorage.setItem('pilotkids_user', JSON.stringify(mockUser))
    setUser(mockUser)
    return { success: true, token: mockToken, user: mockUser }
  }, [])

  // eslint-disable-next-line no-unused-vars -- password real API bilan almashtirilganda ishlatiladi
  const register = useCallback((name, email, password) => {
    const mockUser = {
      id: String(Date.now()),
      name,
      email,
      avatar: null,
      xp: 0,
      rank: 'Junior Engineer',
      isPremium: false,
    }
    const mockToken = 'mock_jwt_token_' + Date.now()
    localStorage.setItem('pilotkids_token', mockToken)
    localStorage.setItem('pilotkids_user', JSON.stringify(mockUser))
    setUser(mockUser)
    return { success: true, token: mockToken, user: mockUser }
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem('pilotkids_token')
    localStorage.removeItem('pilotkids_user')
    setUser(null)
  }, [])

  const getToken = useCallback(() => localStorage.getItem('pilotkids_token'), [])

  const value = useMemo(
    () => ({ user, login, register, logout, getToken, isAuthenticated: !!user }),
    [user, login, register, logout, getToken]
  )

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => useContext(AuthContext)
