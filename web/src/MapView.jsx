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
    if (!map) return

    map.eachLayer(layer => { if (layer && layer.options && layer.options.attribution === undefined) map.removeLayer(layer) })

    const trajCoords = [...trajectory]
      .sort((a, b) => a.time - b.time)
      .map(p => [p.latitude, p.longitude])
      .filter(([a, b]) => a != null && b != null)

    if (trajCoords.length > 0) {
      L.polyline(trajCoords, { color: '#CC1111', weight: 2, opacity: 0.6 }).addTo(map)
      L.circleMarker(trajCoords[0], { radius: 7, color: '#16a34a', fillColor: '#16a34a', fillOpacity: 1, weight: 2 }).addTo(map)
    }

    const sorted = [...logs].sort((a, b) => a.time_from - b.time_from)
    sorted.forEach(event => {
      const rawName = Array.isArray(event.event_name) ? event.event_name.filter(Boolean).join(', ') : event.event_name
      const label = rawName && rawName !== 'unknown' ? rawName : 'Stop'
      L.circleMarker([event.lat ?? event.latitude, event.lng ?? event.longitude], {
        radius: 9, color: '#CC1111', fillColor: '#ffffff', fillOpacity: 1, weight: 2.5,
      }).addTo(map).bindPopup(`<b>${label}</b>`)
    })

    const allCoords = [
      ...trajCoords,
      ...sorted.map(e => [e.lat ?? e.latitude, e.lng ?? e.longitude]).filter(([a, b]) => a != null && b != null),
    ]
    if (allCoords.length > 0) {
      map.fitBounds(allCoords, { padding: [48, 48] })
    } else {
      map.setView([46.0569, 14.5058], 13) // default view
    }
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
        <div className="legend-item"><span className="legend-ring" />Stop</div>
        <div className="legend-item"><span className="legend-line" />Path</div>
      </div>
    </div>
  )
}
