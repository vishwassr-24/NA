// NEXUS AQUA - Administrator Module
// Handles: Everything + User Management + Role Approvals + System Stats + Demo Seeder

import { useState, useEffect } from 'react'
import { Routes, Route, Link } from 'react-router-dom'
import {
  Users, Shield, CheckCircle, XCircle, AlertTriangle,
  Loader2, RefreshCw, Trash2, Edit2, Database, BarChart2,
  Waves, Map, FileText, Check, ShieldAlert
} from 'lucide-react'
import toast from 'react-hot-toast'
import DashboardLayout from '../components/DashboardLayout'
import { useAuth } from '../context/AuthContext'
import api from '../utils/api'
import { formatDate, getRoleLabel, getRoleBadgeClass, getTimeGreeting } from '../utils/helpers'

// ─── Admin Overview Dashboard ────────────────────────────────────────────────
function AdminDashboard() {
  const { user } = useAuth()
  const [stats, setStats] = useState(null)
  const [pendingUsers, setPendingUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [seeding, setSeeding] = useState(false)

  const loadData = () => {
    setLoading(true)
    Promise.all([
      api.get('/admin/stats'),
      api.get('/admin/users/pending')
    ])
      .then(([statsRes, pendingRes]) => {
        setStats(statsRes.data)
        setPendingUsers(pendingRes.data)
      })
      .catch(() => toast.error('Failed to load system metrics'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    loadData()
  }, [])

  const approveUser = async (userId) => {
    try {
      await api.patch(`/admin/users/${userId}/status`, { status: 'active' })
      toast.success('User account approved and activated!')
      loadData()
    } catch {
      toast.error('Failed to approve user')
    }
  }

  const rejectUser = async (userId) => {
    if (!confirm('Reject and delete this registration?')) return
    try {
      await api.delete(`/admin/users/${userId}`)
      toast.success('User registration rejected')
      loadData()
    } catch {
      toast.error('Failed to reject user')
    }
  }

  const handleSeedData = async () => {
    setSeeding(true)
    try {
      const res = await api.post('/admin/seed')
      toast.success(res.data.message || 'Demo data seeded successfully!')
      loadData()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Seeding failed')
    } finally {
      setSeeding(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Shield className="w-6 h-6 text-ocean-400" />
            System Administration & Governance
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            <strong className="text-ocean-400 font-semibold">{getTimeGreeting()}</strong>, {user?.name}! Global system administration & governance console.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleSeedData}
            disabled={seeding}
            className="btn-teal text-sm py-2 px-4 flex items-center gap-2"
          >
            {seeding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Database className="w-4 h-4" />}
            Seed System Demo Data
          </button>
          <button onClick={loadData} className="btn-ghost text-sm py-2 px-3 flex items-center gap-1">
            <RefreshCw className="w-4 h-4" /> Refresh
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-ocean-400 animate-spin" />
        </div>
      ) : (
        <>
          {/* Top Level Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="stat-card">
              <div className="w-10 h-10 bg-purple-500/20 rounded-xl flex items-center justify-center mb-1">
                <Users className="w-5 h-5 text-purple-400" />
              </div>
              <p className="text-2xl font-bold text-white">{stats?.users?.total ?? 0}</p>
              <p className="text-sm text-gray-400">Total Registered Users</p>
            </div>

            <div className="stat-card">
              <div className="w-10 h-10 bg-yellow-500/20 rounded-xl flex items-center justify-center mb-1">
                <ShieldAlert className="w-5 h-5 text-yellow-400" />
              </div>
              <p className="text-2xl font-bold text-yellow-400">{stats?.users?.pending_approval ?? 0}</p>
              <p className="text-sm text-gray-400">Pending Approvals</p>
            </div>

            <div className="stat-card">
              <div className="w-10 h-10 bg-ocean-500/20 rounded-xl flex items-center justify-center mb-1">
                <Waves className="w-5 h-5 text-ocean-400" />
              </div>
              <p className="text-2xl font-bold text-white">{stats?.surveys?.total ?? 0}</p>
              <p className="text-sm text-gray-400">Total Surveys Tracked</p>
            </div>

            <div className="stat-card">
              <div className="w-10 h-10 bg-teal-500/20 rounded-xl flex items-center justify-center mb-1">
                <Database className="w-5 h-5 text-teal-400" />
              </div>
              <p className="text-2xl font-bold text-white">{stats?.detections?.total ?? 0}</p>
              <p className="text-sm text-gray-400">AI Debris Detections</p>
            </div>
          </div>

          {/* Pending Role Approvals */}
          <div className="glass-card p-6 border-yellow-500/30">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <ShieldAlert className="w-5 h-5 text-yellow-400" />
                  Sensitive Role Approvals Queue
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  Registrations for Admin and Marine Expert roles require explicit administrator sign-off
                </p>
              </div>
              <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-yellow-500/20 text-yellow-300 border border-yellow-500/40">
                {pendingUsers.length} Pending
              </span>
            </div>

            {pendingUsers.length === 0 ? (
              <div className="text-center py-6 text-gray-400 text-sm">
                No pending registrations requiring role clearance.
              </div>
            ) : (
              <div className="space-y-3">
                {pendingUsers.map((pUser) => (
                  <div key={pUser.id} className="p-4 rounded-xl bg-white/5 border border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-3">
                        <span className="font-semibold text-white">{pUser.name}</span>
                        <span className="text-xs font-mono text-ocean-400">@{pUser.user_id}</span>
                        <span className={getRoleBadgeClass(pUser.role)}>{getRoleLabel(pUser.role)}</span>
                      </div>
                      <p className="text-xs text-gray-400 mt-1">
                        Email: {pUser.email} · Registered on {formatDate(pUser.created_at)}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => approveUser(pUser.id)}
                        className="btn-teal text-xs py-1.5 px-3 flex items-center gap-1"
                      >
                        <Check className="w-3.5 h-3.5" /> Approve & Activate
                      </button>
                      <button
                        onClick={() => rejectUser(pUser.id)}
                        className="btn-ghost text-xs py-1.5 px-3 text-red-400 hover:text-red-300 hover:bg-red-500/10 flex items-center gap-1"
                      >
                        <XCircle className="w-3.5 h-3.5" /> Reject
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick Cross-Role Navigation Links for Admin */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Link to="/admin/users" className="glass-card p-6 hover:bg-white/10 transition-all block">
              <div className="flex items-center gap-3 mb-2">
                <Users className="w-5 h-5 text-purple-400" />
                <h4 className="font-bold text-white">Full User Management</h4>
              </div>
              <p className="text-xs text-gray-400">
                View all accounts, toggle account suspensions, and re-assign system permissions.
              </p>
            </Link>

            <Link to="/environment/map" className="glass-card p-6 hover:bg-white/10 transition-all block">
              <div className="flex items-center gap-3 mb-2">
                <Map className="w-5 h-5 text-ocean-400" />
                <h4 className="font-bold text-white">Pollution Hotspot Map</h4>
              </div>
              <p className="text-xs text-gray-400">
                Direct administrative oversight of geospatial marine debris fields.
              </p>
            </Link>

            <Link to="/researcher/reports" className="glass-card p-6 hover:bg-white/10 transition-all block">
              <div className="flex items-center gap-3 mb-2">
                <FileText className="w-5 h-5 text-teal-400" />
                <h4 className="font-bold text-white">Data Export & Reports</h4>
              </div>
              <p className="text-xs text-gray-400">
                Download comprehensive PDF audit logs and CSV telemetry datasets.
              </p>
            </Link>
          </div>
        </>
      )}
    </div>
  )
}

// ─── Full User Management Table ──────────────────────────────────────────────
function UserManagement() {
  const { user: currentUser } = useAuth()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  const fetchUsers = () => {
    setLoading(true)
    api.get('/admin/users')
      .then(res => setUsers(res.data))
      .catch(() => toast.error('Failed to load users list'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    fetchUsers()
  }, [])

  const handleStatusToggle = async (targetUser) => {
    if (targetUser.id === currentUser.id) {
      toast.error('Cannot suspend your own superadmin account')
      return
    }
    const newStatus = targetUser.status === 'active' ? 'suspended' : 'active'
    try {
      await api.patch(`/admin/users/${targetUser.id}/status`, { status: newStatus })
      toast.success(`User @${targetUser.user_id} set to ${newStatus}`)
      fetchUsers()
    } catch {
      toast.error('Failed to update status')
    }
  }

  const handleRoleChange = async (targetUser, newRole) => {
    if (targetUser.id === currentUser.id) {
      toast.error('Cannot change your own role')
      return
    }
    try {
      await api.patch(`/admin/users/${targetUser.id}/role`, { role: newRole })
      toast.success(`User @${targetUser.user_id} role changed to ${newRole}`)
      fetchUsers()
    } catch {
      toast.error('Failed to update user role')
    }
  }

  const handleDelete = async (targetUser) => {
    if (targetUser.id === currentUser.id) {
      toast.error('Cannot delete your own account')
      return
    }
    if (!confirm(`Permanently delete @${targetUser.user_id}?`)) return
    try {
      await api.delete(`/admin/users/${targetUser.id}`)
      toast.success('User deleted')
      fetchUsers()
    } catch {
      toast.error('Failed to delete user')
    }
  }

  const filtered = users.filter(u =>
    u.name.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase()) ||
    u.user_id.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">User Directory & RBAC Control</h1>
          <p className="text-gray-400 text-sm mt-1">Manage credentials, role assignments, and account activation</p>
        </div>
        <button onClick={fetchUsers} className="btn-ghost text-sm py-2 px-3 flex items-center gap-1">
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>

      <div className="glass-card p-4">
        <input
          type="text"
          placeholder="Filter by name, email, or user ID..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="input-field"
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 text-ocean-400 animate-spin" />
        </div>
      ) : (
        <div className="glass-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-white/5 border-b border-white/10 text-xs text-gray-400 uppercase">
                <tr>
                  <th className="p-4">User</th>
                  <th className="p-4">Email</th>
                  <th className="p-4">Assigned Role</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Registered</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filtered.map((u) => (
                  <tr key={u.id} className="hover:bg-white/5 transition-colors">
                    <td className="p-4">
                      <p className="font-semibold text-white">{u.name}</p>
                      <p className="text-xs font-mono text-ocean-400">@{u.user_id}</p>
                    </td>
                    <td className="p-4 text-gray-300">{u.email}</td>
                    <td className="p-4">
                      <select
                        value={u.role}
                        disabled={u.id === currentUser.id}
                        onChange={(e) => handleRoleChange(u, e.target.value)}
                        className="bg-white/10 text-xs rounded-lg px-2.5 py-1 text-white border border-white/10 focus:outline-none disabled:opacity-50"
                      >
                        <option value="admin" className="bg-navy-900">Administrator</option>
                        <option value="survey_operator" className="bg-navy-900">Survey Operator</option>
                        <option value="environment_officer" className="bg-navy-900">Environment Officer</option>
                        <option value="marine_expert" className="bg-navy-900">Marine Expert</option>
                        <option value="researcher" className="bg-navy-900">Researcher</option>
                      </select>
                    </td>
                    <td className="p-4">
                      <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                        u.status === 'active' ? 'bg-green-500/20 text-green-300' :
                        u.status === 'pending' ? 'bg-yellow-500/20 text-yellow-300' :
                        'bg-red-500/20 text-red-300'
                      }`}>
                        {u.status}
                      </span>
                    </td>
                    <td className="p-4 text-xs text-gray-400">{formatDate(u.created_at)}</td>
                    <td className="p-4 text-right space-x-2">
                      {u.id !== currentUser.id && (
                        <>
                          <button
                            onClick={() => handleStatusToggle(u)}
                            className="text-xs text-yellow-400 hover:text-yellow-300 p-1"
                            title={u.status === 'active' ? 'Suspend user' : 'Activate user'}
                          >
                            {u.status === 'active' ? 'Suspend' : 'Activate'}
                          </button>
                          <button
                            onClick={() => handleDelete(u)}
                            className="text-xs text-red-400 hover:text-red-300 p-1"
                            title="Delete user"
                          >
                            <Trash2 className="w-4 h-4 inline" />
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── System Stats Sub-view ───────────────────────────────────────────────────
function SystemStatsView() {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/admin/stats')
      .then(res => setStats(res.data))
      .catch(() => toast.error('Failed to load system metrics'))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white">System Infrastructure & Analytics</h1>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-ocean-400 animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="glass-card p-6">
            <h3 className="font-bold text-white text-lg mb-4">User Role Distribution</h3>
            <div className="space-y-3">
              {stats?.users?.by_role && Object.entries(stats.users.by_role).map(([role, count]) => (
                <div key={role} className="flex items-center justify-between p-3 rounded-lg bg-white/5">
                  <span className="text-sm font-medium text-gray-300">{getRoleLabel(role)}</span>
                  <span className="font-mono text-ocean-400 font-bold">{count}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="glass-card p-6">
            <h3 className="font-bold text-white text-lg mb-4">Storage & Processing Status</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-lg bg-white/5">
                <span className="text-sm text-gray-300">Total Scans Stored</span>
                <span className="font-mono text-white font-bold">{stats?.images?.total ?? 0}</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-white/5">
                <span className="text-sm text-gray-300">Scans Successfully Processed</span>
                <span className="font-mono text-green-400 font-bold">{stats?.images?.processed ?? 0}</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-white/5">
                <span className="text-sm text-gray-300">Hotspots Identified</span>
                <span className="font-mono text-yellow-400 font-bold">{stats?.hotspots?.total ?? 0}</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-white/5">
                <span className="text-sm text-gray-300">Expert Validations</span>
                <span className="font-mono text-teal-400 font-bold">{stats?.expert_reviews?.total ?? 0}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Admin Parent Route Wrapper ──────────────────────────────────────────────
export default function Admin() {
  return (
    <DashboardLayout>
      <Routes>
        <Route index element={<AdminDashboard />} />
        <Route path="users" element={<UserManagement />} />
        <Route path="stats" element={<SystemStatsView />} />
      </Routes>
    </DashboardLayout>
  )
}
