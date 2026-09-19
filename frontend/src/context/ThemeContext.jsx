// NEXUS AQUA - Theme Context
// Provides Light Mode & Dark Mode state with instant localStorage persistence

import React, { createContext, useContext, useState, useEffect } from 'react'

const ThemeContext = createContext()

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(() => {
    try {
      const savedTheme = localStorage.getItem('nexus-aqua-theme')
      if (savedTheme === 'light' || savedTheme === 'dark') {
        return savedTheme
      }
      // Check system preference
      if (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) {
        return 'light'
      }
    } catch {
      // Fallback
    }
    return 'dark'
  })

  const applyTheme = (newTheme) => {
    const root = document.documentElement
    root.classList.remove('light', 'dark')
    root.classList.add(newTheme)
    root.setAttribute('data-theme', newTheme)

    // Update browser color-scheme meta tag if present
    const meta = document.querySelector('meta[name="color-scheme"]')
    if (meta) {
      meta.content = newTheme
    }

    try {
      localStorage.setItem('nexus-aqua-theme', newTheme)
    } catch (e) {
      console.warn('Failed to save theme in localStorage', e)
    }
  }

  useEffect(() => {
    applyTheme(theme)
  }, [theme])

  const toggleTheme = () => {
    setThemeState((prev) => (prev === 'dark' ? 'light' : 'dark'))
  }

  const setTheme = (newTheme) => {
    if (newTheme === 'dark' || newTheme === 'light') {
      setThemeState(newTheme)
    }
  }

  return (
    <ThemeContext.Provider
      value={{
        theme,
        isDark: theme === 'dark',
        isLight: theme === 'light',
        toggleTheme,
        setTheme,
      }}
    >
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}
