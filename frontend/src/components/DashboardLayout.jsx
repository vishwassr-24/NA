// NEXUS AQUA - Dashboard Layout Wrapper
// Sidebar + main content area for all authenticated pages

import Sidebar from './Sidebar'

export default function DashboardLayout({ children }) {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        <div className="p-6 max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  )
}
