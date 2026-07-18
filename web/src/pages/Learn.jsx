import { useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getMessages, loadDemoState, sendChat, setLearnerLevel } from '../api'
import ChatMessage from '../components/ChatMessage'
import DemoSwitcher from '../components/DemoSwitcher'
import Header from '../components/Header'
import LevelToggle from '../components/LevelToggle'

const starters = ['What’s the difference between a list and a tuple?', 'When should I choose a tuple?', 'Can a list hold different data types?']

export default function Learn() {
  const { sessionId } = useParams()
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [level, setLevel] = useState('beginner')
  const [thinking, setThinking] = useState(false)
  const [error, setError] = useState('')
  const [demoState, setDemoState] = useState('empty')
  const endRef = useRef(null)

  useEffect(() => { getMessages(sessionId).then(setMessages).catch(() => setError('The conversation could not be loaded.')) }, [sessionId])
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

  return <div className="page learn-page">
    <Header mode="student" title="Python Lists and Tuples"><LevelToggle value={level} onChange={changeLevel} /></Header>
    <main className="learn-main">
      <div className="lesson-rail"><Link to="/?role=teacher">← Leave lesson</Link><div className="rail-rule" /><span>Lesson 01</span></div>
      <section className="chat-shell" aria-label="Tutor conversation">
        <div className="chat-heading"><div><span className="overline"><i />Guided lesson</span><h1>Let’s learn together.</h1></div><p>Every answer is grounded in your teacher’s material.</p></div>
        <div className={`message-stream ${messages.length === 0 ? 'is-empty' : ''}`} aria-live="polite">
          {messages.length === 0 && !error && <div className="chat-empty"><div className="empty-ornament">P</div><h2>What would you like to understand?</h2><p>Ask anything about this lesson. I’ll explain it using only your teacher’s material, then check what clicked.</p><div className="starter-chips">{starters.map((item) => <button key={item} onClick={() => ask(null, item)}>{item}<span>↗</span></button>)}</div></div>}
          {messages.map((message) => <ChatMessage message={message} key={message.id} />)}
          {thinking && <div className="message-row tutor" role="status"><div className="typing"><span /><span /><span /><small>Finding evidence in your lesson</small></div></div>}
          {error && <div className="message-row tutor"><div className="chat-error" role="alert"><div><strong>The tutor paused here</strong><p>{error}</p></div><button onClick={() => setError('')}>Try again</button></div></div>}
          <div ref={endRef} />
        </div>
        <form className="composer" onSubmit={ask}><label htmlFor="message">Ask about this lesson</label><div className="composer-row"><textarea id="message" rows="1" value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) ask(e) }} placeholder="Type your question or answer…" disabled={thinking} /><button className="primary-button" disabled={!input.trim() || thinking}>Ask the tutor <span>↑</span></button></div><div className="composer-foot"><span><i />Grounded in 8 teacher-approved sections</span><span>Enter to send · Shift + Enter for a new line</span></div></form>
      </section>
    </main>
    <DemoSwitcher page="learn" value={demoState} onChange={switchState} />
  </div>
}
