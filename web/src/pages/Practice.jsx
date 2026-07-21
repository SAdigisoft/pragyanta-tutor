import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { getLessons, getQuestions } from '../api'
import Header from '../components/Header'
import { ArrowIcon, BookIcon, CheckIcon, RepeatIcon, TargetIcon, XIcon } from '../components/Icons'

const LETTERS = ['A', 'B', 'C', 'D']

// Deterministic-enough shuffle so a freshly generated bank does not always
// place the correct option first.
const shuffle = (items) => {
  const copy = [...items]
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

export default function Practice() {
  const { lessonId } = useParams()
  const navigate = useNavigate()
  const [title, setTitle] = useState('')
  const [level, setLevel] = useState('all')
  const [questions, setQuestions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [index, setIndex] = useState(0)
  const [chosen, setChosen] = useState(null)
  const [revealed, setRevealed] = useState(false)
  const [correct, setCorrect] = useState(0)
  const [finished, setFinished] = useState(false)

  const load = (difficulty) => {
    setLoading(true); setError('')
    setIndex(0); setChosen(null); setRevealed(false); setCorrect(0); setFinished(false)
    getQuestions(lessonId, { limit: 15, difficulty: difficulty === 'all' ? undefined : difficulty })
      .then((rows) => setQuestions(rows.map((q) => ({ ...q, shuffled: shuffle(q.options) }))))
      .catch(() => setError('Practice questions could not be loaded. Try again.'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { getLessons().then((list) => setTitle(list.find((l) => l.lesson_id === lessonId)?.title || 'Practice')).catch(() => {}) }, [lessonId])
  useEffect(() => { load(level) }, [lessonId, level])

  const question = questions[index]
  const total = questions.length
  const scorePct = total ? Math.round((correct / total) * 100) : 0
  const dial = useMemo(() => 2 * Math.PI * 52, [])

  const choose = (option) => { if (!revealed) setChosen(option) }
  const check = () => {
    if (chosen == null) return
    setRevealed(true)
    if (chosen === question.answer) setCorrect((c) => c + 1)
  }
  const next = () => {
    if (index + 1 >= total) { setFinished(true); return }
    setIndex((i) => i + 1); setChosen(null); setRevealed(false)
  }

  return <div className="page practice-page">
    <Header mode="student" title={title} roleTargets={{ teacher: `/report/${lessonId}?role=teacher`, student: `/practice/${lessonId}?role=student` }}>
      <div className="level-control">
        <span className="level-label">Difficulty</span>
        <div className="level-toggle" role="group" aria-label="Difficulty">
          {['all', 'beginner', 'intermediate'].map((value) => (
            <button key={value} className={level === value ? 'active' : ''} aria-pressed={level === value} onClick={() => setLevel(value)}>
              {value === 'all' ? 'All' : value === 'beginner' ? 'Beginner' : 'Intermediate'}
            </button>
          ))}
        </div>
      </div>
    </Header>

    <main className="practice-main">
      <div className="practice-topline">
        <button className="report-crumb" onClick={() => navigate('/?role=teacher')}>← All lessons</button>
        <div className="practice-kicker"><TargetIcon size={15} /> Practice · {title}</div>
      </div>

      {loading ? (
        <div className="practice-card practice-status">Loading practice questions…</div>
      ) : error ? (
        <div className="practice-card practice-status error">{error} <button className="secondary-button" onClick={() => load(level)}>Retry</button></div>
      ) : total === 0 ? (
        <div className="practice-card practice-status">
          <div className="empty-icon"><TargetIcon size={22} /></div>
          <h3>No practice questions yet</h3>
          <p>Generate the question bank for this lesson, then come back to practise.</p>
        </div>
      ) : finished ? (
        <div className="practice-card practice-result">
          <div className="score-dial" role="img" aria-label={`Score ${correct} of ${total}`}>
            <svg width="128" height="128" viewBox="0 0 128 128">
              <circle cx="64" cy="64" r="52" fill="none" stroke="var(--rule)" strokeWidth="10" />
              <circle cx="64" cy="64" r="52" fill="none" stroke="var(--evidence)" strokeWidth="10" strokeLinecap="round"
                strokeDasharray={dial} strokeDashoffset={dial * (1 - correct / total)} transform="rotate(-90 64 64)" />
            </svg>
            <div className="score-center"><strong>{scorePct}%</strong><span>{correct}/{total}</span></div>
          </div>
          <h2>{scorePct >= 80 ? 'Strong work.' : scorePct >= 50 ? 'Good progress.' : 'Keep practising.'}</h2>
          <p>You answered {correct} of {total} questions correctly on <strong>{title}</strong>.</p>
          <div className="practice-result-actions">
            <button className="primary-button" onClick={() => load(level)}><RepeatIcon /> Practise again</button>
            <button className="secondary-button" onClick={() => navigate('/?role=student')}><BookIcon size={17} /> Back to lessons</button>
          </div>
        </div>
      ) : (
        <>
          <div className="practice-progress">
            <div className="progress-meta"><span>Question {index + 1} <i>of {total}</i></span><span className="progress-score"><TargetIcon size={14} /> {correct} correct</span></div>
            <div className="progress-bar"><span style={{ width: `${((index + (revealed ? 1 : 0)) / total) * 100}%` }} /></div>
          </div>

          <div className="practice-card question-card" key={question.id}>
            <div className="question-top">
              <span className={`diff-pill ${question.difficulty}`}>{question.difficulty}</span>
            </div>
            <h2 className="question-prompt">{question.prompt}</h2>
            <div className="option-list" role="radiogroup" aria-label="Answer options">
              {question.shuffled.map((option, i) => {
                const isChosen = chosen === option
                const isAnswer = option === question.answer
                let state = ''
                if (revealed && isAnswer) state = 'correct'
                else if (revealed && isChosen && !isAnswer) state = 'wrong'
                else if (isChosen) state = 'chosen'
                return (
                  <button key={option} className={`option ${state}`} role="radio" aria-checked={isChosen} disabled={revealed} onClick={() => choose(option)}>
                    <span className="option-letter">{LETTERS[i]}</span>
                    <span className="option-text">{option}</span>
                    {revealed && isAnswer && <span className="option-mark correct"><CheckIcon /></span>}
                    {revealed && isChosen && !isAnswer && <span className="option-mark wrong"><XIcon size={16} /></span>}
                  </button>
                )
              })}
            </div>

            {revealed && (
              <div className={`explain ${chosen === question.answer ? 'right' : 'off'}`}>
                <strong>{chosen === question.answer ? 'Correct' : 'Not quite'}</strong>
                <p>{question.explanation}</p>
                {question.misconception && chosen !== question.answer && <small>Common trap: {question.misconception}</small>}
                {question.source_quote && <blockquote className="practice-source"><span>Source evidence</span>{question.source_quote}</blockquote>}
              </div>
            )}

            <div className="question-actions">
              {!revealed ? (
                <button className="primary-button" disabled={chosen == null} onClick={check}>Check answer</button>
              ) : (
                <button className="primary-button" onClick={next}>{index + 1 >= total ? 'See results' : 'Next question'} <ArrowIcon /></button>
              )}
            </div>
          </div>
        </>
      )}
    </main>
  </div>
}
