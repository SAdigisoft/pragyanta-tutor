import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { createLesson, createSession, getLessons } from '../api'
import DemoSwitcher from '../components/DemoSwitcher'
import Header from '../components/Header'
import { ArrowIcon, BookIcon, CheckIcon, UploadIcon } from '../components/Icons'

const formatDate = (date) => new Intl.DateTimeFormat('en', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(date))

export default function Landing() {
  const [lessons, setLessons] = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('pdf')
  const [title, setTitle] = useState('')
  const [text, setText] = useState('')
  const [file, setFile] = useState(null)
  const [uploadState, setUploadState] = useState('idle')
  const [error, setError] = useState('')
  const [demoState, setDemoState] = useState('default')
  const inputRef = useRef(null)
  const navigate = useNavigate()

  useEffect(() => { getLessons().then(setLessons).catch(() => setError('Lessons could not be loaded. Refresh the page to try again.')).finally(() => setLoading(false)) }, [])

  const startLesson = async (lessonId) => {
    const result = await createSession({ lesson_id: lessonId, learner_level: 'beginner' })
    navigate(`/learn/${result.session_id}?role=student`)
  }

  const upload = async () => {
    setError('')
    if (tab === 'pdf' && !file) { setError('Choose a PDF file before uploading.'); return }
    if (tab === 'text' && (!title.trim() || !text.trim())) { setError('Add a title and lesson text before uploading.'); return }
    setUploadState('uploading')
    try {
      await new Promise((r) => setTimeout(r, 650)); setUploadState('processing')
      const lesson = await createLesson({ title, text, file })
      setLessons((items) => [lesson, ...items]); setUploadState('success'); setTitle(''); setText(''); setFile(null)
      setTimeout(() => setUploadState('idle'), 2500)
    } catch (e) { setError(e.message); setUploadState('error') }
  }

  const changeDemo = (state) => {
    setDemoState(state); setError(''); setUploadState('idle')
    if (state === 'empty') setLessons([])
    else getLessons().then(setLessons)
    if (state === 'uploading') setUploadState('processing')
    if (state === 'upload_error') { setUploadState('error'); setError('The lesson could not be processed. Check the file and try again.') }
  }

  return <div className="page landing-page">
    <Header mode="teacher" />
    <main className="landing-main">
      <section className="hero-copy"><div className="overline"><span />Evidence-based teaching</div><h1>Teach from sources<br /><em>you trust.</em></h1><p>Upload your lesson material. Pragyanta turns it into a tutor that explains, checks understanding, and stays grounded in your sources.</p></section>
      <section className="library-section">
        <div className="section-heading"><div><span className="section-number">01</span><h2>Your lessons</h2></div><p>{lessons.length} {lessons.length === 1 ? 'lesson' : 'lessons'} ready for students</p></div>
        {loading ? <div className="skeleton-card" aria-live="polite">Loading your lessons…</div> : error && !lessons.length ? <div className="empty-card error-card"><h3>Lessons are unavailable</h3><p>{error}</p></div> : lessons.length === 0 ? <div className="empty-card"><div className="empty-icon"><BookIcon /></div><h3>Your lesson library is ready</h3><p>Upload a PDF or paste lesson text to create your first evidence-based tutor.</p><button className="text-button" onClick={() => document.getElementById('upload')?.scrollIntoView({ behavior: 'smooth' })}>Add your first lesson <ArrowIcon /></button></div> : <div className="lesson-grid">{lessons.map((lesson) => <article className="lesson-card" key={lesson.lesson_id}><div className="lesson-card-top"><span className="lesson-label">Teacher-approved material</span><span className="lesson-date">{formatDate(lesson.created_at)}</span></div><h3>{lesson.title}</h3><div className="lesson-meta"><span><i />{lesson.chunk_count} source sections</span><span>Ready to teach</span></div><div className="lesson-actions"><button className="primary-button" onClick={() => startLesson(lesson.lesson_id)}>Open as student <ArrowIcon /></button><button className="secondary-button" onClick={() => navigate(`/report/${lesson.lesson_id}?role=teacher`)}>View report</button></div></article>)}</div>}
      </section>
      <section className="upload-section" id="upload">
        <div className="upload-intro"><span className="section-number">02</span><h2>Upload a lesson</h2><p>Only this material will be used to teach. Facts from outside the lesson stay outside the conversation.</p><div className="trust-note"><span>✓</span><p><strong>Source-bound by design</strong><br />Every teaching claim includes evidence from your material.</p></div></div>
        <div className="upload-card">
          <div className="tabs" role="tablist"><button role="tab" aria-selected={tab === 'pdf'} className={tab === 'pdf' ? 'active' : ''} onClick={() => setTab('pdf')}>Upload PDF</button><button role="tab" aria-selected={tab === 'text'} className={tab === 'text' ? 'active' : ''} onClick={() => setTab('text')}>Paste text</button></div>
          {tab === 'pdf' ? <div className={`drop-zone ${file ? 'has-file' : ''}`} onClick={() => inputRef.current?.click()} onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f?.type === 'application/pdf') setFile(f); else setError('Choose a PDF file. Other file types are not supported.') }}><input ref={inputRef} type="file" accept="application/pdf" onChange={(e) => setFile(e.target.files[0])} hidden /><div className="upload-icon">{file ? <CheckIcon /> : <UploadIcon />}</div><h3>{file ? file.name : 'Drop your lesson PDF here'}</h3><p>{file ? `${Math.max(1, Math.round(file.size / 1024))} KB · Ready to upload` : 'or click to choose a file · PDF up to 10 MB'}</p></div> : <div className="paste-form"><label>Lesson title<input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Python Lists and Tuples" /></label><label>Lesson material<textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="Paste the teacher-approved lesson text here…" /></label></div>}
          {error && <div className="form-error" role="alert"><span>!</span>{error}</div>}
          {uploadState === 'success' ? <div className="upload-success" role="status"><CheckIcon /> Lesson processed and ready for students.</div> : <button className="primary-button full" disabled={['uploading', 'processing'].includes(uploadState)} onClick={upload}>{uploadState === 'uploading' ? 'Uploading lesson…' : uploadState === 'processing' ? 'Finding source sections…' : 'Upload lesson'}{uploadState === 'idle' && <ArrowIcon />}</button>}
        </div>
      </section>
    </main>
    <footer><span>Pragyanta</span><p>Answers grounded in evidence. Understanding verified.</p></footer>
    <DemoSwitcher page="landing" value={demoState} onChange={changeDemo} />
  </div>
}
