// NEXUS AQUA - Environment Officer Dashboard + Modules
// Handles: Hotspot Map (Leaflet), Cleanup Priority, Action Tracking, Status

import { useState, useEffect } from 'react'
import { Routes, Route, Link } from 'react-router-dom'
import { MapContainer, TileLayer, Marker, Popup, CircleMarker } from 'react-leaflet'
import L from 'leaflet'
import {
  Map, AlertTriangle, CheckSquare, BarChart2, Plus,
  Loader2, Filter, RefreshCw, Layers, CheckCircle2, Clock, AlertCircle
} from 'lucide-react'
import toast from 'react-hot-toast'
import DashboardLayout from '../components/DashboardLayout'
import { useAuth } from '../context/AuthContext'
import api from '../utils/api'
import {
  getRiskBadgeClass, getRiskColor, formatDate, getTimeGreeting
} from '../utils/helpers'

// Fix Leaflet's default icon path issues in modern bundlers
try {
  if (typeof window !== 'undefined' && L?.Icon?.Default) {
    delete L.Icon.Default.prototype._getIconUrl
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
      iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
      shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    })
  }
} catch (err) {
  console.warn('Leaflet icon configuration notice:', err)
}


// Custom Leaflet DivIcon with risk color
function createRiskMarkerIcon(risk) {
  const color = getRiskColor(risk)
  return L.divIcon({
    className: 'custom-map-pin',
    html: `
      <div style="
        background-color: ${color};
        width: 22px;
        height: 22px;
        border-radius: 50%;
        border: 2px solid white;
        box-shadow: 0 0 12px ${color};
        display: flex;
        align-items: center;
        justify-content: center;
      ">
        <div style="width: 6px; height: 6px; background: white; border-radius: 50%;"></div>
      </div>
    `,
    iconSize: [22, 22],
    iconAnchor: [11, 11],
    popupAnchor: [0, -11],
  })
}

// ─── Environment Overview Dashboard ──────────────────────────────────────────
function EnvironmentDashboard() {
  const { user } = useAuth()
  const [stats, setStats] = useState(null)
  const [recentHotspots, setRecentHotspots] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      api.get('/environment/stats'),
      api.get('/environment/hotspots')
    ])
      .then(([statsRes, hotspotsRes]) => {
        setStats(statsRes.data)
        setRecentHotspots(hotspotsRes.data.slice(0, 5))
      })
      .catch(() => toast.error('Failed to load dashboard metrics'))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Environment Officer Portal</h1>
          <p className="text-gray-400 text-sm mt-1"><strong className="text-ocean-400 font-semibold">{getTimeGreeting()}</strong>, Officer {user?.name}! Marine pollution tracking & cleanup coordination.</p>
        </div>
        <div className="flex gap-3">
          <Link to="/environment/map" className="btn-ocean flex items-center gap-2">
            <Map className="w-4 h-4" /> Open Hotspot Map
          </Link>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 text-ocean-400 animate-spin" />
        </div>
      ) : (
        <>
          {/* Stats Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="stat-card">
              <div className="w-10 h-10 bg-ocean-500/20 rounded-xl flex items-center justify-center mb-1">
                <Layers className="w-5 h-5 text-ocean-400" />
              </div>
              <p className="text-2xl font-bold text-white">{stats?.total_hotspots ?? 0}</p>
              <p className="text-sm text-gray-400">Total Hotspots</p>
            </div>

            <div className="stat-card">
              <div className="w-10 h-10 bg-red-500/20 rounded-xl flex items-center justify-center mb-1">
                <AlertCircle className="w-5 h-5 text-red-400" />
              </div>
              <p className="text-2xl font-bold text-red-400">{stats?.critical_hotspots ?? 0}</p>
              <p className="text-sm text-gray-400">Critical Hotspots</p>
            </div>

            <div className="stat-card">
              <div className="w-10 h-10 bg-yellow-500/20 rounded-xl flex items-center justify-center mb-1">
                <Clock className="w-5 h-5 text-yellow-400" />
              </div>
              <p className="text-2xl font-bold text-white">{stats?.pending_cleanup ?? 0}</p>
              <p className="text-sm text-gray-400">Pending Cleanup</p>
            </div>

            <div className="stat-card">
              <div className="w-10 h-10 bg-green-500/20 rounded-xl flex items-center justify-center mb-1">
                <CheckCircle2 className="w-5 h-5 text-green-400" />
              </div>
              <p className="text-2xl font-bold text-white">{stats?.completed_cleanup ?? 0}</p>
              <p className="text-sm text-gray-400">Cleaned Up</p>
            </div>
          </div>

          {/* Quick Actions & Recent Hotspots */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 glass-card p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-white text-lg flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-yellow-400" />
                  Priority Hotspots Overview
                </h3>
                <Link to="/environment/priority" className="text-sm text-ocean-400 hover:text-ocean-300">
                  Manage all &rarr;
                </Link>
              </div>

              {recentHotspots.length === 0 ? (
                <div className="text-center py-8 text-gray-400">No hotspots detected yet.</div>
              ) : (
                <div className="space-y-3">
                  {recentHotspots.map((hs) => (
                    <div key={hs.id} className="p-4 rounded-xl bg-white/5 border border-white/5 flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className={getRiskBadgeClass(hs.risk_level)}>{hs.risk_level}</span>
                          <span className="text-xs uppercase px-2 py-0.5 rounded bg-ocean-500/10 text-ocean-300 border border-ocean-500/20">
                            Priority: {hs.cleanup_priority}
                          </span>
                        </div>
                        <p className="text-sm text-gray-300">
                          Coords: {hs.latitude.toFixed(4)}, {hs.longitude.toFixed(4)} · Debris count: {hs.debris_count}
                        </p>
                        {hs.notes && <p className="text-xs text-gray-400 mt-1 italic">{hs.notes}</p>}
                      </div>
                      <div className="text-right">
                        <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                          hs.cleanup_status === 'done' ? 'bg-green-500/20 text-green-300' :
                          hs.cleanup_status === 'in_progress' ? 'bg-yellow-500/20 text-yellow-300' :
                          'bg-red-500/20 text-red-300'
                        }`}>
                          {hs.cleanup_status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="glass-card p-6 space-y-4">
              <h3 className="font-bold text-white text-lg">Officer Modules</h3>
              <p className="text-sm text-gray-400">Quickly navigate to active environmental oversight tools:</p>
              
              <Link to="/environment/map" className="block p-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition-all">
                <div className="flex items-center gap-3">
                  <Map className="w-5 h-5 text-ocean-400" />
                  <div>
                    <h4 className="font-semibold text-white text-sm">Interactive Hotspot Map</h4>
                    <p className="text-xs text-gray-400">Geospatial heat zones with coordinates</p>
                  </div>
                </div>
              </Link>

              <Link to="/environment/priority" className="block p-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition-all">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="w-5 h-5 text-yellow-400" />
                  <div>
                    <h4 className="font-semibold text-white text-sm">Cleanup Priority Triage</h4>
                    <p className="text-xs text-gray-400">Update status from pending to in-progress & done</p>
                  </div>
                </div>
              </Link>

              <Link to="/environment/actions" className="block p-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition-all">
                <div className="flex items-center gap-3">
                  <CheckSquare className="w-5 h-5 text-teal-400" />
                  <div>
                    <h4 className="font-semibold text-white text-sm">Action Tracking</h4>
                    <p className="text-xs text-gray-400">Deploy cleanup teams and log action items</p>
                  </div>
                </div>
              </Link>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

// ─── Interactive Hotspot Map (React Leaflet) ─────────────────────────────────
function HotspotMap() {
  const [hotspots, setHotspots] = useState([])
  const [loading, setLoading] = useState(true)
  const [filterRisk, setFilterRisk] = useState('ALL')

  const fetchHotspots = () => {
    setLoading(true)
    api.get('/environment/hotspots')
      .then(res => setHotspots(res.data))
      .catch(() => toast.error('Failed to load hotspots for map'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    fetchHotspots()
  }, [])

  const filtered = hotspots.filter(h => filterRisk === 'ALL' || h.risk_level === filterRisk)

  // Default center around Mumbai coastal coordinates or first hotspot
  const defaultCenter = hotspots.length > 0 && hotspots[0].latitude && hotspots[0].longitude
    ? [hotspots[0].latitude, hotspots[0].longitude]
    : [19.0760, 72.8777]

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Map className="w-6 h-6 text-ocean-400" />
            Pollution & Hotspot Geospatial Map
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            Real-time side-scan sonar detections and high-risk debris cluster mapping
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-3 py-1.5">
            <Filter className="w-4 h-4 text-gray-400" />
            <select
              value={filterRisk}
              onChange={(e) => setFilterRisk(e.target.value)}
              className="bg-transparent text-sm text-white focus:outline-none"
            >
              <option value="ALL" className="bg-navy-900">All Risk Levels</option>
              <option value="CRITICAL" className="bg-navy-900">Critical Only</option>
              <option value="HIGH" className="bg-navy-900">High Risk</option>
              <option value="MEDIUM" className="bg-navy-900">Medium Risk</option>
              <option value="LOW" className="bg-navy-900">Low Risk</option>
            </select>
          </div>
          <button onClick={fetchHotspots} className="btn-ghost text-sm py-2 px-3 flex items-center gap-1">
            <RefreshCw className="w-4 h-4" /> Refresh
          </button>
        </div>
      </div>

      {/* Map Card */}
      <div className="glass-card p-4 overflow-hidden">
        {loading ? (
          <div className="h-[550px] flex items-center justify-center">
            <Loader2 className="w-8 h-8 text-ocean-400 animate-spin" />
          </div>
        ) : (
          <div className="h-[550px] w-full rounded-xl overflow-hidden relative z-0">
            <MapContainer
              center={defaultCenter}
              zoom={11}
              style={{ height: '100%', width: '100%' }}
              scrollWheelZoom={true}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />

              {filtered.map((hs) => (
                <div key={hs.id}>
                  {/* Danger zone radius circle */}
                  <CircleMarker
                    center={[hs.latitude, hs.longitude]}
                    radius={hs.risk_level === 'CRITICAL' ? 35 : hs.risk_level === 'HIGH' ? 25 : 15}
                    pathOptions={{
                      color: getRiskColor(hs.risk_level),
                      fillColor: getRiskColor(hs.risk_level),
                      fillOpacity: 0.25,
                      weight: 1.5,
                    }}
                  />

                  {/* Marker Pin */}
                  <Marker
                    position={[hs.latitude, hs.longitude]}
                    icon={createRiskMarkerIcon(hs.risk_level)}
                  >
                    <Popup>
                      <div className="p-2 space-y-2">
                        <div className="flex items-center justify-between gap-3">
                          <span className={`text-xs font-bold px-2 py-0.5 rounded ${
                            hs.risk_level === 'CRITICAL' ? 'bg-red-500 text-white' :
                            hs.risk_level === 'HIGH' ? 'bg-orange-500 text-white' :
                            hs.risk_level === 'MEDIUM' ? 'bg-yellow-500 text-black' :
                            'bg-green-500 text-white'
                          }`}>
                            {hs.risk_level} RISK
                          </span>
                          <span className="text-xs text-gray-400 font-mono">
                            ID: #{hs.id}
                          </span>
                        </div>

                        <div className="text-xs text-gray-300 space-y-1">
                          <p><strong>Debris Count:</strong> {hs.debris_count}</p>
                          <p><strong>Cleanup Priority:</strong> <span className="uppercase">{hs.cleanup_priority}</span></p>
                          <p><strong>Status:</strong> {hs.cleanup_status}</p>
                          <p className="font-mono text-[10px]">
                            Lat: {hs.latitude.toFixed(5)} | Lng: {hs.longitude.toFixed(5)}
                          </p>
                          {hs.notes && <p className="italic text-gray-400 mt-1">{hs.notes}</p>}
                        </div>

                        <div className="pt-2 border-t border-gray-700">
                          <Link
                            to="/environment/actions"
                            className="block text-center text-xs bg-ocean-600 hover:bg-ocean-500 text-white py-1 px-2 rounded font-medium"
                          >
                            Dispatch Action Record
                          </Link>
                        </div>
                      </div>
                    </Popup>
                  </Marker>
                </div>
              ))}
            </MapContainer>
          </div>
        )}

        {/* Legend */}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-4 text-xs text-gray-400 px-2">
          <div className="flex items-center gap-4">
            <span className="font-semibold text-gray-300">Legend:</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-red-600"></span> Critical Risk</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-red-500"></span> High Risk</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-yellow-500"></span> Medium Risk</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-green-500"></span> Low Risk</span>
          </div>
          <div>Total Points Shown: {filtered.length}</div>
        </div>
      </div>
    </div>
  )
}

// ─── Cleanup Priority & Status Management ────────────────────────────────────
function CleanupPriorityModule() {
  const [hotspots, setHotspots] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchHotspots = () => {
    setLoading(true)
    api.get('/environment/hotspots')
      .then(res => setHotspots(res.data))
      .catch(() => toast.error('Failed to load cleanup hotspots'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    fetchHotspots()
  }, [])

  const updateStatus = async (hotspotId, newStatus) => {
    try {
      await api.patch(`/environment/hotspots/${hotspotId}`, {
        cleanup_status: newStatus,
      })
      toast.success(`Hotspot #${hotspotId} status updated to ${newStatus}`)
      setHotspots(prev => prev.map(h => h.id === hotspotId ? { ...h, cleanup_status: newStatus } : h))
    } catch {
      toast.error('Failed to update cleanup status')
    }
  }

  const updatePriority = async (hotspotId, newPriority) => {
    try {
      await api.patch(`/environment/hotspots/${hotspotId}`, {
        cleanup_priority: newPriority,
      })
      toast.success(`Priority updated to ${newPriority}`)
      setHotspots(prev => prev.map(h => h.id === hotspotId ? { ...h, cleanup_priority: newPriority } : h))
    } catch {
      toast.error('Failed to update priority')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Cleanup Priority Management</h1>
          <p className="text-gray-400 text-sm mt-1">Triage and track remediation workflows for detected debris fields</p>
        </div>
        <button onClick={fetchHotspots} className="btn-ghost text-sm py-2 px-3 flex items-center gap-1">
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 text-ocean-400 animate-spin" />
        </div>
      ) : hotspots.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <CheckCircle2 className="w-12 h-12 text-green-400 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-white">No active hotspots</h3>
          <p className="text-gray-400 text-sm mt-1">All clean! When AI finds high-risk debris, hotspots appear here automatically.</p>
        </div>
      ) : (
        <div className="glass-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-white/5 border-b border-white/10 text-xs text-gray-400 uppercase">
                <tr>
                  <th className="p-4">ID / Location</th>
                  <th className="p-4">Risk Level</th>
                  <th className="p-4">Debris Count</th>
                  <th className="p-4">Priority</th>
                  <th className="p-4">Remediation Status</th>
                  <th className="p-4">Notes</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {hotspots.map((h) => (
                  <tr key={h.id} className="hover:bg-white/5 transition-colors">
                    <td className="p-4">
                      <p className="font-semibold text-white">Hotspot #{h.id}</p>
                      <p className="text-xs font-mono text-gray-500">
                        {h.latitude.toFixed(4)}, {h.longitude.toFixed(4)}
                      </p>
                    </td>
                    <td className="p-4">
                      <span className={getRiskBadgeClass(h.risk_level)}>{h.risk_level}</span>
                    </td>
                    <td className="p-4 font-mono font-medium text-white">{h.debris_count} items</td>
                    <td className="p-4">
                      <select
                        value={h.cleanup_priority}
                        onChange={(e) => updatePriority(h.id, e.target.value)}
                        className="bg-white/10 text-xs rounded-lg px-2.5 py-1.5 text-white border border-white/10 focus:outline-none"
                      >
                        <option value="low" className="bg-navy-900">Low</option>
                        <option value="medium" className="bg-navy-900">Medium</option>
                        <option value="high" className="bg-navy-900">High</option>
                        <option value="urgent" className="bg-navy-900">Urgent</option>
                      </select>
                    </td>
                    <td className="p-4">
                      <select
                        value={h.cleanup_status}
                        onChange={(e) => updateStatus(h.id, e.target.value)}
                        className={`text-xs rounded-lg px-2.5 py-1.5 font-medium border focus:outline-none ${
                          h.cleanup_status === 'done' ? 'bg-green-500/20 text-green-300 border-green-500/40' :
                          h.cleanup_status === 'in_progress' ? 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40' :
                          'bg-red-500/20 text-red-300 border-red-500/40'
                        }`}
                      >
                        <option value="pending" className="bg-navy-900 text-white">Pending</option>
                        <option value="in_progress" className="bg-navy-900 text-white">In Progress</option>
                        <option value="done" className="bg-navy-900 text-white">Done / Cleared</option>
                      </select>
                    </td>
                    <td className="p-4 text-xs text-gray-400 max-w-xs truncate">
                      {h.notes || '—'}
                    </td>
                    <td className="p-4 text-right">
                      <Link
                        to={`/environment/map`}
                        className="text-xs text-ocean-400 hover:text-ocean-300 font-medium"
                      >
                        View on Map &rarr;
                      </Link>
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

// ─── Action Tracking (Dispatch teams, track resolution) ───────────────────────
function ActionTrackingModule() {
  const [actions, setActions] = useState([])
  const [hotspots, setHotspots] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [newAction, setNewAction] = useState({ hotspot_id: '', action_description: '' })
  const [submitting, setSubmitting] = useState(false)

  const fetchData = () => {
    setLoading(true)
    Promise.all([
      api.get('/environment/actions'),
      api.get('/environment/hotspots'),
    ])
      .then(([actsRes, hotsRes]) => {
        setActions(actsRes.data)
        setHotspots(hotsRes.data)
      })
      .catch(() => toast.error('Failed to load action records'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    fetchData()
  }, [])

  const handleCreate = async (e) => {
    e.preventDefault()
    if (!newAction.hotspot_id || !newAction.action_description) {
      toast.error('Please fill in all fields')
      return
    }

    setSubmitting(true)
    try {
      await api.post('/environment/actions', {
        hotspot_id: parseInt(newAction.hotspot_id),
        action_description: newAction.action_description,
      })
      toast.success('Action record created!')
      setShowModal(false)
      setNewAction({ hotspot_id: '', action_description: '' })
      fetchData()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to create action')
    } finally {
      setSubmitting(false)
    }
  }

  const updateActionStatus = async (actionId, status) => {
    try {
      await api.patch(`/environment/actions/${actionId}`, { status })
      toast.success(`Action updated to ${status}`)
      setActions(prev => prev.map(a => a.id === actionId ? { ...a, status } : a))
    } catch {
      toast.error('Failed to update action status')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Action Tracking & Operations</h1>
          <p className="text-gray-400 text-sm mt-1">Coordinate maritime cleanup vessels, divers, and remediation efforts</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-ocean flex items-center gap-2">
          <Plus className="w-4 h-4" /> New Action Record
        </button>
      </div>

      {showModal && (
        <div className="glass-card p-6 border-ocean-500/40">
          <h3 className="text-lg font-bold text-white mb-4">Deploy Cleanup Action</h3>
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Target Hotspot *</label>
              <select
                className="input-field"
                value={newAction.hotspot_id}
                onChange={e => setNewAction({ ...newAction, hotspot_id: e.target.value })}
                required
              >
                <option value="">— Select Target Hotspot —</option>
                {hotspots.map(h => (
                  <option key={h.id} value={h.id}>
                    Hotspot #{h.id} ({h.risk_level} Risk - {h.debris_count} items at {h.latitude.toFixed(3)}, {h.longitude.toFixed(3)})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Action Description & Protocol *</label>
              <textarea
                className="input-field"
                rows={3}
                placeholder="e.g. Deploying salvage team with ROV and crane vessel to extract ghost fishing nets..."
                value={newAction.action_description}
                onChange={e => setNewAction({ ...newAction, action_description: e.target.value })}
                required
              />
            </div>

            <div className="flex gap-3">
              <button type="submit" disabled={submitting} className="btn-ocean flex items-center gap-2">
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckSquare className="w-4 h-4" />}
                Submit Deployment
              </button>
              <button type="button" onClick={() => setShowModal(false)} className="btn-ghost">Cancel</button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 text-ocean-400 animate-spin" />
        </div>
      ) : actions.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <CheckSquare className="w-12 h-12 text-gray-600 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-white">No Action Records</h3>
          <p className="text-gray-400 text-sm mt-1">Create an action record to track team dispatch and debris recovery.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {actions.map((act) => (
            <div key={act.id} className="glass-card p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-3">
                  <span className="font-bold text-white">Action #{act.id}</span>
                  <span className="text-xs text-ocean-400 font-medium">Target Hotspot #{act.hotspot_id}</span>
                  <span className="text-xs text-gray-500">{formatDate(act.created_at)}</span>
                </div>
                <p className="text-sm text-gray-300">{act.action_description}</p>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-xs text-gray-400">Status:</span>
                <select
                  value={act.status}
                  onChange={(e) => updateActionStatus(act.id, e.target.value)}
                  className={`text-xs rounded-lg px-3 py-1.5 font-medium border focus:outline-none ${
                    act.status === 'closed' ? 'bg-green-500/20 text-green-300 border-green-500/40' :
                    act.status === 'in_progress' ? 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40' :
                    'bg-ocean-500/20 text-ocean-300 border-ocean-500/40'
                  }`}
                >
                  <option value="open" className="bg-navy-900 text-white">Open</option>
                  <option value="in_progress" className="bg-navy-900 text-white">In Progress</option>
                  <option value="closed" className="bg-navy-900 text-white">Closed / Resolved</option>
                </select>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── EnvironmentOfficer Parent Route Wrapper ─────────────────────────────────
export default function EnvironmentOfficer() {
  return (
    <DashboardLayout>
      <Routes>
        <Route index element={<EnvironmentDashboard />} />
        <Route path="map" element={<HotspotMap />} />
        <Route path="priority" element={<CleanupPriorityModule />} />
        <Route path="actions" element={<ActionTrackingModule />} />
      </Routes>
    </DashboardLayout>
  )
}
