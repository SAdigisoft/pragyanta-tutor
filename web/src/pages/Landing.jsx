import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { createLesson, createSession, getLessons } from '../api'
import DemoSwitcher from '../components/DemoSwitcher'
import Header from '../components/Header'
import { ArrowIcon, BookIcon, CheckIcon, FileIcon, ShieldIcon, TargetIcon, UploadIcon, UserIcon } from '../components/Icons'

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
      <section className="hero-copy"><div><div className="overline"><span />Evidence-based teaching</div><h1>Teach from sources you trust.</h1><p>Pragyanta answers only from teacher-approved material, so every explanation stays grounded in your lesson.</p></div><aside className="hero-promise"><span><ShieldIcon /></span><p>Answers stay grounded in<br />teacher-approved material.</p></aside></section>
      {!loading && lessons.length > 0 && <section className="stat-strip" aria-label="Curriculum at a glance">
        <div className="stat-tile"><span className="stat-icon"><BookIcon size={19} /></span><div><strong>{lessons.length}</strong><small>{lessons.length === 1 ? 'lesson' : 'lessons'} in the library</small></div></div>
        <div className="stat-tile"><span className="stat-icon"><TargetIcon size={19} /></span><div><strong>{lessons.reduce((sum, l) => sum + (l.question_count || 0), 0).toLocaleString()}</strong><small>grounded practice questions</small></div></div>
        <div className="stat-tile"><span className="stat-icon"><ShieldIcon size={19} /></span><div><strong>100%</strong><small>answers cited to your material</small></div></div>
      </section>}
      <section className="library-section" id="lessons">
        <div className="section-heading"><div><h2>Your lessons</h2><span className="heading-rule" /></div><p>{lessons.length} {lessons.length === 1 ? 'lesson' : 'lessons'} ready</p></div>
        {loading ? <div className="skeleton-card" aria-live="polite">Loading your lessons…</div> : error && !lessons.length ? <div className="empty-card error-card"><h3>Lessons are unavailable</h3><p>{error}</p></div> : lessons.length === 0 ? <div className="empty-card"><div className="empty-icon"><BookIcon /></div><h3>Your lesson library is ready</h3><p>Upload a PDF or paste lesson text to create your first evidence-based tutor.</p><button className="text-button" onClick={() => document.getElementById('upload')?.scrollIntoView({ behavior: 'smooth' })}>Add your first lesson <ArrowIcon /></button></div> : <div className="lesson-grid">{lessons.map((lesson) => <article className="lesson-card" key={lesson.lesson_id}><div className="lesson-card-top"><div className="lesson-document"><FileIcon size={30} /></div><span className="lesson-label">Teacher-approved lesson</span></div><h3>{lesson.title}</h3><div className="lesson-meta"><span><BookIcon size={16} />{lesson.chunk_count} sections</span>{lesson.question_count > 0 && <span><i />{lesson.question_count} practice questions</span>}<span className="lesson-date">{formatDate(lesson.created_at)}</span></div><div className="lesson-actions"><button className="primary-button wide" onClick={() => startLesson(lesson.lesson_id)}><UserIcon />Open as student <ArrowIcon /></button><div className="lesson-subactions"><button className="secondary-button" onClick={() => navigate(`/practice/${lesson.lesson_id}?role=student`)}><TargetIcon size={15} />Practice</button><button className="secondary-button" onClick={() => navigate(`/report/${lesson.lesson_id}?role=teacher`)}>Report</button></div></div></article>)}</div>}
      </section>
      <section className="upload-section" id="upload">
        <div className="section-heading"><div><h2>Upload lesson</h2><span className="heading-rule" /></div><p>PDF or text</p></div>
        <div className="upload-card">
          <div className="tabs" role="tablist"><button role="tab" aria-selected={tab === 'pdf'} className={tab === 'pdf' ? 'active' : ''} onClick={() => setTab('pdf')}>Upload PDF</button><button role="tab" aria-selected={tab === 'text'} className={tab === 'text' ? 'active' : ''} onClick={() => setTab('text')}>Paste text</button></div>
          {tab === 'pdf' ? <div className={`drop-zone ${file ? 'has-file' : ''}`} onClick={() => inputRef.current?.click()} onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f?.type === 'application/pdf') setFile(f); else setError('Choose a PDF file. Other file types are not supported.') }}><input ref={inputRef} type="file" accept="application/pdf" onChange={(e) => setFile(e.target.files[0])} hidden /><div className="upload-icon">{file ? <CheckIcon /> : <UploadIcon />}</div><h3>{file ? file.name : 'Drop your lesson PDF here'}</h3><p>{file ? `${Math.max(1, Math.round(file.size / 1024))} KB · Ready to upload` : 'or click to choose a file · PDF up to 10 MB'}</p></div> : <div className="paste-form"><label>Lesson title<input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Python Lists and Tuples" /></label><label>Lesson material<textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="Paste the teacher-approved lesson text here…" /></label></div>}
          {['uploading', 'processing'].includes(uploadState) && <div className="processing-card" role="status"><div><span className="processing-icon"><FileIcon /></span><div><strong>{file?.name || 'Preparing your lesson'}</strong><small>{uploadState === 'uploading' ? 'Uploading teacher-approved material' : 'Extracting source sections'}</small></div></div><div className="progress-track"><span className={uploadState} /></div><ol><li className="done">Upload complete</li><li className="active">Extracting source sections</li><li>Creating lesson</li></ol></div>}
          {error && <div className="form-error" role="alert"><span>!</span>{error}</div>}
          {uploadState === 'success' ? <div className="upload-success" role="status"><CheckIcon /> Lesson processed and ready for students.</div> : !['uploading', 'processing'].includes(uploadState) && <button className="primary-button full" onClick={upload}>Upload lesson <ArrowIcon /></button>}
        </div>
      </section>
    </main>
    <footer><span>Pragyanta</span><p>Answers grounded in evidence. Understanding verified.</p></footer>
    <DemoSwitcher page="landing" value={demoState} onChange={changeDemo} />
  </div>
}
