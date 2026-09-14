// NEXUS AQUA - Marine Expert Page
// Handles: pending detection queue + review actions + history

import { useState, useEffect } from 'react'
import { Routes, Route } from 'react-router-dom'
import {
  ShieldCheck, Clock, CheckCircle, XCircle, Edit3,
  Loader2, AlertTriangle, MessageSquare, BarChart2,
  Eye, Sparkles, LifeBuoy, Leaf, Layers, Maximize2,
  Send, UserCheck, X, Check
} from 'lucide-react'
import toast from 'react-hot-toast'
import DashboardLayout from '../components/DashboardLayout'
import { useAuth } from '../context/AuthContext'
import api from '../utils/api'
import { getRiskBadgeClass, formatDate, formatConfidence, getLatencyStatus, getTimeGreeting } from '../utils/helpers'

const DEBRIS_CLASSES = [
  'ghost_net', 'submerged_tire', 'plastic_bottle', 'metal_drum', 'plastic_waste',
  'subsea_pipe_cable', 'cargo_container', 'wood_timber', 'glass_debris', 'shipwreck_hull',
  'unknown_anomaly'
]

// ─── Expert Dashboard Stats ───────────────────────────────────────────────────
function ExpertDashboard() {
  const { user } = useAuth()
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/expert/stats')
      .then(r => setStats(r.data))
      .catch(() => toast.error('Failed to load stats'))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Marine Expert Dashboard</h1>
        <p className="text-gray-400 text-sm mt-1">
          <strong className="text-ocean-400 font-semibold">{getTimeGreeting()}</strong>, Dr. {user?.name}! Your expert confirmation queue is active.
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 text-ocean-400 animate-spin" /></div>
      ) : stats && (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          {[
            { label: 'Pending Review',  value: stats.pending_review,   icon: Clock,        color: 'yellow' },
            { label: 'Confirmed',       value: stats.confirmed,         icon: CheckCircle,  color: 'green' },
            { label: 'Reclassified',    value: stats.changed,           icon: Edit3,        color: 'ocean' },
            { label: 'Rejected',        value: stats.rejected,          icon: XCircle,      color: 'red' },
            { label: 'My Reviews',      value: stats.my_total_reviews,  icon: ShieldCheck,  color: 'teal' },
          ].map(s => (
            <div key={s.label} className="stat-card">
              <s.icon className={`w-6 h-6 text-${s.color}-400 mb-2`} />
              <p className="text-2xl font-bold text-white">{s.value}</p>
              <p className="text-sm text-gray-400">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      <div className="glass-card p-6">
        <h2 className="text-lg font-bold text-white mb-3">Your Role</h2>
        <p className="text-gray-300 text-sm leading-relaxed">
          As a Marine Expert, you review AI detections that have low confidence scores.
          Navigate to <strong className="text-ocean-400">Review Queue</strong> to see pending detections and provide your expert judgment:
          <strong className="text-green-400"> Confirm</strong> (accept AI result),
          <strong className="text-ocean-400"> Change</strong> (reclassify to correct type), or
          <strong className="text-red-400"> Reject</strong> (false positive).
        </p>
      </div>
    </div>
  )
}

// ─── Review Queue ─────────────────────────────────────────────────────────────
function ReviewQueue() {
  const [pending, setPending] = useState([])
  const [loading, setLoading] = useState(true)
  const [reviewing, setReviewing] = useState(null) // detection_id being reviewed
  const [form, setForm] = useState({ action: '', changed_class: '', comment: '' })
  const [submitting, setSubmitting] = useState(false)
  const [imageModes, setImageModes] = useState({}) // { [detId]: 'annotated' | 'raw' }
  const [zoomModal, setZoomModal] = useState(null) // { url, title, det }

  const token = localStorage.getItem('nexus_token') || ''

  const fetchPending = () => {
    setLoading(true)
    api.get('/expert/pending')
      .then(r => setPending(r.data))
      .catch(() => toast.error('Failed to load pending detections'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchPending() }, [])

  const openReview = (det, defaultAction = '') => {
    setReviewing(det)
    setForm({ action: defaultAction, changed_class: '', comment: '' })
  }

  const quickConfirm = async (det) => {
    setSubmitting(true)
    try {
      await api.post(`/expert/review/${det.detection_id}`, {
        action: 'confirm',
        comment: 'Verified and confirmed by Marine Expert.',
      })
      toast.success(`Target #${det.detection_id} (${det.class_name.replace(/_/g, ' ')}) confirmed!`)
      if (reviewing?.detection_id === det.detection_id) setReviewing(null)
      fetchPending()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Confirmation failed')
    } finally {
      setSubmitting(false)
    }
  }

  const submitReview = async () => {
    if (!form.action) { toast.error('Please select an action'); return }
    if (form.action === 'change' && !form.changed_class) { toast.error('Please select the correct class'); return }

    setSubmitting(true)
    try {
      await api.post(`/expert/review/${reviewing.detection_id}`, {
        action: form.action,
        changed_class: form.action === 'change' ? form.changed_class : null,
        comment: form.comment || null,
      })
      toast.success(`Detection #${reviewing.detection_id} ${form.action}ed successfully!`)
      setReviewing(null)
      fetchPending()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Review submission failed')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2.5">
            <ShieldCheck className="w-6 h-6 text-ocean-400" />
            Marine Expert Review & Confirmation Queue
          </h1>
          <p className="text-gray-400 text-sm mt-0.5">
            Verify highlighted sonar scans, debris taxonomy, material hazards, and fauna extraction protocols submitted by Survey Operators.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs font-semibold px-3 py-1 rounded-full bg-yellow-500/10 border border-yellow-500/30 text-yellow-400">
            {pending.length} Pending Verification
          </span>
          <button onClick={fetchPending} className="btn-ghost text-sm py-1.5 px-3">Refresh</button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16"><Loader2 className="w-8 h-8 text-ocean-400 animate-spin" /></div>
      ) : pending.length === 0 ? (
        <div className="glass-card p-16 text-center">
          <CheckCircle className="w-14 h-14 text-emerald-400 mx-auto mb-4" />
          <h3 className="text-white font-bold text-xl">All Clear — Review Queue Empty!</h3>
          <p className="text-gray-400 text-sm mt-1 max-w-md mx-auto">
            No sonar scans or debris anomalies currently pending expert confirmation. As Survey Operators analyze new side-scan sonar runs and dispatch confirmation requests, they will appear here with highlighted targets.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {pending.map(det => {
            const mode = imageModes[det.detection_id] || 'annotated'
            const annotatedUrl = `${det.annotated_image_url || `/api/ai/image/${det.sonar_image_id}/annotated`}?token=${token}`
            const rawUrl = `${det.image_url || `/api/ai/image/${det.sonar_image_id}/file`}?token=${token}`
            const displayUrl = mode === 'raw' ? rawUrl : annotatedUrl

            return (
              <div
                key={det.detection_id}
                className={`glass-card p-6 border transition-all duration-200 ${
                  reviewing?.detection_id === det.detection_id
                    ? 'border-ocean-500/70 shadow-2xl shadow-ocean-950/50 ring-1 ring-ocean-500/30'
                    : 'border-white/10 hover:border-white/20'
                }`}
              >
                {/* Card Title & Dispatch Badge */}
                <div className="flex items-center justify-between pb-4 mb-5 border-b border-white/10 flex-wrap gap-2">
                  <div className="flex items-center gap-3">
                    <span className="w-8 h-8 rounded-lg bg-ocean-500/20 text-ocean-300 flex items-center justify-center font-bold text-sm">
                      #{det.detection_id}
                    </span>
                    <div>
                      <h2 className="text-lg font-bold text-white capitalize flex items-center gap-2">
                        {det.class_name.replace(/_/g, ' ')}
                        <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-500/20 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                          {formatConfidence(det.confidence)} Match
                        </span>
                      </h2>
                      <p className="text-xs text-gray-400">
                        Mission Survey: <strong className="text-gray-200">{det.survey_title}</strong> • Uploaded {formatDate(det.uploaded_at)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className={getRiskBadgeClass(det.risk_level)}>{det.risk_level || 'MEDIUM'} RISK</span>
                    <span className="text-xs text-yellow-400 border border-yellow-500/30 bg-yellow-500/10 px-2.5 py-1 rounded-full font-medium">
                      Awaiting Expert Confirmation
                    </span>
                  </div>
                </div>

                {/* 2-Column Split: Highlighted Sonar Viewport + Intelligence Dossier */}
                <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
                  {/* Left: Highlighted Image Viewport (5 cols) */}
                  <div className="xl:col-span-5 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => setImageModes(prev => ({ ...prev, [det.detection_id]: 'annotated' }))}
                          className={`text-xs px-2.5 py-1 rounded-lg border font-semibold transition-all ${
                            mode === 'annotated'
                              ? 'bg-ocean-500/20 border-ocean-500/50 text-ocean-300'
                              : 'bg-white/5 border-white/10 text-gray-400 hover:text-white'
                          }`}
                        >
                          <Sparkles className="w-3 h-3 inline mr-1" />
                          Highlighted Scan
                        </button>
                        <button
                          onClick={() => setImageModes(prev => ({ ...prev, [det.detection_id]: 'raw' }))}
                          className={`text-xs px-2.5 py-1 rounded-lg border font-semibold transition-all ${
                            mode === 'raw'
                              ? 'bg-ocean-500/20 border-ocean-500/50 text-ocean-300'
                              : 'bg-white/5 border-white/10 text-gray-400 hover:text-white'
                          }`}
                        >
                          <Eye className="w-3 h-3 inline mr-1" />
                          Raw Sonar
                        </button>
                      </div>

                      <button
                        onClick={() => setZoomModal({ url: displayUrl, title: `${det.class_name.replace(/_/g, ' ')} (Scan #${det.sonar_image_id})`, det })}
                        className="text-xs text-gray-400 hover:text-ocean-300 flex items-center gap-1 transition-colors"
                      >
                        <Maximize2 className="w-3.5 h-3.5" /> Fullscreen
                      </button>
                    </div>

                    {/* Image Box */}
                    <div
                      className="relative rounded-xl overflow-hidden bg-black border border-white/15 group cursor-pointer shadow-lg"
                      onClick={() => setZoomModal({ url: displayUrl, title: `${det.class_name.replace(/_/g, ' ')} (Scan #${det.sonar_image_id})`, det })}
                    >
                      <img
                        src={displayUrl}
                        alt={det.class_name}
                        className="w-full h-64 object-contain transition-transform duration-300 group-hover:scale-105"
                        onError={(e) => {
                          e.target.onerror = null
                          e.target.src = rawUrl
                        }}
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                        <span className="bg-black/80 px-3 py-1.5 rounded-lg text-xs font-semibold text-white flex items-center gap-1.5 border border-white/20">
                          <Maximize2 className="w-3.5 h-3.5 text-ocean-400" /> Click to Zoom Sonar Image
                        </span>
                      </div>
                    </div>

                    {/* Acoustic Telemetry */}
                    <div className="p-2.5 rounded-lg bg-black/40 border border-white/5 flex items-center justify-between text-xs text-gray-400 font-mono">
                      <span>BBox: [{det.bbox.x1.toFixed(3)}, {det.bbox.y1.toFixed(3)} - {det.bbox.x2.toFixed(3)}, {det.bbox.y2.toFixed(3)}]</span>
                      <span>Anomaly: {det.anomaly_score != null ? `${(det.anomaly_score * 100).toFixed(1)}%` : '—'}</span>
                    </div>
                  </div>

                  {/* Right: Analyzed Information Dossier (7 cols) */}
                  <div className="xl:col-span-7 space-y-4">
                    {/* Operator Dispatch Note (if provided) */}
                    {det.operator_notes && (
                      <div className="p-3 rounded-xl bg-cyan-950/30 border border-cyan-500/30 text-xs flex items-start gap-2.5">
                        <Send className="w-4 h-4 text-cyan-400 flex-shrink-0 mt-0.5" />
                        <div>
                          <span className="font-bold text-cyan-300 uppercase tracking-wider block text-[10px] mb-0.5">
                            Survey Operator Dispatch Note:
                          </span>
                          <span className="text-cyan-100 italic">"{det.operator_notes}"</span>
                        </div>
                      </div>
                    )}

                    {/* Material & Physical Dimensions */}
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                        <span className="text-gray-400 block text-[10px] uppercase tracking-wider font-semibold mb-0.5">Material Composition</span>
                        <span className="text-white font-medium">{det.material || 'Synthetic / Marine Composite Material'}</span>
                      </div>
                      <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                        <span className="text-gray-400 block text-[10px] uppercase tracking-wider font-semibold mb-0.5">Estimated Dimensions</span>
                        <span className="text-white font-mono font-medium">~{det.estimated_size_m || '1.0'} meters</span>
                      </div>
                    </div>

                    {/* AI Object Description */}
                    {det.object_description && (
                      <div className="p-3 rounded-xl bg-black/30 border border-white/10 text-xs">
                        <span className="text-ocean-400 font-semibold block text-[11px] mb-1 flex items-center gap-1.5">
                          <Layers className="w-3.5 h-3.5" /> Identified Sonar Target Profile:
                        </span>
                        <p className="text-gray-300 leading-relaxed">{det.object_description}</p>
                      </div>
                    )}

                    {/* Environmental Hazard */}
                    {det.environmental_hazard && (
                      <div className="p-3 rounded-xl bg-yellow-950/20 border border-yellow-500/30 text-xs flex items-start gap-2.5">
                        <AlertTriangle className="w-4 h-4 text-yellow-400 flex-shrink-0 mt-0.5" />
                        <div>
                          <span className="text-yellow-400 font-bold block text-[10px] uppercase tracking-wider mb-0.5">
                            Environmental & Marine Life Hazard:
                          </span>
                          <p className="text-yellow-200/90 leading-relaxed">{det.environmental_hazard}</p>
                        </div>
                      </div>
                    )}

                    {/* Removal & Fauna Protection Protocol */}
                    <div className="p-3.5 rounded-xl bg-emerald-950/20 border border-emerald-500/30 text-xs space-y-1.5">
                      <div className="flex items-center gap-2 text-emerald-300 font-semibold">
                        <LifeBuoy className="w-4 h-4 text-emerald-400" />
                        <span>Actionable Removal & Marine Fauna Protection Suggestion:</span>
                      </div>
                      <p className="text-emerald-100/90 leading-relaxed bg-black/30 p-2.5 rounded-lg border border-emerald-500/20">
                        {det.removal_suggestion || (
                          "Deploy certified Scientific Diver team or Light Work-Class ROV with soft-clamp manipulator. Inspect for entangled benthic organisms and disentangle gently before surface hoisting using pneumatic lift bags."
                        )}
                      </p>
                      <div className="flex items-center gap-4 text-[11px] text-emerald-400/80 pt-0.5">
                        <span className="flex items-center gap-1">
                          <Leaf className="w-3 h-3 text-emerald-400" /> Safe Extraction Protocol
                        </span>
                        <span className="flex items-center gap-1">
                          <ShieldCheck className="w-3 h-3 text-emerald-400" /> Marine Life Protected
                        </span>
                      </div>
                    </div>

                    {/* Action Bar (When not reviewing) */}
                    {reviewing?.detection_id !== det.detection_id && (
                      <div className="flex items-center justify-between pt-2 border-t border-white/10 flex-wrap gap-2">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => quickConfirm(det)}
                            disabled={submitting}
                            className="btn-ocean bg-emerald-600 hover:bg-emerald-500 border-emerald-500/50 text-white text-xs py-2 px-4 flex items-center gap-1.5 shadow-md shadow-emerald-950/50"
                          >
                            <Check className="w-3.5 h-3.5" />
                            Confirm Detection
                          </button>
                          <button
                            onClick={() => openReview(det, 'change')}
                            className="btn-ocean text-xs py-2 px-3 flex items-center gap-1.5"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            Reclassify Class
                          </button>
                          <button
                            onClick={() => openReview(det, 'reject')}
                            className="p-2 rounded-xl text-xs text-red-400 hover:bg-red-500/10 border border-red-500/20 flex items-center gap-1 transition-colors"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            Reject False Alarm
                          </button>
                        </div>
                        <button
                          onClick={() => openReview(det)}
                          className="btn-ghost text-xs py-1.5 px-3 text-gray-400 hover:text-white"
                        >
                          Detailed Review & Notes...
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Inline Review Drawer */}
                {reviewing?.detection_id === det.detection_id && (
                  <div className="mt-5 pt-5 border-t border-white/15 space-y-4 bg-white/5 -mx-6 -mb-6 p-6 rounded-b-2xl">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-bold text-white flex items-center gap-2">
                        <UserCheck className="w-4 h-4 text-ocean-400" />
                        Submit Expert Judgment for Target #{det.detection_id}
                      </p>
                      <button onClick={() => setReviewing(null)} className="text-gray-400 hover:text-white">
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Action selection */}
                    <div className="flex gap-3 flex-wrap">
                      {[
                        { value: 'confirm', label: '✓ Accept & Confirm', color: 'green' },
                        { value: 'change',  label: '↺ Change Classification', color: 'ocean' },
                        { value: 'reject',  label: '✗ Reject False Alarm', color: 'red' },
                      ].map(a => (
                        <button
                          key={a.value}
                          onClick={() => setForm({ ...form, action: a.value })}
                          className={`px-4 py-2 rounded-xl text-xs font-semibold border transition-all duration-150 ${
                            form.action === a.value
                              ? `bg-${a.color}-500/20 border-${a.color}-500/50 text-${a.color}-300 ring-1 ring-${a.color}-400/30`
                              : 'bg-white/5 border-white/10 text-gray-400 hover:text-white'
                          }`}
                        >
                          {a.label}
                        </button>
                      ))}
                    </div>

                    {/* New class selector */}
                    {form.action === 'change' && (
                      <div>
                        <label className="block text-xs font-semibold text-gray-300 mb-1">Select Correct Marine Debris Class *</label>
                        <select
                          className="input-field text-xs py-2"
                          value={form.changed_class}
                          onChange={e => setForm({ ...form, changed_class: e.target.value })}
                        >
                          <option value="">Choose correct category...</option>
                          {DEBRIS_CLASSES.map(c => (
                            <option key={c} value={c}>{c.replace(/_/g, ' ').toUpperCase()}</option>
                          ))}
                        </select>
                      </div>
                    )}

                    {/* Comment */}
                    <div>
                      <label className="block text-xs font-semibold text-gray-300 mb-1">
                        Marine Expert Field Justification & Comments (Optional)
                      </label>
                      <textarea
                        className="input-field text-xs"
                        rows={2}
                        placeholder="Add scientific confirmation remarks, acoustic shadow observations, or salvage instructions..."
                        value={form.comment}
                        onChange={e => setForm({ ...form, comment: e.target.value })}
                      />
                    </div>

                    <div className="flex gap-3">
                      <button
                        onClick={submitReview}
                        disabled={submitting || !form.action}
                        className="btn-ocean flex items-center gap-2 text-xs py-2.5 px-5"
                      >
                        {submitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Submitting Confirmation...</> : 'Save & Lock Expert Review'}
                      </button>
                      <button onClick={() => setReviewing(null)} className="btn-ghost text-xs">
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Fullscreen Zoom Modal */}
      {zoomModal && (
        <div
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4"
          onClick={() => setZoomModal(null)}
        >
          <div
            className="glass-card max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col border border-white/20 shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b border-white/10">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-ocean-400" />
                {zoomModal.title}
              </h3>
              <button
                onClick={() => setZoomModal(null)}
                className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-auto p-4 bg-black flex items-center justify-center">
              <img
                src={zoomModal.url}
                alt="Zoomed sonar"
                className="max-w-full max-h-[75vh] object-contain rounded-lg"
              />
            </div>
            <div className="p-3 border-t border-white/10 bg-white/5 flex items-center justify-between text-xs text-gray-300">
              <span>Classified Target: <strong className="text-white capitalize">{zoomModal.det?.class_name?.replace(/_/g, ' ')}</strong></span>
              <span className="font-mono">Confidence: {formatConfidence(zoomModal.det?.confidence || 0)}</span>
              <button
                onClick={() => setZoomModal(null)}
                className="btn-ghost text-xs py-1 px-3"
              >
                Close View
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── My Reviews History ───────────────────────────────────────────────────────
function MyReviews() {
  const [reviews, setReviews] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/expert/reviews')
      .then(r => setReviews(r.data))
      .catch(() => toast.error('Failed to load reviews'))
      .finally(() => setLoading(false))
  }, [])

  const actionIcon = { confirm: CheckCircle, change: Edit3, reject: XCircle }
  const actionColor = { confirm: 'text-green-400', change: 'text-ocean-400', reject: 'text-red-400' }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white">My Reviews</h1>
      {loading ? (
        <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 text-ocean-400 animate-spin" /></div>
      ) : reviews.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <MessageSquare className="w-12 h-12 text-gray-600 mx-auto mb-4" />
          <p className="text-gray-400">No reviews submitted yet. Go to the Review Queue to start.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {reviews.map(r => {
            const Icon = actionIcon[r.action] || CheckCircle
            return (
              <div key={r.id} className="glass-card p-4 flex items-start gap-4">
                <Icon className={`w-5 h-5 ${actionColor[r.action] || 'text-gray-400'} flex-shrink-0 mt-1`} />
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <span className="font-medium text-white capitalize">{r.action}</span>
                    {r.changed_class && <span className="text-xs text-ocean-400">→ {r.changed_class.replace(/_/g, ' ')}</span>}
                    <span className="text-xs text-gray-500">Detection #{r.detection_id}</span>
                  </div>
                  {r.comment && <p className="text-sm text-gray-400 mt-1 italic">"{r.comment}"</p>}
                  <p className="text-xs text-gray-500 mt-1">{formatDate(r.reviewed_at)}</p>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default function MarineExpert() {
  return (
    <DashboardLayout>
      <Routes>
        <Route index element={<ExpertDashboard />} />
        <Route path="queue" element={<ReviewQueue />} />
        <Route path="reviews" element={<MyReviews />} />
      </Routes>
    </DashboardLayout>
  )
}
