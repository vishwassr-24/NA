// NEXUS AQUA - Protected Route Component
// Wraps routes that require authentication + optional role check.
// Server enforces roles too, but this provides client-side UX protection.

import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

/**
 * ProtectedRoute
 * - Redirects unauthenticated users to /login
 * - Optionally checks role(s) and redirects to /unauthorized if not allowed
 *
 * @param {React.ReactNode} children
 * @param {string[]} allowedRoles - optional list of allowed roles
 */
export default function ProtectedRoute({ children, allowedRoles }) {
  const { isAuthenticated, user, loading } = useAuth()
  const location = useLocation()

  // While checking saved session, show nothing (or a splash)
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-navy-950">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-2 border-ocean-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-400 text-sm">Verifying session...</p>
        </div>
      </div>
    )
  }

  // Not authenticated → go to login, remember where they came from
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  // Role check (client-side guard; server always enforces too)
  if (allowedRoles && allowedRoles.length > 0) {
    if (!allowedRoles.includes(user.role)) {
      return <Navigate to="/unauthorized" replace />
    }
  }

  return children
}
