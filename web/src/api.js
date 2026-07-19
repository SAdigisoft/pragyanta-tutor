import { LESSON, delay, exchangeStudent, practiceQuestions, report, tutorTurns } from './mocks'

const mockFlag = import.meta.env.VITE_USE_MOCKS ?? import.meta.env.VITE_MOCK
const useMocks = mockFlag !== 'false' && mockFlag !== '0'
const API_BASE = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || 'http://localhost:8000'

let lessons = [LESSON]
let messages = []
let step = 0
let level = 'beginner'
let sessions = []

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: { ...(options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }), ...options.headers },
    ...options,
  })
  if (!response.ok) {
    let body = {}
    try { body = await response.json() } catch { /* response had no JSON */ }
    throw new Error(body.error || `Request failed (${response.status})`)
  }
  return response.json()
}

export async function getLessons() {
  if (!useMocks) return request('/api/lessons')
  await delay(260)
  return [...lessons]
}

export async function createLesson(input) {
  if (!useMocks) {
    if (input.file) { const data = new FormData(); data.append('file', input.file); if (input.title) data.append('title', input.title); return request('/api/lessons', { method: 'POST', body: data }) }
    return request('/api/lessons', { method: 'POST', body: JSON.stringify({ title: input.title, text: input.text }) })
  }
  await delay(1050)
  if (input.forceError) throw new Error('The lesson could not be processed. Check the file and try again.')
  const item = { lesson_id: `lesson-${Date.now()}`, title: input.title || input.file?.name?.replace(/\.pdf$/i, '') || 'Untitled lesson', chunk_count: 6, created_at: new Date().toISOString() }
  lessons = [item, ...lessons]
  return item
}

export async function createSession(payload) {
  if (!useMocks) return request('/api/sessions', { method: 'POST', body: JSON.stringify(payload) })
  await delay(380); level = payload.learner_level || 'beginner'; messages = []; step = 0
  const lesson = lessons.find((item) => item.lesson_id === payload.lesson_id) || LESSON
  sessions = [{ session_id: 'demo-session', lesson_id: lesson.lesson_id, lesson_title: lesson.title, learner_level: level, featured_prompt: lesson.featured_prompt || null, last_message: null, created_at: new Date().toISOString() }, ...sessions.filter((item) => item.session_id !== 'demo-session')]
  return { session_id: 'demo-session' }
}

export async function getSessions() {
  if (!useMocks) return request('/api/sessions')
  await delay(180)
  return sessions.map((item) => item.session_id === 'demo-session' ? { ...item, last_message: messages.at(-1)?.content || item.last_message } : item)
}

export async function getSession(sessionId) {
  if (!useMocks) return request(`/api/sessions/${sessionId}`)
  await delay(120)
  const session = sessions.find((item) => item.session_id === sessionId)
  if (session) return { ...session }
  return { session_id: sessionId, lesson_id: LESSON.lesson_id, lesson_title: LESSON.title, learner_level: level, featured_prompt: LESSON.featured_prompt, created_at: new Date().toISOString() }
}

export async function getMessages(sessionId) {
  if (!useMocks) return request(`/api/sessions/${sessionId}/messages`)
  await delay(220)
  return [...messages]
}

export async function sendChat(sessionId, payload) {
  if (!useMocks) {
    const result = await request(`/api/sessions/${sessionId}/chat`, { method: 'POST', body: JSON.stringify({ message: payload.message }) })
    return { ...result, student_message: { id: `student-${Date.now()}`, role: 'student', msg_type: 'chat', content: payload.message } }
  }
  level = payload.learner_level || level
  await delay(720)
  const student = { id: `s${step + 1}`, role: 'student', msg_type: 'chat', content: exchangeStudent[step] || payload.message }
  const turn = step === 0 ? tutorTurns[level][0] : (tutorTurns.shared[step - 1] || tutorTurns.shared[2])
  messages.push(student, ...turn)
  step = Math.min(step + 1, 4)
  return { student_message: student, tutor_messages: turn, misconception_update: step === 2 ? { description: turn[0].misconception, status: 'open' } : step === 3 ? { description: 'The student believes tuple values can be modified.', status: 'resolved' } : null }
}

export async function getReport(lessonId) {
  if (!useMocks) return request(`/api/lessons/${lessonId}/report`)
  await delay(320); return structuredClone(report)
}

export async function getQuestions(lessonId, { limit = 20, difficulty } = {}) {
  if (!useMocks) {
    const params = new URLSearchParams({ limit: String(limit) })
    if (difficulty) params.set('difficulty', difficulty)
    return request(`/api/lessons/${lessonId}/questions?${params}`)
  }
  await delay(340)
  const pool = difficulty ? practiceQuestions.filter((q) => q.difficulty === difficulty) : practiceQuestions
  return structuredClone(pool).slice(0, limit)
}

export async function setLearnerLevel(_sessionId, nextLevel) {
  level = nextLevel
  if (!useMocks) return request(`/api/sessions/${_sessionId}`, { method: 'PATCH', body: JSON.stringify({ learner_level: nextLevel }) })
  if (messages.length && messages.some((m) => m.id === 't1' || m.id === 't1i')) {
    const replacement = tutorTurns[nextLevel][0]
    messages = messages.filter((m) => !['t1', 't2', 't1i', 't2i'].includes(m.id))
    const firstStudent = messages.findIndex((m) => m.id === 's1')
    messages.splice(firstStudent + 1, 0, ...replacement)
  }
  return { learner_level: nextLevel }
}

export async function loadDemoState(state) {
  if (!useMocks) return
  messages = []
  step = 0
  if (state === 'empty') return
  const count = { answer: 1, remediation: 2, resolved: 3, off_topic: 4, unresolved: 3 }[state] || 0
  for (let i = 0; i < count; i += 1) {
    const student = { id: `s${i + 1}`, role: 'student', msg_type: 'chat', content: exchangeStudent[i] }
    const turn = i === 0 ? tutorTurns[level][0] : tutorTurns.shared[i - 1]
    messages.push(student, ...turn)
  }
  step = count
  if (state === 'unresolved') {
    messages = messages.filter((m) => m.id !== 't5')
    messages.push({ id: 't5u', role: 'tutor', msg_type: 'verdict', status: 'unresolved', content: 'Not quite yet. A tuple stays fixed after it is created, so assigning a new value to point[0] is not allowed.', detail: 'Let’s move on and return to this idea later.' })
  }
}

export const isMockMode = useMocks
