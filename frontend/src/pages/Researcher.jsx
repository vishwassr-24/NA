// NEXUS AQUA - Researcher Module
// Handles: Analytics Dashboard, Detection Data Explorer, CSV Export, PDF Report Download

import { useState, useEffect } from 'react'
import { Routes, Route, Link } from 'react-router-dom'
import {
  BarChart2, FileText, Database, Download, Filter,
  Loader2, RefreshCw, Layers, TrendingUp, Cpu, CheckCircle
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts'
import toast from 'react-hot-toast'
import DashboardLayout from '../components/DashboardLayout'
import { useAuth } from '../context/AuthContext'
import api from '../utils/api'
import {
  getRiskBadgeClass, formatDate, formatConfidence, getTimeGreeting
} from '../utils/helpers'

const COLORS = ['#0ea5e9', '#14b8a6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899']

// ─── Researcher Overview & Analytics ─────────────────────────────────────────
function ResearcherAnalytics() {
  const { user } = useAuth()
  const [summary, setSummary] = useState(null)
  const [loading, setLoading] = useState(true)

  const fetchSummary = () => {
    setLoading(true)
    api.get('/researcher/summary')
      .then(res => setSummary(res.data))
      .catch(() => toast.error('Failed to load researcher metrics'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    fetchSummary()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-ocean-400 animate-spin" />
      </div>
    )
  }

  // Transform class distribution for Recharts
  const classData = summary?.detections?.class_distribution
    ? Object.entries(summary.detections.class_distribution).map(([name, count]) => ({
        name: name.replace(/_/g, ' '),
        count,
      }))
    : []

  // Detection status breakdown
  const statusData = [
    { name: 'Auto-Confirmed', value: summary?.detections?.auto_confirmed ?? 0 },
    { name: 'Expert Confirmed', value: summary?.detections?.expert_confirmed ?? 0 },
    { name: 'Rejected', value: summary?.detections?.rejected ?? 0 },
  ].filter(d => d.value > 0)

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Scientific Research & Analytics</h1>
          <p className="text-gray-400 text-sm mt-1">
            <strong className="text-ocean-400 font-semibold">{getTimeGreeting()}</strong>, {user?.name || 'Researcher'}! Empirical data analysis of underwater marine debris detected via side-scan sonar.
          </p>
        </div>
        <div className="flex gap-3">
          <Link to="/researcher/reports" className="btn-ocean flex items-center gap-2">
            <Download className="w-4 h-4" /> Reports & Exports
          </Link>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="stat-card">
          <div className="w-10 h-10 bg-ocean-500/20 rounded-xl flex items-center justify-center mb-1">
            <Database className="w-5 h-5 text-ocean-400" />
          </div>
          <p className="text-2xl font-bold text-white">{summary?.detections?.total ?? 0}</p>
          <p className="text-sm text-gray-400">Total Detections</p>
        </div>

        <div className="stat-card">
          <div className="w-10 h-10 bg-teal-500/20 rounded-xl flex items-center justify-center mb-1">
            <Layers className="w-5 h-5 text-teal-400" />
          </div>
          <p className="text-2xl font-bold text-white">{summary?.images?.processed ?? 0}</p>
          <p className="text-sm text-gray-400">Sonar Scans Analyzed</p>
        </div>

        <div className="stat-card">
          <div className="w-10 h-10 bg-yellow-500/20 rounded-xl flex items-center justify-center mb-1">
            <Cpu className="w-5 h-5 text-yellow-400" />
          </div>
          <p className="text-2xl font-bold text-yellow-400 font-mono">
            {summary?.ai_performance?.average_latency_ms ?? 0} ms
          </p>
          <p className="text-sm text-gray-400">Avg AI Inference Latency</p>
        </div>

        <div className="stat-card">
          <div className="w-10 h-10 bg-purple-500/20 rounded-xl flex items-center justify-center mb-1">
            <CheckCircle className="w-5 h-5 text-purple-400" />
          </div>
          <p className="text-2xl font-bold text-white">{summary?.expert_reviews?.total ?? 0}</p>
          <p className="text-sm text-gray-400">Expert Reviews Conducted</p>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Class Distribution Bar Chart */}
        <div className="glass-card p-6">
          <h3 className="text-lg font-bold text-white mb-1 flex items-center gap-2">
            <BarChart2 className="w-5 h-5 text-ocean-400" />
            Debris Taxonomy Frequency
          </h3>
          <p className="text-xs text-gray-400 mb-4">Frequency count of detected marine litter classes</p>

          <div className="h-64 w-full">
            {classData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-gray-500">
                No detection data recorded yet
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={classData}>
                  <XAxis dataKey="name" stroke="#64748b" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                  <YAxis stroke="#64748b" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px' }}
                    itemStyle={{ color: '#38bdf8' }}
                  />
                  <Bar dataKey="count" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Verification Status Breakdown */}
        <div className="glass-card p-6">
          <h3 className="text-lg font-bold text-white mb-1 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-teal-400" />
            Classification Confidence & Verification
          </h3>
          <p className="text-xs text-gray-400 mb-4">Human-in-the-loop validation breakdown</p>

          <div className="h-64 w-full flex items-center justify-center">
            {statusData.length === 0 ? (
              <div className="text-gray-500">No verification data yet</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {statusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px' }}
                  />
                  <Legend wrapperStyle={{ fontSize: '12px', color: '#94a3b8' }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Detection Data Explorer ─────────────────────────────────────────────────
function DetectionDataExplorer() {
  const [detections, setDetections] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchClass, setSearchClass] = useState('')
  const [filterRisk, setFilterRisk] = useState('ALL')

  const fetchDetections = () => {
    setLoading(true)
    api.get('/researcher/detections')
      .then(res => setDetections(res.data))
      .catch(() => toast.error('Failed to load detection logs'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    fetchDetections()
  }, [])

  const filtered = detections.filter(d => {
    const matchesClass = !searchClass || d.class_name.toLowerCase().includes(searchClass.toLowerCase())
    const matchesRisk = filterRisk === 'ALL' || d.risk_level === filterRisk
    return matchesClass && matchesRisk
  })

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Detection Information & Dataset</h1>
          <p className="text-gray-400 text-sm mt-1">Raw validated detections with coordinate and survey telemetry</p>
        </div>
        <div className="flex items-center gap-3">
          <Link to="/researcher/reports" className="btn-ocean text-sm py-2 px-3 flex items-center gap-1">
            <Download className="w-4 h-4" /> Export Raw CSV
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="glass-card p-4 flex flex-wrap gap-4 items-center">
        <div className="flex-1 min-w-[200px]">
          <input
            type="text"
            className="input-field"
            placeholder="Search class (e.g. fishing_net, tire, bottle)..."
            value={searchClass}
            onChange={e => setSearchClass(e.target.value)}
          />
        </div>
        <div>
          <select
            value={filterRisk}
            onChange={e => setFilterRisk(e.target.value)}
            className="input-field py-3 text-sm"
          >
            <option value="ALL">All Risk Levels</option>
            <option value="CRITICAL">Critical</option>
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
            <option value="LOW">Low</option>
          </select>
        </div>
        <button onClick={fetchDetections} className="btn-ghost flex items-center gap-1 text-sm py-3 px-4">
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 text-ocean-400 animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="glass-card p-12 text-center text-gray-400">
          No detections matching criteria found.
        </div>
      ) : (
        <div className="glass-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-white/5 border-b border-white/10 text-xs text-gray-400 uppercase">
                <tr>
                  <th className="p-4">ID</th>
                  <th className="p-4">Class</th>
                  <th className="p-4">Confidence</th>
                  <th className="p-4">Risk Level</th>
                  <th className="p-4">Survey & Location</th>
                  <th className="p-4">Bounding Box</th>
                  <th className="p-4">Verification</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filtered.map((d) => (
                  <tr key={d.detection_id} className="hover:bg-white/5 transition-colors">
                    <td className="p-4 font-mono text-gray-400 text-xs">#{d.detection_id}</td>
                    <td className="p-4 font-semibold text-white capitalize">{d.class_name.replace(/_/g, ' ')}</td>
                    <td className="p-4 font-mono font-medium text-ocean-300">
                      {formatConfidence(d.confidence)}
                    </td>
                    <td className="p-4">
                      <span className={getRiskBadgeClass(d.risk_level)}>{d.risk_level || 'N/A'}</span>
                    </td>
                    <td className="p-4">
                      <p className="text-white font-medium">{d.survey_title || 'General Sweep'}</p>
                      <p className="text-xs text-gray-500 font-mono">
                        {d.latitude && d.longitude ? `${d.latitude.toFixed(4)}, ${d.longitude.toFixed(4)}` : 'Coordinates N/A'}
                      </p>
                    </td>
                    <td className="p-4 font-mono text-xs text-gray-400">
                      [{d.bbox.x1.toFixed(2)}, {d.bbox.y1.toFixed(2)}, {d.bbox.x2.toFixed(2)}, {d.bbox.y2.toFixed(2)}]
                    </td>
                    <td className="p-4">
                      <span className={`text-xs px-2 py-0.5 rounded ${
                        d.status === 'confirmed' ? 'bg-green-500/20 text-green-300' :
                        d.status === 'changed' ? 'bg-teal-500/20 text-teal-300' :
                        d.status === 'auto_confirmed' ? 'bg-blue-500/20 text-blue-300' :
                        'bg-yellow-500/20 text-yellow-300'
                      }`}>
                        {d.status}
                      </span>
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

// ─── Reports & Export Module ─────────────────────────────────────────────────
function ReportsExportModule() {
  const [downloadingCsv, setDownloadingCsv] = useState(false)
  const [downloadingPdf, setDownloadingPdf] = useState(false)

  const handleDownloadCsv = async () => {
    setDownloadingCsv(true)
    try {
      const response = await api.get('/researcher/export/csv', {
        responseType: 'blob',
      })
      const blob = new Blob([response.data], { type: 'text/csv' })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `nexus_aqua_research_detections_${Date.now()}.csv`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
      toast.success('CSV dataset exported successfully!')
    } catch {
      toast.error('Failed to export CSV dataset')
    } finally {
      setDownloadingCsv(false)
    }
  }

  const handleDownloadPdf = async () => {
    setDownloadingPdf(true)
    try {
      const response = await api.get('/researcher/export/report', {
        responseType: 'blob',
      })
      const blob = new Blob([response.data], { type: 'application/pdf' })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `nexus_aqua_scientific_report_${Date.now()}.pdf`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
      toast.success('PDF report downloaded successfully!')
    } catch (err) {
      toast.error('Failed to generate PDF report')
    } finally {
      setDownloadingPdf(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Reports & Data Export Center</h1>
        <p className="text-gray-400 text-sm mt-1">Generate publication-ready reports and download raw datasets</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* PDF Card */}
        <div className="glass-card p-6 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="w-12 h-12 rounded-xl bg-red-500/20 flex items-center justify-center text-red-400 mb-2">
              <FileText className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white">Comprehensive PDF Executive Report</h3>
            <p className="text-sm text-gray-300">
              Generates an official NEXUS AQUA project synthesis report containing executive summaries,
              debris taxonomies, geospatial coordinates, and remediation urgency.
            </p>
            <ul className="text-xs text-gray-400 space-y-1 list-disc list-inside pt-2">
              <li>Executive metrics and detection totals</li>
              <li>Taxonomy distribution tables</li>
              <li>Hotspot coordinate registry</li>
              <li>National ecological intelligence compliance</li>
            </ul>
          </div>
          <button
            onClick={handleDownloadPdf}
            disabled={downloadingPdf}
            className="btn-ocean w-full mt-6 flex items-center justify-center gap-2"
          >
            {downloadingPdf ? <Loader2 className="w-5 h-5 animate-spin" /> : <Download className="w-5 h-5" />}
            Download PDF Report
          </button>
        </div>

        {/* CSV Card */}
        <div className="glass-card p-6 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="w-12 h-12 rounded-xl bg-teal-500/20 flex items-center justify-center text-teal-400 mb-2">
              <Database className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white">Full CSV Dataset Export</h3>
            <p className="text-sm text-gray-300">
              Download clean tabular comma-separated values compatible with Python, Pandas, R, GIS tools, and
              oceanographic models.
            </p>
            <ul className="text-xs text-gray-400 space-y-1 list-disc list-inside pt-2">
              <li>Normalized Bounding box coordinates [x1, y1, x2, y2]</li>
              <li>Statistical anomaly scores</li>
              <li>Inference latency measurements (ms)</li>
              <li>Marine Expert review actions & annotations</li>
            </ul>
          </div>
          <button
            onClick={handleDownloadCsv}
            disabled={downloadingCsv}
            className="btn-teal w-full mt-6 flex items-center justify-center gap-2"
          >
            {downloadingCsv ? <Loader2 className="w-5 h-5 animate-spin" /> : <Download className="w-5 h-5" />}
            Export Dataset (CSV)
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Researcher Parent Route Wrapper ─────────────────────────────────────────
export default function Researcher() {
  return (
    <DashboardLayout>
      <Routes>
        <Route index element={<ResearcherAnalytics />} />
        <Route path="analytics" element={<ResearcherAnalytics />} />
        <Route path="data" element={<DetectionDataExplorer />} />
        <Route path="reports" element={<ReportsExportModule />} />
      </Routes>
    </DashboardLayout>
  )
}
