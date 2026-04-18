import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import locationLogs from './data/locationLogs.js'
import './MapView.css'

const pathCoords = locationLogs.map(l => [l.latitude, l.longitude])

const stops = []
const seen = new Set()
for (const log of locationLogs) {
  if (log.event_type === 'arrive' && !seen.has(log.event_name)) {
    seen.add(log.event_name)
    stops.push(log)
  }
}

const avgLat = pathCoords.reduce((s, c) => s + c[0], 0) / pathCoords.length
const avgLng = pathCoords.reduce((s, c) => s + c[1], 0) / pathCoords.length

export default function MapView({ analysis }) {
  const containerRef = useRef(null)
  const mapRef = useRef(null)

  useEffect(() => {
    if (mapRef.current) return

    const map = L.map(containerRef.current, { zoomControl: true })
    mapRef.current = map

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(map)

    // Path polyline
    L.polyline(pathCoords, { color: '#CC1111', weight: 3, opacity: 0.75 }).addTo(map)

    // Start dot
    L.circleMarker(pathCoords[0], {
      radius: 7, color: '#16a34a', fillColor: '#16a34a', fillOpacity: 1, weight: 2,
    }).addTo(map).bindPopup(`<b>Start</b><br>${locationLogs[0].time.slice(11, 16)}`)

    // End dot
    L.circleMarker(pathCoords[pathCoords.length - 1], {
      radius: 7, color: '#1d4ed8', fillColor: '#1d4ed8', fillOpacity: 1, weight: 2,
    }).addTo(map).bindPopup(`<b>End</b><br>${locationLogs[locationLogs.length - 1].time.slice(11, 16)}`)

    // Named stop markers
    stops.forEach(stop => {
      L.circleMarker([stop.latitude, stop.longitude], {
        radius: 9, color: '#CC1111', fillColor: '#ffffff', fillOpacity: 1, weight: 2.5,
      }).addTo(map).bindPopup(`<b>${stop.event_name}</b>`)
    })

    map.fitBounds(pathCoords, { padding: [48, 48] })

    return () => {
      map.remove()
      mapRef.current = null
    }
  }, [])

  // Enrich stop popups with analysis data once available
  useEffect(() => {
    if (!analysis || !mapRef.current) return
    // Popups are already open on demand; analysis data shown in analysis tab
  }, [analysis])

  return (
    <div className="map-root">
      <div ref={containerRef} className="leaflet-map" />
      <div className="map-legend">
        <div className="legend-item"><span className="legend-dot" style={{ background: '#16a34a' }} />Start</div>
        <div className="legend-item"><span className="legend-dot" style={{ background: '#1d4ed8' }} />End</div>
        <div className="legend-item"><span className="legend-ring" />Stop</div>
        <div className="legend-item"><span className="legend-line" />Path</div>
      </div>
    </div>
  )
}
