import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import App from '../App'
import ChatMessage from '../components/ChatMessage'
import LevelToggle from '../components/LevelToggle'
import Report from '../pages/Report'
import Practice from '../pages/Practice'
import Learn from '../pages/Learn'

describe('core frontend rendering', () => {
  it('provides persistent product navigation and tutoring history access', async () => {
    render(<MemoryRouter initialEntries={['/']}><App /></MemoryRouter>)

    expect(screen.getByRole('navigation', { name: 'Main navigation' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Lesson library' })).toHaveClass('active')
    expect(screen.getByRole('link', { name: 'Practice' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Learning reports' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'New tutoring chat' })).toBeInTheDocument()
    expect(await screen.findByText('Your tutoring conversations will appear here.')).toBeInTheDocument()
  })

  it('makes learner-level selection accessible and interactive', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<LevelToggle value="beginner" onChange={onChange} />)

    expect(screen.getByRole('button', { name: 'Beginner' })).toHaveAttribute('aria-pressed', 'true')
    await user.click(screen.getByRole('button', { name: 'Intermediate' }))
    expect(onChange).toHaveBeenCalledWith('intermediate')
  })

  it('renders the featured prompt supplied by session metadata', async () => {
    render(<MemoryRouter initialEntries={['/learn/demo-session']}><Routes><Route path="/learn/:sessionId" element={<Learn />} /></Routes></MemoryRouter>)

    expect(await screen.findByRole('button', { name: /What is the difference between a list and a tuple\?/ })).toBeInTheDocument()
  })

  it('normalizes verdicts returned by the real API', () => {
    const { container } = render(<ChatMessage message={{
      role: 'tutor', msg_type: 'verdict', verdict_status: 'resolved',
      content: "Exactly. Tuples are immutable. | You've got the key difference.",
    }} />)

    expect(screen.getByText('Misconception resolved')).toBeInTheDocument()
    expect(screen.getByText('Exactly. Tuples are immutable.')).toBeInTheDocument()
    expect(screen.getByText("You've got the key difference.")).toBeInTheDocument()
    expect(container.querySelector('.verdict-panel')).toHaveClass('resolved')
  })

  it('renders backend remediation safely when no misconception label is present', () => {
    render(<ChatMessage message={{ role: 'tutor', msg_type: 'remediation', content: 'Lists can change, while tuples cannot.' }} />)
    expect(screen.getByRole('heading', { name: 'A key idea needs another look' })).toBeInTheDocument()
    expect(screen.getByText('Lists can change, while tuples cannot.')).toBeInTheDocument()
  })

  it('renders report totals, evidence, and all statuses through its route', async () => {
    render(<MemoryRouter initialEntries={['/report/demo-lesson']}><Routes><Route path="/report/:lessonId" element={<Report />} /></Routes></MemoryRouter>)

    expect(await screen.findByText('3')).toBeInTheDocument()
    expect(screen.getByText('The student believes tuple values can be modified.')).toBeInTheDocument()
    for (const status of ['resolved', 'unresolved', 'open']) {
      expect(screen.getByText(status, { selector: '.status-badge' })).toHaveClass('status-badge', status)
    }
  })

  it('shows exact source evidence after checking a practice answer', async () => {
    const user = userEvent.setup()
    render(<MemoryRouter initialEntries={['/practice/demo-lesson']}><Routes><Route path="/practice/:lessonId" element={<Practice />} /></Routes></MemoryRouter>)

    expect(await screen.findByText('What is the difference between a list and a tuple?')).toBeInTheDocument()
    await user.click(screen.getByRole('radio', { name: /A list is mutable; a tuple is immutable/ }))
    await user.click(screen.getByRole('button', { name: 'Check answer' }))
    expect(screen.getByText('Source evidence')).toBeInTheDocument()
    expect(screen.getByText(/A list is mutable, meaning its contents can be changed/)).toBeInTheDocument()
  })
})
