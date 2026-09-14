// NEXUS AQUA - Unauthorized Access Warning Page

import { Link, useNavigate } from 'react-router-dom'
import { ShieldAlert, ArrowLeft } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

export default function Unauthorized() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const homePath = user?.role === 'admin' ? '/admin' :
    user?.role === 'survey_operator' ? '/survey' :
    user?.role === 'environment_officer' ? '/environment' :
    user?.role === 'marine_expert' ? '/expert' :
    user?.role === 'researcher' ? '/researcher' : '/login'

  return (
    <div className="min-h-screen bg-ocean-gradient flex items-center justify-center p-4">
      <div className="glass-card max-w-md w-full p-8 text-center border-red-500/30">
        <div className="w-16 h-16 rounded-full bg-red-500/20 border border-red-500/40 flex items-center justify-center mx-auto mb-4">
          <ShieldAlert className="w-8 h-8 text-red-400" />
        </div>
        <h1 className="text-2xl font-bold text-white mb-2">Access Restricted</h1>
        <p className="text-sm text-gray-300 mb-6">
          Strict Role-Based Access Control (RBAC) is enforced. You do not have permissions to view this module.
        </p>
        <div className="space-y-3">
          <button
            onClick={() => navigate(homePath)}
            className="btn-ocean w-full flex items-center justify-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" /> Return to My Dashboard
          </button>
        </div>
      </div>
    </div>
  )
}
