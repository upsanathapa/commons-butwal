import { useEffect, useState } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'
import ReportForm from './components/ReportForm'
import { fetchIssues, createIssue, confirmIssue } from './lib/api'

delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
})

const CENTER = [27.7006, 83.4484]

const STATUS_LABELS = {
  reported: 'Reported',
  confirmed: 'Confirmed',
  sent: 'Sent to ward',
  fixed: 'Fixed',
}

// 3 or more neighbours confirming upgrades "Reported" to "Confirmed"
function displayStatus(issue) {
  if (issue.status === 'reported' && issue.confirmations >= 3) return 'Confirmed'
  return STATUS_LABELS[issue.status] || issue.status
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

export default function App() {
  const [issues, setIssues] = useState([])
  const [pending, setPending] = useState(null)
  const [error, setError] = useState('')

  async function loadIssues() {
    try {
      setIssues(await fetchIssues())
      setError('')
    } catch (e) {
      console.error(e)
      setError('Could not load issues. Check your internet connection.')
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
    } catch (e) {
      console.error(e)
      setError('Could not save the report. Please try again.')
    }
  }

  async function handleConfirm(id) {
    try {
      await confirmIssue(id)
      await loadIssues()
    } catch (e) {
      console.error(e)
      setError('Could not save your confirmation.')
    }
  }

  return (
    <>
      <MapContainer center={CENTER} zoom={16} style={{ height: '100vh', width: '100%' }}>
        <TileLayer
          attribution="&copy; OpenStreetMap contributors"
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <ClickHandler onPick={setPending} />

        {issues.map((issue) => (
          <Marker key={issue.id} position={[issue.lat, issue.lng]}>
            <Popup>
              <strong>{issue.title}</strong>
              <br />
              {issue.category} · {displayStatus(issue)}
              <br />
              {issue.description}
              <br />
              <em>{issue.reporter ? `Reported by ${issue.reporter}` : 'Anonymous'}</em>
              <br />
              <button
                onClick={() => handleConfirm(issue.id)}
                disabled={issue.confirmedByMe}
                style={{ marginTop: 6 }}
              >
                {issue.confirmedByMe ? 'Confirmed' : 'I see this too'} ({issue.confirmations})
              </button>
              <br />
              <button
                onClick={() => navigator.clipboard.writeText(complaintText(issue))}
                style={{ marginTop: 6 }}
              >
                Copy complaint text
              </button>
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      {error && (
        <div
          style={{
            position: 'fixed', bottom: 16, left: 16, zIndex: 2000,
            background: '#b91c1c', color: 'white', padding: '10px 14px', borderRadius: 8,
          }}
        >
          {error}
        </div>
      )}

      {pending && (
        <ReportForm position={pending} onSubmit={addIssue} onCancel={() => setPending(null)} />
      )}
    </>
  )
}