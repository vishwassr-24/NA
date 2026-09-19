// NEXUS AQUA - High-Risk & Marine Life Hazard Emergency Pop-up Modal
// Exclusively active for: Administrator and Researcher roles
// Triggers whenever high-risk debris or acute danger to marine life is detected

import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  AlertTriangle, ShieldAlert, CheckCircle, X,
  MapPin, ChevronLeft, ChevronRight, Waves, ExternalLink,
  LifeBuoy, Bell, Radio, Info
} from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../utils/api'
import { useAuth } from '../context/AuthContext'

export default function MarineHazardAlertModal() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const [hazards, setHazards] = useState([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isOpen, setIsOpen] = useState(false)
  const [showBellDropdown, setShowBellDropdown] = useState(false)
  const [acknowledgedIds, setAcknowledgedIds] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('acknowledged_marine_hazards') || '[]')
    } catch {
      return []
    }
  })

  // Only active for Admin and Researcher
  const isTargetRole = user?.role === 'admin' || user?.role === 'researcher'

  const fetchHazards = useCallback(async () => {
    if (!isTargetRole) return
    try {
      const res = await api.get('/alerts/marine-hazards')
      const allHazards = res.data?.hazards || []
      setHazards(allHazards)

      // Check if there are any unacknowledged alerts
      const storedAck = JSON.parse(localStorage.getItem('acknowledged_marine_hazards') || '[]')
      const unacknowledged = allHazards.filter(h => !storedAck.includes(h.id))

      if (unacknowledged.length > 0 && !sessionStorage.getItem('dismissed_hazard_popup')) {
        setIsOpen(true)
        // Default to first unacknowledged alert
        const firstUnackIndex = allHazards.findIndex(h => !storedAck.includes(h.id))
        if (firstUnackIndex !== -1) {
          setCurrentIndex(firstUnackIndex)
        }
      }
    } catch {
      // Silently handle if network drops
    }
  }, [isTargetRole])

  useEffect(() => {
    if (isTargetRole) {
      fetchHazards()
      // Real-time polling every 25 seconds to catch newly uploaded high-risk scans
      const interval = setInterval(fetchHazards, 25000)
      return () => clearInterval(interval)
    }
  }, [fetchHazards, isTargetRole])

  if (!isTargetRole || hazards.length === 0) return null

  const currentHazard = hazards[currentIndex] || hazards[0]
  const isCurrentAck = acknowledgedIds.includes(currentHazard?.id)
  const unackCount = hazards.filter(h => !acknowledgedIds.includes(h.id)).length

  const acknowledgeCurrent = () => {
    if (!currentHazard) return
    const newAck = Array.from(new Set([...acknowledgedIds, currentHazard.id]))
    setAcknowledgedIds(newAck)
    localStorage.setItem('acknowledged_marine_hazards', JSON.stringify(newAck))
    toast.success(`Hazard alert #${currentHazard.id} acknowledged`, { icon: '🛡️' })

    // If more unacknowledged alerts exist, show next; otherwise close
    const nextUnack = hazards.findIndex(h => !newAck.includes(h.id))
    if (nextUnack !== -1) {
      setCurrentIndex(nextUnack)
    } else {
      setIsOpen(false)
      sessionStorage.setItem('dismissed_hazard_popup', 'true')
    }
  }

  const acknowledgeAll = () => {
    const allIds = hazards.map(h => h.id)
    setAcknowledgedIds(allIds)
    localStorage.setItem('acknowledged_marine_hazards', JSON.stringify(allIds))
    setIsOpen(false)
    sessionStorage.setItem('dismissed_hazard_popup', 'true')
    toast.success(`All ${hazards.length} high-risk marine hazard alerts acknowledged`, { icon: '✅' })
  }

  const closePopup = () => {
    setIsOpen(false)
    sessionStorage.setItem('dismissed_hazard_popup', 'true')
  }

  const openAlertByIndex = (idx) => {
    setCurrentIndex(idx)
    setIsOpen(true)
    setShowBellDropdown(false)
  }

  const goToLocation = () => {
    setIsOpen(false)
    if (user?.role === 'admin') {
      navigate('/environment/map')
    } else {
      navigate('/researcher/data')
    }
  }

  return (
    <>
      {/* ─── Top Notification Bar Bell for Admin & Researcher ─── */}
      <div className="fixed top-4 right-6 z-40 flex items-center gap-3">
        <div className="relative">
          <button
            onClick={() => setShowBellDropdown(prev => !prev)}
            title="Marine Life Hazard Alerts"
            className={`px-3 py-1.5 rounded-xl border flex items-center gap-2 backdrop-blur-md transition-all shadow-lg text-xs font-semibold ${
              unackCount > 0
                ? 'bg-rose-500/20 border-rose-500/50 text-rose-300 hover:bg-rose-500/30 animate-pulse'
                : 'bg-navy-900/80 border-white/10 text-gray-300 hover:text-white hover:bg-white/10'
            }`}
          >
            <div className="relative">
              <Bell className={`w-4 h-4 ${unackCount > 0 ? 'text-rose-400' : 'text-gray-400'}`} />
              {unackCount > 0 && (
                <span className="absolute -top-1 -right-1 w-2 h-2 bg-rose-500 rounded-full animate-ping" />
              )}
            </div>
            <span>Marine Hazard Alert</span>
            {unackCount > 0 ? (
              <span className="px-1.5 py-0.2 bg-rose-500 text-white rounded-full text-[10px] font-bold">
                {unackCount}
              </span>
            ) : (
              <span className="px-1.5 py-0.2 bg-white/10 text-gray-400 rounded-full text-[10px]">
                {hazards.length}
              </span>
            )}
          </button>

          {/* Alert Dropdown */}
          {showBellDropdown && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 glass-card p-4 rounded-2xl shadow-2xl border border-rose-500/30 z-50 animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between pb-3 border-b border-white/10">
                <div className="flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-rose-400" />
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider">Marine Life Threats</h4>
                </div>
                <span className="text-[10px] text-gray-400">
                  {unackCount} pending · {hazards.length} total
                </span>
              </div>

              <div className="max-h-72 overflow-y-auto space-y-2 py-2">
                {hazards.map((h, i) => {
                  const isAck = acknowledgedIds.includes(h.id)
                  return (
                    <div
                      key={h.id}
                      onClick={() => openAlertByIndex(i)}
                      className={`p-2.5 rounded-xl border text-left cursor-pointer transition-all ${
                        i === currentIndex && isOpen
                          ? 'bg-rose-500/20 border-rose-500/50'
                          : isAck
                          ? 'bg-white/5 border-white/5 opacity-75 hover:opacity-100 hover:bg-white/10'
                          : 'bg-rose-950/40 border-rose-500/30 hover:bg-rose-900/40'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-bold text-white truncate">{h.debris_label}</span>
                        <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${
                          h.severity === 'CRITICAL' ? 'bg-rose-500/30 text-rose-300' : 'bg-amber-500/30 text-amber-300'
                        }`}>
                          {h.severity}
                        </span>
                      </div>
                      <p className="text-[11px] text-gray-400 line-clamp-1 mt-1">{h.marine_life_hazard}</p>
                      <div className="flex items-center justify-between mt-2 text-[10px] text-gray-500">
                        <span>{h.location_name || h.survey_title}</span>
                        <span>{isAck ? '✓ Acknowledged' : '⚠️ Action Needed'}</span>
                      </div>
                    </div>
                  )
                })}
              </div>

              <div className="pt-2 border-t border-white/10 flex items-center justify-between gap-2">
                <button
                  onClick={acknowledgeAll}
                  className="text-[11px] text-gray-400 hover:text-white transition-colors"
                >
                  Dismiss all
                </button>
                <button
                  onClick={() => openAlertByIndex(0)}
                  className="btn-ocean text-xs py-1 px-2.5 flex items-center gap-1"
                >
                  <AlertTriangle className="w-3 h-3 text-rose-300" /> Open Full Alert
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ─── Emergency High-Risk Marine Life Hazard Modal Pop-up ─── */}
      {isOpen && currentHazard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-950/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="relative w-full max-w-2xl bg-gradient-to-b from-navy-900 via-navy-900/95 to-navy-950 border-2 border-rose-500/60 rounded-3xl shadow-2xl shadow-rose-950/50 overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Top Critical Header Banner */}
            <div className="bg-gradient-to-r from-rose-600 via-red-600 to-amber-600 px-6 py-4 text-white flex items-center justify-between shadow-lg">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-black/20 flex items-center justify-center animate-bounce">
                  <ShieldAlert className="w-5 h-5 text-white" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-black uppercase tracking-widest bg-black/30 px-2 py-0.5 rounded-full">
                      Automated Eco-Alert
                    </span>
                    <span className="w-2 h-2 rounded-full bg-white animate-ping" />
                  </div>
                  <h3 className="text-base sm:text-lg font-extrabold tracking-tight">
                    HIGH RISK ALERT: DANGER TO MARINE LIFE
                  </h3>
                </div>
              </div>

              <button
                onClick={closePopup}
                className="w-8 h-8 rounded-full bg-black/20 hover:bg-black/40 flex items-center justify-center text-white/80 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-5 max-h-[78vh] overflow-y-auto">
              {/* Alert Pagination & Status Header */}
              <div className="flex items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2">
                  <span className={`px-2.5 py-1 rounded-full font-bold uppercase tracking-wider flex items-center gap-1.5 ${
                    currentHazard.severity === 'CRITICAL'
                      ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                      : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                  }`}>
                    <AlertTriangle className="w-3.5 h-3.5" />
                    {currentHazard.severity} SEVERITY
                  </span>
                  <span className="text-gray-400">
                    Hazard {currentIndex + 1} of {hazards.length}
                  </span>
                </div>

                {hazards.length > 1 && (
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setCurrentIndex(prev => (prev > 0 ? prev - 1 : hazards.length - 1))}
                      className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 transition-colors"
                      title="Previous hazard"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setCurrentIndex(prev => (prev < hazards.length - 1 ? prev + 1 : 0))}
                      className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 transition-colors"
                      title="Next hazard"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>

              {/* Target Identification & Location Grid */}
              <div className="glass-card p-4 border border-rose-500/30 rounded-2xl bg-gradient-to-br from-rose-500/10 to-transparent">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold text-rose-400 uppercase tracking-wider">Detected Marine Anomaly</p>
                    <h4 className="text-xl font-bold text-white mt-0.5">{currentHazard.debris_label}</h4>
                    {currentHazard.material && (
                      <p className="text-xs text-gray-300 mt-1">
                        Material Composition: <span className="text-white font-medium">{currentHazard.material}</span>
                      </p>
                    )}
                  </div>
                  {currentHazard.confidence && (
                    <div className="text-right">
                      <span className="text-[10px] text-gray-400 uppercase">Confidence</span>
                      <p className="text-base font-bold font-mono text-emerald-400">
                        {(currentHazard.confidence * 100).toFixed(0)}%
                      </p>
                    </div>
                  )}
                </div>

                <div className="mt-3 pt-3 border-t border-white/10 flex items-center gap-4 text-xs text-gray-300 flex-wrap">
                  <span className="flex items-center gap-1.5 text-ocean-300 font-medium">
                    <MapPin className="w-3.5 h-3.5 text-ocean-400" />
                    {currentHazard.location_name || currentHazard.survey_title}
                  </span>
                  {currentHazard.latitude && currentHazard.longitude && (
                    <span className="font-mono text-gray-400">
                      Coordinates: {currentHazard.latitude.toFixed(4)}° N, {currentHazard.longitude.toFixed(4)}° E
                    </span>
                  )}
                  {currentHazard.depth_m && (
                    <span className="font-mono text-cyan-400">
                      Depth: {currentHazard.depth_m}m
                    </span>
                  )}
                </div>
              </div>

              {/* Specific Marine Life Danger Box */}
              <div className="p-4 rounded-2xl bg-rose-950/50 border border-rose-500/40 text-rose-100 shadow-inner">
                <div className="flex items-center gap-2 text-rose-300 mb-1.5">
                  <Radio className="w-4 h-4 animate-pulse text-rose-400" />
                  <h5 className="text-xs font-bold uppercase tracking-wider">Ecological & Marine Life Threat</h5>
                </div>
                <p className="text-sm leading-relaxed text-rose-100/90 font-medium">
                  {currentHazard.marine_life_hazard}
                </p>
              </div>

              {/* Recommended Emergency Removal Strategy */}
              <div className="p-4 rounded-2xl bg-ocean-950/50 border border-ocean-500/30 text-ocean-100">
                <div className="flex items-center gap-2 text-ocean-300 mb-1.5">
                  <LifeBuoy className="w-4 h-4 text-ocean-400" />
                  <h5 className="text-xs font-bold uppercase tracking-wider">Safe Removal & Faunal Protection Strategy</h5>
                </div>
                <p className="text-xs leading-relaxed text-gray-300">
                  {currentHazard.removal_strategy}
                </p>
              </div>

              {/* Role Context Notice */}
              <div className="flex items-center gap-2 text-[11px] text-gray-400 bg-white/5 p-2.5 rounded-xl border border-white/5">
                <Info className="w-3.5 h-3.5 text-ocean-400 flex-shrink-0" />
                <span>
                  Dispatched exclusively to <strong>{user?.role === 'admin' ? 'Administrator' : 'Researcher'}</strong> workstation for immediate oversight and priority intervention planning.
                </span>
              </div>
            </div>

            {/* Modal Footer Controls */}
            <div className="px-6 py-4 bg-navy-950 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3">
              <button
                onClick={goToLocation}
                className="btn-ghost text-xs w-full sm:w-auto flex items-center justify-center gap-1.5 text-ocean-400 hover:text-ocean-300"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                {user?.role === 'admin' ? 'Inspect on Hotspot Map' : 'Open Researcher Explorer'}
              </button>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  onClick={acknowledgeAll}
                  className="btn-ghost text-xs py-2 px-3 flex-1 sm:flex-initial text-gray-400 hover:text-white"
                >
                  Dismiss All
                </button>
                <button
                  onClick={acknowledgeCurrent}
                  className="btn-ocean text-xs py-2 px-4 flex-1 sm:flex-initial flex items-center justify-center gap-1.5 font-bold shadow-lg"
                >
                  <CheckCircle className="w-4 h-4" /> Acknowledge Alert
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
