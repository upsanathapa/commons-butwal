import { useState } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'

// Fix: Vite can't find Leaflet's default pin images unless we point to them
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
})

// Starting point of the map: [latitude, longitude]. Change to your own neighbourhood later.
const CENTER = [27.7006, 83.4484]

// Listens for clicks on the map and tells App where the click happened
function ClickHandler({ onPick }) {
  useMapEvents({
    click(e) {
      onPick(e.latlng)
    },
  })
  return null
}

export default function App() {
  const [pins, setPins] = useState([])

  function addPin(latlng) {
    setPins((prev) => [
      ...prev,
      { id: Date.now(), lat: latlng.lat, lng: latlng.lng },
    ])
  }

  return (
    <MapContainer center={CENTER} zoom={16} style={{ height: '100vh', width: '100%' }}>
      <TileLayer
        attribution="&copy; OpenStreetMap contributors"
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <ClickHandler onPick={addPin} />
      {pins.map((pin) => (
        <Marker key={pin.id} position={[pin.lat, pin.lng]}>
          <Popup>
            Issue at {pin.lat.toFixed(5)}, {pin.lng.toFixed(5)}
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  )
}