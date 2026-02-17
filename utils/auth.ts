// Client-side auth utilities: token storage and authenticated fetch with refresh
const BASE_API = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000'
const DEBUG_AUTH = process.env.NEXT_PUBLIC_DEBUG_AUTH === '1'
// In-memory debounce to avoid emitting many logout events and causing rapid
// navigation loops when multiple requests fail concurrently.
;(globalThis as any).__authLogoutDebounce = (globalThis as any).__authLogoutDebounce || { ts: 0 }

export function setAccessToken(token: string | null) {
  try {
    if (typeof window === 'undefined' || !window.localStorage) {
      if (DEBUG_AUTH) console.warn('[auth] no localStorage available (server-side or blocked)')
      throw new Error('localStorage unavailable')
    }
    if (token == null) {
      if (DEBUG_AUTH) console.debug('[auth] clearing accessToken')
      window.localStorage.removeItem('accessToken')
      // Only emit a single logout event within a short window to avoid
      // redirect loops when many requests fail at once.
      try {
        const now = Date.now()
        const d = (globalThis as any).__authLogoutDebounce
        if (!d.ts || now - d.ts > 3000) {
          d.ts = now
          emitAuthEvent('auth:logout', {})
        } else if (DEBUG_AUTH) {
          console.debug('[auth] suppressed duplicate logout event')
        }
      } catch (e) {
        emitAuthEvent('auth:logout', {})
      }
    } else {
      if (DEBUG_AUTH) console.debug('[auth] setting accessToken', token)
      window.localStorage.setItem('accessToken', token)
      emitAuthEvent('auth:token', { token })
    }
  } catch (e) {
    if (DEBUG_AUTH) console.error('[auth] setAccessToken failed', e)
  }
}

export function getAccessToken(): string | null {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return null
    return window.localStorage.getItem('accessToken')
  } catch (e) {
    return null
  }
}

export function clearAccessToken() {
  try {
    // use setAccessToken to ensure auth events are emitted
    setAccessToken(null)
    if (typeof window !== 'undefined' && window.localStorage) window.localStorage.removeItem('user')
  } catch (e) {}
}

export function getUser() {
  try { const s = localStorage.getItem('user'); return s ? JSON.parse(s) : null } catch (e) { return null }
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
  // Serialize concurrent refresh attempts so multiple failing requests
  // don't rotate the refresh token concurrently and cause revocation races.
  if ((globalThis as any).__refreshPromise) {
    return (globalThis as any).__refreshPromise
  }

    (globalThis as any).__refreshPromise = (async () => {
    try {
      const useCookie = process.env.NEXT_PUBLIC_USE_COOKIE_REFRESH === '1'
      let res: Response
      if (useCookie) {
        // Rely on httpOnly cookie; send POST with credentials to include cookie
        res = await fetch(`${BASE_API}/api/auth/refresh-token`, { method: 'POST', credentials: 'include' })
      } else {
        // Read refresh token from localStorage (client stores it on login)
        const refreshToken = (typeof window !== 'undefined' && window.localStorage) ? window.localStorage.getItem('refreshToken') : null;
        if (!refreshToken) return null
        res = await fetch(`${BASE_API}/api/auth/refresh-token`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ refreshToken })
        })
      }
      if (!res.ok) return null
      const data = await res.json().catch(() => null)
        if (data && data.token) {
        setAccessToken(data.token)
        // If not using cookie refresh, persist returned refreshToken; otherwise server set cookie
        const useCookiePersist = process.env.NEXT_PUBLIC_USE_COOKIE_REFRESH === '1'
        if (!useCookiePersist && data.refreshToken) {
          try { if (typeof window !== 'undefined' && window.localStorage) window.localStorage.setItem('refreshToken', data.refreshToken) } catch(e){}
        }
        return data.token
      }
      return null
    } catch (e) {
      return null
    } finally {
      // clear shared promise after completion
      try { delete (globalThis as any).__refreshPromise } catch(e){}
    }
  })()

  return (globalThis as any).__refreshPromise
}

// fetch with Authorization header, automatically tries refresh once on 401
export async function fetchWithAuth(input: RequestInfo, init?: RequestInit, triedRefresh = false): Promise<Response> {
  let token = getAccessToken()
  // If access token will expire within ~60s, proactively refresh it to avoid
  // sending requests that immediately return 401. This keeps the UX smooth
  // and reduces refresh races.
  try {
    const tokenWillExpireSoon = (tk: string | null) => {
      if (!tk) return true
      try {
        const payload = JSON.parse(atob(tk.split('.')[1].replace(/-/g,'+').replace(/_/g,'/')))
        return (payload.exp || 0) < Math.floor(Date.now() / 1000) + 60
      } catch (e) {
        return true
      }
    }
    if (token && tokenWillExpireSoon(token)) {
      const newToken = await refreshAccessToken()
      if (newToken) token = newToken
    }
  } catch (e) {
    // best-effort; if anything fails, proceed and let server respond
  }
  const headers = new Headers(init?.headers || {})
  if (token) headers.set('Authorization', `Bearer ${token}`)

  // Dev-only fallback: append token as a query param when enabled to help
  // with environments where Authorization headers or cookies are blocked.
  // Enable by setting NEXT_PUBLIC_AUTH_TOKEN_IN_QUERY=1 in your frontend env.
  try {
    const enableQueryToken = (process.env.NEXT_PUBLIC_AUTH_TOKEN_IN_QUERY === '1')
    if (token && enableQueryToken && typeof input === 'string') {
      const u = new URL(input, typeof window !== 'undefined' ? window.location.origin : undefined)
      // only add if not already present
      if (!u.searchParams.has('token')) u.searchParams.set('token', token)
      input = u.toString()
    }
  } catch (e) {
    // ignore URL errors
  }

  // Debug: show whether Authorization header will be sent (opt-in)
  try {
    if (DEBUG_AUTH && typeof console !== 'undefined' && console.debug) {
      console.debug('[auth] fetchWithAuth', typeof input === 'string' ? input : (input && (input as any).url) , 'Authorization=', headers.get('Authorization'))
    }
  } catch (e) {
    // ignore
  }

  const res = await fetch(input, { ...(init || {}), headers, credentials: init?.credentials ?? 'include' })
  // Make `res.json()` tolerant and safe: use a clone and cache parsed result so
  // body consumption won't throw when callers call `.json()` multiple times.
  try {
    const originalJson = (res as any).json ? (res as any).json.bind(res) : undefined;
    let _cachedJson: any = undefined;
    (res as any).json = async function() {
      if (_cachedJson !== undefined) return _cachedJson;
      if (originalJson) {
        try {
          _cachedJson = await originalJson();
          return _cachedJson;
        } catch (e) {
          try {
            const txt = await (res.clone()).text();
            try { _cachedJson = txt ? JSON.parse(txt) : null } catch { _cachedJson = txt }
            return _cachedJson;
          } catch (e2) {
            _cachedJson = null;
            return _cachedJson;
          }
        }
      }
      try {
        const txt = await (res.clone()).text();
        try { _cachedJson = txt ? JSON.parse(txt) : null } catch { _cachedJson = txt }
        return _cachedJson;
      } catch (e) {
        _cachedJson = null;
        return _cachedJson;
      }
    }
  } catch (e) {
    // ignore
  }
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
  // Patch response.json to be tolerant and safe (clone + cache) to avoid "body stream already read"
  try {
    const originalJson2 = (res as any).json ? (res as any).json.bind(res) : undefined;
    let _cachedJson2: any = undefined;
    (res as any).json = async function() {
      if (_cachedJson2 !== undefined) return _cachedJson2;
      if (originalJson2) {
        try {
          _cachedJson2 = await originalJson2();
          return _cachedJson2;
        } catch (e) {
          try {
            const txt = await (res.clone()).text();
            try { _cachedJson2 = txt ? JSON.parse(txt) : null } catch { _cachedJson2 = txt }
            return _cachedJson2;
          } catch (e2) {
            _cachedJson2 = null;
            return _cachedJson2;
          }
        }
      }
      try {
        const txt = await (res.clone()).text();
        try { _cachedJson2 = txt ? JSON.parse(txt) : null } catch { _cachedJson2 = txt }
        return _cachedJson2;
      } catch (e) {
        _cachedJson2 = null;
        return _cachedJson2;
      }
    }
  } catch (e) {
    // ignore patch failures
  }

  return res
}

// Convenience helpers: login and logout flows used by pages/components
export async function login(identifier: string, password: string) {
  if (DEBUG_AUTH) console.debug('[auth] login payload ->', { identifier, password: password ? '***' : '' })
  const res = await fetch(`${BASE_API}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ identifier, password }),
  })
  const data = await res.json().catch(() => null)
  if (DEBUG_AUTH) console.debug('[auth] login response', { status: res.status, body: data })
  if (res.ok && data && data.token) {
    setAccessToken(data.token)
    try { if (typeof window !== 'undefined' && window.localStorage && data.refreshToken) window.localStorage.setItem('refreshToken', data.refreshToken) } catch(e){}
  }
  return { ok: res.ok, status: res.status, data }
}

// Dev auto-login: when NEXT_PUBLIC_AUTO_LOGIN=1, attempt to log in automatically
// using NEXT_PUBLIC_TEST_IDENTIFIER and NEXT_PUBLIC_TEST_PASSWORD. This is
// only intended for local dev/testing and is guarded by the public env var.
try {
  if (typeof window !== 'undefined' && process.env.NEXT_PUBLIC_AUTO_LOGIN === '1') {
    (async () => {
      try {
        const token = getAccessToken()
        if (token) return
        const id = process.env.NEXT_PUBLIC_TEST_IDENTIFIER || 'biggsadmin@test.app'
        const pw = process.env.NEXT_PUBLIC_TEST_PASSWORD || 'Biggsadmin@123'
        // call login() defined above
        const resp = await login(id, pw)
        if (resp && resp.ok) {
          console.debug('[auth] Auto-login success for', id)
        } else {
          console.debug('[auth] Auto-login failed', resp && resp.status)
        }
      } catch (e) {
        console.debug('[auth] Auto-login error', e instanceof Error && e.message ? e.message : e)
      }
    })()
  }
} catch (e) {
  // ignore errors during module load
}

export async function logout() {
  try {
    // Use fetchWithAuth so we send current access token and attempt refresh if needed.
    // Send refreshToken to server so it can be removed server-side
    const refreshToken = (typeof window !== 'undefined' && window.localStorage) ? window.localStorage.getItem('refreshToken') : null;
    const res = await fetchWithAuth(`${BASE_API}/api/auth/logout`, { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ refreshToken }) })
    // If server returns 401 (already logged out / invalid refresh), just proceed to clear client state.
    if (res.status === 401) {
      // nothing special, fallthrough to clear token
    }
  } catch (e) {
    // ignore network errors
  }
  clearAccessToken()
  try { if (typeof window !== 'undefined' && window.localStorage) window.localStorage.removeItem('refreshToken') } catch(e){}
}

export default {
  setAccessToken,
  getAccessToken,
  clearAccessToken,
  fetchWithAuth,
}
