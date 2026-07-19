import { useEffect, useState } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import AppSidebar from './components/AppSidebar'
import Landing from './pages/Landing'
import Learn from './pages/Learn'
import Practice from './pages/Practice'
import Report from './pages/Report'

export default function App() {
  const location = useLocation()
  const [collapsed, setCollapsed] = useState(() => window.localStorage.getItem('pragyanta-sidebar-collapsed') === 'true')
  const [mobileOpen, setMobileOpen] = useState(false)
  useEffect(() => { window.localStorage.setItem('pragyanta-sidebar-collapsed', String(collapsed)) }, [collapsed])
  useEffect(() => {
    if (!location.hash) return
    const frame = window.requestAnimationFrame(() => document.querySelector(location.hash)?.scrollIntoView?.({ behavior: 'smooth' }))
    return () => window.cancelAnimationFrame(frame)
  }, [location.pathname, location.hash])
  return (
    <div className={`app-shell ${collapsed ? 'sidebar-collapsed' : ''}`}>
      <AppSidebar collapsed={collapsed} mobileOpen={mobileOpen} onCollapse={() => setCollapsed((value) => !value)} onMobileClose={(open = false) => setMobileOpen(open)} />
      <div className="app-content">
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/learn/:sessionId" element={<Learn />} />
          <Route path="/practice/:lessonId" element={<Practice />} />
          <Route path="/report/:lessonId" element={<Report />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </div>
  )
}
