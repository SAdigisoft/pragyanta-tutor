const cleanCitationText = (value = '') => value
  .trim()
  .replace(/^\s*#{1,6}\s*/, '')
  .replace(/^\s*§\s*\d+(?:\.\d+)*\s*/, '')
  .replace(/^\s*(?:\d+[.)]|[-*+])\s+/, '')
  .trim()

export default function CitationCard({ citation }) {
  const parts = cleanCitationText(citation.snippet).split(/(mutable|immutable)/gi)
  const sourceLabel = cleanCitationText(citation.label || citation.source || 'Teacher-approved lesson')
  return (
    <figure className="citation-card">
      <div className="citation-kicker"><span>Source evidence</span><span className="citation-line" /></div>
      <blockquote>“{parts.map((part, i) => /^(mutable|immutable)$/i.test(part) ? <mark key={i}>{part}</mark> : part)}”</blockquote>
      <figcaption>From your teacher’s material: {sourceLabel}</figcaption>
    </figure>
  )
}
