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

function buildPrompt(logs) {
  const csv = [
    'id,longitude,latitude,time,event_type,event_name',
    ...logs.map(l =>
      `${l.id},${l.longitude},${l.latitude},${l.time},${l.event_type},${l.event_name}`
    ),
  ].join('\n')

  return `You are a personal location analytics assistant. Analyse the GPS log below and return ONLY a valid JSON object matching the schema exactly — no markdown, no extra text.

Schema:
${SCHEMA}

Rules:
- timeTracked = total span from first to last log entry (HH:MM format → convert to "Xh Ym")
- favoritePlace = named place with longest cumulative stationary time
- placesVisited = deduplicated named stops (exclude "En route …" events), sorted by arrival time
- path = every log entry as a coordinate point, in chronological order, suitable for drawing a polyline on a map
- totalDistanceKm = rough estimate based on coordinate deltas (Haversine; round to 1 decimal)
- movingTimeMinutes = total time where event_type = "moving"
- stationaryTimeMinutes = total time where event_type = "stationary" or "arrive"
- mostActiveHour = 1-hour window with most distinct log entries
- summary = friendly 2–3 sentence narrative written in second person ("You started your day…")

GPS Log (CSV):
${csv}`
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
      contents: [{ parts: [{ text: buildPrompt(logs) }] }],
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
