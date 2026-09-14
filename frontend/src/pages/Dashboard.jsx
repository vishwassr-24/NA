// NEXUS AQUA - Role-Based Dashboard Dispatcher
// Automatically redirects authenticated users to their specific role dashboard

import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Loader2 } from 'lucide-react'

const ROLE_ROUTES = {
  admin: '/admin',
  survey_operator: '/survey',
  environment_officer: '/environment',
  marine_expert: '/expert',
  researcher: '/researcher',
}

export default function Dashboard() {
  const { user, isAuthenticated, loading } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (!loading) {
      if (!isAuthenticated || !user) {
        navigate('/login', { replace: true })
      } else {
        const destination = ROLE_ROUTES[user.role] || '/login'
        navigate(destination, { replace: true })
      }
    }
  }, [user, isAuthenticated, loading, navigate])

  return (
    <div className="min-h-screen flex items-center justify-center bg-navy-950">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-2 border-ocean-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-gray-400 text-sm">Redirecting to your role dashboard...</p>
      </div>
    </div>
  )
}
