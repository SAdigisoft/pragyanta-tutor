export const LESSON = {
  lesson_id: 'demo-lesson',
  title: 'Python Lists and Tuples',
  created_at: '2026-07-18T10:30:00Z',
  chunk_count: 8,
}

export const citation = {
  chunk_id: 'lists-tuples-2',
  snippet: 'A list is mutable, meaning its contents can be changed after creation. A tuple is immutable.',
  source: 'Lists & Tuples §2',
}

export const exchangeStudent = [
  "What’s the difference between a list and a tuple?",
  'A tuple is better because we can modify its values later.',
  'It will throw an error, because tuples can’t be changed after creation.',
  'Who won the cricket world cup?',
]

export const tutorTurns = {
  beginner: [
    [
      { id: 't1', role: 'tutor', msg_type: 'chat', content: 'A list can change after you create it—you can add, remove, or replace items. A tuple stays fixed, so its values cannot be changed.', citations: [citation] },
      { id: 't2', role: 'tutor', msg_type: 'diagnostic_question', content: 'Quick check — if you needed to store coordinates that must never change, which would you pick, and why?' },
    ],
  ],
  intermediate: [
    [
      { id: 't1i', role: 'tutor', msg_type: 'chat', content: 'Lists are mutable sequences, while tuples are immutable sequences. That immutability can make a tuple hashable when its elements are hashable, allowing it to be used as a dictionary key.', citations: [citation] },
      { id: 't2i', role: 'tutor', msg_type: 'diagnostic_question', content: 'Which structure would you choose for a dictionary key made of two coordinates, and what property makes that possible?' },
    ],
  ],
  shared: [
    [
      { id: 't3', role: 'tutor', msg_type: 'remediation', title: 'Let’s fix something', misconception: 'Lists and tuples have been mixed up: lists can change, while tuples cannot.', content: 'Think of a list like a whiteboard—you can erase and rewrite it. A tuple is like a printed page: once printed, its values stay fixed.', citations: [citation] },
      { id: 't4', role: 'tutor', msg_type: 'verification_question', content: 'You have point = (3, 4). What happens if you run point[0] = 5?' },
    ],
    [
      { id: 't5', role: 'tutor', msg_type: 'verdict', status: 'resolved', content: 'Exactly. A tuple does not support item assignment because it is immutable.', detail: 'You’ve got the key difference.' },
    ],
    [
      { id: 't6', role: 'tutor', msg_type: 'off_topic', content: 'That’s outside this lesson’s material. I can only teach from the sources your teacher provided.' },
    ],
  ],
}

export const report = {
  lesson_title: LESSON.title,
  summary: { total: 3, resolved: 1, unresolved: 1, open: 1 },
  misconceptions: [
    { id: 'm1', description: 'The student believes tuple values can be modified.', evidence: 'A tuple is better because we can modify its values later.', status: 'resolved', detected_at: '2026-07-18T11:24:00Z', resolved_at: '2026-07-18T11:27:00Z' },
    { id: 'm2', description: 'The student believes lists cannot contain mixed data types.', evidence: 'Every item in a list has to be the same type.', status: 'unresolved', detected_at: '2026-07-18T11:41:00Z', resolved_at: null },
    { id: 'm3', description: 'The student confuses tuple unpacking with modifying a tuple.', evidence: 'Unpacking changes the original tuple.', status: 'open', detected_at: '2026-07-18T12:06:00Z', resolved_at: null },
  ],
}

export const delay = (ms = 450) => new Promise((resolve) => setTimeout(resolve, ms))
