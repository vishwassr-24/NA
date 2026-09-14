// NEXUS AQUA - Survey Operator Dashboard + All Sub-pages
// Handles: Survey list, Create survey, Upload & analyze sonar images, History, Location

import { useState, useEffect, useRef, useCallback } from 'react'
import { Routes, Route, useNavigate, Link } from 'react-router-dom'
import {
  Waves, Upload, Plus, Clock, MapPin, ChevronRight,
  Zap, AlertTriangle, CheckCircle, XCircle, Loader2,
  Eye, Trash2, BarChart2, Image, Activity, Search,
  Sparkles, LifeBuoy, Leaf, ShieldCheck, Layers, Info,
  Send, Share2, CheckSquare
} from 'lucide-react'
import toast from 'react-hot-toast'
import DashboardLayout from '../components/DashboardLayout'
import { useAuth } from '../context/AuthContext'
import api from '../utils/api'
import {
  getRiskBadgeClass, formatDate, formatFileSize,
  getLatencyStatus, formatConfidence, bboxToPixels, getRiskColor,
  getTimeGreeting
} from '../utils/helpers'

// ─── Stat Card ───────────────────────────────────────────────────────────────
function StatCard({ icon: Icon, label, value, color = 'ocean' }) {
  return (
    <div className="stat-card">
      <div className={`w-10 h-10 bg-${color}-500/20 rounded-xl flex items-center justify-center mb-1`}>
        <Icon className={`w-5 h-5 text-${color}-400`} />
      </div>
      <p className="text-2xl font-bold text-white">{value ?? '—'}</p>
      <p className="text-sm text-gray-400">{label}</p>
    </div>
  )
}

// ─── Main Survey Operator Dashboard ──────────────────────────────────────────
function SurveyDashboard() {
  const { user } = useAuth()
  const [surveys, setSurveys] = useState([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    api.get('/surveys/')
      .then(r => setSurveys(r.data))
      .catch(() => toast.error('Failed to load surveys'))
      .finally(() => setLoading(false))
  }, [])

  const stats = {
    total: surveys.length,
    active: surveys.filter(s => s.status === 'active').length,
    images: surveys.reduce((a, s) => a + (s.image_count || 0), 0),
    completed: surveys.filter(s => s.status === 'completed').length,
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Survey Dashboard</h1>
          <p className="text-gray-400 text-sm mt-1">
            <strong className="text-ocean-400 font-semibold">{getTimeGreeting()}</strong>, {user?.name}! Survey control and sonar mission telemetry.
          </p>
        </div>
        <button onClick={() => navigate('/survey/upload')} className="btn-ocean flex items-center gap-2">
          <Upload className="w-4 h-4" /> Upload & Analyze
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Waves}      label="Total Surveys"    value={stats.total}     color="ocean" />
        <StatCard icon={Activity}   label="Active Surveys"   value={stats.active}    color="teal" />
        <StatCard icon={Image}      label="Images Uploaded"  value={stats.images}    color="purple" />
        <StatCard icon={CheckCircle} label="Completed"       value={stats.completed} color="green" />
      </div>

      {/* Recent Surveys */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="section-header">Recent Surveys</h2>
          <Link to="/surveys" className="text-ocean-400 hover:text-ocean-300 text-sm flex items-center gap-1">
            View all <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 text-ocean-400 animate-spin" />
          </div>
        ) : surveys.length === 0 ? (
          <div className="glass-card p-12 text-center">
            <Waves className="w-12 h-12 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400">No surveys yet. Start by creating one.</p>
            <Link to="/surveys" className="btn-ocean inline-flex items-center gap-2 mt-4">
              <Plus className="w-4 h-4" /> New Survey
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {surveys.slice(0, 5).map(survey => (
              <SurveyCard key={survey.id} survey={survey} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Survey Card ─────────────────────────────────────────────────────────────
function SurveyCard({ survey, onDelete }) {
  const navigate = useNavigate()
  const statusColors = { active: 'text-green-400', completed: 'text-blue-400', archived: 'text-gray-400' }

  return (
    <div className="glass-card p-5 flex items-center gap-4 hover:bg-white/5 transition-all duration-200 group">
      <div className="w-10 h-10 bg-ocean-500/20 rounded-xl flex items-center justify-center flex-shrink-0">
        <Waves className="w-5 h-5 text-ocean-400" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-white truncate">{survey.title}</p>
        <div className="flex items-center gap-4 mt-1">
          <span className={`text-xs ${statusColors[survey.status] || 'text-gray-400'} font-medium capitalize`}>{survey.status}</span>
          {survey.location_name && <span className="text-xs text-gray-500 flex items-center gap-1"><MapPin className="w-3 h-3" />{survey.location_name}</span>}
          <span className="text-xs text-gray-500">{formatDate(survey.created_at)}</span>
          <span className="text-xs text-gray-500">{survey.image_count} image{survey.image_count !== 1 ? 's' : ''}</span>
        </div>
      </div>
      <button
        onClick={() => navigate(`/survey/upload?survey=${survey.id}`)}
        className="opacity-0 group-hover:opacity-100 btn-ocean text-xs py-1.5 px-3 flex items-center gap-1 transition-opacity"
      >
        <Upload className="w-3 h-3" /> Upload
      </button>
    </div>
  )
}

// ─── Surveys List Page ────────────────────────────────────────────────────────
function SurveyList() {
  const [surveys, setSurveys] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState({ title: '', description: '', location_name: '', latitude: '', longitude: '', depth_m: '' })

  const fetchSurveys = () => {
    setLoading(true)
    api.get('/surveys/').then(r => setSurveys(r.data)).catch(() => toast.error('Failed to load')).finally(() => setLoading(false))
  }

  useEffect(() => { fetchSurveys() }, [])

  const createSurvey = async (e) => {
    e.preventDefault()
    try {
      const payload = {
        ...form,
        latitude: form.latitude ? parseFloat(form.latitude) : null,
        longitude: form.longitude ? parseFloat(form.longitude) : null,
        depth_m: form.depth_m ? parseFloat(form.depth_m) : null,
      }
      await api.post('/surveys/', payload)
      toast.success('Survey created!')
      setShowCreate(false)
      setForm({ title: '', description: '', location_name: '', latitude: '', longitude: '', depth_m: '' })
      fetchSurveys()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to create survey')
    }
  }

  const deleteSurvey = async (id) => {
    if (!confirm('Delete this survey? This cannot be undone.')) return
    try {
      await api.delete(`/surveys/${id}`)
      toast.success('Survey deleted')
      fetchSurveys()
    } catch {
      toast.error('Failed to delete survey')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Surveys</h1>
        <button onClick={() => setShowCreate(!showCreate)} className="btn-ocean flex items-center gap-2">
          <Plus className="w-4 h-4" /> New Survey
        </button>
      </div>

      {showCreate && (
        <div className="glass-card p-6">
          <h3 className="text-lg font-bold text-white mb-4">Create New Survey</h3>
          <form onSubmit={createSurvey} className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-300 mb-1">Survey Title *</label>
              <input className="input-field" placeholder="e.g., Northern Bay Survey Q1" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} required />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-300 mb-1">Description</label>
              <textarea className="input-field" rows={2} placeholder="Brief description..." value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Location Name</label>
              <input className="input-field" placeholder="e.g., Mumbai Harbour" value={form.location_name} onChange={e => setForm({ ...form, location_name: e.target.value })} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Depth (m)</label>
              <input className="input-field" type="number" step="0.1" min="0" placeholder="e.g., 25.5" value={form.depth_m} onChange={e => setForm({ ...form, depth_m: e.target.value })} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Latitude</label>
              <input className="input-field" type="number" step="any" placeholder="e.g., 19.0760" value={form.latitude} onChange={e => setForm({ ...form, latitude: e.target.value })} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Longitude</label>
              <input className="input-field" type="number" step="any" placeholder="e.g., 72.8777" value={form.longitude} onChange={e => setForm({ ...form, longitude: e.target.value })} />
            </div>
            <div className="col-span-2 flex gap-3">
              <button type="submit" className="btn-ocean">Create Survey</button>
              <button type="button" onClick={() => setShowCreate(false)} className="btn-ghost">Cancel</button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 text-ocean-400 animate-spin" /></div>
      ) : (
        <div className="space-y-3">
          {surveys.map(survey => (
            <div key={survey.id} className="glass-card p-5 flex items-center gap-4 group">
              <div className="w-10 h-10 bg-ocean-500/20 rounded-xl flex items-center justify-center">
                <Waves className="w-5 h-5 text-ocean-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-white">{survey.title}</p>
                <div className="flex items-center gap-4 mt-1 flex-wrap">
                  <span className="text-xs text-gray-400 capitalize">Status: <span className="text-white">{survey.status}</span></span>
                  {survey.location_name && <span className="text-xs text-gray-500">{survey.location_name}</span>}
                  <span className="text-xs text-gray-500">{formatDate(survey.created_at)}</span>
                  <span className="text-xs text-gray-500">{survey.image_count} images</span>
                </div>
              </div>
              <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <Link to={`/survey/upload?survey=${survey.id}`} className="btn-ocean text-xs py-1.5 px-3 flex items-center gap-1">
                  <Upload className="w-3 h-3" /> Analyze
                </Link>
                <button onClick={() => deleteSurvey(survey.id)} className="p-2 rounded-lg text-red-400 hover:bg-red-500/10 transition-colors">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
          {surveys.length === 0 && (
            <div className="glass-card p-12 text-center">
              <p className="text-gray-400">No surveys found. Create your first survey.</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Upload & Analyze Page ────────────────────────────────────────────────────
function UploadAnalyze() {
  const [surveys, setSurveys] = useState([])
  const [selectedSurvey, setSelectedSurvey] = useState('')
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [result, setResult] = useState(null)
  const [imgDims, setImgDims] = useState({ w: 0, h: 0 })
  const [sendingToExpert, setSendingToExpert] = useState(false)
  const [expertSent, setExpertSent] = useState(false)
  const [expertSentTime, setExpertSentTime] = useState(null)
  const [operatorNotes, setOperatorNotes] = useState('')
  const [isHighPriority, setIsHighPriority] = useState(false)
  const fileRef = useRef(null)
  const canvasRef = useRef(null)
  const imgRef = useRef(null)

  // Pre-select survey from query param
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const sid = params.get('survey')
    if (sid) setSelectedSurvey(sid)
  }, [])

  useEffect(() => {
    api.get('/surveys/')
      .then(r => {
        setSurveys(r.data)
        if (r.data.length > 0) {
          setSelectedSurvey(prev => prev || r.data[0].id)
        }
      })
      .catch(() => {})
  }, [])

  const handleFile = (e) => {
    const f = e.target.files[0]
    if (!f) return
    setFile(f)
    setResult(null)
    setExpertSent(false)
    setOperatorNotes('')
    const url = URL.createObjectURL(f)
    setPreview(url)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    const f = e.dataTransfer.files[0]
    if (f) {
      setFile(f)
      setResult(null)
      setExpertSent(false)
      setOperatorNotes('')
      setPreview(URL.createObjectURL(f))
    }
  }

  const sendToExpert = async () => {
    if (!result?.sonar_image_id) {
      toast.error('No analyzed scan found to transmit')
      return
    }
    setSendingToExpert(true)
    try {
      const res = await api.post(`/expert/request-confirmation/${result.sonar_image_id}`, {
        operator_notes: operatorNotes.trim() || 'Survey Operator request for Marine Expert verification of analyzed sonar anomalies.',
        priority: isHighPriority ? 'high' : 'normal',
      })
      setExpertSent(true)
      setExpertSentTime(new Date().toLocaleTimeString())
      toast.success(res.data.message || 'Image and intelligence sent to Marine Expert!')
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to dispatch confirmation request')
    } finally {
      setSendingToExpert(false)
    }
  }

  const drawBBoxes = useCallback(() => {
    if (!result || !canvasRef.current || !imgRef.current) return
    const canvas = canvasRef.current
    const img = imgRef.current
    canvas.width = img.naturalWidth
    canvas.height = img.naturalHeight
    const ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    result.detections.forEach((det) => {
      const px = bboxToPixels(det.bbox, canvas.width, canvas.height)
      const color = getRiskColor(det.risk_level)
      ctx.strokeStyle = color
      ctx.lineWidth = 3
      ctx.shadowColor = color
      ctx.shadowBlur = 8
      ctx.strokeRect(px.x1, px.y1, px.width, px.height)

      // Label background
      const sizeTag = det.estimated_size_m ? ` (~${det.estimated_size_m}m)` : ''
      const label = `${det.class_name.replace(/_/g, ' ')} ${(det.confidence * 100).toFixed(0)}%${sizeTag}`
      ctx.font = 'bold 13px Inter, sans-serif'
      const tw = ctx.measureText(label).width
      ctx.fillStyle = color + 'e6'
      ctx.shadowBlur = 0
      ctx.fillRect(px.x1, px.y1 - 24, tw + 12, 24)
      ctx.fillStyle = '#fff'
      ctx.fillText(label, px.x1 + 6, px.y1 - 7)
    })
  }, [result])

  useEffect(() => { if (result) drawBBoxes() }, [result, drawBBoxes])

  const analyze = async () => {
    if (!file) {
      toast.error('Please select a sonar image first')
      return
    }

    setAnalyzing(true)
    setResult(null)

    let targetSurveyId = selectedSurvey
    // If no survey is selected yet, auto-select existing or create a quick session
    if (!targetSurveyId) {
      if (surveys.length > 0) {
        targetSurveyId = surveys[0].id
        setSelectedSurvey(targetSurveyId)
      } else {
        try {
          const newSurveyRes = await api.post('/surveys/', {
            title: 'Live Sonar Mission Sweep',
            description: 'Auto-initialized survey session for rapid inference',
            location_name: 'Sonar Survey Grid',
            latitude: 19.0760,
            longitude: 72.8777,
          })
          targetSurveyId = newSurveyRes.data.id
          setSurveys([newSurveyRes.data])
          setSelectedSurvey(targetSurveyId)
        } catch (e) {
          toast.error('Could not initialize survey session. Please create a survey first.')
          setAnalyzing(false)
          return
        }
      }
    }

    const fd = new FormData()
    fd.append('file', file)

    try {
      const res = await api.post(`/ai/analyze/${targetSurveyId}`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      setResult(res.data)
      if (res.data.total_objects > 0 || res.data.auto_dispatched_to_expert) {
        setExpertSent(true)
        setExpertSentTime(new Date().toLocaleTimeString())
        toast.success(`Anomaly detected! Automatically dispatched ${res.data.total_objects} target(s) to Marine Expert for verification.`, { duration: 5500 })
      } else {
        toast.success('Analysis complete! Clean seabed — 0 anomalies detected.')
      }
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Analysis failed')
    } finally {
      setAnalyzing(false)
    }
  }

  const latencyStatus = result ? getLatencyStatus(result.inference_latency_ms) : null

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white">Upload & Analyze Sonar Image</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Upload */}
        <div className="space-y-4">
          {/* Survey selector */}
          <div className="glass-card p-5">
            <label className="block text-sm font-medium text-gray-300 mb-2">Select Survey Session</label>
            <select
              className="input-field"
              value={selectedSurvey}
              onChange={e => setSelectedSurvey(e.target.value)}
            >
              {surveys.length === 0 && <option value="">— Auto-creating active session on analyze —</option>}
              {surveys.map(s => (
                <option key={s.id} value={s.id}>{s.title} ({s.location_name || 'Active Zone'})</option>
              ))}
            </select>
          </div>

          {/* Drop zone */}
          <div
            className={`glass-card border-2 border-dashed p-10 text-center cursor-pointer transition-all duration-200
              ${file ? 'border-ocean-500/50 bg-ocean-500/5' : 'border-white/10 hover:border-ocean-500/30 hover:bg-white/5'}`}
            onDragOver={e => e.preventDefault()}
            onDrop={handleDrop}
            onClick={() => fileRef.current?.click()}
          >
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
            {file ? (
              <div>
                <CheckCircle className="w-10 h-10 text-ocean-400 mx-auto mb-3" />
                <p className="font-semibold text-white">{file.name}</p>
                <p className="text-sm text-gray-400 mt-1">{formatFileSize(file.size)}</p>
                <button
                  onClick={e => { e.stopPropagation(); setFile(null); setPreview(null); setResult(null) }}
                  className="mt-3 text-xs text-red-400 hover:text-red-300"
                >Remove</button>
              </div>
            ) : (
              <div>
                <Upload className="w-10 h-10 text-gray-500 mx-auto mb-3" />
                <p className="text-gray-300 font-medium">Drop sonar image here</p>
                <p className="text-sm text-gray-500 mt-1">or click to browse (JPEG, PNG, TIFF, BMP)</p>
                <p className="text-xs text-gray-600 mt-3">Max 500 MB • Up to 16K Ultra-HD</p>
              </div>
            )}
          </div>

          <button
            onClick={analyze}
            disabled={!file || analyzing}
            className="btn-ocean w-full flex items-center justify-center gap-2 text-base py-3"
          >
            {analyzing ? (
              <><Loader2 className="w-5 h-5 animate-spin" /> Running AI Analysis...</>
            ) : (
              <><Zap className="w-5 h-5" /> Analyze Image</>
            )}
          </button>
        </div>

        {/* Right: Image preview + results */}
        <div className="space-y-4">
          {preview && (
            <div className="glass-card p-4">
              <p className="text-sm font-medium text-gray-400 mb-3">Image Preview {result && '(with detections)'}</p>
              <div className="relative rounded-xl overflow-hidden bg-black">
                <img
                  ref={imgRef}
                  src={preview}
                  alt="Sonar image"
                  className="w-full object-contain max-h-64"
                  onLoad={e => { setImgDims({ w: e.target.naturalWidth, h: e.target.naturalHeight }); if (result) drawBBoxes() }}
                />
                {result && (
                  <canvas
                    ref={canvasRef}
                    className="absolute inset-0 w-full h-full"
                    style={{ pointerEvents: 'none' }}
                  />
                )}
              </div>
            </div>
          )}

          {/* AI Results in 4 Sequential Columns / Tiers */}
          {result && (
            <div className="space-y-6 pt-2">
              {/* ─── TIER 1: Image & Acoustic Highlighting ─── */}
              <div className="glass-card p-5 border-ocean-500/30 shadow-lg">
                <div className="flex items-center justify-between mb-3 pb-3 border-b border-white/10">
                  <div className="flex items-center gap-2.5">
                    <span className="w-7 h-7 rounded-lg bg-ocean-500/20 text-ocean-300 flex items-center justify-center font-bold text-xs">
                      1
                    </span>
                    <div>
                      <h3 className="text-sm font-bold text-white flex items-center gap-2">
                        <Eye className="w-4 h-4 text-ocean-400" />
                        Analyzed Sonar Image & Detection Highlights
                      </h3>
                      <p className="text-xs text-gray-400">Acoustic backscatter relief map with bounding box localization</p>
                    </div>
                  </div>
                  <span className="text-xs px-2.5 py-1 rounded-full bg-ocean-500/20 text-ocean-300 font-medium">
                    {result.total_objects} Contact{result.total_objects !== 1 ? 's' : ''} Mapped
                  </span>
                </div>

                {/* Sonar Canvas View */}
                <div className="relative rounded-xl overflow-hidden bg-black border border-white/10">
                  <img
                    ref={imgRef}
                    src={preview}
                    alt="Analyzed sonar image"
                    className="w-full object-contain max-h-96"
                    onLoad={e => { setImgDims({ w: e.target.naturalWidth, h: e.target.naturalHeight }); drawBBoxes() }}
                  />
                  <canvas
                    ref={canvasRef}
                    className="absolute inset-0 w-full h-full"
                    style={{ pointerEvents: 'none' }}
                  />
                </div>

                {/* Telemetry Bar */}
                <div className="grid grid-cols-3 gap-2.5 mt-3 pt-3 border-t border-white/10 text-center">
                  <div className="bg-white/5 p-2 rounded-lg">
                    <p className="text-xs text-gray-400">Inference Speed</p>
                    <p className={`text-sm font-bold font-mono ${latencyStatus.color}`}>{result.inference_latency_ms.toFixed(1)} ms</p>
                  </div>
                  <div className="bg-white/5 p-2 rounded-lg">
                    <p className="text-xs text-gray-400">Mission Risk</p>
                    <span className={`text-xs px-2 py-0.5 rounded font-semibold mt-0.5 inline-block ${getRiskBadgeClass(result.risk_level)}`}>
                      {result.risk_level}
                    </span>
                  </div>
                  <div className="bg-white/5 p-2 rounded-lg">
                    <p className="text-xs text-gray-400">Anomaly Index</p>
                    <p className="text-sm font-bold text-white font-mono">{(result.anomaly_score * 100).toFixed(1)}%</p>
                  </div>
                </div>
              </div>

              {/* ─── TIER 2: Actual Debris or Anomaly Detected ─── */}
              <div className="glass-card p-5 border-purple-500/30 shadow-lg">
                <div className="flex items-center gap-2.5 mb-3 pb-3 border-b border-white/10">
                  <span className="w-7 h-7 rounded-lg bg-purple-500/20 text-purple-300 flex items-center justify-center font-bold text-xs">
                    2
                  </span>
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <Search className="w-4 h-4 text-purple-400" />
                      Actual Debris or Anomaly Detected
                    </h3>
                    <p className="text-xs text-gray-400">Classified underwater targets with calibrated certainty ratings</p>
                  </div>
                </div>

                {result.detections.length === 0 ? (
                  <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-sm font-bold text-white">Clean Seabed — No Debris Detected</h4>
                      <p className="text-xs text-emerald-200/80 mt-1 leading-relaxed">
                        The sonar image was analyzed across all 10 marine debris categories and AUV sonar acoustic contact models. No artificial debris, obstacles, or hazardous MILCO mine-like contacts were detected.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {result.detections.map((det, i) => (
                      <div
                        key={i}
                        className="p-4 rounded-xl bg-white/5 border border-white/10 hover:border-purple-500/40 transition-all space-y-2.5"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2.5">
                            <span
                              className="w-3 h-3 rounded-full flex-shrink-0 animate-pulse"
                              style={{ background: getRiskColor(det.risk_level) }}
                            />
                            <div>
                              <span className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold block">Target #{i + 1}</span>
                              <h4 className="text-base font-extrabold text-white capitalize">
                                {det.class_name.replace(/_/g, ' ')}
                              </h4>
                            </div>
                          </div>
                          <div className="text-right">
                            <span className="text-xs font-bold text-emerald-400 bg-emerald-500/20 border border-emerald-500/30 px-2.5 py-1 rounded-full font-mono">
                              {formatConfidence(det.confidence)} Match
                            </span>
                            <span className={`block text-[11px] font-semibold mt-1 ${getRiskBadgeClass(det.risk_level)}`}>
                              {det.risk_level} HAZARD
                            </span>
                          </div>
                        </div>

                        {/* Physical Detection Note */}
                        {det.object_description && (
                          <div className="text-xs text-gray-200 bg-black/40 p-2.5 rounded-lg border border-white/5 flex items-start gap-2">
                            <ShieldCheck className="w-4 h-4 text-ocean-400 flex-shrink-0 mt-0.5" />
                            <div>
                              <span className="text-ocean-300 font-semibold block text-[11px]">Identified Sonar Contact Profile:</span>
                              <span>{det.object_description}</span>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* ─── TIER 3: Detailed Information About the Debris ─── */}
              {result.detections.length > 0 && (
                <div className="glass-card p-5 border-blue-500/30 shadow-lg">
                  <div className="flex items-center gap-2.5 mb-3 pb-3 border-b border-white/10">
                    <span className="w-7 h-7 rounded-lg bg-blue-500/20 text-blue-300 flex items-center justify-center font-bold text-xs">
                      3
                    </span>
                    <div>
                      <h3 className="text-sm font-bold text-white flex items-center gap-2">
                        <Activity className="w-4 h-4 text-blue-400" />
                        Detailed Information About the Debris
                      </h3>
                      <p className="text-xs text-gray-400">Material composition, physical dimensions, and marine ecosystem threats</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {result.detections.map((det, i) => (
                      <div key={i} className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-blue-300 uppercase tracking-wider">
                            Detailed Intelligence • {det.class_name.replace(/_/g, ' ')}
                          </span>
                          <span className="text-xs text-gray-400 font-mono">
                            Coordinates: [{det.bbox.x1.toFixed(2)}, {det.bbox.y1.toFixed(2)} - {det.bbox.x2.toFixed(2)}, {det.bbox.y2.toFixed(2)}]
                          </span>
                        </div>

                        {/* Material & Size Grid */}
                        <div className="grid grid-cols-2 gap-2.5 text-xs">
                          <div className="bg-white/5 p-3 rounded-lg border border-white/5">
                            <span className="text-gray-400 block text-[10px] uppercase tracking-wider font-semibold mb-0.5">Material Composition</span>
                            <span className="text-white font-medium">{det.material || 'Synthetic / Composite Marine Material'}</span>
                          </div>
                          <div className="bg-white/5 p-3 rounded-lg border border-white/5">
                            <span className="text-gray-400 block text-[10px] uppercase tracking-wider font-semibold mb-0.5">Estimated Physical Dimensions</span>
                            <span className="text-white font-mono font-medium">~{det.estimated_size_m || '1.0'} meters</span>
                          </div>
                        </div>

                        {/* Environmental Threat Breakdown */}
                        {det.environmental_hazard && (
                          <div className="text-xs text-yellow-300/90 bg-yellow-500/10 border border-yellow-500/20 p-3 rounded-lg flex items-start gap-2.5">
                            <AlertTriangle className="w-4 h-4 text-yellow-400 flex-shrink-0 mt-0.5" />
                            <div>
                              <span className="font-semibold text-yellow-400 block text-[10px] uppercase tracking-wider mb-0.5">
                                Environmental & Marine Life Hazard
                              </span>
                              <span className="leading-relaxed">{det.environmental_hazard}</span>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ─── TIER 4: Suggestions to Remove Debris from Marine Life ─── */}
              {result.detections.length > 0 && (
                <div className="glass-card p-5 border-emerald-500/40 bg-emerald-950/10 shadow-lg">
                  <div className="flex items-center gap-2.5 mb-3 pb-3 border-b border-emerald-500/20">
                    <span className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-300 flex items-center justify-center font-bold text-xs">
                      4
                    </span>
                    <div>
                      <h3 className="text-sm font-bold text-white flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-emerald-400" />
                        Removal & Marine Life Protection Suggestions
                      </h3>
                      <p className="text-xs text-emerald-300/70">Actionable removal procedures, diver/ROV protocols, and fauna preservation steps</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {result.detections.map((det, i) => (
                      <div
                        key={i}
                        className="p-4 rounded-xl bg-emerald-900/20 border border-emerald-500/30 space-y-2.5"
                      >
                        <div className="flex items-center gap-2 text-emerald-300 text-xs font-semibold">
                          <LifeBuoy className="w-4 h-4 text-emerald-400" />
                          <span>Removal Protocol for {det.class_name.replace(/_/g, ' ').toUpperCase()}</span>
                        </div>

                        <div className="text-xs text-emerald-100/90 leading-relaxed bg-black/40 p-3 rounded-lg border border-emerald-500/20">
                          <span className="text-emerald-400 font-bold block mb-1">🌿 Safe Extraction Procedure:</span>
                          {det.removal_suggestion || (
                            "Deploy certified Scientific Diver team or Light Work-Class ROV with soft-clamp manipulator. Inspect for entangled sea turtles, crustaceans, or benthic organisms and disentangle gently before surface hoisting using pneumatic lift bags."
                          )}
                        </div>

                        <div className="flex items-center gap-4 text-[11px] text-emerald-300/80 pt-1">
                          <span className="flex items-center gap-1">
                            <Leaf className="w-3.5 h-3.5 text-emerald-400" />
                            Eco-Safe Protocol
                          </span>
                          <span className="flex items-center gap-1">
                            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                            Fauna Protection Verified
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ─── EXPERT CONFIRMATION DISPATCH ─── */}
              {result.detections.length > 0 && (
                <div className="glass-card p-5 border-cyan-500/40 bg-gradient-to-r from-ocean-950/40 via-cyan-950/20 to-ocean-950/40 shadow-xl">
                  <div className="flex items-center justify-between mb-3 pb-3 border-b border-cyan-500/20">
                    <div className="flex items-center gap-2.5">
                      <span className="w-8 h-8 rounded-xl bg-cyan-500/20 text-cyan-300 flex items-center justify-center font-bold text-sm">
                        <Send className="w-4 h-4 text-cyan-400" />
                      </span>
                      <div>
                        <h3 className="text-sm font-bold text-white flex items-center gap-2">
                          Marine Expert Confirmation Dispatch
                        </h3>
                        <p className="text-xs text-cyan-300/70">
                          AI agent automatically queues all detected sonar anomalies for Marine Expert verification
                        </p>
                      </div>
                    </div>
                    {expertSent ? (
                      <span className="flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 animate-pulse">
                        <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                        Auto-Dispatched to Expert
                      </span>
                    ) : (
                      <span className="text-xs px-2.5 py-1 rounded-full bg-cyan-500/20 text-cyan-300 font-medium">
                        Queued for Verification
                      </span>
                    )}
                  </div>

                  {expertSent ? (
                    <div className="p-4 rounded-xl bg-emerald-950/30 border border-emerald-500/30 space-y-3">
                      <div className="flex items-start gap-3">
                        <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                        <div className="flex-1">
                          <h4 className="text-sm font-bold text-white">Automatically Transmitted to Marine Expert Verification Queue!</h4>
                          <p className="text-xs text-emerald-200/80 mt-0.5">
                            Auto-dispatched at {expertSentTime || 'just now'} • The Marine Expert dashboard has received these highlighted sonar targets and will verify or confirm the findings.
                          </p>
                          {operatorNotes && (
                            <div className="mt-2 text-xs text-gray-300 bg-black/40 p-2.5 rounded-lg border border-emerald-500/20">
                              <span className="text-emerald-400 font-semibold block mb-0.5">Operator Dispatch Remarks:</span>
                              "{operatorNotes}"
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center justify-between pt-1 text-xs">
                        <span className="text-gray-400">
                          Pending confirmation: <strong className="text-white">{result.detections.length} target(s)</strong>
                        </span>
                        <button
                          onClick={() => setExpertSent(false)}
                          className="btn-ghost text-xs py-1 px-3 text-cyan-300 hover:text-cyan-200"
                        >
                          Update / Resend Notes
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs font-semibold text-gray-300 mb-1 flex items-center justify-between">
                          <span>Operator Field Notes for Expert (Optional)</span>
                          <span className="text-[10px] text-gray-500">Will be shown in the Marine Expert confirmation portal</span>
                        </label>
                        <textarea
                          className="input-field text-xs py-2"
                          rows={2}
                          placeholder="e.g., Sonar acoustic shadow confirms high specular reflection; please verify object type before recovery team dispatch."
                          value={operatorNotes}
                          onChange={e => setOperatorNotes(e.target.value)}
                        />
                      </div>

                      <div className="flex items-center justify-between flex-wrap gap-3">
                        <label className="flex items-center gap-2 cursor-pointer text-xs text-gray-300 select-none">
                          <input
                            type="checkbox"
                            checked={isHighPriority}
                            onChange={e => setIsHighPriority(e.target.checked)}
                            className="w-4 h-4 rounded border-white/20 bg-white/5 text-ocean-500 focus:ring-ocean-400"
                          />
                          <span>Flag as <strong className="text-orange-400">High Priority Verification</strong></span>
                        </label>

                        <button
                          onClick={sendToExpert}
                          disabled={sendingToExpert}
                          className="btn-ocean flex items-center gap-2 text-sm py-2.5 px-5 bg-gradient-to-r from-ocean-500 to-cyan-500 hover:from-ocean-400 hover:to-cyan-400 shadow-lg shadow-cyan-500/20"
                        >
                          {sendingToExpert ? (
                            <><Loader2 className="w-4 h-4 animate-spin" /> Transmitting Request...</>
                          ) : (
                            <><Send className="w-4 h-4" /> Send to Expert for Confirmation ({result.detections.length})</>
                          )}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Overall AI Mission Explanation */}
              <div className="glass-card p-4 border-white/10">
                <div className="flex items-center gap-2 mb-2">
                  <Info className="w-4 h-4 text-ocean-400" />
                  <p className="text-xs font-semibold text-white uppercase tracking-wider">Comprehensive Mission Summary</p>
                </div>
                <p className="text-xs text-gray-300 leading-relaxed">{result.explanation}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Survey History Page ──────────────────────────────────────────────────────
function SurveyHistory() {
  const [surveys, setSurveys] = useState([])
  const [loading, setLoading] = useState(true)
  const [images, setImages] = useState({})

  useEffect(() => {
    api.get('/surveys/')
      .then(r => {
        setSurveys(r.data)
        // Load images for each survey
        r.data.forEach(s => {
          api.get(`/surveys/${s.id}/images`)
            .then(ir => setImages(prev => ({ ...prev, [s.id]: ir.data })))
            .catch(() => {})
        })
      })
      .catch(() => toast.error('Failed to load surveys'))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white">Survey History</h1>
      {loading ? (
        <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 text-ocean-400 animate-spin" /></div>
      ) : (
        <div className="space-y-4">
          {surveys.map(survey => (
            <div key={survey.id} className="glass-card p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-bold text-white text-lg">{survey.title}</h3>
                  <p className="text-sm text-gray-400 mt-0.5">{survey.location_name || 'No location'} · {formatDate(survey.created_at)}</p>
                </div>
                <span className="text-xs font-medium px-3 py-1 rounded-full bg-ocean-500/20 text-ocean-300 border border-ocean-500/30 capitalize">{survey.status}</span>
              </div>
              {(images[survey.id] || []).length > 0 ? (
                <div className="grid grid-cols-1 gap-2">
                  {(images[survey.id] || []).slice(0, 3).map(img => (
                    <div key={img.id} className="flex items-center gap-3 p-3 bg-white/5 rounded-xl">
                      <Image className="w-4 h-4 text-ocean-400 flex-shrink-0" />
                      <p className="flex-1 text-sm text-gray-300 truncate">{img.original_filename}</p>
                      {img.processed && (
                        <>
                          <span className={getRiskBadgeClass(img.risk_level)}>{img.risk_level || '—'}</span>
                          <span className="text-xs text-gray-500 font-mono">{img.inference_latency_ms?.toFixed(1)}ms</span>
                        </>
                      )}
                      <span className={`text-xs ${img.processed ? 'text-green-400' : 'text-yellow-400'}`}>
                        {img.processed ? '✓ Analyzed' : '⏳ Pending'}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500">No images uploaded yet.</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Live Location Page ───────────────────────────────────────────────────────
function LiveLocation() {
  const [coords, setCoords] = useState(null)
  const [watching, setWatching] = useState(false)
  const watchId = useRef(null)

  const startWatch = () => {
    if (!navigator.geolocation) { toast.error('Geolocation not supported'); return }
    setWatching(true)
    watchId.current = navigator.geolocation.watchPosition(
      pos => setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude, acc: pos.coords.accuracy }),
      err => { toast.error(`Location error: ${err.message}`); setWatching(false) },
      { enableHighAccuracy: true }
    )
  }

  const stopWatch = () => {
    if (watchId.current) navigator.geolocation.clearWatch(watchId.current)
    setWatching(false)
  }

  useEffect(() => () => { if (watchId.current) navigator.geolocation.clearWatch(watchId.current) }, [])

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white">Live Survey Location</h1>
      <div className="glass-card p-6">
        <div className="flex items-center gap-3 mb-6">
          {watching ? (
            <button onClick={stopWatch} className="btn-ghost flex items-center gap-2">Stop Tracking</button>
          ) : (
            <button onClick={startWatch} className="btn-ocean flex items-center gap-2"><MapPin className="w-4 h-4" />Start GPS Tracking</button>
          )}
          {watching && <span className="flex items-center gap-2 text-green-400 text-sm"><span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />Live</span>}
        </div>
        {coords ? (
          <div className="grid grid-cols-3 gap-4">
            <div className="glass-card p-4 text-center">
              <p className="text-2xl font-bold font-mono text-ocean-400">{coords.lat.toFixed(6)}</p>
              <p className="text-xs text-gray-400 mt-1">Latitude</p>
            </div>
            <div className="glass-card p-4 text-center">
              <p className="text-2xl font-bold font-mono text-teal-400">{coords.lng.toFixed(6)}</p>
              <p className="text-xs text-gray-400 mt-1">Longitude</p>
            </div>
            <div className="glass-card p-4 text-center">
              <p className="text-2xl font-bold font-mono text-yellow-400">±{coords.acc?.toFixed(1)}m</p>
              <p className="text-xs text-gray-400 mt-1">Accuracy</p>
            </div>
          </div>
        ) : (
          <div className="text-center py-10">
            <MapPin className="w-12 h-12 text-gray-600 mx-auto mb-3" />
            <p className="text-gray-400">Click "Start GPS Tracking" to get your live location</p>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── SurveyOperator: Routes ───────────────────────────────────────────────────
export default function SurveyOperator() {
  return (
    <DashboardLayout>
      <Routes>
        <Route index element={<SurveyDashboard />} />
        <Route path="upload" element={<UploadAnalyze />} />
        <Route path="history" element={<SurveyHistory />} />
        <Route path="location" element={<LiveLocation />} />
      </Routes>
    </DashboardLayout>
  )
}
