import { useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getMessages, getSession, loadDemoState, sendChat, setLearnerLevel } from '../api'
import ChatMessage from '../components/ChatMessage'
import DemoSwitcher from '../components/DemoSwitcher'
import Header from '../components/Header'
import LevelToggle from '../components/LevelToggle'
import { BookIcon } from '../components/Icons'

export default function Learn() {
  const { sessionId } = useParams()
  const [messages, setMessages] = useState([])
  const [session, setSession] = useState(null)
  const [input, setInput] = useState('')
  const [level, setLevel] = useState('beginner')
  const [thinking, setThinking] = useState(false)
  const [error, setError] = useState('')
  const [demoState, setDemoState] = useState('empty')
  const endRef = useRef(null)

  useEffect(() => {
    setError('')
    Promise.all([getMessages(sessionId), getSession(sessionId)])
      .then(([history, metadata]) => { setMessages(history); setSession(metadata); setLevel(metadata.learner_level) })
      .catch(() => setError('The conversation could not be loaded.'))
  }, [sessionId])
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }) }, [messages, thinking])

  const ask = async (e, suggestion) => {
    e?.preventDefault(); const message = (suggestion || input).trim(); if (!message || thinking) return
    setError(''); setInput(''); setThinking(true)
    setMessages((items) => [...items, { id: `pending-${Date.now()}`, role: 'student', msg_type: 'chat', content: message }])
    try {
      const result = await sendChat(sessionId, { message, learner_level: level })
      setMessages((items) => [...items.slice(0, -1), result.student_message, ...result.tutor_messages]); setDemoState('custom')
    } catch (err) { setMessages((items) => items.slice(0, -1)); setError(err.message || 'The tutor could not respond. Try asking again.') }
    finally { setThinking(false) }
  }

  const changeLevel = async (next) => {
    setLevel(next); await setLearnerLevel(sessionId, next); setMessages(await getMessages(sessionId))
  }

  const switchState = async (state) => {
    setDemoState(state); setError('')
    if (state === 'error') { setMessages([]); setError('The tutor could not respond. Your message was not sent.'); return }
    await loadDemoState(state); setMessages(await getMessages(sessionId))
  }

  const lessonTitle = session?.lesson_title || 'Your lesson'
  const starters = lessonTitle === 'Python Lists and Tuples' ? [
    'What is the difference between a list and a tuple?',
    'When should I choose a tuple instead of a list?',
    'Why can a tuple be a dictionary key?',
  ] : [
    `What are the key ideas in ${lessonTitle}?`,
    'Can you explain the first concept from this lesson?',
    'What should I practise from this lesson?',
  ]
  const unavailable = Boolean(error && !session)

  return <div className="page learn-page">
    <Header mode="student" title={lessonTitle}><LevelToggle value={level} onChange={changeLevel} /></Header>
    <main className="learn-main">
      <div className="lesson-rail"><Link to="/?role=teacher">← Leave lesson</Link><div className="rail-rule" /><span>Tutor session</span></div>
      <section className="chat-shell" aria-label="Tutor conversation">
        {messages.length > 0 && <div className="chat-heading"><div><span className="overline"><i />Guided lesson</span><h1>Let’s learn together.</h1></div><p>Every answer is grounded in your teacher’s material.</p></div>}
        <div className={`message-stream ${messages.length === 0 ? 'is-empty' : ''}`} aria-live="polite">
          {messages.length === 0 && !error && <div className="chat-empty"><div className="empty-ornament"><BookIcon size={66} /></div><span className="lesson-prompt">Lesson prompt</span><h2>What would you like<br />to understand?</h2><p>Ask about {lessonTitle}. I’ll answer only from your teacher’s material and show the source.</p><div className="starter-chips">{starters.map((item, index) => <button key={item} onClick={() => ask(null, item)}><span className="starter-number">0{index + 1}</span><strong>{item}</strong><span className="starter-arrow">›</span></button>)}</div></div>}
          {messages.map((message, index) => <ChatMessage message={message} key={message.id || `${message.role}-${message.msg_type}-${index}`} />)}
          {thinking && <div className="message-row tutor" role="status"><div className="typing"><span /><span /><span /><small>Finding evidence in your lesson</small></div></div>}
          {error && <div className="message-row tutor"><div className="chat-error" role="alert"><div><strong>The tutor paused here</strong><p>{error}</p></div><button onClick={() => setError('')}>Try again</button></div></div>}
          <div ref={endRef} />
        </div>
        <form className="composer" onSubmit={ask}><div className="composer-row"><span className="composer-symbol">···</span><textarea id="message" aria-label="Ask about this lesson" rows="1" value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) ask(e) }} placeholder={unavailable ? 'This session is unavailable' : 'Ask about this lesson…'} disabled={thinking || unavailable} /><button className="primary-button" disabled={!input.trim() || thinking || unavailable}>Ask the tutor <span>↗</span></button></div><div className="composer-foot"><span><i />Grounded in teacher-approved source sections</span><span>Enter to send · Shift + Enter for a new line</span></div></form>
      </section>
    </main>
    <DemoSwitcher page="learn" value={demoState} onChange={switchState} />
  </div>
}
