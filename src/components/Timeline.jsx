import { TIMELINE_STEPS, stepIndex } from '../lib/helpers'

export default function Timeline({ issue }) {
  const current = stepIndex(issue)
  return (
    <ol className="timeline">
      {TIMELINE_STEPS.map((label, i) => (
        <li
          key={label}
          className={`tl-step ${i < current ? 'tl-done' : ''} ${i === current ? 'tl-now' : ''}`}
        >
          <span className="tl-dot">{i <= current ? '✓' : ''}</span>
          <span className="tl-label">{label}</span>
        </li>
      ))}
    </ol>
  )
}