import { Link, useLocation, useNavigate } from 'react-router-dom'
import { BookIcon } from './Icons'

export default function Header({ mode = 'teacher', title, children }) {
  const location = useLocation()
  const navigate = useNavigate()
  const selectRole = (role) => {
    if (role === 'teacher') navigate(`/${location.pathname.startsWith('/report') ? location.pathname.slice(1) : ''}?role=teacher`)
    else navigate('/learn/demo-session?role=student')
  }
  return (
    <header className="site-header">
      <div className="header-inner">
        <Link className="brand" to="/?role=teacher" aria-label="Pragyanta home"><span className="brand-mark"><BookIcon /></span><span>Pragyanta</span></Link>
        {title && <div className="header-lesson"><span>Learning from</span><strong>{title}</strong></div>}
        <div className="header-actions">
          {children}
          <div className="role-switch" aria-label="Choose role">
            <button className={mode === 'teacher' ? 'active' : ''} onClick={() => selectRole('teacher')} aria-pressed={mode === 'teacher'}>Teacher</button>
            <button className={mode === 'student' ? 'active' : ''} onClick={() => selectRole('student')} aria-pressed={mode === 'student'}>Student</button>
          </div>
        </div>
      </div>
    </header>
  )
}
