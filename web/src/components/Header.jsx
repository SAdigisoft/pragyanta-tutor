import { Link, useLocation, useNavigate } from 'react-router-dom'
import { BookIcon, UserIcon } from './Icons'

export default function Header({ mode = 'teacher', title, children }) {
  const location = useLocation()
  const navigate = useNavigate()
  const queryRole = new URLSearchParams(location.search).get('role')
  const selectedRole = queryRole || mode
  const selectRole = (role) => {
    if (role === 'teacher') navigate(`${location.pathname.startsWith('/report') ? location.pathname : '/'}?role=teacher`)
    else if (location.pathname.startsWith('/learn/')) navigate(`${location.pathname}?role=student`)
    else navigate('/?role=student')
  }
  return (
    <header className="site-header">
      <div className="header-inner">
        <Link className="brand" to="/?role=teacher" aria-label="Pragyanta home"><span className="brand-mark"><BookIcon size={38} /></span><span><strong>Pragyanta</strong><small>Evidence-based adaptive tutor</small></span></Link>
        {title && <div className="header-lesson"><span>Learning from</span><strong>{title}</strong></div>}
        <div className="header-actions">
          {children}
          <div className="role-switch" aria-label="Choose role">
            <button className={selectedRole === 'teacher' ? 'active' : ''} onClick={() => selectRole('teacher')} aria-pressed={selectedRole === 'teacher'}><UserIcon />Teacher</button>
            <button className={selectedRole === 'student' ? 'active' : ''} onClick={() => selectRole('student')} aria-pressed={selectedRole === 'student'}><UserIcon />Student</button>
          </div>
        </div>
      </div>
    </header>
  )
}
