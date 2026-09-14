// NEXUS AQUA - Authentication Context
// Provides auth state (user, token) and actions (login, logout) globally.
// JWT is stored in localStorage and injected into all API calls.

import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import api from '../utils/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [token, setToken] = useState(null)
  const [loading, setLoading] = useState(true)

  /**
   * Logout: clears token + user from storage and state.
   */
  const logout = useCallback(() => {
    try {
      localStorage.removeItem('nexus_token')
      localStorage.removeItem('nexus_user')
    } catch (e) {
      console.warn('Storage error on logout:', e)
    }
    setToken(null)
    setUser(null)
  }, [])

  /**
   * Login: saves token + user, updates state.
   */
  const login = useCallback((tokenStr, userData) => {
    try {
      localStorage.setItem('nexus_token', tokenStr)
      localStorage.setItem('nexus_user', JSON.stringify(userData))
    } catch (e) {
      console.warn('Storage error on login:', e)
    }
    setToken(tokenStr)
    setUser(userData)
  }, [])

  // ── On mount: restore session from localStorage ────────────────────────────
  useEffect(() => {
    let savedToken = null
    let savedUser = null
    try {
      savedToken = localStorage.getItem('nexus_token')
      savedUser = localStorage.getItem('nexus_user')
    } catch (e) {
      console.warn('Storage access restricted:', e)
    }

    if (savedToken && savedUser) {
      try {
        const parsedUser = JSON.parse(savedUser)
        setToken(savedToken)
        setUser(parsedUser)
        // Verify token is still valid with server
        api.get('/auth/me')
          .then((res) => {
            setUser(res.data)
            try {
              localStorage.setItem('nexus_user', JSON.stringify(res.data))
            } catch (e) {
              console.warn('Failed to update stored user:', e)
            }
          })
          .catch(() => {
            logout()
          })
          .finally(() => setLoading(false))
      } catch {
        logout()
        setLoading(false)
      }
    } else {
      setLoading(false)
    }
  }, [logout])

  /**
   * Check if the current user has a specific role.
   */
  const hasRole = useCallback((...roles) => {
    return user && roles.includes(user.role)
  }, [user])

  const isAuthenticated = !!user && !!token

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout, hasRole, isAuthenticated }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
