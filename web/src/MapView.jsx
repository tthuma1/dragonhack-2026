import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import './MapView.css'

export default function MapView({ analysis, logs = [], trajectory = [] }) {
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

    return () => {
      map.remove()
      mapRef.current = null
    }
  }, [])

  useEffect(() => {
    const map = mapRef.current
    if (!map || (logs.length === 0 && trajectory.length === 0)) return

    map.eachLayer(layer => { if (layer && layer.options && layer.options.attribution === undefined) map.removeLayer(layer) })

    // Draw trajectory path
    if (trajectory.length > 0) {
      const trajCoords = [...trajectory]
        .sort((a, b) => a.time - b.time)
        .map(p => [p.latitude, p.longitude])
        .filter(([a, b]) => a != null && b != null)
      if (trajCoords.length === 0) return
      L.polyline(trajCoords, { color: '#CC1111', weight: 2, opacity: 0.6 }).addTo(map)

      // Start marker from first trajectory point
      L.circleMarker(trajCoords[0], { radius: 7, color: '#16a34a', fillColor: '#16a34a', fillOpacity: 1, weight: 2 }).addTo(map)

      const last = trajCoords[trajCoords.length - 1]
      if (trajCoords.length > 1) L.circleMarker(last, { radius: 7, color: '#1d4ed8', fillColor: '#1d4ed8', fillOpacity: 1, weight: 2 }).addTo(map)
    }

    // Draw event stop markers
    const sorted = [...logs].sort((a, b) => a.time_from - b.time_from)
    sorted.forEach(event => {
      const names = event.event_name?.filter(Boolean) ?? []
      const label = names.length ? names.join(', ') : 'Stop'
      L.circleMarker([event.lat, event.lng], {
        radius: 9, color: '#CC1111', fillColor: '#ffffff', fillOpacity: 1, weight: 2.5,
      }).addTo(map).bindPopup(`<b>${label}</b>`)
    })

    const allCoords = [
      ...trajectory.map(p => [p.latitude, p.longitude]),
      ...sorted.map(e => [e.lat, e.lng]),
    ].filter(([a, b]) => a != null && b != null)
    if (allCoords.length > 0) map.fitBounds(allCoords, { padding: [48, 48] })
  }, [logs, trajectory])

  // Enrich stop popups with analysis data once available
  useEffect(() => {
    if (!analysis || !mapRef.current) return
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
