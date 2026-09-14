// NEXUS AQUA - Login Page (Entry Point)
// This is the FIRST page users see. No dashboard before authentication.

import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Anchor, Eye, EyeOff, Wifi, AlertCircle, Clock, Calendar } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuth } from '../context/AuthContext'
import api from '../utils/api'
import { getTimeGreeting } from '../utils/helpers'

const ROLE_DASHBOARDS = {
  admin: '/admin',
  survey_operator: '/survey',
  environment_officer: '/environment',
  marine_expert: '/expert',
  researcher: '/researcher',
}

export default function Login() {
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [showPwd, setShowPwd] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [currentTime, setCurrentTime] = useState(new Date())

  const { login, isAuthenticated, user } = useAuth()
  const navigate = useNavigate()

  // Real-time ticking clock for live date & time
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  // If already logged in → redirect to role dashboard
  useEffect(() => {
    if (isAuthenticated && user) {
      navigate(ROLE_DASHBOARDS[user.role] || '/survey', { replace: true })
    }
  }, [isAuthenticated, user, navigate])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!identifier.trim() || !password) {
      setError('Please enter your credentials.')
      return
    }

    setLoading(true)
    try {
      const res = await api.post('/auth/login', { identifier, password })
      const { access_token, user: userData } = res.data

      const greeting = getTimeGreeting()
      login(access_token, userData)
      toast.success(`${greeting}, ${userData.name}! Welcome to NEXUS AQUA.`, {
        icon: '🌊',
        duration: 4000,
      })

      // Redirect to role-specific dashboard
      const dest = ROLE_DASHBOARDS[userData.role] || '/survey'
      navigate(dest, { replace: true })
    } catch (err) {
      const detail = err.response?.data?.detail || 'Login failed. Please try again.'
      setError(detail)
      toast.error(detail)
    } finally {
      setLoading(false)
    }
  }


  return (
    <div className="min-h-screen bg-ocean-gradient flex items-center justify-center p-4 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-ocean-500/10 rounded-full blur-3xl animate-pulse-slow" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-teal-500/10 rounded-full blur-3xl animate-pulse-slow" style={{ animationDelay: '1.5s' }} />
        {/* Sonar rings */}
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 border border-ocean-500/10 rounded-full"
            style={{
              width: `${i * 200}px`,
              height: `${i * 200}px`,
              animation: `pulse ${2 + i}s ease-in-out infinite`,
              animationDelay: `${i * 0.5}s`,
            }}
          />
        ))}
      </div>

      <div className="w-full max-w-md relative z-10">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-ocean-500 to-teal-500 rounded-2xl shadow-2xl shadow-ocean-500/30 mb-4 animate-glow">
            <Anchor className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-white mb-2 tracking-tight">
            NEXUS <span className="text-ocean-400">AQUA</span>
          </h1>
          <p className="text-gray-400 text-sm leading-relaxed mb-3">
            AI-Powered Marine Debris & Sonar Intelligence System
          </p>

          {/* Live Date & Time Display */}
          <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-2xl bg-navy-900/60 border border-ocean-500/30 backdrop-blur-md shadow-lg shadow-ocean-950/50">
            <div className="flex items-center gap-1.5 text-xs text-ocean-300 font-medium">
              <Calendar className="w-3.5 h-3.5 text-ocean-400" />
              <span>
                {currentTime.toLocaleDateString(undefined, {
                  weekday: 'short',
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })}
              </span>
            </div>
            <span className="text-white/20">|</span>
            <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-white">
              <Clock className="w-3.5 h-3.5 text-teal-400 animate-pulse" />
              <span>
                {currentTime.toLocaleTimeString(undefined, {
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit',
                  hour12: true,
                })}
              </span>
            </div>
          </div>
        </div>

        {/* Login Card */}
        <div className="glass-card p-8 shadow-2xl">
          <h2 className="text-xl font-bold text-white mb-6">Sign In</h2>

          {/* Error */}
          {error && (
            <div className="flex items-start gap-3 bg-red-500/10 border border-red-500/30 rounded-xl p-4 mb-6">
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Identifier */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Email or User ID
              </label>
              <input
                type="text"
                className="input-field"
                placeholder="Enter your email or User ID"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                autoComplete="username"
                autoFocus
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPwd ? 'text' : 'password'}
                  className="input-field pr-12"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPwd(!showPwd)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-200 transition-colors"
                >
                  {showPwd ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="btn-ocean w-full flex items-center justify-center gap-2 mt-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Authenticating...
                </>
              ) : (
                <>
                  <Wifi className="w-4 h-4" />
                  Sign In to System
                </>
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-gray-500 text-sm">
              New to NEXUS AQUA?{' '}
              <Link to="/register" className="text-ocean-400 hover:text-ocean-300 font-medium transition-colors">
                Register here
              </Link>
            </p>
          </div>
        </div>



        <p className="text-center text-xs text-gray-500 mt-4">
          © {currentTime.getFullYear()} NEXUS AQUA · All rights reserved
        </p>
      </div>
    </div>
  )
}
