// NEXUS AQUA - Application Router & Main Entry
// Enforces:
// 1. First page is always Login (no landing page or public dashboard)
// 2. Immediate role-based dashboard redirection upon login
// 3. Strict RBAC protection on all internal routes
// 4. Lazy-loading for role dashboard modules for instant startup performance

import React, { Suspense, lazy } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import Unauthorized from './pages/Unauthorized'
import ProtectedRoute from './components/ProtectedRoute'
import { Loader2 } from 'lucide-react'
import { useTheme } from './context/ThemeContext'

// Code-split heavy dashboard pages so Login loads instantly without dependencies
const SurveyOperator = lazy(() => import('./pages/SurveyOperator'))
const MarineExpert = lazy(() => import('./pages/MarineExpert'))
const EnvironmentOfficer = lazy(() => import('./pages/EnvironmentOfficer'))
const Researcher = lazy(() => import('./pages/Researcher'))
const Admin = lazy(() => import('./pages/Admin'))

function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-navy-950 dark:bg-navy-950 light:bg-slate-50">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="w-10 h-10 text-ocean-500 animate-spin" />
        <p className="text-gray-400 dark:text-gray-400 light:text-slate-500 text-sm">Loading workstation module...</p>
      </div>
    </div>
  )
}

export default function App() {
  const { isDark } = useTheme()

  return (
    <>
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: isDark ? '#0f172a' : '#ffffff',
            color: isDark ? '#e2e8f0' : '#0f172a',
            border: isDark ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid rgba(203, 213, 225, 0.8)',
            boxShadow: isDark ? '0 10px 25px -5px rgba(0, 0, 0, 0.5)' : '0 10px 25px -5px rgba(15, 23, 42, 0.1)',
            borderRadius: '12px',
            fontSize: '14px',
          },
          success: {
            iconTheme: {
              primary: '#14b8a6',
              secondary: isDark ? '#0f172a' : '#ffffff',
            },
          },
          error: {
            iconTheme: {
              primary: '#ef4444',
              secondary: isDark ? '#0f172a' : '#ffffff',
            },
          },
        }}
      />

      <Routes>
        {/* The very first page is always Login */}
        <Route path="/" element={<Login />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/unauthorized" element={<Unauthorized />} />

        {/* Dynamic Role-Based Redirector */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />

        {/* Survey Operator Routes */}
        <Route
          path="/survey/*"
          element={
            <ProtectedRoute allowedRoles={['admin', 'survey_operator']}>
              <Suspense fallback={<PageLoader />}>
                <SurveyOperator />
              </Suspense>
            </ProtectedRoute>
          }
        />
        <Route path="/surveys" element={<Navigate to="/survey/list" replace />} />
        <Route path="/surveys/*" element={<Navigate to="/survey/list" replace />} />

        {/* Marine Expert Routes */}
        <Route
          path="/expert/*"
          element={
            <ProtectedRoute allowedRoles={['admin', 'marine_expert']}>
              <Suspense fallback={<PageLoader />}>
                <MarineExpert />
              </Suspense>
            </ProtectedRoute>
          }
        />

        {/* Environment Officer Routes */}
        <Route
          path="/environment/*"
          element={
            <ProtectedRoute allowedRoles={['admin', 'environment_officer']}>
              <Suspense fallback={<PageLoader />}>
                <EnvironmentOfficer />
              </Suspense>
            </ProtectedRoute>
          }
        />

        {/* Researcher Routes */}
        <Route
          path="/researcher/*"
          element={
            <ProtectedRoute allowedRoles={['admin', 'researcher']}>
              <Suspense fallback={<PageLoader />}>
                <Researcher />
              </Suspense>
            </ProtectedRoute>
          }
        />

        {/* Administrator Routes (Admin only) */}
        <Route
          path="/admin/*"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <Suspense fallback={<PageLoader />}>
                <Admin />
              </Suspense>
            </ProtectedRoute>
          }
        />

        {/* Fallback - Send back to home/login */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  )
}
