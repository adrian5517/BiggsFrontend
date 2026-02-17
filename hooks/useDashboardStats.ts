import { useEffect, useState, useRef } from 'react'
import { fetchWithAuth } from '@/utils/auth'

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000'

type Stats = {
  liveEvents?: number | null
  uploads?: number | null
  files?: number | null
}

export default function useDashboardStats(pollInterval = 10000) {
  const [stats, setStats] = useState<Stats>({ liveEvents: undefined, uploads: undefined, files: undefined })
  const [loading, setLoading] = useState(true)
  const [lastError, setLastError] = useState<string | null>(null)
  const mounted = useRef(true)

  const fetchStats = async () => {
    setLoading(true)
    try {
      // Preferred: single endpoint returning all numbers
      const res = await fetchWithAuth(`${API_BASE}/api/admin/dashboard`)
      if (res.ok) {
        const data = await res.json().catch(() => null)
        if (data && mounted.current) {
          setStats({
            liveEvents: typeof data.liveEvents === 'number' ? data.liveEvents : null,
            uploads: typeof data.uploads === 'number' ? data.uploads : null,
            files: typeof data.files === 'number' ? data.files : null,
          })
        }
      } else {
        // fallback: try separate endpoints, tolerant to missing endpoints
        const keys: Partial<Stats> = {}
        try {
          const r1 = await fetchWithAuth(`${API_BASE}/api/stats/events`)
          if (r1.ok) { const jd = await r1.json().catch(()=>null); if (jd && typeof jd.count === 'number') keys.liveEvents = jd.count }
        } catch (e) {}
        try {
          const r2 = await fetchWithAuth(`${API_BASE}/api/stats/uploads`)
          if (r2.ok) { const jd = await r2.json().catch(()=>null); if (jd && typeof jd.count === 'number') keys.uploads = jd.count }
        } catch (e) {}
        try {
          const r3 = await fetchWithAuth(`${API_BASE}/api/stats/files`)
          if (r3.ok) { const jd = await r3.json().catch(()=>null); if (jd && typeof jd.count === 'number') keys.files = jd.count }
        } catch (e) {}

        if (mounted.current) setStats(prev => ({ ...prev, ...keys }))
      }
    } catch (e: any) {
      // network or endpoint missing — keep previous values and record last error
      const msg = e && e.message ? e.message : 'Network error'
      try { setLastError(msg) } catch (_) {}
    } finally {
      if (mounted.current) setLoading(false)
    }
  }

  useEffect(() => {
    mounted.current = true
    fetchStats()
    const id = setInterval(fetchStats, pollInterval)
    return () => { mounted.current = false; clearInterval(id) }
  }, [pollInterval])

  return { stats, loading, refresh: fetchStats, lastError }
}
