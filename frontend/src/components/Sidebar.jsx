// NEXUS AQUA - Sidebar Navigation Component

import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, Waves, Upload, MapPin, Clock,
  Map, AlertTriangle, CheckSquare, BarChart2,
  FileText, Database, Users, Settings, LogOut,
  ShieldCheck, Anchor
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { getRoleLabel, getTimeGreeting } from '../utils/helpers'
import toast from 'react-hot-toast'
import ThemeToggle from './ThemeToggle'

// Role-specific navigation items
const NAV_ITEMS = {
  admin: [
    { icon: LayoutDashboard, label: 'Dashboard',          path: '/admin' },
    { icon: Users,           label: 'User Management',     path: '/admin/users' },
    { icon: Waves,           label: 'All Surveys',         path: '/survey/list' },
    { icon: Map,             label: 'Hotspot Map',         path: '/environment/map' },
    { icon: FileText,        label: 'Reports',             path: '/researcher/reports' },
    { icon: Settings,        label: 'System Stats',        path: '/admin/stats' },
  ],
  survey_operator: [
    { icon: LayoutDashboard, label: 'Dashboard',           path: '/survey' },
    { icon: Upload,          label: 'Upload & Analyze',    path: '/survey/upload' },
    { icon: Waves,           label: 'Surveys Management',  path: '/survey/list' },
    { icon: Clock,           label: 'Survey History',      path: '/survey/history' },
    { icon: MapPin,          label: 'Live Location',       path: '/survey/location' },
  ],
  environment_officer: [
    { icon: LayoutDashboard, label: 'Dashboard',        path: '/environment' },
    { icon: Map,             label: 'Hotspot Map',       path: '/environment/map' },
    { icon: AlertTriangle,   label: 'Cleanup Priority',  path: '/environment/priority' },
    { icon: CheckSquare,     label: 'Action Tracking',   path: '/environment/actions' },
  ],
  marine_expert: [
    { icon: LayoutDashboard, label: 'Dashboard',       path: '/expert' },
    { icon: ShieldCheck,     label: 'Review Queue',    path: '/expert/queue' },
    { icon: CheckSquare,     label: 'My Reviews',      path: '/expert/reviews' },
  ],
  researcher: [
    { icon: LayoutDashboard, label: 'Dashboard',       path: '/researcher' },
    { icon: Database,        label: 'Detection Data',  path: '/researcher/data' },
    { icon: BarChart2,       label: 'Analytics',       path: '/researcher/analytics' },
    { icon: FileText,        label: 'Reports & Export', path: '/researcher/reports' },
  ],
}

export default function Sidebar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const navItems = NAV_ITEMS[user?.role] || []

  const handleLogout = () => {
    logout()
    toast.success('Logged out successfully')
    navigate('/login', { replace: true })
  }

  return (
    <aside className="w-64 min-h-screen bg-navy-900/80 backdrop-blur-sm border-r border-white/5 flex flex-col">
      {/* Logo */}
      <div className="p-6 border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-ocean-500 to-teal-500 rounded-xl flex items-center justify-center shadow-lg">
            <Anchor className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white tracking-tight">NEXUS AQUA</h1>
            <p className="text-xs text-ocean-400">Marine AI System</p>
          </div>
        </div>
      </div>

      {/* User info */}
      <div className="p-4 border-b border-white/5">
        <div className="glass-card p-3 flex items-center gap-3">
          <div className="w-9 h-9 bg-gradient-to-br from-ocean-600 to-teal-600 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
            {user?.name?.[0]?.toUpperCase() || 'U'}
          </div>
          <div className="min-w-0">
            <p className="text-xs text-ocean-400 font-medium leading-none mb-1">{getTimeGreeting()}</p>
            <p className="text-sm font-semibold text-white truncate leading-tight">{user?.name}</p>
            <p className="text-xs text-gray-400 truncate mt-0.5">{getRoleLabel(user?.role)}</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path.split('/').length <= 2}
            className={({ isActive }) =>
              `nav-item ${isActive ? 'nav-item-active' : ''}`
            }
          >
            <item.icon className="w-4 h-4 flex-shrink-0" />
            <span className="text-sm font-medium">{item.label}</span>
          </NavLink>
        ))}
      </nav>

      {/* Footer: Theme Toggle & Logout */}
      <div className="p-4 border-t border-white/5 space-y-2">
        <ThemeToggle variant="sidebar" />
        <button
          onClick={handleLogout}
          className="nav-item w-full text-red-400 hover:text-red-300 hover:bg-red-500/10"
        >
          <LogOut className="w-4 h-4" />
          <span className="text-sm font-medium">Logout</span>
        </button>
      </div>
    </aside>
  )
}
