import { buildReport, categoryInfo, daysOpen } from '../lib/helpers'

export default function ReportCard({ issues, onSelect }) {
  const r = buildReport(issues)

  if (r.total === 0) {
    return <p className="empty">No data yet. Report an issue to start the scoreboard.</p>
  }

  const maxCount = r.categories[0][1]

  return (
    <div className="rc">
      <div className="rc-hero">
        <div className="rc-big">{r.percentFixed}%</div>
        <div>
          <div className="rc-hero-title">of reported problems fixed</div>
          <div className="rc-hero-sub">
            {r.fixedCount} of {r.total} issues
          </div>
        </div>
      </div>
      <div className="bar">
        <div className="bar-fill" style={{ width: `${r.percentFixed}%` }} />
      </div>

      <div className="rc-grid">
        <div className="rc-tile">
          <b>{r.openCount}</b>
          <span>still open</span>
        </div>
        <div className="rc-tile">
          <b>{r.avgDays}</b>
          <span>avg days waiting</span>
        </div>
      </div>

      {r.oldest && (
        <button className="rc-item" onClick={() => onSelect(r.oldest)}>
          <span className="rc-item-label">Waiting longest</span>
          <span className="rc-item-title">{r.oldest.title}</span>
          <span className="rc-item-meta">
            {daysOpen(r.oldest)} days open · ✓ {r.oldest.confirmations} confirmations
          </span>
        </button>
      )}

      {r.mostConfirmed && r.mostConfirmed.confirmations > 0 && (
        <button className="rc-item" onClick={() => onSelect(r.mostConfirmed)}>
          <span className="rc-item-label">Most confirmed</span>
          <span className="rc-item-title">{r.mostConfirmed.title}</span>
          <span className="rc-item-meta">✓ {r.mostConfirmed.confirmations} neighbours see this</span>
        </button>
      )}

      <div className="rc-section">Reports by category</div>
      {r.categories.map(([name, count]) => (
        <div key={name} className="cat-row">
          <span className="cat-name">
            {categoryInfo(name).emoji} {name}
          </span>
          <span className="cat-bar">
            <span style={{ width: `${(count / maxCount) * 100}%`, background: categoryInfo(name).color }} />
          </span>
          <span className="cat-count">{count}</span>
        </div>
      ))}
    </div>
  )
}