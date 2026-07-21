import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { createSession, getLessons, getSessions } from '../api'
import { BookIcon, ChartIcon, MenuIcon, PanelIcon, PlusIcon, SearchIcon, TargetIcon, XIcon } from './Icons'

const sessionPreview = (session) => session.last_message || `${session.learner_level || 'beginner'} tutoring session`

export default function AppSidebar({ collapsed, mobileOpen, onCollapse, onMobileClose }) {
  const location = useLocation()
  const navigate = useNavigate()
  const currentRole = new URLSearchParams(location.search).get('role') || 'teacher'
  const [lessons, setLessons] = useState([])
  const [sessions, setSessions] = useState([])
  const [query, setQuery] = useState('')
  const [searchOpen, setSearchOpen] = useState(false)
  const [starting, setStarting] = useState(false)

  useEffect(() => {
    let active = true
    Promise.all([getLessons(), getSessions()]).then(([lessonRows, sessionRows]) => {
      if (active) { setLessons(lessonRows); setSessions(sessionRows) }
    }).catch(() => {})
    return () => { active = false }
  }, [location.pathname, location.search])

  const sessionId = location.pathname.match(/^\/learn\/([^/]+)/)?.[1]
  const lessonId = location.pathname.match(/^\/(?:practice|report)\/([^/]+)/)?.[1]
  const activeSession = sessions.find((item) => item.session_id === sessionId)
  const activeLessonId = lessonId || activeSession?.lesson_id
  const filteredSessions = useMemo(() => {
    const term = query.trim().toLowerCase()
    if (!term) return sessions
    return sessions.filter((item) => `${item.lesson_title} ${item.last_message || ''}`.toLowerCase().includes(term))
  }, [query, sessions])

  const closeAndNavigate = () => onMobileClose()
  const startChat = async () => {
    if (!activeLessonId) { navigate('/?role=student#lessons'); onMobileClose(); return }
    setStarting(true)
    try {
      const result = await createSession({ lesson_id: activeLessonId, learner_level: 'beginner' })
      navigate(`/learn/${result.session_id}?role=student`)
      onMobileClose()
    } finally { setStarting(false) }
  }
  const routeClass = (path) => location.pathname === path ? 'active' : ''

  return <>
    <button className="mobile-nav-trigger" aria-label="Open navigation" aria-expanded={mobileOpen} onClick={() => onMobileClose(true)}><MenuIcon /></button>
    {mobileOpen && <button className="sidebar-backdrop" aria-label="Close navigation" onClick={() => onMobileClose()} />}
    <aside className={`app-sidebar ${collapsed ? 'is-collapsed' : ''} ${mobileOpen ? 'is-mobile-open' : ''}`} role="navigation" aria-label="Main navigation">
      <div className="sidebar-top">
        <Link className="sidebar-brand" to={`/?role=${currentRole}`} onClick={closeAndNavigate} aria-label="Pragyanta home"><span className="sidebar-brand-mark"><BookIcon size={30} /></span><span className="sidebar-brand-copy"><strong>Pragyanta</strong><small>Adaptive tutor</small></span></Link>
        <button className="sidebar-collapse" onClick={onCollapse} aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'} title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}><PanelIcon /></button>
        <button className="sidebar-mobile-close" onClick={() => onMobileClose()} aria-label="Close navigation"><XIcon /></button>
      </div>

      <button className="sidebar-new-chat" onClick={startChat} disabled={starting} title="Start a new tutoring conversation"><PlusIcon /><span>{starting ? 'Starting…' : 'New tutoring chat'}</span></button>

      <nav className="sidebar-primary">
        <Link className={routeClass('/')} to={`/?role=${currentRole}`} onClick={closeAndNavigate} title="Lesson library"><BookIcon size={19} /><span>Lesson library</span></Link>
        <Link className={location.pathname.startsWith('/practice/') ? 'active' : !activeLessonId ? 'disabled' : ''} to={activeLessonId ? `/practice/${activeLessonId}?role=student` : '/?role=student'} onClick={closeAndNavigate} title="Practice"><TargetIcon size={19} /><span>Practice</span></Link>
        {currentRole === 'teacher' && <Link className={location.pathname.startsWith('/report/') ? 'active' : !activeLessonId ? 'disabled' : ''} to={activeLessonId ? `/report/${activeLessonId}?role=teacher` : '/?role=teacher'} onClick={closeAndNavigate} title="Learning reports"><ChartIcon /><span>Learning reports</span></Link>}
        {currentRole === 'teacher' && <Link to="/?role=teacher#upload" onClick={closeAndNavigate} title="Upload lesson"><PlusIcon /><span>Upload lesson</span></Link>}
      </nav>

      <div className="sidebar-history">
        <div className="sidebar-section-heading"><span>Recent tutoring</span><button onClick={() => setSearchOpen((value) => !value)} aria-label="Search tutoring history" aria-expanded={searchOpen}><SearchIcon size={16} /></button></div>
        {searchOpen && <label className="sidebar-search"><SearchIcon size={15} /><input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search conversations" aria-label="Search conversations" /></label>}
        <div className="sidebar-session-list">
          {filteredSessions.map((session) => <Link key={session.session_id} className={sessionId === session.session_id ? 'active' : ''} to={`/learn/${session.session_id}?role=student`} onClick={closeAndNavigate} title={session.lesson_title}>
            <span className="session-glyph"><BookIcon size={16} /></span><span className="session-copy"><strong>{session.lesson_title}</strong><small>{sessionPreview(session)}</small></span>
          </Link>)}
          {!filteredSessions.length && <p className="sidebar-empty">{query ? 'No matching conversations.' : 'Your tutoring conversations will appear here.'}</p>}
        </div>
      </div>

      <div className="sidebar-foot"><span className="sidebar-avatar">P</span><span><strong>Local workspace</strong><small>Private on this device</small></span></div>
    </aside>
  </>
}
