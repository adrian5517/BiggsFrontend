// Client-side auth utilities: token storage and authenticated fetch with refresh
const BASE_API = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000'

export function setAccessToken(token: string | null) {
  try {
    if (token == null) {
      localStorage.removeItem('accessToken')
      emitAuthEvent('auth:logout', {})
    } else {
      localStorage.setItem('accessToken', token)
      emitAuthEvent('auth:token', { token })
    }
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

function emitAuthEvent(name: string, detail?: any) {
  try {
    if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
      window.dispatchEvent(new CustomEvent(name, { detail }))
    }
  } catch (e) {
    // ignore
  }
}

export function onAuthLogout(handler: EventListener) {
  if (typeof window !== 'undefined') window.addEventListener('auth:logout', handler)
  return () => { if (typeof window !== 'undefined') window.removeEventListener('auth:logout', handler) }
}

export function onAuthToken(handler: EventListener) {
  if (typeof window !== 'undefined') window.addEventListener('auth:token', handler)
  return () => { if (typeof window !== 'undefined') window.removeEventListener('auth:token', handler) }
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

  // if 401 and we haven't tried refreshing, attempt refresh and retry once
  if (!triedRefresh) {
    const newToken = await refreshAccessToken()
    if (newToken) {
      // retry the original request with the refreshed token, but mark triedRefresh=true
      const headers2 = new Headers(init?.headers || {})
      headers2.set('Authorization', `Bearer ${newToken}`)
      return fetchWithAuth(input, { ...(init || {}), headers: headers2, credentials: init?.credentials ?? 'include' }, true)
    }
  }

  // Refresh failed (or we already tried). Clear local access token so callers can redirect to login.
  try { clearAccessToken() } catch (e) {}
  return res
}

// Convenience helpers: login and logout flows used by pages/components
export async function login(identifier: string, password: string) {
  const res = await fetch(`${BASE_API}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ identifier, password }),
  })
  const data = await res.json().catch(() => null)
  if (res.ok && data && data.token) {
    setAccessToken(data.token)
  }
  return { ok: res.ok, status: res.status, data }
}

export async function logout() {
  try {
    await fetch(`${BASE_API}/api/auth/logout`, { method: 'POST', credentials: 'include' })
  } catch (e) {}
  clearAccessToken()
}

export default {
  setAccessToken,
  getAccessToken,
  clearAccessToken,
  fetchWithAuth,
}
