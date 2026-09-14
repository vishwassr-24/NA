// NEXUS AQUA - API Client
// Centralised Axios instance with JWT interceptor and base URL

import axios from 'axios'

const API_BASE = import.meta.env.VITE_API_URL || '/api'

const api = axios.create({
  baseURL: API_BASE,
  timeout: 60000, // 60s for AI inference (model download on first run)
})

// ── Request interceptor: attach JWT token ────────────────────────────────────
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('nexus_token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// ── Response interceptor: handle 401 (auto logout) ───────────────────────────
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid — clear storage and redirect to login
      localStorage.removeItem('nexus_token')
      localStorage.removeItem('nexus_user')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export default api
