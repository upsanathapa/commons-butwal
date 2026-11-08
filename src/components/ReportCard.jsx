import { buildReport, categoryInfo, daysOpen } from '../lib/helpers'
import { t, catLabel } from '../lib/i18n'

export default function ReportCard({ issues, onSelect }) {
  const r = buildReport(issues)

  if (r.total === 0) {
    return <p className="empty">{t('rc_noData')}</p>
  }

  const maxCount = r.categories[0][1]

  return (
    <div className="rc">
      <div className="rc-hero">
        <div className="rc-big">{r.percentFixed}%</div>
        <div>
          <div className="rc-hero-title">{t('rc_pct')}</div>
          <div className="rc-hero-sub">{t('rc_of', { a: r.fixedCount, b: r.total })}</div>
        </div>
      </div>
      <div className="bar">
        <div className="bar-fill" style={{ width: `${r.percentFixed}%` }} />
      </div>

      <div className="rc-grid">
        <div className="rc-tile">
          <b>{r.openCount}</b>
          <span>{t('rc_open')}</span>
        </div>
        <div className="rc-tile">
          <b>{r.avgDays}</b>
          <span>{t('rc_avg')}</span>
        </div>
      </div>

      {r.oldest && (
        <button className="rc-item" onClick={() => onSelect(r.oldest)}>
          <span className="rc-item-label">{t('rc_longest')}</span>
          <span className="rc-item-title">{r.oldest.title}</span>
          <span className="rc-item-meta">
            {t('rc_longestMeta', { n: daysOpen(r.oldest), c: r.oldest.confirmations })}
          </span>
        </button>
      )}

      {r.mostConfirmed && r.mostConfirmed.confirmations > 0 && (
        <button className="rc-item" onClick={() => onSelect(r.mostConfirmed)}>
          <span className="rc-item-label">{t('rc_mostConfirmed')}</span>
          <span className="rc-item-title">{r.mostConfirmed.title}</span>
          <span className="rc-item-meta">
            {t('rc_mostMeta', { c: r.mostConfirmed.confirmations })}
          </span>
        </button>
      )}

      <div className="rc-section">{t('rc_byCategory')}</div>
      {r.categories.map(([name, count]) => (
        <div key={name} className="cat-row">
          <span className="cat-name">
            {categoryInfo(name).emoji} {catLabel(name)}
          </span>
          <span className="cat-bar">
            <span
              style={{ width: `${(count / maxCount) * 100}%`, background: categoryInfo(name).color }}
            />
          </span>
          <span className="cat-count">{count}</span>
        </div>
      ))}
    </div>
  )
}