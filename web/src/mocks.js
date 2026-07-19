export const LESSON = {
  lesson_id: 'demo-lesson',
  title: 'Python Lists and Tuples',
  created_at: '2026-07-18T10:30:00Z',
  chunk_count: 8,
  question_count: 160,
  featured_prompt: 'What is the difference between a list and a tuple?',
}

export const practiceQuestions = [
  {
    id: 'q1', kind: 'mcq', difficulty: 'beginner',
    prompt: 'What is the difference between a list and a tuple?',
    is_featured: true,
    options: ['A list is immutable; a tuple is mutable', 'A list is mutable; a tuple is immutable', 'They are identical in every way', 'Only tuples can be looped over'],
    answer: 'A list is mutable; a tuple is immutable',
    explanation: 'A list can be changed after creation, while a tuple cannot — its contents are fixed for its whole lifetime.',
    misconception: 'Believing the mutability of lists and tuples is reversed.',
    source_quote: 'A list is mutable, meaning its contents can be changed after creation. A tuple is immutable.',
  },
  {
    id: 'q2', kind: 'mcq', difficulty: 'beginner',
    prompt: 'You have point = (3, 4). What happens if you run point[0] = 5?',
    options: ['It updates the tuple to (5, 4)', 'It raises a TypeError', 'It appends 5 to the tuple', 'It silently does nothing'],
    answer: 'It raises a TypeError',
    explanation: 'Tuples do not support item assignment, so Python raises a TypeError because a tuple is immutable.',
    misconception: 'Assuming a tuple can be edited in place like a list.',
  },
  {
    id: 'q3', kind: 'mcq', difficulty: 'beginner',
    prompt: 'Which bracket style creates a list?',
    options: ['Parentheses ( )', 'Square brackets [ ]', 'Curly braces { }', 'Angle brackets < >'],
    answer: 'Square brackets [ ]',
    explanation: 'You create a list with square brackets, such as scores = [90, 85, 77].',
    misconception: 'Confusing list syntax with tuple or dict syntax.',
  },
  {
    id: 'q4', kind: 'mcq', difficulty: 'intermediate',
    prompt: 'Why can a tuple be used as a dictionary key but a list cannot?',
    options: ['Tuples are shorter than lists', 'Tuples are immutable and therefore hashable', 'Lists are stored in a different file', 'Dictionaries only accept numbers as keys'],
    answer: 'Tuples are immutable and therefore hashable',
    explanation: 'Because a tuple cannot change, it is hashable and can serve as a dictionary key; a list is mutable and unhashable.',
    misconception: 'Not connecting immutability to hashability.',
  },
  {
    id: 'q5', kind: 'mcq', difficulty: 'intermediate',
    prompt: 'What does scores.sort() return?',
    options: ['A new sorted list', 'None — it sorts the list in place', 'The first element', 'A reversed copy'],
    answer: 'None — it sorts the list in place',
    explanation: 'Methods like append and sort change the list in place and return None, so assigning their result throws the data away.',
    misconception: 'Expecting in-place list methods to return a new list.',
  },
  {
    id: 'q6', kind: 'mcq', difficulty: 'beginner',
    prompt: 'Which situation is the best fit for a tuple?',
    options: ['A shopping cart that grows and shrinks', 'A queue of tasks being processed', 'Fixed 2D coordinates like (3, 4)', 'A running list of game scores'],
    answer: 'Fixed 2D coordinates like (3, 4)',
    explanation: 'Use a tuple when values belong together and must never change, such as coordinates or an RGB colour.',
    misconception: 'Choosing a tuple for data that is meant to change.',
  },
]

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
