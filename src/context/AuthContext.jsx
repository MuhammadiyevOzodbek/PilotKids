import { createContext, useContext, useState } from 'react'

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

  const login = (email, password) => {
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
  }

  const register = (name, email, password) => {
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
  }

  const logout = () => {
    localStorage.removeItem('pilotkids_token')
    localStorage.removeItem('pilotkids_user')
    setUser(null)
  }

  const getToken = () => localStorage.getItem('pilotkids_token')

  return (
    <AuthContext.Provider value={{ user, login, register, logout, getToken, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
