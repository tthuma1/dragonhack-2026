const BASE = import.meta.env.VITE_API_BASE ?? '/api'

async function checkRes(res) {
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    const msg = body.message || body.error || `API error ${res.status}`
    throw new Error(msg)
  }
  return res.json().catch(() => ({}))
}

export async function getTrajectory(userId) {
  const res = await fetch(`${BASE}/location/trajectory/${encodeURIComponent(userId)}`)
  return checkRes(res)
}

export async function getEvents(userId) {
  const res = await fetch(`${BASE}/location/events/${encodeURIComponent(userId)}`)
  return checkRes(res)
}

export async function uploadLocation(payload) {
  const res = await fetch(`${BASE}/location/upload`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  return checkRes(res)
}

export async function signUp(data) {
  const res = await fetch(`${BASE}/auth/sign_up`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  return checkRes(res)
}

export async function signIn(data) {
  const res = await fetch(`${BASE}/auth/sign_in`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  return checkRes(res)
}

export async function signOut(token) {
  const res = await fetch(`${BASE}/auth/sign_out?token=${encodeURIComponent(token)}`, { method: 'POST' })
  return checkRes(res)
}

export default {
  getTrajectory,
  getEvents,
  uploadLocation,
  signUp,
  signIn,
  signOut,
}
