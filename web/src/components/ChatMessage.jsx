import CitationCard from './CitationCard'
import { BookIcon, CheckIcon } from './Icons'

export default function ChatMessage({ message }) {
  if (message.role === 'student') return <div className="message-row student"><div className="student-bubble">{message.content}</div></div>
  if (message.msg_type === 'diagnostic_question' || message.msg_type === 'verification_question') return (
    <div className="message-row tutor"><section className="question-panel"><div className="question-label"><span className="question-mark">?</span>Tutor asks</div><p>{message.content}</p></section></div>
  )
  if (message.msg_type === 'remediation') return (
    <div className="message-row tutor"><section className="remediation-panel">
      <div className="panel-eyebrow"><span className="attention-symbol">↺</span>{message.title || 'Let’s fix something'}</div>
      <h3>{message.misconception || 'A key idea needs another look'}</h3><p>{message.content}</p>
      {message.citations?.map((item) => <CitationCard citation={item} key={item.chunk_id} />)}
    </section></div>
  )
  if (message.msg_type === 'verdict') {
    const status = message.status || message.verdict_status || 'unresolved'
    const contentParts = String(message.content || '').split('|').map((part) => part.trim()).filter(Boolean)
    const content = contentParts[0] || ''
    const detail = message.detail || contentParts.slice(1).join(' ')
    return (
      <div className="message-row tutor"><section className={`verdict-panel ${status}`}>
        <div className="verdict-icon">{status === 'resolved' ? <CheckIcon /> : '↺'}</div>
        <div><div className="panel-eyebrow">{status === 'resolved' ? 'Misconception resolved' : 'Keep this idea in view'}</div><p>{content}</p>{detail && <small>{detail}</small>}</div>
      </section></div>
    )
  }
  return (
    <div className="message-row tutor"><div className="tutor-wrap"><div className="tutor-avatar"><BookIcon size={18} /></div><div className="tutor-content">
      {message.msg_type === 'off_topic' && <div className="boundary-badge"><span>◇</span> Outside lesson material</div>}
      <div className="tutor-bubble">{message.content}</div>
      {message.citations?.map((item) => <CitationCard citation={item} key={item.chunk_id} />)}
      {message.msg_type === 'off_topic' && <div className="suggestion-row"><button>When should I use a tuple?</button><button>Why are tuples immutable?</button></div>}
    </div></div></div>
  )
}
