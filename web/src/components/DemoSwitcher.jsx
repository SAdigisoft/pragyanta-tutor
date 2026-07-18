import { useState } from 'react'

const options = {
  landing: [['default', 'Lesson library'], ['empty', 'Empty library'], ['uploading', 'Uploading'], ['upload_error', 'Upload error']],
  learn: [['empty', 'Empty session'], ['answer', 'Grounded answer'], ['remediation', 'Remediation'], ['resolved', 'Resolved'], ['unresolved', 'Unresolved'], ['off_topic', 'Off topic'], ['error', 'Tutor error']],
  report: [['default', 'Report with data'], ['empty', 'Empty report'], ['error', 'Report error']],
}

export default function DemoSwitcher({ page, value, onChange }) {
  const [open, setOpen] = useState(false)
  if (import.meta.env.VITE_SHOW_DEMO_SWITCHER === 'false') return null
  return (
    <aside className={`demo-switcher ${open ? 'open' : ''}`}>
      {open && <div className="demo-menu"><div className="demo-title"><span>Review screen states</span><button aria-label="Close demo menu" onClick={() => setOpen(false)}>×</button></div>{options[page].map(([key, label]) => <button key={key} className={value === key ? 'active' : ''} onClick={() => onChange(key)}>{label}<span>{value === key ? '●' : '○'}</span></button>)}</div>}
      <button className="demo-trigger" aria-expanded={open} onClick={() => setOpen((v) => !v)}><span>⚙</span> Demo</button>
    </aside>
  )
}
