async function resolveDelayed(promise) {
  await vi.runAllTimersAsync()
  return promise
}

describe('mock API storyboard', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.useFakeTimers()
  })

  afterEach(() => vi.useRealTimers())

  it('plays the four-turn answer, remediation, resolution, and off-topic sequence', async () => {
    const api = await import('../api')
    await resolveDelayed(api.createSession({ lesson_id: 'demo-lesson', learner_level: 'beginner' }))

    const answer = await resolveDelayed(api.sendChat('demo-session', { message: 'question' }))
    expect(answer.tutor_messages.map((message) => message.msg_type)).toEqual(['chat', 'diagnostic_question'])
    expect(answer.tutor_messages[0].citations).toHaveLength(1)

    const remediation = await resolveDelayed(api.sendChat('demo-session', { message: 'incorrect answer' }))
    expect(remediation.tutor_messages.map((message) => message.msg_type)).toEqual(['remediation', 'verification_question'])
    expect(remediation.misconception_update).toMatchObject({ status: 'open' })

    const resolution = await resolveDelayed(api.sendChat('demo-session', { message: 'correct answer' }))
    expect(resolution.tutor_messages[0]).toMatchObject({ msg_type: 'verdict', status: 'resolved' })
    expect(resolution.misconception_update).toMatchObject({ status: 'resolved' })

    const refusal = await resolveDelayed(api.sendChat('demo-session', { message: 'off-topic question' }))
    expect(refusal.tutor_messages[0].msg_type).toBe('off_topic')
    expect(await resolveDelayed(api.getMessages('demo-session'))).toHaveLength(10)
  })

  it('re-hydrates the first explanation when learner level changes', async () => {
    const api = await import('../api')
    await resolveDelayed(api.createSession({ lesson_id: 'demo-lesson', learner_level: 'beginner' }))
    await resolveDelayed(api.sendChat('demo-session', { message: 'question' }))
    await api.setLearnerLevel('demo-session', 'intermediate')

    const messages = await resolveDelayed(api.getMessages('demo-session'))
    expect(messages.some((message) => message.id === 't1i')).toBe(true)
    expect(messages.find((message) => message.id === 't1i').content).toContain('hashable')
    expect(messages.some((message) => message.id === 't1')).toBe(false)
  })

  it('returns the complete report summary and three distinct statuses', async () => {
    const api = await import('../api')
    const data = await resolveDelayed(api.getReport('demo-lesson'))
    expect(data.summary).toEqual({ total: 3, resolved: 1, unresolved: 1, open: 1 })
    expect(data.misconceptions.map((item) => item.status)).toEqual(['resolved', 'unresolved', 'open'])
  })
})
