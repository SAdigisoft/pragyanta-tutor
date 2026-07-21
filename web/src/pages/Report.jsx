import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getReport } from '../api'
import DemoSwitcher from '../components/DemoSwitcher'
import Header from '../components/Header'
import { BookIcon } from '../components/Icons'

const date = (value) => value ? new Intl.DateTimeFormat('en', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(value)) : '—'

export default function Report() {
  const { lessonId } = useParams()
  const [data, setData] = useState(null)
  const [state, setState] = useState('default')
  const [error, setError] = useState('')
  useEffect(() => { getReport(lessonId).then(setData).catch(() => setError('The learning-gap report could not be loaded.')) }, [lessonId])
  const changeState = async (next) => { setState(next); setError(''); if (next === 'error') { setError('The learning-gap report could not be loaded. Refresh to try again.'); return } const result = await getReport(lessonId); if (next === 'empty') { result.misconceptions = []; result.summary = { total: 0, resolved: 0, unresolved: 0, open: 0 } } setData(result) }
  return <div className="page report-page"><Header mode="teacher" roleTargets={{ teacher: `/report/${lessonId}?role=teacher`, student: `/practice/${lessonId}?role=student` }} />
    <main className="report-main">
      <Link className="report-crumb" to="/?role=teacher"><BookIcon size={23} /><span>›</span>{data?.lesson_title || 'Lesson report'}</Link>
      <section className="report-title"><div><span className="overline"><i />Teacher evidence</span><h1>Misconception report</h1></div></section>
      {error ? <div className="report-empty error-card"><h2>Report unavailable</h2><p>{error}</p></div> : !data ? <div className="report-empty">Loading learning gaps…</div> : data.misconceptions.length === 0 ? <div className="report-empty"><span className="empty-check">✓</span><h2>No misconceptions detected yet</h2><p>Students haven’t hit any snags. New learning gaps will appear here when the tutor detects them.</p></div> : <>
        <section className="report-stats" aria-label="Misconception summary">
          <div className="rstat total"><strong>{data.summary.total}</strong><small>detected</small></div>
          <div className="rstat resolved"><strong>{data.summary.resolved}</strong><small>resolved</small></div>
          <div className="rstat unresolved"><strong>{data.summary.unresolved}</strong><small>unresolved</small></div>
          <div className="rstat open"><strong>{data.summary.open}</strong><small>open</small></div>
        </section>
        <div className="report-table-wrap"><table><thead><tr><th>Misconception</th><th>Student’s words</th><th>Status</th><th>Detected</th><th>Resolved</th></tr></thead><tbody>{data.misconceptions.map((item, index) => <tr key={item.id || `${item.detected_at}-${index}`}><td><strong>{item.description}</strong></td><td><blockquote>“{item.evidence}”</blockquote></td><td><span className={`status-badge ${item.status}`}><i />{item.status}</span></td><td>{date(item.detected_at)}</td><td>{date(item.resolved_at)}</td></tr>)}</tbody></table></div>
        <Link className="back-button" to="/?role=teacher">← Back to lessons</Link>
      </>}
    </main><DemoSwitcher page="report" value={state} onChange={changeState} />
  </div>
}
