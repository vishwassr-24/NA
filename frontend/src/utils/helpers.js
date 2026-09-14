// NEXUS AQUA - Utility helpers

/**
 * Get Tailwind CSS class name for a risk level string.
 * @param {string} risk - "LOW" | "MEDIUM" | "HIGH" | "CRITICAL"
 * @returns {string} badge class name
 */
export function getRiskBadgeClass(risk) {
  const map = {
    LOW:      'badge-low',
    MEDIUM:   'badge-medium',
    HIGH:     'badge-high',
    CRITICAL: 'badge-critical',
  }
  return map[risk?.toUpperCase()] || 'badge-low'
}

/**
 * Get hex color for a risk level (used for map markers etc.)
 */
export function getRiskColor(risk) {
  const map = {
    LOW:      '#22c55e',
    MEDIUM:   '#f59e0b',
    HIGH:     '#ef4444',
    CRITICAL: '#dc2626',
  }
  return map[risk?.toUpperCase()] || '#6b7280'
}

/**
 * Format a Date or ISO string to human-readable local time.
 */
export function formatDate(dateStr) {
  if (!dateStr) return '—'
  try {
    return new Intl.DateTimeFormat('en-IN', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(dateStr))
  } catch {
    return dateStr
  }
}

/**
 * Format file size in bytes to human-readable string.
 */
export function formatFileSize(bytes) {
  if (!bytes) return '—'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`
}

/**
 * Format confidence as percentage string.
 */
export function formatConfidence(conf) {
  if (conf === null || conf === undefined) return '—'
  return `${(conf * 100).toFixed(1)}%`
}

/**
 * Format latency with color indicator.
 * < 10ms = green (target), 10-50ms = yellow, > 50ms = red
 */
export function getLatencyStatus(ms) {
  if (!ms) return { color: 'text-gray-400', label: '—' }
  if (ms < 10)  return { color: 'text-green-400', label: `${ms.toFixed(1)} ms ⚡` }
  if (ms < 50)  return { color: 'text-yellow-400', label: `${ms.toFixed(1)} ms` }
  return { color: 'text-red-400', label: `${ms.toFixed(1)} ms` }
}

/**
 * Get human-readable role label.
 */
export function getRoleLabel(role) {
  const map = {
    admin:                'Administrator',
    survey_operator:      'Survey Operator',
    environment_officer:  'Environment Officer',
    marine_expert:        'Marine Expert',
    researcher:           'Researcher',
  }
  return map[role] || role
}

/**
 * Get role badge color classes.
 */
export function getRoleBadgeClass(role) {
  const map = {
    admin:                'bg-purple-500/20 text-purple-300 border-purple-500/30',
    survey_operator:      'bg-ocean-500/20 text-ocean-300 border-ocean-500/30',
    environment_officer:  'bg-green-500/20 text-green-300 border-green-500/30',
    marine_expert:        'bg-teal-500/20 text-teal-300 border-teal-500/30',
    researcher:           'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
  }
  return `${map[role] || 'bg-gray-500/20 text-gray-300 border-gray-500/30'} border text-xs font-semibold px-2.5 py-1 rounded-full`
}

/**
 * Clamp a value between min and max.
 */
export function clamp(val, min, max) {
  return Math.min(Math.max(val, min), max)
}

/**
 * Convert relative bbox coords [0,1] to absolute pixel coords.
 */
export function bboxToPixels(bbox, imgWidth, imgHeight) {
  return {
    x1: bbox.x1 * imgWidth,
    y1: bbox.y1 * imgHeight,
    x2: bbox.x2 * imgWidth,
    y2: bbox.y2 * imgHeight,
    width: (bbox.x2 - bbox.x1) * imgWidth,
    height: (bbox.y2 - bbox.y1) * imgHeight,
  }
}

/**
 * Get accurate, time-based greeting according to current local time without mistakes.
 * 05:00 - 11:59 -> "Good morning"
 * 12:00 - 16:59 -> "Good afternoon"
 * 17:00 - 21:59 -> "Good evening"
 * 22:00 - 04:59 -> "Good evening"
 */
export function getTimeGreeting(date = new Date()) {
  const hour = date.getHours()
  if (hour >= 5 && hour < 12) {
    return 'Good morning'
  }
  if (hour >= 12 && hour < 17) {
    return 'Good afternoon'
  }
  if (hour >= 17 && hour < 22) {
    return 'Good evening'
  }
  return 'Good evening'
}

