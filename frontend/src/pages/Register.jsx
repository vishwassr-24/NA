// NEXUS AQUA - Register Page

import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Anchor, Eye, EyeOff, AlertCircle, CheckCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../utils/api'
import ThemeToggle from '../components/ThemeToggle'

const ROLES = [
  { value: 'survey_operator',     label: 'Survey Operator',      desc: 'Upload and manage sonar surveys' },
  { value: 'environment_officer', label: 'Environment Officer',   desc: 'Manage hotspots and cleanup actions' },
  { value: 'marine_expert',       label: 'Marine Expert',         desc: 'Review AI detections (requires approval)' },
  { value: 'researcher',          label: 'Researcher',            desc: 'Access data and generate reports' },
  { value: 'admin',               label: 'Administrator',         desc: 'Full system access (requires approval)' },
]

const APPROVAL_ROLES = ['admin', 'marine_expert']

export default function Register() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')
  const [showPwd, setShowPwd] = useState(false)

  const [form, setForm] = useState({
    user_id: '', name: '', email: '', password: '', confirm_password: '', role: '',
  })

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value })
    setError('')
  }

  const validate = () => {
    if (!form.user_id || !form.name || !form.email || !form.password || !form.role) {
      return 'All fields are required.'
    }
    if (form.password !== form.confirm_password) {
      return 'Passwords do not match.'
    }
    if (form.password.length < 8) {
      return 'Password must be at least 8 characters.'
    }
    if (!/^[a-zA-Z0-9_-]+$/.test(form.user_id)) {
      return 'User ID must be alphanumeric (underscores/hyphens allowed).'
    }
    return null
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const validationError = validate()
    if (validationError) { setError(validationError); return }

    setLoading(true)
    try {
      await api.post('/auth/register', form)
      setSuccess(true)
      toast.success('Account created successfully!')
    } catch (err) {
      const detail = err.response?.data?.detail || 'Registration failed.'
      setError(detail)
      toast.error(detail)
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    const needsApproval = APPROVAL_ROLES.includes(form.role)
    return (
      <div className="min-h-screen bg-ocean-gradient flex items-center justify-center p-4">
        <ThemeToggle variant="float" />
        <div className="glass-card p-10 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-green-500/20 border border-green-500/30 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-8 h-8 text-green-400" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-3">Registration Successful!</h2>
          {needsApproval ? (
            <p className="text-gray-400 mb-6">
              Your account is <strong className="text-yellow-400">pending admin approval</strong> because you selected a sensitive role.
              You will be able to login once an administrator approves your account.
            </p>
          ) : (
            <p className="text-gray-400 mb-6">
              Your account is <strong className="text-green-400">active</strong>. You can log in now.
            </p>
          )}
          <button onClick={() => navigate('/login')} className="btn-ocean w-full">
            Go to Login
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-ocean-gradient flex items-center justify-center p-4">
      <ThemeToggle variant="float" />
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-ocean-500 to-teal-500 rounded-2xl shadow-xl mb-4">
            <Anchor className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white">Create Account</h1>
          <p className="text-gray-400 text-sm mt-1">Join the NEXUS AQUA platform</p>
        </div>

        <div className="glass-card p-8">
          {error && (
            <div className="flex items-start gap-3 bg-red-500/10 border border-red-500/30 rounded-xl p-4 mb-6">
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">User ID *</label>
                <input name="user_id" className="input-field" placeholder="e.g. johndoe123" value={form.user_id} onChange={handleChange} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Full Name *</label>
                <input name="name" className="input-field" placeholder="John Doe" value={form.name} onChange={handleChange} />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Email Address *</label>
              <input name="email" type="email" className="input-field" placeholder="john@example.com" value={form.email} onChange={handleChange} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Password *</label>
                <div className="relative">
                  <input name="password" type={showPwd ? 'text' : 'password'} className="input-field pr-10" placeholder="Min 8 characters" value={form.password} onChange={handleChange} />
                  <button type="button" onClick={() => setShowPwd(!showPwd)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                    {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Confirm Password *</label>
                <input name="confirm_password" type="password" className="input-field" placeholder="Repeat password" value={form.confirm_password} onChange={handleChange} />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Select Role *</label>
              <div className="space-y-2">
                {ROLES.map((role) => (
                  <label key={role.value} className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all duration-150 ${form.role === role.value ? 'bg-ocean-600/20 border-ocean-500/50' : 'bg-white/5 border-white/5 hover:border-white/15'}`}>
                    <input type="radio" name="role" value={role.value} checked={form.role === role.value} onChange={handleChange} className="mt-1 accent-ocean-500" />
                    <div>
                      <p className="text-sm font-medium text-white">{role.label}
                        {APPROVAL_ROLES.includes(role.value) && (
                          <span className="ml-2 text-xs text-yellow-400 font-normal">⏳ Requires approval</span>
                        )}
                      </p>
                      <p className="text-xs text-gray-400">{role.desc}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <button type="submit" disabled={loading} className="btn-ocean w-full mt-2">
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Creating account...
                </span>
              ) : 'Create Account'}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-5">
            Already have an account?{' '}
            <Link to="/login" className="text-ocean-400 hover:text-ocean-300 font-medium">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
