import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import ChatMessage from '../components/ChatMessage'
import LevelToggle from '../components/LevelToggle'
import Report from '../pages/Report'

describe('core frontend rendering', () => {
  it('makes learner-level selection accessible and interactive', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<LevelToggle value="beginner" onChange={onChange} />)

    expect(screen.getByRole('button', { name: 'Beginner' })).toHaveAttribute('aria-pressed', 'true')
    await user.click(screen.getByRole('button', { name: 'Intermediate' }))
    expect(onChange).toHaveBeenCalledWith('intermediate')
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
})
