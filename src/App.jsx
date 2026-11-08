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
import { fetchIssues, createIssue, confirmIssue } from './lib/api'
import {
  CATEGORY_NAMES,
  categoryInfo,
  displayStatus,
  statusKey,
  timeAgo,
} from './lib/helpers'

// Map starting point: [latitude, longitude]. Change to your own area.
const CENTER = [27.66875, 83.46506]

// A coloured pin with the category icon, drawn with plain HTML and CSS
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

function complaintText(issue) {
  return (
    `Issue: ${issue.title}\n` +
    `Category: ${issue.category}\n` +
    `Details: ${issue.description || 'No extra details'}\n` +
    `Location: https://www.openstreetmap.org/?mlat=${issue.lat}&mlon=${issue.lng}#map=19/${issue.lat}/${issue.lng}\n` +
    `Confirmed by ${issue.confirmations} neighbour(s) on Commons.`
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

// Moves the map when "target" changes
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
  const [issues, setIssues] = useState([])
  const [loading, setLoading] = useState(true)
  const [pending, setPending] = useState(null)
  const [category, setCategory] = useState('All')
  const [query, setQuery] = useState('')
  const [target, setTarget] = useState(null)
  const [toast, setToast] = useState(null)
  const markerRefs = useRef({})

  function notify(type, text) {
    setToast({ type, text })
    setTimeout(() => setToast(null), 3500)
  }

  async function loadIssues() {
    try {
      setIssues(await fetchIssues())
    } catch (e) {
      console.error(e)
      notify('error', 'Could not load issues. Check your internet connection.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadIssues()
  }, [])

  async function addIssue(details) {
    try {
      await createIssue(details, pending)
      setPending(null)
      await loadIssues()
      notify('ok', 'Thank you! Your report is on the map.')
    } catch (e) {
      console.error(e)
      notify('error', 'Could not save the report. Please try again.')
    }
  }

  async function handleConfirm(id) {
    try {
      await confirmIssue(id)
      await loadIssues()
      notify('ok', 'Thanks for confirming this issue.')
    } catch (e) {
      console.error(e)
      notify('error', 'Could not save your confirmation.')
    }
  }

  async function copyComplaint(issue) {
    try {
      await navigator.clipboard.writeText(complaintText(issue))
      notify('ok', 'Complaint text copied. Paste it into Hello Sarkar or send it to your ward office.')
    } catch (e) {
      console.error(e)
      notify('error', 'Could not copy the text.')
    }
  }

  function selectIssue(issue) {
    setTarget({ lat: issue.lat, lng: issue.lng, t: Date.now() })
    setTimeout(() => markerRefs.current[issue.id]?.openPopup(), 900)
  }

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    return issues
      .filter((i) => category === 'All' || i.category === category)
      .filter(
        (i) =>
          !q ||
          i.title.toLowerCase().includes(q) ||
          (i.description || '').toLowerCase().includes(q)
      )
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
  }, [issues, category, query])

  const fixed = issues.filter((i) => i.status === 'fixed').length
  const confirmations = issues.reduce((sum, i) => sum + i.confirmations, 0)

  return (
    <div className="app">
      <header className="header">
        <div className="brand">
          <div className="logo">C</div>
          <div>
            <h1>Commons Butwal</h1>
            <p>See it. Confirm it. Get it fixed, together.</p>
          </div>
        </div>
        <div className="stats">
          <div className="stat">
            <b>{issues.length}</b>
            <span>reported</span>
          </div>
          <div className="stat">
            <b>{confirmations}</b>
            <span>confirmations</span>
          </div>
          <div className="stat">
            <b>{fixed}</b>
            <span>fixed</span>
          </div>
        </div>
      </header>

      <div className="main">
        <aside className="sidebar">
          <div className="sidebar-top">
            <input
              className="search"
              placeholder="Search issues…"
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
                  {c === 'All' ? 'All' : `${categoryInfo(c).emoji} ${c}`}
                </button>
              ))}
            </div>
          </div>

          <div className="list">
            {loading && <p className="empty">Loading issues…</p>}
            {!loading && visible.length === 0 && (
              <p className="empty">No issues here yet. Click the map to report the first one.</p>
            )}
            {visible.map((issue) => {
              const { color, emoji } = categoryInfo(issue.category)
              return (
                <button key={issue.id} className="card" onClick={() => selectIssue(issue)}>
                  <span className="card-icon" style={{ background: color }}>
                    {emoji}
                  </span>
                  <span className="card-body">
                    <span className="card-title">{issue.title}</span>
                    <span className="card-meta">
                      {issue.category} · {timeAgo(issue.created_at)}
                    </span>
                  </span>
                  <span className="card-side">
                    <span className={`status status-${statusKey(issue)}`}>
                      {displayStatus(issue)}
                    </span>
                    <span className="count">✓ {issue.confirmations}</span>
                  </span>
                </button>
              )
            })}
          </div>

          <div className="sidebar-foot">
            Official complaint line: Hello Sarkar <b>1111</b>
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

            {visible.map((issue) => (
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
                      {categoryInfo(issue.category).emoji} {issue.category} ·{' '}
                      {timeAgo(issue.created_at)}
                    </div>
                    <span className={`status status-${statusKey(issue)}`}>
                      {displayStatus(issue)}
                    </span>
                    {issue.description && <p className="popup-desc">{issue.description}</p>}
                    <div className="popup-by">
                      {issue.reporter ? `Reported by ${issue.reporter}` : 'Reported anonymously'}
                    </div>
                    <div className="popup-actions">
                      <button
                        className="btn btn-primary"
                        onClick={() => handleConfirm(issue.id)}
                        disabled={issue.confirmedByMe}
                      >
                        {issue.confirmedByMe ? 'Confirmed' : 'I see this too'} (
                        {issue.confirmations})
                      </button>
                      <button className="btn btn-ghost" onClick={() => copyComplaint(issue)}>
                        Copy complaint
                      </button>
                    </div>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>

          {!pending && <div className="hint">Click anywhere on the map to report a problem</div>}

          {pending && (
            <ReportForm
              position={pending}
              onSubmit={addIssue}
              onCancel={() => setPending(null)}
            />
          )}
        </div>
      </div>

      {toast && <div className={`toast toast-${toast.type}`}>{toast.text}</div>}
    </div>
  )
}