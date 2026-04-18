// Simulated GPS log for 2026-04-17 (yesterday)
// ~1 ping per 30–60 s; moving legs ping every 10 s
// Coordinates centred on Ljubljana city centre

const D = '2026-04-17'
const ts = (h, m, s = 0) =>
  `${D}T${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}Z`

// Lerp helpers for smooth path segments
const lerp = (a, b, t) => a + (b - a) * t
const lerpCoord = (from, to, steps) =>
  Array.from({ length: steps }, (_, i) => ({
    lat: lerp(from[0], to[0], i / steps),
    lng: lerp(from[1], to[1], i / steps),
  }))

// Named anchors
const PLACES = {
  home:       { lat: 46.0635, lng: 14.5123, name: 'Home' },
  coffee:     { lat: 46.0558, lng: 14.5089, name: 'Kavarna Centralni' },
  office:     { lat: 46.0489, lng: 14.5065, name: 'Tech Hub Office' },
  restaurant: { lat: 46.0501, lng: 14.5090, name: 'Lunch Spot' },
  park:       { lat: 46.0526, lng: 14.4984, name: 'Tivoli Park' },
}

let id = 1
const logs = []

const add = (time, lat, lng, event_type, event_name) =>
  logs.push({ id: id++, longitude: lng, latitude: lat, time, event_type, event_name })

// ── 07:30 arrive home ──────────────────────────────────────────────────────
add(ts(7,30), PLACES.home.lat, PLACES.home.lng, 'arrive', PLACES.home.name)
for (let m = 31; m <= 44; m += 2)
  add(ts(7,m), PLACES.home.lat, PLACES.home.lng, 'stationary', PLACES.home.name)

// ── 07:45 depart → coffee (10 moving pings) ────────────────────────────────
add(ts(7,45), PLACES.home.lat, PLACES.home.lng, 'depart', PLACES.home.name)
lerpCoord([PLACES.home.lat, PLACES.home.lng], [PLACES.coffee.lat, PLACES.coffee.lng], 10)
  .forEach(({ lat, lng }, i) =>
    add(ts(7, 46 + i * 2), lat, lng, 'moving', 'En route to coffee'))

// ── 08:06 arrive coffee ────────────────────────────────────────────────────
add(ts(8,6), PLACES.coffee.lat, PLACES.coffee.lng, 'arrive', PLACES.coffee.name)
for (let m = 10; m <= 60; m += 10)
  add(ts(8,m > 59 ? 59 : m), PLACES.coffee.lat, PLACES.coffee.lng, 'stationary', PLACES.coffee.name)
add(ts(9,0), PLACES.coffee.lat, PLACES.coffee.lng, 'stationary', PLACES.coffee.name)
add(ts(9,15), PLACES.coffee.lat, PLACES.coffee.lng, 'stationary', PLACES.coffee.name)

// ── 09:25 depart → office ─────────────────────────────────────────────────
add(ts(9,25), PLACES.coffee.lat, PLACES.coffee.lng, 'depart', PLACES.coffee.name)
lerpCoord([PLACES.coffee.lat, PLACES.coffee.lng], [PLACES.office.lat, PLACES.office.lng], 6)
  .forEach(({ lat, lng }, i) =>
    add(ts(9, 26 + i * 2), lat, lng, 'moving', 'En route to office'))

// ── 09:37 arrive office ────────────────────────────────────────────────────
add(ts(9,37), PLACES.office.lat, PLACES.office.lng, 'arrive', PLACES.office.name)
for (let m = 0; m < 60; m += 15)
  add(ts(10, m), PLACES.office.lat, PLACES.office.lng, 'stationary', PLACES.office.name)
for (let m = 0; m < 60; m += 15)
  add(ts(11, m), PLACES.office.lat, PLACES.office.lng, 'stationary', PLACES.office.name)
add(ts(12,0),  PLACES.office.lat, PLACES.office.lng, 'stationary', PLACES.office.name)
add(ts(12,20), PLACES.office.lat, PLACES.office.lng, 'stationary', PLACES.office.name)

// ── 12:30 depart → lunch ──────────────────────────────────────────────────
add(ts(12,30), PLACES.office.lat, PLACES.office.lng, 'depart', PLACES.office.name)
lerpCoord([PLACES.office.lat, PLACES.office.lng], [PLACES.restaurant.lat, PLACES.restaurant.lng], 5)
  .forEach(({ lat, lng }, i) =>
    add(ts(12, 31 + i * 2), lat, lng, 'moving', 'En route to lunch'))

// ── 12:40 arrive restaurant ───────────────────────────────────────────────
add(ts(12,40), PLACES.restaurant.lat, PLACES.restaurant.lng, 'arrive', PLACES.restaurant.name)
for (let m = 45; m <= 59; m += 5)
  add(ts(12, m), PLACES.restaurant.lat, PLACES.restaurant.lng, 'stationary', PLACES.restaurant.name)
add(ts(13,5),  PLACES.restaurant.lat, PLACES.restaurant.lng, 'stationary', PLACES.restaurant.name)
add(ts(13,20), PLACES.restaurant.lat, PLACES.restaurant.lng, 'stationary', PLACES.restaurant.name)

// ── 13:30 depart → office ─────────────────────────────────────────────────
add(ts(13,30), PLACES.restaurant.lat, PLACES.restaurant.lng, 'depart', PLACES.restaurant.name)
lerpCoord([PLACES.restaurant.lat, PLACES.restaurant.lng], [PLACES.office.lat, PLACES.office.lng], 5)
  .forEach(({ lat, lng }, i) =>
    add(ts(13, 31 + i * 2), lat, lng, 'moving', 'En route to office'))

// ── 13:41 arrive office ────────────────────────────────────────────────────
add(ts(13,41), PLACES.office.lat, PLACES.office.lng, 'arrive', PLACES.office.name)
for (let m = 0; m < 60; m += 15)
  add(ts(14, m), PLACES.office.lat, PLACES.office.lng, 'stationary', PLACES.office.name)
for (let m = 0; m < 60; m += 15)
  add(ts(15, m), PLACES.office.lat, PLACES.office.lng, 'stationary', PLACES.office.name)
for (let m = 0; m < 60; m += 15)
  add(ts(16, m), PLACES.office.lat, PLACES.office.lng, 'stationary', PLACES.office.name)
add(ts(16,55), PLACES.office.lat, PLACES.office.lng, 'stationary', PLACES.office.name)

// ── 17:00 depart → park ───────────────────────────────────────────────────
add(ts(17,0), PLACES.office.lat, PLACES.office.lng, 'depart', PLACES.office.name)
lerpCoord([PLACES.office.lat, PLACES.office.lng], [PLACES.park.lat, PLACES.park.lng], 8)
  .forEach(({ lat, lng }, i) =>
    add(ts(17, 1 + i * 2), lat, lng, 'moving', 'En route to park'))

// ── 17:16 arrive park ─────────────────────────────────────────────────────
add(ts(17,16), PLACES.park.lat, PLACES.park.lng, 'arrive', PLACES.park.name)
for (let m = 20; m <= 59; m += 10)
  add(ts(17, m), PLACES.park.lat, PLACES.park.lng, 'stationary', PLACES.park.name)
for (let m = 0; m <= 20; m += 10)
  add(ts(18, m), PLACES.park.lat, PLACES.park.lng, 'stationary', PLACES.park.name)

// ── 18:30 depart → home ───────────────────────────────────────────────────
add(ts(18,30), PLACES.park.lat, PLACES.park.lng, 'depart', PLACES.park.name)
lerpCoord([PLACES.park.lat, PLACES.park.lng], [PLACES.home.lat, PLACES.home.lng], 10)
  .forEach(({ lat, lng }, i) =>
    add(ts(18, 31 + i * 2), lat, lng, 'moving', 'En route home'))

// ── 18:51 arrive home ─────────────────────────────────────────────────────
add(ts(18,51), PLACES.home.lat, PLACES.home.lng, 'arrive', PLACES.home.name)
for (let m = 55; m <= 59; m += 5)
  add(ts(18, m), PLACES.home.lat, PLACES.home.lng, 'stationary', PLACES.home.name)
for (let m = 0; m <= 50; m += 10)
  add(ts(19, m), PLACES.home.lat, PLACES.home.lng, 'stationary', PLACES.home.name)

export default logs

// Named anchors exported for map use later
export { PLACES }
