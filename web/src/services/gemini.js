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
    const tryZoom = async (zoom) => {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&zoom=${zoom}`,
        { headers: { 'Accept-Language': 'en' } }
      )
      return res.json()
    }
    for (const zoom of [18, 17, 16]) {
      const data = await tryZoom(zoom)
      const a = data.address ?? {}
      const name = data.name || a.amenity || a.building || a.shop || a.tourism || a.leisure || a.office
      if (name) return name
    }
    const fallback = await tryZoom(18)
    return fallback.address?.road || fallback.display_name?.split(',')[0] || ''
  } catch {
    return ''
  }
}

function cleanField(val) {
  if (!val) return ''
  const arr = Array.isArray(val) ? val : [val]
  return arr.filter(v => v && v !== 'unknown').join('; ')
}

async function buildPrompt(logs) {
  const lat = e => e.lat ?? e.latitude
  const lng = e => e.lng ?? e.longitude
  const geocoded = await Promise.all(logs.map(e => reverseGeocode(lat(e), lng(e))))

  const rows = logs.map((e, i) => {
    const names = cleanField(e.event_name) || geocoded[i] || ''
    const types = cleanField(e.event_type) || ''
    const from = new Date((e.time_from ?? e.time) * 1000).toISOString()
    const to = new Date((e.time_to ?? e.time) * 1000).toISOString()
    const durationMin = e.time_to ? Math.round((e.time_to - e.time_from) / 60) : 0
    return `${i + 1},${lat(e)},${lng(e)},${from},${to},${durationMin},${e.point_count ?? 1},"${types}","${names}"`
  }).join('\n')

  return `You are a personal location analytics assistant. Analyse the stay-cluster log below and return ONLY a valid JSON object matching the schema exactly — no markdown, no extra text.

Schema:
${SCHEMA}

Each row is a stay cluster: index, lat, lng, time_from (ISO), time_to (ISO), duration_minutes (pre-computed, use this directly — do not recalculate), point_count, event_types (semicolon-separated, may be empty), place_names (semicolon-separated, may be empty).

Rules:
- timeTracked = span from earliest time_from to latest time_to, formatted as "Xh Ym"
- favoritePlace = cluster with highest duration_minutes; use place_names if non-empty, otherwise infer from coordinates
- placesVisited = one entry per cluster, sorted by time_from; use duration_minutes directly for durationMinutes; arrivalTime/departureTime as local HH:MM from time_from/time_to; treat coordinates as a reverse geocode — identify the nearest named real-world venue or landmark; use place_names and event_types as hints; never use raw coordinates or "unknown"
- totalDistanceKm = Haversine sum between consecutive cluster centroids, round to 1 decimal
- movingTimeMinutes = sum of gaps between clusters (next time_from − previous time_to), in minutes
- stationaryTimeMinutes = sum of all duration_minutes
- mostActiveHour = 1-hour window containing the most cluster activity
- path = cluster centroids in chronological order
- summary = friendly 2–3 sentence narrative in second person describing where the user spent time and what they likely did

Stay-cluster log (CSV):
index,lat,lng,time_from,time_to,duration_minutes,point_count,event_types,place_names
${rows}`
}

export async function sendChatMessage(messages, analysis, logs) {
  if (!API_KEY) throw new Error('VITE_GEMINI_API_KEY is not set in .env.local')

  const context = analysis
    ? `Here's what the user got up to:
- Total time out: ${analysis.timeTracked}, covering ${analysis.totalDistanceKm} km
- Favourite spot: ${analysis.favoritePlace?.name} (${analysis.favoritePlace?.totalDuration}, ${analysis.favoritePlace?.visits} visit${analysis.favoritePlace?.visits !== 1 ? 's' : ''})
- Places: ${analysis.placesVisited?.map(p => `${p.name} (${p.arrivalTime}–${p.departureTime}, ${p.durationMinutes} min)`).join(' → ')}
- Most active around: ${analysis.mostActiveHour}
- Summary: ${analysis.summary}`
    : `The user has ${logs.length} location clusters logged. Analysis hasn't finished yet so you don't have place names, but you can still chat.`

  const systemPrompt = `You are BTrack, a chill personal travel companion built into the BTrack app. You know where the user has been and you chat with them about it — like a friend who checked their day.

Your vibe: warm, curious, a little playful. Short replies unless they want detail. Use casual language, not bullet-point reports. React to what they say, ask follow-up questions sometimes.

What you can do:
- Chat about where they went, how long they spent somewhere, patterns in their day
- Give personalised recommendations for places to visit next time, based on where they already go and what kind of spots they seem to like
- Spot interesting things ("you spent 3x longer at X than anywhere else — big fan?")
- Suggest nearby alternatives or hidden gems similar to their favourite spots
- If they ask about somewhere specific, riff on it — what's nearby, what time is good to go, what vibe it has

${context}

If something's unrelated to travel or places, just gently steer back. Keep it natural.`

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
      generationConfig: { temperature: 0.85, maxOutputTokens: 500 },
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

export async function generateInstagramCaption(analysis) {
  if (!API_KEY) throw new Error('VITE_GEMINI_API_KEY is not set in .env.local')

  const summary = analysis
    ? `Time tracked: ${analysis.timeTracked}. Favourite place: ${analysis.favoritePlace?.name} (${analysis.favoritePlace?.totalDuration}). Places visited: ${analysis.placesVisited?.map(p => p.name).join(', ')}. Total distance: ${analysis.totalDistanceKm} km. Summary: ${analysis.summary}`
    : 'A full day of exploring the city, tracking locations and adventures.'

  const prompt = `Write an engaging Instagram caption for a location-tracking app called BTrack. Base it on this day summary: ${summary}

Rules:
- 3–5 sentences, conversational and upbeat
- Include 1–2 relevant emojis naturally in the text (not just at the end)
- End with 4–6 relevant hashtags on a new line
- Do NOT use quotes around the caption
- Do NOT include any explanation, just the caption itself`

  const res = await fetch(`${ENDPOINT}?key=${API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.9 },
    }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.error?.message ?? `Gemini API error ${res.status}`)
  }

  const data = await res.json()
  return data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? ''
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
