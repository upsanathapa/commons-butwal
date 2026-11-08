import { TIMELINE_KEYS, stepIndex, statusLabel } from '../lib/helpers'

export default function Timeline({ issue }) {
  const current = stepIndex(issue)
  return (
    <ol className="timeline">
      {TIMELINE_KEYS.map((key, i) => (
        <li
          key={key}
          className={`tl-step ${i < current ? 'tl-done' : ''} ${i === current ? 'tl-now' : ''}`}
        >
          <span className="tl-dot">{i <= current ? '✓' : ''}</span>
          <span className="tl-label">{statusLabel(key)}</span>
        </li>
      ))}
    </ol>
  )
}