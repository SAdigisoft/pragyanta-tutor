export default function LevelToggle({ value, onChange }) {
  return (
    <div className="level-control">
      <span className="level-label">Explanation level</span>
      <div className="level-toggle" aria-label="Explanation level">
        {['beginner', 'intermediate'].map((item) => <button key={item} className={value === item ? 'active' : ''} aria-pressed={value === item} onClick={() => onChange(item)}>{item[0].toUpperCase() + item.slice(1)}</button>)}
      </div>
    </div>
  )
}
