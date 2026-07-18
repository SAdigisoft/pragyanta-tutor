import { Navigate, Route, Routes } from 'react-router-dom'
import Landing from './pages/Landing'
import Learn from './pages/Learn'
import Report from './pages/Report'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/learn/:sessionId" element={<Learn />} />
      <Route path="/report/:lessonId" element={<Report />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
