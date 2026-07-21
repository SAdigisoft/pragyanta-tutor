const cleanCitationText = (value = '') => value
  .trim()
  .replace(/\bSECTION\s+[A-Z]\s*:\s*PDF LESSON CONTENT\b/gi, '')
  .replace(/\bChapter title\b/gi, '')
  .replace(/\bLesson metadata\b.*?(?=\bLearning objectives\b|\bKey vocabulary\b|\bMain explanation\b|$)/gi, '')
  .replace(/\s+/g, ' ')
  .replace(/^\s*#{1,6}\s*/, '')
  .replace(/^\s*Ã‚Â§\s*\d+(?:\.\d+)*\s*/, '')
  .replace(/^\s*(?:\d+[.)]|[-*+])\s+/, '')
  .trim()

export default function CitationCard({ citation }) {
  const snippet = cleanCitationText(citation.snippet)
  const parts = snippet.split(/(mutable|immutable)/gi)
  const sourceLabel = cleanCitationText(citation.label || citation.source || 'Teacher-approved lesson')
  const compactLabel = sourceLabel.length > 96 ? `${sourceLabel.slice(0, 96)}...` : sourceLabel

  return (
    <figure className="citation-card">
      <div className="citation-kicker"><span>Source evidence</span><span className="citation-line" /></div>
      <blockquote>"{parts.map((part, i) => /^(mutable|immutable)$/i.test(part) ? <mark key={i}>{part}</mark> : part)}"</blockquote>
      <figcaption title={sourceLabel}>From your teacher's material: {compactLabel || 'Source section'}</figcaption>
    </figure>
  )
}
