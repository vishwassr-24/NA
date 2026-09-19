// NEXUS AQUA - Theme Toggle Component
// Sleek, animated switch between Dark Mode and Light Mode

import React from 'react'
import { Sun, Moon } from 'lucide-react'
import { useTheme } from '../context/ThemeContext'

export default function ThemeToggle({ variant = 'default', className = '' }) {
  const { theme, isDark, toggleTheme } = useTheme()

  if (variant === 'sidebar') {
    return (
      <div className={`p-2 rounded-xl transition-all duration-200 ${className}`}>
        <div className="flex items-center justify-between gap-2 px-2 py-1.5 rounded-lg bg-black/20 dark:bg-black/20 light:bg-slate-200/60 border border-white/5 dark:border-white/5 light:border-slate-300/40">
          <div className="flex items-center gap-2">
            {isDark ? (
              <Moon className="w-4 h-4 text-ocean-400" />
            ) : (
              <Sun className="w-4 h-4 text-amber-500" />
            )}
            <span className="text-xs font-medium text-gray-300 dark:text-gray-300 light:text-slate-700">
              {isDark ? 'Dark Mode' : 'Light Mode'}
            </span>
          </div>

          <button
            type="button"
            onClick={toggleTheme}
            aria-label={`Switch to ${isDark ? 'Light' : 'Dark'} mode`}
            className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-ocean-500/50 bg-ocean-600/40 hover:bg-ocean-600/60"
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-md transition-transform duration-300 flex items-center justify-center ${
                isDark ? 'translate-x-6 bg-ocean-400' : 'translate-x-1 bg-amber-400'
              }`}
            >
              {isDark ? (
                <Moon className="w-2.5 h-2.5 text-navy-950" />
              ) : (
                <Sun className="w-2.5 h-2.5 text-amber-900" />
              )}
            </span>
          </button>
        </div>
      </div>
    )
  }

  if (variant === 'float') {
    return (
      <button
        type="button"
        onClick={toggleTheme}
        aria-label={`Switch to ${isDark ? 'Light' : 'Dark'} mode`}
        className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-3.5 py-2 rounded-full glass-card hover:border-ocean-500/50 shadow-lg backdrop-blur-md transition-all duration-300 hover:scale-105 active:scale-95 group ${className}`}
      >
        <div
          className={`w-6 h-6 rounded-full flex items-center justify-center transition-all duration-300 ${
            isDark
              ? 'bg-ocean-500/20 text-ocean-400 group-hover:bg-ocean-500/30'
              : 'bg-amber-500/20 text-amber-500 group-hover:bg-amber-500/30'
          }`}
        >
          {isDark ? <Moon className="w-3.5 h-3.5" /> : <Sun className="w-3.5 h-3.5" />}
        </div>
        <span className="text-xs font-semibold tracking-wide text-gray-200 dark:text-gray-200 light:text-slate-700">
          {isDark ? 'Dark' : 'Light'}
        </span>
      </button>
    )
  }

  // Default compact button
  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={`Switch to ${isDark ? 'Light' : 'Dark'} mode`}
      title={`Switch to ${isDark ? 'Light' : 'Dark'} mode`}
      className={`p-2 rounded-xl glass-card hover:border-ocean-500/40 text-gray-300 hover:text-white transition-all duration-200 active:scale-95 ${className}`}
    >
      {isDark ? (
        <Sun className="w-4 h-4 text-amber-400 hover:text-amber-300 transition-colors" />
      ) : (
        <Moon className="w-4 h-4 text-ocean-500 hover:text-ocean-600 transition-colors" />
      )}
    </button>
  )
}
