import { useEffect, useMemo, useRef, useState } from 'react'
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  CircleMarker,
  useMap,
  useMapEvents,
} from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
import ReportForm from './components/ReportForm'
import ReportCard from './components/ReportCard'
import Timeline from './components/Timeline'
import Logo from './components/Logo'
import { fetchIssues, createIssue, confirmIssue } from './lib/api'
import { t, catLabel, getLang, setLang } from './lib/i18n'
import {
  CATEGORY_NAMES,
  categoryInfo,
  displayStatus,
  statusKey,
  timeAgo,
  daysOpen,
  daysOpenLabel,
  priorityLevel,
  priorityLabel,
  priorityScore,
} from './lib/helpers'

// Map starting point: [latitude, longitude]. Change to your own area.
const CENTER = [27.66875, 83.46506]

function pinIcon(issue) {
  const { color, emoji } = categoryInfo(issue.category)
  return L.divIcon({
    className: 'pin-wrap',
    html: `<div class="pin" style="background:${color}"><span>${emoji}</span></div>`,
    iconSize: [34, 34],
    iconAnchor: [17, 34],
    popupAnchor: [0, -30],
  })
}

// The complaint text stays in English, because it is sent to officials
function complaintText(issue) {
  return (
    `Issue: ${issue.title}\n` +
    `Category: ${issue.category}\n` +
    `Details: ${issue.description || 'No extra details'}\n` +
    `Location: https://www.openstreetmap.org/?mlat=${issue.lat}&mlon=${issue.lng}#map=19/${issue.lat}/${issue.lng}\n` +
    `Open for ${daysOpen(issue)} day(s). Confirmed by ${issue.confirmations} neighbour(s) on Commons.`
  )
}

function ClickHandler({ onPick }) {
  useMapEvents({
    click(e) {
      onPick(e.latlng)
    },
  })
  return null
}

function FlyTo({ target }) {
  const map = useMap()
  useEffect(() => {
    if (target) {
      map.flyTo([target.lat, target.lng], Math.max(map.getZoom(), 17), { duration: 0.8 })
    }
  }, [target, map])
  return null
}

export default function App() {
  const [lang, setLangState] = useState(getLang)
  const [issues, setIssues] = useState([])
  const [loading, setLoading] = useState(true)
  const [pending, setPending] = useState(null)
  const [category, setCategory] = useState('All')
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState('priority')
  const [tab, setTab] = useState('issues')
  const [target, setTarget] = useState(null)
  const [toast, setToast] = useState(null)
  const [showHow, setShowHow] = useState(() => {
    try {
      return !localStorage.getItem('commons_seen_how')
    } catch {
      return false
    }
  })
  const markerRefs = useRef({})

  function switchLang(next) {
    setLang(next)
    setLangState(next)
  }

  useEffect(() => {
    document.documentElement.lang = lang
  }, [lang])

  function notify(type, key) {
    setToast({ type, key })
    setTimeout(() => setToast(null), 3500)
  }

  function closeHow() {
    setShowHow(false)
    try {
      localStorage.setItem('commons_seen_how', '1')
    } catch {
      // storage unavailable: ignore
    }
  }

  async function loadIssues() {
    try {
      setIssues(await fetchIssues())
    } catch (e) {
      console.error(e)
      notify('error', 'toast_loadFail')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadIssues()
  }, [])

  async function addIssue(details) {
    try {
      const { photoFailed } = await createIssue(details, pending)
      setPending(null)
      await loadIssues()
      if (photoFailed) {
        notify('error', 'toast_photoFailed')
      } else {
        notify('ok', 'toast_thanksReport')
      }
    } catch (e) {
      console.error(e)
      notify('error', 'toast_saveFail')
    }
  }

  async function handleConfirm(id) {
    try {
      await confirmIssue(id)
      await loadIssues()
      notify('ok', 'toast_thanksConfirm')
    } catch (e) {
      console.error(e)
      notify('error', 'toast_confirmFail')
    }
  }

  async function copyComplaint(issue) {
    try {
      await navigator.clipboard.writeText(complaintText(issue))
      notify('ok', 'toast_copied')
    } catch (e) {
      console.error(e)
      notify('error', 'toast_copyFail')
    }
  }

  function selectIssue(issue) {
    setTarget({ lat: issue.lat, lng: issue.lng, t: Date.now() })
    setTimeout(() => markerRefs.current[issue.id]?.openPopup(), 900)
  }

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    const list = issues
      .filter((i) => category === 'All' || i.category === category)
      .filter(
        (i) =>
          !q ||
          i.title.toLowerCase().includes(q) ||
          (i.description || '').toLowerCase().includes(q)
      )
    return list.sort(
      sort === 'priority'
        ? (a, b) => priorityScore(b) - priorityScore(a)
        : (a, b) => new Date(b.created_at) - new Date(a.created_at)
    )
  }, [issues, category, query, sort])

  const fixed = issues.filter((i) => i.status === 'fixed').length
  const confirmations = issues.reduce((sum, i) => sum + i.confirmations, 0)

  return (
    <div className="app">
      <header className="header">
        <div className="brand">
          <Logo size={42} />
          <div>
            <h1>Commons Butwal</h1>
            <p>{t('tagline')}</p>
          </div>
        </div>
        <div className="header-right">
          <div className="stats">
            <div className="stat">
              <b>{issues.length}</b>
              <span>{t('stat_reported')}</span>
            </div>
            <div className="stat">
              <b>{confirmations}</b>
              <span>{t('stat_confirmations')}</span>
            </div>
            <div className="stat">
              <b>{fixed}</b>
              <span>{t('stat_fixed')}</span>
            </div>
          </div>
          <div className="lang">
            <button className={lang === 'en' ? 'on' : ''} onClick={() => switchLang('en')}>
              EN
            </button>
            <button className={lang === 'ne' ? 'on' : ''} onClick={() => switchLang('ne')}>
              नेपाली
            </button>
          </div>
          <button className="how-btn" onClick={() => setShowHow(true)}>
            {t('howBtn')}
          </button>
        </div>
      </header>

      <div className="main">
        <aside className="sidebar">
          <div className="tabs">
            <button
              className={`tab ${tab === 'issues' ? 'tab-on' : ''}`}
              onClick={() => setTab('issues')}
            >
              {t('tabIssues')} ({issues.length})
            </button>
            <button
              className={`tab ${tab === 'report' ? 'tab-on' : ''}`}
              onClick={() => setTab('report')}
            >
              {t('tabReport')}
            </button>
          </div>

          {tab === 'issues' && (
            <>
              <div className="sidebar-top">
                <input
                  className="search"
                  placeholder={t('searchPh')}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
                <div className="chips">
                  {['All', ...CATEGORY_NAMES].map((c) => (
                    <button
                      key={c}
                      className={`chip ${category === c ? 'chip-on' : ''}`}
                      onClick={() => setCategory(c)}
                    >
                      {c === 'All' ? t('all') : `${categoryInfo(c).emoji} ${catLabel(c)}`}
                    </button>
                  ))}
                </div>
                <div className="sort">
                  <button
                    className={`sort-btn ${sort === 'priority' ? 'sort-on' : ''}`}
                    onClick={() => setSort('priority')}
                  >
                    {t('sortPriority')}
                  </button>
                  <button
                    className={`sort-btn ${sort === 'newest' ? 'sort-on' : ''}`}
                    onClick={() => setSort('newest')}
                  >
                    {t('sortNewest')}
                  </button>
                </div>
              </div>

              <div className="list">
                {loading && <p className="empty">{t('loading')}</p>}
                {!loading && visible.length === 0 && <p className="empty">{t('emptyList')}</p>}
                {visible.map((issue) => {
                  const { color, emoji } = categoryInfo(issue.category)
                  const level = priorityLevel(issue)
                  return (
                    <button key={issue.id} className="card" onClick={() => selectIssue(issue)}>
                      <span className="card-icon" style={{ background: color }}>
                        {emoji}
                      </span>
                      <span className="card-body">
                        <span className="card-title">{issue.title}</span>
                        <span className="card-meta">
                          {catLabel(issue.category)} · {daysOpenLabel(issue)}
                        </span>
                      </span>
                      <span className="card-side">
                        <span className={`status status-${statusKey(issue)}`}>
                          {displayStatus(issue)}
                        </span>
                        {level === 'high' ? (
                          <span className="prio prio-high">{priorityLabel('high')}</span>
                        ) : (
                          <span className="count">✓ {issue.confirmations}</span>
                        )}
                      </span>
                    </button>
                  )
                })}
              </div>
            </>
          )}

          {tab === 'report' && (
            <div className="list">
              <ReportCard issues={issues} onSelect={selectIssue} />
            </div>
          )}

          <div className="sidebar-foot">
            {t('hotline')} <b>1111</b>
          </div>
        </aside>

        <div className="map-wrap">
          <MapContainer center={CENTER} zoom={16}>
            <TileLayer
              attribution="&copy; OpenStreetMap contributors"
              url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <ClickHandler onPick={setPending} />
            <FlyTo target={target} />

            {pending && (
              <CircleMarker
                center={[pending.lat, pending.lng]}
                radius={12}
                pathOptions={{ color: '#0f766e', fillColor: '#14b8a6', fillOpacity: 0.5 }}
              />
            )}

            {visible.map((issue) => {
              const level = priorityLevel(issue)
              return (
                <Marker
                  key={issue.id}
                  position={[issue.lat, issue.lng]}
                  icon={pinIcon(issue)}
                  ref={(m) => {
                    if (m) markerRefs.current[issue.id] = m
                  }}
                >
                  <Popup>
                    <div className="popup">
                      {issue.photo_url && (
                        <img className="popup-photo" src={issue.photo_url} alt={issue.title} />
                      )}
                      <div className="popup-title">{issue.title}</div>
                      <div className="popup-meta">
                        {categoryInfo(issue.category).emoji} {catLabel(issue.category)} ·{' '}
                        {timeAgo(issue.created_at)}
                      </div>
                      <div className="popup-row">
                        <span className="popup-days">{daysOpenLabel(issue)}</span>
                        {level && (
                          <span className={`prio prio-${level}`}>{priorityLabel(level)}</span>
                        )}
                      </div>
                      <Timeline issue={issue} />
                      {issue.description && <p className="popup-desc">{issue.description}</p>}
                      <div className="popup-by">
                        {issue.reporter
                          ? t('reportedBy', { name: issue.reporter })
                          : t('anonymous')}
                      </div>
                      <div className="popup-actions">
                        <button
                          className="btn btn-primary"
                          onClick={() => handleConfirm(issue.id)}
                          disabled={issue.confirmedByMe}
                        >
                          {issue.confirmedByMe ? t('confirmedBtn') : t('confirmBtn')} (
                          {issue.confirmations})
                        </button>
                        <button className="btn btn-ghost" onClick={() => copyComplaint(issue)}>
                          {t('copyBtn')}
                        </button>
                      </div>
                    </div>
                  </Popup>
                </Marker>
              )
            })}
          </MapContainer>

          {!pending && <div className="hint">{t('hint')}</div>}

          {pending && (
            <ReportForm
              position={pending}
              onSubmit={addIssue}
              onCancel={() => setPending(null)}
            />
          )}
        </div>
      </div>

      {showHow && (
        <div className="modal-back" onClick={closeHow}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>{t('how_title')}</h2>
            <p className="modal-lead">{t('how_lead')}</p>
            <ol className="how">
              <li>
                <b>{t('how1Title')}</b> {t('how1')}
              </li>
              <li>
                <b>{t('how2Title')}</b> {t('how2')}
              </li>
              <li>
                <b>{t('how3Title')}</b> {t('how3')}
              </li>
              <li>
                <b>{t('how4Title')}</b> {t('how4')}
              </li>
            </ol>
            <p className="how-note">{t('how_note')}</p>
            <button className="btn btn-primary" onClick={closeHow}>
              {t('how_gotIt')}
            </button>
          </div>
        </div>
      )}

      {toast && <div className={`toast toast-${toast.type}`}>{t(toast.key)}</div>}
    </div>
  )
}