import { useState } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'
import ReportForm from './components/ReportForm'

delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
})

const CENTER = [27.7006, 83.4484]

function ClickHandler({ onPick }) {
  useMapEvents({
    click(e) {
      onPick(e.latlng)
    },
  })
  return null
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


export default function App() {
  const [issues, setIssues] = useState([])
  const [pending, setPending] = useState(null)      // where the user clicked
  const [confirmed, setConfirmed] = useState([])    // ids this user already confirmed

  function addIssue(details) {
    setIssues((prev) => [
      ...prev,
      {
        id: Date.now(),
        ...details,
        lat: pending.lat,
        lng: pending.lng,
        status: 'Reported',
        confirmations: 0,
      },
    ])
    setPending(null)
  }

  function confirmIssue(id) {
    if (confirmed.includes(id)) return
    setConfirmed((prev) => [...prev, id])
    setIssues((prev) =>
      prev.map((i) => {
        if (i.id !== id) return i
        const count = i.confirmations + 1
        return { ...i, confirmations: count, status: count >= 3 ? 'Confirmed' : i.status }
      })
    )
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
              {issue.category} · {issue.status}
              <br />
              {issue.description}
              <br />
              <em>{issue.reporter ? `Reported by ${issue.reporter}` : 'Anonymous'}</em>
              <br />
              <button
                onClick={() => confirmIssue(issue.id)}
                disabled={confirmed.includes(issue.id)}
                style={{ marginTop: 6 }}
              >
                {confirmed.includes(issue.id) ? 'Confirmed' : 'I see this too'} ({issue.confirmations})
              </button>
              <br />
<button
  onClick={() => navigator.clipboard.writeText(complaintText(issue))}
  style={{ marginTop: 6 }}
>
  Copy complaint text
</button>-
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      {pending && (
        <ReportForm position={pending} onSubmit={addIssue} onCancel={() => setPending(null)} />
      )}
    </>
  )
}