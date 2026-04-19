const API_KEY = import.meta.env.VITE_GEMINI_API_KEY
const ENDPOINT =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent'

const SCHEMA = `{
  "timeTracked": "Xh Ym",
  "favoritePlace": { "name": "...", "totalDuration": "Xh Ym", "visits": N },
  "placesVisited": [
    {
      "name": "...",
      "arrivalTime": "HH:MM",
      "departureTime": "HH:MM",
      "durationMinutes": N,
      "coordinates": { "lat": N, "lng": N }
    }
  ],
  "totalDistanceKm": N,
  "mostActiveHour": "HH:MM–HH:MM",
  "movingTimeMinutes": N,
  "stationaryTimeMinutes": N,
  "summary": "2–3 sentence friendly narrative of the day",
  "path": [
    { "lat": N, "lng": N, "time": "HH:MM", "label": "..." }
  ]
}`

async function reverseGeocode(lat, lng) {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&zoom=18`,
      { headers: { 'Accept-Language': 'en' } }
    )
    const data = await res.json()
    const a = data.address ?? {}
    return a.amenity || a.building || a.shop || a.tourism || a.leisure ||
           a.office || a.road || data.display_name?.split(',')[0] || ''
  } catch {
    return ''
  }
}

async function buildPrompt(logs) {
  const geocoded = await Promise.all(logs.map(e => reverseGeocode(e.lat, e.lng)))

  const rows = logs.map((e, i) => {
    const names = (e.event_name ?? []).filter(Boolean).join('; ') || geocoded[i] || ''
    const types = (e.event_type ?? []).filter(Boolean).join('; ') || ''
    const from = new Date(e.time_from * 1000).toISOString()
    const to = new Date(e.time_to * 1000).toISOString()
    return `${i + 1},${e.lat},${e.lng},${from},${to},${e.point_count},"${types}","${names}"`
  }).join('\n')

  return `You are a personal location analytics assistant. Analyse the stay-cluster log below and return ONLY a valid JSON object matching the schema exactly — no markdown, no extra text.

Schema:
${SCHEMA}

Each row is a stay cluster: index, lat, lng, time_from (ISO), time_to (ISO), point_count, event_types (semicolon-separated, may be empty), place_names (semicolon-separated, may be empty).

Rules:
- timeTracked = span from earliest time_from to latest time_to, formatted as "Xh Ym"
- favoritePlace = cluster with longest duration (time_to − time_from); name it using place_names if non-empty, otherwise use event_types and coordinates to infer the most sensible real-world place name
- placesVisited = one entry per cluster, sorted by time_from; arrivalTime/departureTime as local HH:MM; treat the coordinates as a reverse geocode lookup — identify the exact or nearest named real-world venue, building, street, or landmark at that lat/lng using your training data; use place_names and event_types only as additional hints; never use raw coordinates or generic names like "unknown"
- totalDistanceKm = Haversine sum between consecutive cluster centroids, round to 1 decimal
- movingTimeMinutes = gaps between clusters (time between one time_to and next time_from)
- stationaryTimeMinutes = sum of (time_to − time_from) for all clusters
- mostActiveHour = 1-hour window containing the most cluster activity
- path = cluster centroids in chronological order
- summary = friendly 2–3 sentence narrative in second person describing where the user spent time and what they likely did

Stay-cluster log (CSV):
index,lat,lng,time_from,time_to,point_count,event_types,place_names
${rows}`
}

export async function sendChatMessage(messages, analysis, logs) {
  if (!API_KEY) throw new Error('VITE_GEMINI_API_KEY is not set in .env.local')

  const context = analysis
    ? `User's location data for yesterday:
- Time tracked: ${analysis.timeTracked}
- Total distance: ${analysis.totalDistanceKm} km
- Favourite place: ${analysis.favoritePlace?.name} (${analysis.favoritePlace?.totalDuration})
- Places visited: ${analysis.placesVisited?.map(p => `${p.name} (${p.arrivalTime}–${p.departureTime})`).join(', ')}
- Most active hour: ${analysis.mostActiveHour}
- Summary: ${analysis.summary}`
    : `User has ${logs.length} location events logged but analysis has not completed yet.`

  const systemPrompt = `You are BTrack AI, a friendly personal location analytics assistant built into the BTrack app. You help users understand their movement patterns, daily habits, and location history.

${context}

Keep responses concise and conversational. If asked about specific places or times, refer to the data above. If asked something unrelated to location/tracking, politely redirect the conversation.`

  // Build Gemini contents array from chat history
  const contents = [
    { role: 'user', parts: [{ text: systemPrompt }] },
    { role: 'model', parts: [{ text: "Got it! I'm ready to help you explore your location data." }] },
    ...messages.slice(1).map(m => ({
      role: m.role === 'ai' ? 'model' : 'user',
      parts: [{ text: m.text }],
    })),
  ]

  const res = await fetch(`${ENDPOINT}?key=${API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents,
      generationConfig: { temperature: 0.7, maxOutputTokens: 300 },
    }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.error?.message ?? `Gemini API error ${res.status}`)
  }

  const data = await res.json()
  return data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? 'Sorry, I could not generate a response.'
}

export async function generateRecommendations(analysis) {
  if (!API_KEY) throw new Error('VITE_GEMINI_API_KEY is not set in .env.local')

  const visited = analysis.placesVisited?.map(p => p.name).join(', ') ?? 'various places'
  const favourite = analysis.favoritePlace?.name ?? 'unknown'
  const summary = analysis.summary ?? ''

  const prompt = `You are a local city guide AI. Based on a user's location history, suggest places they would enjoy.

User's visited places yesterday: ${visited}
Their favourite place: ${favourite}
Day summary: ${summary}

Return ONLY a valid JSON object with exactly this structure. No markdown, no extra text.

{
  "forYou": [
    {
      "name": "Place name",
      "category": "One of: Café, Restaurant, Park, Museum, Bar, Shop, Gallery, Market, Cinema, Other",
      "reason": "One sentence explaining why they'd like it based on their history",
      "vibe": "2-3 words (e.g. 'cosy and quiet')",
      "bestTime": "e.g. 'Weekend morning'"
    }
  ],
  "stepOutside": [
    {
      "name": "Place name",
      "category": "One of: Café, Restaurant, Park, Museum, Bar, Shop, Gallery, Market, Cinema, Other",
      "reason": "One sentence explaining how this is different from their usual habits but why they might still enjoy it",
      "vibe": "2-3 words",
      "bestTime": "e.g. 'Friday evening'"
    }
  ]
}

Rules:
- forYou: exactly 4 places similar in style/vibe to what the user already visits
- stepOutside: exactly 3 places that are notably different from the user's usual — different category, different time of day, different atmosphere — but with a plausible appeal based on their personality`

  const res = await fetch(`${ENDPOINT}?key=${API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.8, responseMimeType: 'application/json' },
    }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.error?.message ?? `Gemini API error ${res.status}`)
  }

  const data = await res.json()
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '{}'
  const clean = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim()
  return JSON.parse(clean)
}

export async function analyzeLocationLogs(logs) {
  if (!API_KEY) throw new Error('VITE_GEMINI_API_KEY is not set in .env.local')

  const res = await fetch(`${ENDPOINT}?key=${API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: await buildPrompt(logs) }] }],
      generationConfig: {
        temperature: 0.2,
        responseMimeType: 'application/json',
      },
    }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.error?.message ?? `Gemini API error ${res.status}`)
  }

  const data = await res.json()
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? ''

  // Strip accidental markdown fences if model ignores mime type
  const clean = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim()
  return JSON.parse(clean)
}
