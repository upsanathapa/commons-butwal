import { useEffect, useMemo, useRef, useState } from 'react'
import {
  MapContainer,
  TileLayer,
  LayersControl,
  Marker,
  Popup,
  Circle,
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
import ResolutionProofs from './components/ResolutionProofs'
import {
  fetchIssues,
  createIssue,
  confirmIssue,
  castFixVote,
  supabase,
  fetchFlagCounts,
  flagIssue,
  isAdmin,
  setIssueStatus,
  fetchHelpers,
  toggleHelper,
} from './lib/api'
import { t, catLabel, getLang, setLang } from './lib/i18n'
import {
  CATEGORY_NAMES,
  categoryInfo,
  displayStatus,
  statusKey,
  isFixed,
  timeAgo,
  daysOpen,
  daysOpenLabel,
  priorityLevel,
  priorityLabel,
  priorityScore,
} from './lib/helpers'

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

const pendingIcon = L.divIcon({
  className: 'pending-wrap',
  html: '<div class="pending-pin"></div>',
  iconSize: [28, 28],
  iconAnchor: [14, 14],
})

function complaintText(issue) {
  return (
    `Issue: ${issue.title}\n` +
    `Category: ${issue.category}\n` +
    `Details: ${issue.description || 'No extra details'}\n` +
    `Location: https://www.openstreetmap.org/?mlat=${issue.lat}&mlon=${issue.lng}#map=19/${issue.lat}/${issue.lng}\n` +
    `Open for ${daysOpen(issue)} day(s). Confirmed by ${issue.confirmations} neighbour(s) on Commons.`
  )
}

function wardBriefing(issues) {
  const top = issues
    .filter((i) => !isFixed(i))
    .sort((a, b) => priorityScore(b) - priorityScore(a))
    .slice(0, 5)
  const lines = top.map(
    (i, n) =>
      `${n + 1}. ${i.title} (${i.category}) - open ${daysOpen(i)} day(s), confirmed by ${i.confirmations} neighbour(s). ` +
      `Location: https://www.openstreetmap.org/?mlat=${i.lat}&mlon=${i.lng}#map=19/${i.lat}/${i.lng}`
  )
  return (
    `Commons Butwal - neighbourhood briefing\n` +
    `${top.length} open issue(s) need attention, most urgent first:\n\n` +
    `${lines.join('\n')}\n\n` +
    `Reported and confirmed by neighbours: commons-butwal.vercel.app`
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
      map.flyTo([target.lat, target.lng], Math.max(map.getZoom(), 17), {
        duration: 0.8,
      })
    }
  }, [target, map])

  return null
}

function ClosePopupWhenReporting({ pending }) {
  const map = useMap()

  useEffect(() => {
    if (pending) map.closePopup()
  }, [pending, map])

  return null
}

function Locator({ tick, onFound, onError }) {
  const map = useMap()

  useMapEvents({
    locationfound(e) {
      onFound({
        lat: e.latlng.lat,
        lng: e.latlng.lng,
        acc: e.accuracy,
      })
    },
    locationerror() {
      onError()
    },
  })

  useEffect(() => {
    if (tick > 0) {
      map.locate({
        setView: true,
        maxZoom: 19,
        enableHighAccuracy: true,
        timeout: 15000,
      })
    }
  }, [tick, map])

  return null
}

export default function App() {
  const [showAbout, setShowAbout] = useState(false)
  const [lang, setLangState] = useState(getLang)
  const [issues, setIssues] = useState([])
  const [loading, setLoading] = useState(true)
  const [pending, setPending] = useState(null)
  const [category, setCategory] = useState('All')
  const [statusFilter, setStatusFilter] = useState('All Status')
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState('priority')
  const [tab, setTab] = useState('issues')
  const [target, setTarget] = useState(null)
  const [toast, setToast] = useState(null)
  const [locateTick, setLocateTick] = useState(0)
  const [me, setMe] = useState(null)
  const [user, setUser] = useState(null)
  const [flagCounts, setFlagCounts] = useState({})
  const [helpers, setHelpers] = useState({ counts: {}, mine: {} })
  const [admin, setAdmin] = useState(false)
  const [showHow, setShowHow] = useState(() => {
    try {
      return !localStorage.getItem('commons_seen_how')
    } catch {
      return false
    }
  })
  const markerRefs = useRef({})
  const openedFromLink = useRef(false)

  function switchLang(next) {
    setLang(next)
    setLangState(next)
  }

  useEffect(() => {
    document.documentElement.lang = lang
  }, [lang])

  // Get the current session and listen for authentication changes
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      loadIssues()
    })

    return () => subscription.unsubscribe()
  }, [])

  // Check whether the logged-in user is an admin
  useEffect(() => {
    if (!user) {
      setAdmin(false)
      return
    }
    isAdmin().then(setAdmin)
  }, [user])

  async function signInWithGoogle() {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin,
        queryParams: { prompt: 'select_account' },
      },
    })
  }

  async function signOut() {
    await supabase.auth.signOut()
  }

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
      setFlagCounts(await fetchFlagCounts())
      setHelpers(await fetchHelpers())
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
    if (!user) {
      notify('error', 'sign_in_needed')
      return
    }
    try {
      await confirmIssue(id)
      await loadIssues()
      notify('ok', 'toast_thanksConfirm')
    } catch (e) {
      console.error(e)
      notify('error', 'toast_confirmFail')
    }
  }

  async function handleFixVote(id, vote) {
    if (!user) {
      notify('error', 'sign_in_needed')
      return
    }
    try {
      await castFixVote(id, vote)
      await loadIssues()
      notify('ok', 'fix_thanks')
    } catch (e) {
      console.error(e)
      notify('error', 'fix_failed')
    }
  }

  async function handleFlag(id) {
    if (!user) {
      notify('error', 'sign_in_needed')
      return
    }
    if (!window.confirm(t('flag_confirm'))) return
    try {
      await flagIssue(id)
      await loadIssues()
      notify('ok', 'flag_thanks')
    } catch (e) {
      console.error(e)
      notify('error', e.message === 'sign_in_required' ? 'sign_in_needed' : 'flag_failed')
    }
  }

  async function handleHelp(id) {
    if (!user) {
      notify('error', 'sign_in_needed')
      return
    }
    const wasHelping = !!helpers.mine[id]
    try {
      await toggleHelper(id, !wasHelping)
      await loadIssues()
      if (!wasHelping) notify('ok', 'help_thanks')
    } catch (e) {
      console.error(e)
      notify('error', 'help_failed')
    }
  }

  async function handleSetStatus(id, status) {
    try {
      await setIssueStatus(id, status)
      await loadIssues()
      notify('ok', 'admin_updated')
    } catch (e) {
      console.error(e)
      notify('error', 'admin_failed')
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

  async function copyLink(issue) {
    const url = `${window.location.origin}/?issue=${issue.id}`
    try {
      await navigator.clipboard.writeText(url)
      notify('ok', 'share_copied')
    } catch (e) {
      console.error(e)
      notify('error', 'toast_copyFail')
    }
  }

  function sendWhatsApp(issue) {
    const link = `${window.location.origin}/?issue=${issue.id}`
    const text = `${complaintText(issue)}\n${link}`
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank')
  }

  async function copyBriefing() {
    try {
      await navigator.clipboard.writeText(wardBriefing(issues))
      notify('ok', 'brief_copied')
    } catch (e) {
      console.error(e)
      notify('error', 'toast_copyFail')
    }
  }

  function selectIssue(issue) {
    setTarget({ lat: issue.lat, lng: issue.lng, t: Date.now() })
    setTimeout(() => markerRefs.current[issue.id]?.openPopup(), 900)
  }

  // Opens the right pin when someone visits a shared link like /?issue=...
  useEffect(() => {
    if (openedFromLink.current || issues.length === 0) return
    const id = new URLSearchParams(window.location.search).get('issue')
    if (!id) return
    const found = issues.find((i) => i.id === id)
    if (found) {
      openedFromLink.current = true
      selectIssue(found)
    }
  }, [issues])

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    const list = issues
      .filter((i) => {
        if (category === 'MyReports') {
          return user ? i.user_id === user.id : false
        }
        return category === 'All' || i.category === category
      })
      .filter((i) => {
        if (statusFilter === 'All Status') return true
        return statusKey(i) === statusFilter
      })
      .filter(
        (i) =>
          !q ||
          i.title.toLowerCase().includes(q) ||
          (i.description || '').toLowerCase().includes(q)
      )
      .filter((i) => (flagCounts[i.id] || 0) < 3)
    return list.sort(
      sort === 'priority'
        ? (a, b) => priorityScore(b) - priorityScore(a)
        : (a, b) => new Date(b.created_at) - new Date(a.created_at)
    )
  }, [issues, category, statusFilter, query, sort, user, flagCounts])

  const fixed = issues.filter((i) => isFixed(i)).length
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

          <div className="auth-section" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {user ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {user.user_metadata?.avatar_url && (
                  <img
                    src={user.user_metadata.avatar_url}
                    alt="Avatar"
                    style={{ width: 28, height: 28, borderRadius: '50%' }}
                  />
                )}
                <button
                  className={`btn ${category === 'MyReports' ? 'btn-primary' : 'btn-ghost'}`}
                  style={{
                    fontSize: '13px',
                    padding: '6px 12px',
                    background: category === 'MyReports' ? '#2563eb' : '#f1f5f9',
                    color: category === 'MyReports' ? '#fff' : '#1e293b',
                    fontWeight: '600',
                  }}
                  onClick={() => setCategory('MyReports')}
                >
                  👤 My Reports
                </button>
                <button
                  className="btn btn-ghost"
                  style={{ fontSize: '13px', padding: '6px 10px' }}
                  onClick={signOut}
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <button
                className="btn btn-primary"
                style={{ fontSize: '13px', padding: '6px 12px' }}
                onClick={signInWithGoogle}
              >
                Sign in with Google
              </button>
            )}
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
          <button className="how-btn" onClick={() => setShowAbout(true)}>
            About
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

                {/* Status filter pills */}
                <div
                  className="chips"
                  style={{ marginTop: '8px', borderTop: '1px solid #e2e8f0', paddingTop: '8px' }}
                >
                  {['All Status', 'reported', 'confirmed', 'sent', 'fixed'].map((st) => (
                    <button
                      key={st}
                      className={`chip ${statusFilter === st ? 'chip-on' : ''}`}
                      onClick={() => setStatusFilter(st)}
                      style={{ fontSize: '11px', padding: '3px 8px' }}
                    >
                      {st === 'All Status' ? '🔍 All Status' : st.charAt(0).toUpperCase() + st.slice(1)}
                    </button>
                  ))}
                </div>

                <div className="sort" style={{ marginTop: '8px' }}>
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
              <button className="btn btn-primary brief-btn" onClick={copyBriefing}>
                {t('brief_btn')}
              </button>
            </div>
          )}

          <div className="sidebar-foot">
            {t('hotline')} <b>1111</b>
          </div>
        </aside>

        <div className="map-wrap">
          <MapContainer center={CENTER} zoom={17} maxZoom={19}>
  <ClosePopupWhenReporting pending={pending} />
            <LayersControl key={lang} position="topright">
              <LayersControl.BaseLayer checked name={t('layer_streets')}>
                <TileLayer
                  attribution="&copy; OpenStreetMap contributors"
                  url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
                  maxNativeZoom={19}
                  maxZoom={19}
                />
              </LayersControl.BaseLayer>
              <LayersControl.BaseLayer name={t('layer_sat')}>
                <TileLayer
                  attribution="Tiles &copy; Esri"
                  url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                  maxNativeZoom={18}
                  maxZoom={19}
                />
              </LayersControl.BaseLayer>
            </LayersControl>

            <ClickHandler onPick={setPending} />
            <FlyTo target={target} />
            <Locator
              tick={locateTick}
              onFound={setMe}
              onError={() => notify('error', 'loc_denied')}
            />

            {me && (
              <>
                <Circle
                  center={[me.lat, me.lng]}
                  radius={me.acc}
                  pathOptions={{ color: '#2563eb', weight: 1, fillOpacity: 0.1 }}
                />
                <CircleMarker
                  center={[me.lat, me.lng]}
                  radius={7}
                  pathOptions={{ color: '#ffffff', weight: 3, fillColor: '#2563eb', fillOpacity: 1 }}
                />
              </>
            )}

            {pending && (
              <Marker
                position={[pending.lat, pending.lng]}
                icon={pendingIcon}
                draggable
                zIndexOffset={1000}
                eventHandlers={{
                  dragend: (e) => setPending(e.target.getLatLng()),
                }}
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
                        <button className="btn btn-ghost" onClick={() => copyLink(issue)}>
                          {t('share_btn')}
                        </button>
                        <button className="btn btn-ghost" onClick={() => sendWhatsApp(issue)}>
                          {t('wa_btn')}
                        </button>
                      </div>

                      <div className="help-box">
                        <div className="help-count">
                          🤝 {t('help_count', { n: helpers.counts[issue.id] || 0 })}
                        </div>
                        <button className="btn btn-ghost" onClick={() => handleHelp(issue.id)}>
                          {helpers.mine[issue.id] ? t('help_withdraw') : t('help_btn')}
                        </button>
                        <div className="help-note">{t('help_note')}</div>
                      </div>

                      {['sent', 'fixed', 'disputed'].includes(statusKey(issue)) && (
                        <div className="verify">
                          <div className="verify-title">{t('fix_ask')}</div>
                          {issue.status === 'sent' && statusKey(issue) === 'fixed' && (
                            <div className="verify-ok">✓ {t('fix_verified')}</div>
                          )}
                          {issue.myVote ? (
                            <div className="verify-done">
                              {t('fix_voted', {
                                v:
                                  issue.myVote === 'fixed'
                                    ? t('fix_voteFixed')
                                    : t('fix_voteBroken'),
                              })}
                            </div>
                          ) : (
                            <div className="verify-btns">
                              <button
                                className="btn btn-ghost"
                                onClick={() => handleFixVote(issue.id, 'fixed')}
                              >
                                {t('fix_yes')}
                              </button>
                              <button
                                className="btn btn-ghost"
                                onClick={() => handleFixVote(issue.id, 'broken')}
                              >
                                {t('fix_no')}
                              </button>
                            </div>
                          )}
                          <div className="verify-counts">
                            {t('fix_counts', { f: issue.fixedVotes, b: issue.brokenVotes })}
                          </div>
                        </div>
                      )}

                      <details className="fold">
                        <summary>Proof of resolution</summary>
                        <ResolutionProofs
                          issue={issue}
                          user={user}
                          admin={admin}
                          onUpdated={loadIssues}
                        />
                      </details>

                      {admin && (
                        <details className="admin-box">
                          <summary className="admin-title">Ward staff controls</summary>
                          <div className="admin-btns">
                            {['reported', 'sent', 'fixed'].map((s) => (
                              <button
                                key={s}
                                className={`chip ${issue.status === s ? 'chip-on' : ''}`}
                                onClick={() => handleSetStatus(issue.id, s)}
                              >
                                {s}
                              </button>
                            ))}
                          </div>
                        </details>
                      )}

                      <button className="flag-btn" onClick={() => handleFlag(issue.id)}>
                        ⚑ {t('flag_btn')}
                      </button>
                    </div>
                  </Popup>
                </Marker>
              )
            })}
          </MapContainer>

          {!pending && <div className="hint">{t('hint')}</div>}

          {!pending && (
            <div className="map-tools">
              <button className="tool-btn" onClick={() => setLocateTick((n) => n + 1)}>
                📍 {t('loc_btn')}
              </button>
              {me && (
                <button
                  className="tool-btn tool-primary"
                  onClick={() => setPending({ lat: me.lat, lng: me.lng })}
                >
                  {t('loc_here')}
                </button>
              )}
            </div>
          )}

          {pending && (
            <ReportForm
              position={pending}
              onSubmit={addIssue}
              onCancel={() => setPending(null)}
              user={user}
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

      {showAbout && (
        <div className="modal-back" onClick={() => setShowAbout(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>About Commons Butwal</h2>
            <p className="modal-lead">
              Everyone notices a broken streetlight and assumes someone else reported it. Commons
              makes each problem visible, lets neighbours confirm it, and tracks it until it is
              really fixed.
            </p>

            <div className="about-grid">
              <div className="rc-tile">
                <b>{issues.length}</b>
                <span>problems on the map</span>
              </div>
              <div className="rc-tile">
                <b>{new Set(issues.map((i) => i.category)).size}</b>
                <span>categories</span>
              </div>
              <div className="rc-tile">
                <b>{issues.filter((i) => i.photo_url).length}</b>
                <span>with photos</span>
              </div>
              <div className="rc-tile">
                <b>{confirmations}</b>
                <span>neighbour confirmations</span>
              </div>
            </div>

            <h3 className="about-h">How we are different</h3>
            <p className="about-p">
              Hello Sarkar and Suchak help people file complaints to officials. Commons focuses on
              one neighbourhood and on follow-through: neighbours confirm instead of filing
              duplicates, every issue shows how many days it has been open, and a fix only counts
              when neighbours verify it.
            </p>

            <h3 className="about-h">Google sign-in</h3>
            <p className="about-p">
              Neighbours sign in with Google to confirm problems, vote on fixes, and flag fake
              reports, so each person counts once.
            </p>

            <button
              className="btn btn-primary"
              style={{ marginTop: 16 }}
              onClick={() => setShowAbout(false)}
            >
              Close
            </button>
          </div>
        </div>
      )}

      {toast && <div className={`toast toast-${toast.type}`}>{t(toast.key)}</div>}
    </div>
  )
}