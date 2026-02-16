'use client'
import React, { useEffect, useState } from 'react'
import fetchWithAuth from '../utils/auth'
import ToastProvider, { useToast } from './ToastProvider'

function PanelContent() {
  const toast = useToast()
  const [status, setStatus] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [runResult, setRunResult] = useState<any>(null)
  const [applyConfirm, setApplyConfirm] = useState(false)
  const [retentionDays, setRetentionDays] = useState<number | ''>('')
  const [intervalHours, setIntervalHours] = useState<number | ''>('')
  const [backups, setBackups] = useState<any[]>([])
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(10)
  const [total, setTotal] = useState(0)
  const [refreshKey, setRefreshKey] = useState(0)

  async function loadStatus() {
    setLoading(true)
    try {
      const res = await fetchWithAuth.fetchWithAuth(`${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000'}/api/admin/retention/status`)
      if (!res.ok) {
        let msg = `Status fetch failed: ${res.status}`
        try { const body = await res.json(); if (body && body.message) msg = body.message } catch (e) {}
        toast.addToast(msg, 'error')
        setStatus(null)
        return
      }
      const data = await res.json()
      setStatus(data)
      setRetentionDays(data.retentionDays)
      setIntervalHours(data.intervalHours)
    } catch (e) {
      console.error('loadStatus error', e)
      toast.addToast('Failed to load status (network)', 'error')
    } finally { setLoading(false) }
  }

  useEffect(() => { loadStatus() }, [])

  useEffect(() => { loadBackups(page) }, [page, limit, refreshKey])

  async function loadBackups(p = 1) {
    setLoading(true)
    try {
      const res = await fetchWithAuth.fetchWithAuth(`${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000'}/api/admin/backups?page=${p}&limit=${limit}`)
      if (!res.ok) {
        let msg = `Backups fetch failed: ${res.status}`
        try { const body = await res.json(); if (body && body.message) msg = body.message } catch (e) {}
        toast.addToast(msg, 'error')
        return
      }
      const data = await res.json()
      setBackups(data.docs || [])
      setTotal(data.total || 0)
      setPage(data.page || p)
    } catch (e) {
      console.error('loadBackups error', e)
      toast.addToast('Failed to load backups (network)', 'error')
    } finally { setLoading(false) }
  }

  async function restoreBackup(id: string) {
    if (!confirm('Restore this backup? This will insert rows back into reports.')) return
    setLoading(true)
    try {
      const res = await fetchWithAuth.fetchWithAuth(`${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000'}/api/admin/backups/${id}/restore`, { method: 'POST' })
      if (!res.ok) throw new Error('Failed')
      const data = await res.json()
      if (data && data.jobId) {
        const base = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000'
        const es = new EventSource(`${base}/api/stream/status?jobId=${data.jobId}`)
        es.onmessage = (ev) => {
          try {
            const parsed = JSON.parse(ev.data)
            if (parsed.type === 'progress') toast.addToast(`Restore: ${parsed.message || JSON.stringify(parsed)}`)
            if (parsed.type === 'file-complete' || parsed.type === 'complete') {
              toast.addToast('Restore completed', 'success')
              es.close()
              setRefreshKey(k => k + 1)
            }
            if (parsed.type === 'error') {
              toast.addToast(`Restore error: ${parsed.message || 'error'}`, 'error')
              es.close()
            }
          } catch (e) {}
        }
        es.onerror = () => { es.close() }
      } else {
        toast.addToast('Restore requested', 'info')
        setRefreshKey(k => k + 1)
      }
    } catch (e) { console.error(e); toast.addToast('Restore failed', 'error') } finally { setLoading(false) }
  }

  async function deleteBackup(id: string) {
    if (!confirm('Delete this backup permanently?')) return
    setLoading(true)
    try {
      const res = await fetchWithAuth.fetchWithAuth(`${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000'}/api/admin/backups/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed')
      toast.addToast('Deleted', 'success')
      setRefreshKey(k => k + 1)
    } catch (e) { console.error(e); toast.addToast('Delete failed', 'error') } finally { setLoading(false) }
  }

  async function runRetention(apply=false) {
    setRunResult(null)
    setLoading(true)
    try {
      const body: any = { apply }
      if (retentionDays) body.retentionDays = Number(retentionDays)
      const res = await fetchWithAuth.fetchWithAuth(`${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000'}/api/admin/retention/run`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      if (!res.ok) throw new Error('Failed')
      const data = await res.json()
      // If apply started as background job, server returns jobId — listen for SSE
      if (data && data.jobId) {
        const base = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000'
        const es = new EventSource(`${base}/api/stream/status?jobId=${data.jobId}`)
        es.onmessage = (ev) => {
          try {
            const parsed = JSON.parse(ev.data)
            if (parsed.type === 'progress') toast.addToast(`Retention: ${parsed.message || JSON.stringify(parsed)}`)
            if (parsed.type === 'complete') {
              toast.addToast('Retention apply complete', 'success')
              es.close()
              loadStatus()
              setRefreshKey(k => k + 1)
            }
            if (parsed.type === 'error') {
              toast.addToast(`Retention error: ${parsed.message || 'error'}`, 'error')
              es.close()
            }
          } catch (e) {}
        }
        es.onerror = () => { es.close() }
        setRunResult({ queued: true, jobId: data.jobId })
      } else {
        const json = data
        setRunResult(json)
        await loadStatus()
      }
    } catch (e) {
      console.error(e)
      toast.addToast('Retention request failed', 'error')
    } finally { setLoading(false); setApplyConfirm(false) }
  }

  return (
    <div className="p-4 border rounded bg-white">
      <h3 className="text-lg font-semibold">Backup Retention</h3>
      <div className="mt-3">
        <div>Enabled: {status ? String(status.enabled) : '...'}</div>
        <div>Retention days: <input className="border px-2 py-1 ml-2" value={retentionDays as any} onChange={e=>setRetentionDays(e.target.value === '' ? '' : Number(e.target.value))} style={{width:80}} /></div>
        <div>Interval hours: <input className="border px-2 py-1 ml-2" value={intervalHours as any} onChange={e=>setIntervalHours(e.target.value === '' ? '' : Number(e.target.value))} style={{width:80}} /></div>
      </div>

      <div className="mt-3 space-x-2">
        <button className="px-3 py-1 bg-gray-200 rounded" onClick={()=>runRetention(false)} disabled={loading}>Dry-Run</button>
        <button className="px-3 py-1 bg-red-600 text-white rounded" onClick={()=>setApplyConfirm(true)} disabled={loading}>Apply</button>
      </div>

      {applyConfirm && (
        <div className="mt-3 p-3 border bg-yellow-50">
          <div>Are you sure? This will permanently delete backups older than retention days.</div>
          <div className="mt-2 space-x-2">
            <button className="px-3 py-1 bg-gray-200 rounded" onClick={()=>setApplyConfirm(false)}>Cancel</button>
            <button className="px-3 py-1 bg-red-600 text-white rounded" onClick={()=>runRetention(true)}>Confirm & Apply</button>
          </div>
        </div>
      )}

      {runResult && (
        <pre className="mt-3 text-sm bg-gray-100 p-2 rounded">{JSON.stringify(runResult, null, 2)}</pre>
      )}

      <div className="mt-4">
        <h4 className="font-medium">Backups count: {status ? status.backupsCount : '...'}</h4>
      </div>
      <div className="mt-4">
        <h4 className="font-medium mb-2">Backups</h4>
        <div className="overflow-auto border rounded">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="p-2 text-left">Branch</th>
                <th className="p-2 text-left">Pos</th>
                <th className="p-2 text-left">WorkDate</th>
                <th className="p-2 text-left">SourceFile</th>
                <th className="p-2 text-left">ReplacedAt</th>
                <th className="p-2 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {backups.map((b) => (
                <tr key={b._id} className="border-t">
                  <td className="p-2">{b.branch}</td>
                  <td className="p-2">{b.pos}</td>
                  <td className="p-2">{b.workDate ? new Date(b.workDate).toISOString().slice(0,10) : ''}</td>
                  <td className="p-2">{b.sourceFile}</td>
                  <td className="p-2">{b.replacedAt ? new Date(b.replacedAt).toLocaleString() : ''}</td>
                  <td className="p-2 space-x-2">
                    <button className="px-2 py-1 bg-green-600 text-white rounded" onClick={()=>restoreBackup(b._id)} disabled={loading}>Restore</button>
                    <button className="px-2 py-1 bg-red-600 text-white rounded" onClick={()=>deleteBackup(b._id)} disabled={loading}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-2 flex items-center justify-between">
          <div>Showing {backups.length} of {total}</div>
          <div className="space-x-2">
            <button onClick={()=>setPage(p=>Math.max(1,p-1))} className="px-2 py-1 border rounded">Prev</button>
            <button onClick={()=>setPage(p=>p+1)} className="px-2 py-1 border rounded">Next</button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function AdminRetentionPanel() {
  return (
    <ToastProvider>
      <PanelContent />
    </ToastProvider>
  )
}
