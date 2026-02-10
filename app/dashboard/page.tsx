"use client"

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import auth, { fetchWithAuth } from '@/utils/auth'

export default function DashboardPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [userList, setUserList] = useState<any[]>([])
  const [error, setError] = useState('')

  useEffect(() => {
    let mounted = true
    async function load() {
      setLoading(true)
      try {
        const res = await fetchWithAuth('http://localhost:3000/api/auth/users', { method: 'GET' })
        if (res.status === 401) {
          // not authorized -> go back to login
          auth.clearAccessToken()
          router.push('/')
          return
        }
        if (!res.ok) {
          const d = await res.json().catch(() => ({}))
          setError(d.message || 'Failed to load')
          return
        }
        const data = await res.json()
        if (mounted) setUserList(data.users || [])
      } catch (e) {
        setError('Network error')
      } finally {
        if (mounted) setLoading(false)
      }
    }
    load()
    return () => { mounted = false }
  }, [router])

  if (loading) return <div className="p-8">Loading...</div>

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Dashboard</h1>
      {error && <div className="text-red-600 mb-4">{error}</div>}
      <p className="mb-4">Protected users list (fetched from protected API)</p>
      <ul className="space-y-2">
        {userList.map((u: any) => (
          <li key={u._id} className="rounded border p-3">
            <div className="font-medium">{u.username} ({u.email})</div>
            <div className="text-sm text-muted-foreground">Role: {u.role}</div>
          </li>
        ))}
      </ul>
    </div>
  )
}
