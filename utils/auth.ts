// Client-side auth utilities: token storage and authenticated fetch with refresh
const BASE_API = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000'

export function setAccessToken(token: string | null) {
  try {
    if (token == null) localStorage.removeItem('accessToken')
    else localStorage.setItem('accessToken', token)
  } catch (e) {
    // ignore storage errors
  }
}

export function getAccessToken(): string | null {
  try {
    return localStorage.getItem('accessToken')
  } catch (e) {
    return null
  }
}

export function clearAccessToken() {
  try { localStorage.removeItem('accessToken') } catch (e) {}
}

async function refreshAccessToken(): Promise<string | null> {
  try {
    const res = await fetch(`${BASE_API}/api/auth/refresh-token`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' }
    })
    if (!res.ok) return null
    const data = await res.json()
    if (data && data.token) {
      setAccessToken(data.token)
      return data.token
    }
    return null
  } catch (e) {
    return null
  }
}

// fetch with Authorization header, automatically tries refresh once on 401
export async function fetchWithAuth(input: RequestInfo, init?: RequestInit, triedRefresh = false): Promise<Response> {
  const token = getAccessToken()
  const headers = new Headers(init?.headers || {})
  if (token) headers.set('Authorization', `Bearer ${token}`)

  const res = await fetch(input, { ...(init || {}), headers, credentials: init?.credentials ?? 'include' })
  if (res.status !== 401) return res

  // if 401 and we haven't tried refreshing, attempt refresh and retry
  if (!triedRefresh) {
    const newToken = await refreshAccessToken()
    if (newToken) {
      const headers2 = new Headers(init?.headers || {})
      headers2.set('Authorization', `Bearer ${newToken}`)
      return fetch(input, { ...(init || {}), headers: headers2, credentials: init?.credentials ?? 'include' })
    }
  }

  return res
}

export default {
  setAccessToken,
  getAccessToken,
  clearAccessToken,
  fetchWithAuth,
}
