export default function CitationCard({ citation }) {
  const parts = citation.snippet.split(/(mutable|immutable)/gi)
  const sourceLabel = citation.label || citation.source || 'Teacher-approved lesson'
  return (
    <figure className="citation-card">
      <div className="citation-kicker"><span>Source evidence</span><span className="citation-line" /></div>
      <blockquote>“{parts.map((part, i) => /^(mutable|immutable)$/i.test(part) ? <mark key={i}>{part}</mark> : part)}”</blockquote>
      <figcaption><span className="source-dot" />From your teacher’s material · {sourceLabel}</figcaption>
    </figure>
  )
}
