'use client'
import React, { useEffect, useState } from 'react'
import fetchWithAuth from '../utils/auth'
import ToastProvider, { useToast } from './ToastProvider'
import TimezoneBadge from './timezone-badge'

type SchedulePreset = 'daily' | 'weekly' | 'monthly' | 'custom'
type BackupViewMode = 'file' | 'row'

// ─── Icons ───────────────────────────────────────────────────────────────────
const Icon = {
  Shield: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
    </svg>
  ),
  Refresh: () => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
    </svg>
  ),
  Restore: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/>
    </svg>
  ),
  Trash: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
    </svg>
  ),
  Clock: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
    </svg>
  ),
  Calendar: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
    </svg>
  ),
  ChevronLeft: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="15 18 9 12 15 6"/>
    </svg>
  ),
  ChevronRight: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 18 15 12 9 6"/>
    </svg>
  ),
  AlertTriangle: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
      <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
    </svg>
  ),
  Database: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/>
    </svg>
  ),
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=DM+Mono:wght@400;500&display=swap');

  .rp-root {
    font-family: 'DM Sans', sans-serif;
    --bg: #f8f8f6;
    --surface: #ffffff;
    --border: #e8e7e3;
    --border-strong: #d0cec9;
    --text-primary: #1a1916;
    --text-secondary: #706d66;
    --text-muted: #a09d96;
    --accent: #2d6a4f;
    --accent-hover: #1b4332;
    --accent-light: #d8f3dc;
    --danger: #c0392b;
    --danger-hover: #96281b;
    --danger-light: #fdecea;
    --warning-bg: #fffbeb;
    --warning-border: #fcd34d;
    --success: #2d6a4f;
    --mono: 'DM Mono', monospace;
    color: var(--text-primary);
  }

  .rp-card {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 12px;
    overflow: hidden;
  }

  .rp-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 20px 24px;
    border-bottom: 1px solid var(--border);
    background: var(--surface);
  }

  .rp-header-left {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .rp-icon-wrap {
    width: 36px;
    height: 36px;
    border-radius: 8px;
    background: var(--accent-light);
    color: var(--accent);
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .rp-title {
    font-size: 15px;
    font-weight: 600;
    letter-spacing: -0.2px;
    margin: 0;
  }

  .rp-subtitle {
    font-size: 12px;
    color: var(--text-muted);
    margin: 0;
  }

  .rp-status-dot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: #94a3b8;
    display: inline-block;
    margin-right: 6px;
    flex-shrink: 0;
  }
  .rp-status-dot.active { background: var(--accent); box-shadow: 0 0 0 3px var(--accent-light); }

  .rp-status-badge {
    display: flex;
    align-items: center;
    font-size: 12px;
    font-weight: 500;
    color: var(--text-secondary);
    background: var(--bg);
    border: 1px solid var(--border);
    border-radius: 20px;
    padding: 4px 12px;
  }

  .rp-body {
    padding: 24px;
  }

  .rp-section {
    margin-bottom: 24px;
  }

  .rp-section-label {
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.6px;
    text-transform: uppercase;
    color: var(--text-muted);
    margin-bottom: 12px;
  }

  .rp-filter-grid {
    display: grid;
    grid-template-columns: 1.2fr 1fr 0.8fr 0.8fr 0.8fr;
    gap: 10px;
    margin-bottom: 10px;
  }

  .rp-filter-actions {
    display: flex;
    gap: 8px;
    margin-bottom: 10px;
    flex-wrap: wrap;
  }

  .rp-config-grid {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    gap: 12px;
  }

  .rp-field {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .rp-field label {
    font-size: 12px;
    font-weight: 500;
    color: var(--text-secondary);
    display: flex;
    align-items: center;
    gap: 5px;
  }

  .rp-input-wrap {
    position: relative;
    display: flex;
    align-items: center;
  }

  .rp-input {
    width: 100%;
    padding: 9px 12px;
    font-family: var(--mono);
    font-size: 13px;
    font-weight: 500;
    color: var(--text-primary);
    background: var(--bg);
    border: 1px solid var(--border);
    border-radius: 8px;
    outline: none;
    transition: border-color 0.15s, box-shadow 0.15s;
    box-sizing: border-box;
  }

  .rp-input:focus {
    border-color: var(--accent);
    box-shadow: 0 0 0 3px var(--accent-light);
  }

  .rp-input-unit {
    position: absolute;
    right: 10px;
    font-size: 11px;
    color: var(--text-muted);
    pointer-events: none;
  }

  .rp-progress-wrap {
    margin-top: 14px;
    margin-bottom: 10px;
  }

  .rp-progress-head {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 6px;
    font-size: 12px;
    color: var(--text-secondary);
  }

  .rp-progress-label {
    font-family: var(--mono);
    color: var(--text-primary);
    font-size: 11px;
    font-weight: 500;
  }

  .rp-progress-track {
    width: 100%;
    height: 10px;
    border-radius: 999px;
    background: var(--bg);
    border: 1px solid var(--border);
    overflow: hidden;
  }

  .rp-progress-bar {
    height: 100%;
    background: linear-gradient(90deg, #4db6e8 0%, #2d6a4f 100%);
    transition: width 0.2s ease;
  }

  .rp-select {
    width: 100%;
    padding: 9px 12px;
    font-family: var(--mono);
    font-size: 13px;
    color: var(--text-primary);
    background: var(--bg);
    border: 1px solid var(--border);
    border-radius: 8px;
    outline: none;
  }

  .rp-select:focus {
    border-color: var(--accent);
    box-shadow: 0 0 0 3px var(--accent-light);
  }

  .rp-divider {
    height: 1px;
    background: var(--border);
    margin: 24px 0;
  }

  .rp-action-row {
    display: flex;
    gap: 10px;
    flex-wrap: wrap;
  }

  .rp-btn {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    padding: 9px 16px;
    font-family: 'DM Sans', sans-serif;
    font-size: 13px;
    font-weight: 500;
    border-radius: 8px;
    border: none;
    cursor: pointer;
    transition: background 0.15s, transform 0.1s, box-shadow 0.15s;
    letter-spacing: -0.1px;
  }

  .rp-btn:active { transform: translateY(1px); }
  .rp-btn:disabled { opacity: 0.5; cursor: not-allowed; }

  .rp-btn-ghost {
    background: var(--bg);
    border: 1px solid var(--border-strong);
    color: var(--text-primary);
  }
  .rp-btn-ghost:hover:not(:disabled) { background: var(--border); }

  .rp-btn-danger {
    background: var(--danger);
    color: #fff;
    box-shadow: 0 1px 3px rgba(192,57,43,0.3);
  }
  .rp-btn-danger:hover:not(:disabled) { background: var(--danger-hover); }

  .rp-btn-sm {
    padding: 6px 11px;
    font-size: 12px;
    border-radius: 6px;
  }

  .rp-btn-success {
    background: var(--accent);
    color: #fff;
    box-shadow: 0 1px 3px rgba(45,106,79,0.3);
  }
  .rp-btn-success:hover:not(:disabled) { background: var(--accent-hover); }

  .rp-confirm-banner {
    display: flex;
    gap: 12px;
    align-items: flex-start;
    padding: 16px;
    background: var(--warning-bg);
    border: 1px solid var(--warning-border);
    border-radius: 10px;
    margin-top: 16px;
    animation: rp-slide-in 0.18s ease;
  }

  .rp-confirm-banner-icon {
    color: #d97706;
    flex-shrink: 0;
    margin-top: 1px;
  }

  .rp-confirm-banner-text {
    flex: 1;
  }

  .rp-confirm-title {
    font-size: 13px;
    font-weight: 600;
    color: #92400e;
    margin: 0 0 4px 0;
  }

  .rp-confirm-body {
    font-size: 12px;
    color: #b45309;
    margin: 0 0 12px 0;
    line-height: 1.5;
  }

  .rp-confirm-actions {
    display: flex;
    gap: 8px;
  }

  .rp-pre {
    font-family: var(--mono);
    font-size: 12px;
    background: var(--bg);
    border: 1px solid var(--border);
    border-radius: 8px;
    padding: 14px;
    margin-top: 16px;
    overflow: auto;
    color: var(--text-secondary);
    line-height: 1.6;
  }

  /* Table */
  .rp-table-wrap {
    border: 1px solid var(--border);
    border-radius: 10px;
    overflow: hidden;
  }

  .rp-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 13px;
  }

  .rp-table th {
    padding: 10px 14px;
    background: var(--bg);
    text-align: left;
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.4px;
    text-transform: uppercase;
    color: var(--text-muted);
    border-bottom: 1px solid var(--border);
    white-space: nowrap;
  }

  .rp-table td {
    padding: 11px 14px;
    border-bottom: 1px solid var(--border);
    color: var(--text-primary);
    vertical-align: middle;
  }

  .rp-table tr:last-child td { border-bottom: none; }

  .rp-table tbody tr:hover td {
    background: #fafaf8;
  }

  .rp-mono {
    font-family: var(--mono);
    font-size: 12px;
  }

  .rp-tag {
    display: inline-flex;
    align-items: center;
    padding: 2px 8px;
    border-radius: 4px;
    font-size: 11px;
    font-weight: 500;
    background: var(--bg);
    border: 1px solid var(--border);
    color: var(--text-secondary);
  }

  .rp-pagination {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 16px;
    border-top: 1px solid var(--border);
    background: var(--bg);
  }

  .rp-pagination-info {
    font-size: 12px;
    color: var(--text-muted);
  }

  .rp-pagination-btns {
    display: flex;
    gap: 6px;
  }

  .rp-page-btn {
    width: 32px;
    height: 32px;
    border-radius: 7px;
    border: 1px solid var(--border-strong);
    background: var(--surface);
    color: var(--text-primary);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background 0.12s;
  }

  .rp-page-btn:hover:not(:disabled) { background: var(--border); }
  .rp-page-btn:disabled { opacity: 0.35; cursor: not-allowed; }

  .rp-stat-row {
    display: flex;
    gap: 12px;
  }

  .rp-stat {
    flex: 1;
    background: var(--bg);
    border: 1px solid var(--border);
    border-radius: 10px;
    padding: 14px 16px;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .rp-stat-value {
    font-size: 22px;
    font-weight: 600;
    font-family: var(--mono);
    letter-spacing: -1px;
    color: var(--text-primary);
  }

  .rp-stat-label {
    font-size: 11px;
    color: var(--text-muted);
    font-weight: 500;
    text-transform: uppercase;
    letter-spacing: 0.4px;
  }

  .rp-empty {
    text-align: center;
    padding: 36px;
    color: var(--text-muted);
    font-size: 13px;
  }

  @keyframes rp-slide-in {
    from { opacity: 0; transform: translateY(-6px); }
    to   { opacity: 1; transform: translateY(0); }
  }

  .rp-loading-row td {
    padding: 32px;
    text-align: center;
    color: var(--text-muted);
    font-size: 13px;
  }
`

// ─── Panel ────────────────────────────────────────────────────────────────────
function PanelContent() {
  const toast = useToast()
  const [status, setStatus] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [runResult, setRunResult] = useState<any>(null)
  const [applyConfirm, setApplyConfirm] = useState(false)
  const [retentionDays, setRetentionDays] = useState<number | ''>('')
  const [intervalHours, setIntervalHours] = useState<number | ''>('')
  const [schedulePreset, setSchedulePreset] = useState<SchedulePreset>('daily')
  const [backups, setBackups] = useState<any[]>([])
  const [backupsUnavailableMessage, setBackupsUnavailableMessage] = useState('')
  const [viewMode, setViewMode] = useState<BackupViewMode>('file')
  const [queryInput, setQueryInput] = useState('')
  const [sourceInput, setSourceInput] = useState('')
  const [fromDateInput, setFromDateInput] = useState('')
  const [toDateInput, setToDateInput] = useState('')
  const [filters, setFilters] = useState({ q: '', sourceFile: '', fromDate: '', toDate: '' })
  const [page, setPage] = useState(1)
  const [limit] = useState(10)
  const [total, setTotal] = useState(0)
  const [refreshKey, setRefreshKey] = useState(0)
  const [retentionProgress, setRetentionProgress] = useState(0)
  const [retentionMessage, setRetentionMessage] = useState('')
  const [retentionJobActive, setRetentionJobActive] = useState(false)
  const [timeZone, setTimeZone] = useState('Asia/Manila')

  const base = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000'

  function formatDate(value: any) {
    if (!value) return '—'
    const d = new Date(value)
    if (Number.isNaN(d.getTime())) return String(value)
    try {
      return new Intl.DateTimeFormat('en-US', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        timeZone,
      }).format(d)
    } catch {
      return d.toISOString().slice(0, 10)
    }
  }

  function formatDateTime(value: any) {
    if (!value) return '—'
    const d = new Date(value)
    if (Number.isNaN(d.getTime())) return String(value)
    try {
      return new Intl.DateTimeFormat('en-US', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true,
        timeZone,
      }).format(d)
    } catch {
      return d.toLocaleString()
    }
  }

  async function loadStatus() {
    setLoading(true)
    try {
      const res = await fetchWithAuth.fetchWithAuth(`${base}/api/admin/retention/status`)
      if (!res.ok) {
        let msg = `Status fetch failed: ${res.status}`
        try { const body = await res.json(); if (body?.message) msg = body.message } catch {}
        toast.addToast(msg, 'error'); setStatus(null); return
      }
      const data = await res.json()
      setStatus(data)
      setRetentionDays(data.retentionDays)
      setIntervalHours(data.intervalHours)
      if (typeof data?.backupsMessage === 'string' && data.backupsMessage) {
        setBackupsUnavailableMessage(data.backupsMessage)
      }
      const hours = Number(data.intervalHours || 24)
      if (hours === 24) setSchedulePreset('daily')
      else if (hours === 24 * 7) setSchedulePreset('weekly')
      else if (hours === 24 * 30) setSchedulePreset('monthly')
      else setSchedulePreset('custom')
    } catch { toast.addToast('Failed to load status', 'error') }
    finally { setLoading(false) }
  }

  async function loadSettingsPreferences() {
    try {
      const res = await fetchWithAuth.fetchWithAuth(`${base}/api/admin/settings`)
      if (!res.ok) return
      const data = await res.json().catch(() => null)
      const preferredMode = String(data?.settings?.uiPreferences?.backupViewMode || '').toLowerCase()
      if (preferredMode === 'file' || preferredMode === 'row') {
        setViewMode(preferredMode as BackupViewMode)
      }
      const tz = String(data?.settings?.uiPreferences?.timezone || '').trim()
      if (tz) setTimeZone(tz)
    } catch {
      // ignore settings preference errors
    }
  }

  async function loadBackups(p = 1) {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      params.set('page', String(p))
      params.set('limit', String(limit))
      params.set('groupBy', viewMode)
      if (filters.q) params.set('q', filters.q)
      if (filters.sourceFile) params.set('sourceFile', filters.sourceFile)
      if (filters.fromDate) params.set('fromDate', filters.fromDate)
      if (filters.toDate) params.set('toDate', filters.toDate)

      const res = await fetchWithAuth.fetchWithAuth(`${base}/api/admin/backups?${params.toString()}`)
      if (!res.ok) {
        let msg = `Backups fetch failed: ${res.status}`
        try { const body = await res.json(); if (body?.message) msg = body.message } catch {}
        toast.addToast(msg, 'error'); return
      }
      const data = await res.json()
      setBackups(data.docs || [])
      setBackupsUnavailableMessage(typeof data?.message === 'string' ? data.message : '')
      setTotal(data.total || 0)
      setPage(data.page || p)
    } catch { toast.addToast('Failed to load backups', 'error') }
    finally { setLoading(false) }
  }

  useEffect(() => {
    loadStatus()
    loadSettingsPreferences()
  }, [])
  useEffect(() => { loadBackups(page) }, [page, limit, refreshKey, filters, viewMode])

  const applyFilters = () => {
    setFilters({
      q: queryInput.trim(),
      sourceFile: sourceInput.trim(),
      fromDate: fromDateInput,
      toDate: toDateInput,
    })
    setPage(1)
  }

  const clearFilters = () => {
    setQueryInput('')
    setSourceInput('')
    setFromDateInput('')
    setToDateInput('')
    setFilters({ q: '', sourceFile: '', fromDate: '', toDate: '' })
    setPage(1)
  }

  function listenJob(jobId: string, onComplete: () => void) {
    const es = new EventSource(`${base}/api/fetch/status/stream?jobId=${encodeURIComponent(jobId)}`)
    setRetentionJobActive(true)
    setRetentionProgress(0)
    setRetentionMessage('Queued retention job...')
    es.onmessage = (ev) => {
      try {
        const parsed = JSON.parse(ev.data)
        if (parsed.type === 'progress') {
          if (typeof parsed.percent === 'number' && Number.isFinite(parsed.percent)) {
            const pct = Math.max(0, Math.min(100, Math.round(parsed.percent)))
            setRetentionProgress(pct)
          }
          if (parsed.message) {
            setRetentionMessage(String(parsed.message))
            toast.addToast(parsed.message)
          }
        }
        if (['file-complete', 'complete'].includes(parsed.type)) {
          setRetentionProgress(100)
          setRetentionMessage('Retention apply complete')
          setRetentionJobActive(false)
          toast.addToast('Operation completed', 'success'); es.close(); onComplete()
        }
        if (parsed.type === 'error') {
          setRetentionJobActive(false)
          toast.addToast(`Error: ${parsed.message || 'unknown'}`, 'error'); es.close()
        }
      } catch {}
    }
    es.onerror = () => {
      setRetentionJobActive(false)
      es.close()
    }
  }

  useEffect(() => {
    if (schedulePreset === 'daily') setIntervalHours(24)
    if (schedulePreset === 'weekly') setIntervalHours(24 * 7)
    if (schedulePreset === 'monthly') setIntervalHours(24 * 30)
  }, [schedulePreset])

  async function restoreBackup(id: string) {
    if (!confirm('Restore this backup? This will insert rows back into reports.')) return
    setLoading(true)
    try {
      const res = await fetchWithAuth.fetchWithAuth(`${base}/api/admin/backups/${id}/restore`, { method: 'POST' })
      if (!res.ok) throw new Error('Failed')
      const data = await res.json()
      if (data?.jobId) listenJob(data.jobId, () => setRefreshKey(k => k + 1))
      else { toast.addToast('Restore requested', 'info'); setRefreshKey(k => k + 1) }
    } catch { toast.addToast('Restore failed', 'error') }
    finally { setLoading(false) }
  }

  async function deleteBackup(id: string) {
    if (!confirm('Delete this backup permanently?')) return
    setLoading(true)
    try {
      const res = await fetchWithAuth.fetchWithAuth(`${base}/api/admin/backups/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed')
      toast.addToast('Deleted', 'success')
      setRefreshKey(k => k + 1)
    } catch { toast.addToast('Delete failed', 'error') }
    finally { setLoading(false) }
  }

  async function runRetention(apply = false) {
    setRunResult(null); setLoading(true)
    if (!apply) {
      setRetentionJobActive(true)
      setRetentionProgress(20)
      setRetentionMessage('Running dry run...')
    }
    try {
      const body: any = { apply }
      if (retentionDays) body.retentionDays = Number(retentionDays)
      const res = await fetchWithAuth.fetchWithAuth(`${base}/api/admin/retention/run`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
      })
      if (!res.ok) throw new Error('Failed')
      const data = await res.json()
      if (data?.jobId) {
        listenJob(data.jobId, () => { loadStatus(); setRefreshKey(k => k + 1) })
        setRunResult({ queued: true, jobId: data.jobId })
      } else {
        setRunResult(data)
        if (!apply) {
          setRetentionProgress(100)
          setRetentionMessage(`Dry run: ${Number(data?.matched || 0)} backups match retention rule.`)
          setRetentionJobActive(false)
        }
        await loadStatus()
      }
    } catch { toast.addToast('Retention request failed', 'error') }
    finally {
      if (!apply && retentionJobActive) setRetentionJobActive(false)
      setLoading(false); setApplyConfirm(false)
    }
  }

  async function saveRetentionConfig() {
    if (!retentionDays || !intervalHours) {
      toast.addToast('Set both retention days and interval before saving.', 'error')
      return
    }
    setLoading(true)
    try {
      const res = await fetchWithAuth.fetchWithAuth(`${base}/api/admin/retention/config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ retentionDays: Number(retentionDays), intervalHours: Number(intervalHours), enabled: true })
      })
      if (!res.ok) {
        const body = await res.json().catch(() => null)
        throw new Error(body?.message || 'Failed to save retention config')
      }
      toast.addToast('Retention schedule updated', 'success')
      await loadStatus()
    } catch (err: any) {
      toast.addToast(err?.message || 'Failed to update schedule', 'error')
    } finally {
      setLoading(false)
    }
  }

  const totalPages = Math.ceil(total / limit)

  return (
    <div className="rp-root">
      <style>{styles}</style>

      <div className="rp-card">
        {/* Header */}
        <div className="rp-header">
          <div className="rp-header-left">
            <div className="rp-icon-wrap"><Icon.Shield /></div>
            <div>
              <p className="rp-title">Backup Retention</p>
              <p className="rp-subtitle">Manage backup lifecycle and data recovery</p>
            </div>
          </div>
          <div className="rp-status-badge">
            <span className={`rp-status-dot ${status?.enabled ? 'active' : ''}`} />
            {status ? (status.enabled ? 'Active' : 'Disabled') : '—'}
          </div>
          <TimezoneBadge />
        </div>

        <div className="rp-body">
          {/* Stats */}
          <div className="rp-stat-row rp-section">
            <div className="rp-stat">
              <span className="rp-stat-value">{status?.backupsCount ?? '—'}</span>
              <span className="rp-stat-label">Total Backups</span>
            </div>
            <div className="rp-stat">
              <span className="rp-stat-value">{status?.eligibleDeleteNow ?? '—'}</span>
              <span className="rp-stat-label">Eligible For Deletion Now</span>
            </div>
            <div className="rp-stat">
              <span className="rp-stat-value">{status?.retentionDays ?? '—'}</span>
              <span className="rp-stat-label">Retention Days</span>
            </div>
            <div className="rp-stat">
              <span className="rp-stat-value">{status?.intervalHours ?? '—'}</span>
              <span className="rp-stat-label">Interval Hours</span>
            </div>
          </div>

          <div style={{ marginTop: -14, marginBottom: 14, fontSize: 12, color: 'var(--text-secondary)' }}>
            Note: Backup rows are stored per transaction row, so the same source file can appear multiple times.
          </div>

          <div className="rp-divider" />

          {/* Config */}
          <div className="rp-section">
            <p className="rp-section-label">Configuration</p>
            <div className="rp-config-grid">
              <div className="rp-field">
                <label><Icon.Calendar /> Retention Days</label>
                <div className="rp-input-wrap">
                  <input
                    className="rp-input"
                    type="number"
                    min={1}
                    value={retentionDays as any}
                    onChange={e => setRetentionDays(e.target.value === '' ? '' : Number(e.target.value))}
                  />
                  <span className="rp-input-unit">days</span>
                </div>
              </div>
              <div className="rp-field">
                <label><Icon.Clock /> Interval Hours</label>
                <div className="rp-input-wrap">
                  <input
                    className="rp-input"
                    type="number"
                    min={1}
                    disabled={schedulePreset !== 'custom'}
                    value={intervalHours as any}
                    onChange={e => setIntervalHours(e.target.value === '' ? '' : Number(e.target.value))}
                  />
                  <span className="rp-input-unit">hrs</span>
                </div>
              </div>

              <div className="rp-field">
                <label><Icon.Calendar /> Cleanup Frequency</label>
                <select
                  className="rp-select"
                  value={schedulePreset}
                  onChange={e => setSchedulePreset(e.target.value as SchedulePreset)}
                >
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                  <option value="custom">Custom</option>
                </select>
              </div>
            </div>
          </div>

          <div className="rp-action-row" style={{ marginTop: -6, marginBottom: 12 }}>
            <button className="rp-btn rp-btn-success" onClick={saveRetentionConfig} disabled={loading}>
              <Icon.Clock /> Save Schedule
            </button>
          </div>

          {retentionJobActive || retentionProgress > 0 ? (
            <div className="rp-progress-wrap">
              <div className="rp-progress-head">
                <span className="rp-progress-label">{retentionMessage || 'Processing retention...'}</span>
                <span>{retentionProgress}%</span>
              </div>
              <div className="rp-progress-track">
                <div className="rp-progress-bar" style={{ width: `${retentionProgress}%` }} />
              </div>
            </div>
          ) : null}

          {/* Actions */}
          <div className="rp-action-row">
            <button className="rp-btn rp-btn-ghost" onClick={() => runRetention(false)} disabled={loading}>
              <Icon.Refresh /> Dry Run
            </button>
            <button className="rp-btn rp-btn-danger" onClick={() => setApplyConfirm(true)} disabled={loading}>
              <Icon.Trash /> Apply Retention
            </button>
          </div>

          {/* Confirm */}
          {applyConfirm && (
            <div className="rp-confirm-banner">
              <div className="rp-confirm-banner-icon"><Icon.AlertTriangle /></div>
              <div className="rp-confirm-banner-text">
                <p className="rp-confirm-title">Confirm Permanent Deletion</p>
                <p className="rp-confirm-body">
                  This will permanently delete all backups older than {retentionDays || status?.retentionDays} days.
                  This action cannot be undone.
                </p>
                <div className="rp-confirm-actions">
                  <button className="rp-btn rp-btn-ghost rp-btn-sm" onClick={() => setApplyConfirm(false)}>Cancel</button>
                  <button className="rp-btn rp-btn-danger rp-btn-sm" onClick={() => runRetention(true)}>
                    Confirm & Apply
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Result */}
          {runResult && (
            <pre className="rp-pre">{JSON.stringify(runResult, null, 2)}</pre>
          )}

          <div className="rp-divider" />

          {/* Backups Table */}
          <div className="rp-section">
            <p className="rp-section-label">Backup Records</p>

            <div className="rp-filter-grid">
              <div className="rp-field" style={{ marginBottom: 0 }}>
                <label>Search (Branch or File)</label>
                <input className="rp-input" value={queryInput} onChange={e => setQueryInput(e.target.value)} placeholder="e.g. SMNAG or rd5000" />
              </div>
              <div className="rp-field" style={{ marginBottom: 0 }}>
                <label>Source File Contains</label>
                <input className="rp-input" value={sourceInput} onChange={e => setSourceInput(e.target.value)} placeholder="file name" />
              </div>
              <div className="rp-field" style={{ marginBottom: 0 }}>
                <label>From Date</label>
                <input className="rp-input" type="date" value={fromDateInput} onChange={e => setFromDateInput(e.target.value)} />
              </div>
              <div className="rp-field" style={{ marginBottom: 0 }}>
                <label>To Date</label>
                <input className="rp-input" type="date" value={toDateInput} onChange={e => setToDateInput(e.target.value)} />
              </div>
              <div className="rp-field" style={{ marginBottom: 0 }}>
                <label>View Mode</label>
                <select className="rp-select" value={viewMode} onChange={e => { setViewMode(e.target.value as BackupViewMode); setPage(1) }}>
                  <option value="file">Grouped By File</option>
                  <option value="row">Raw Rows</option>
                </select>
              </div>
            </div>

            <div className="rp-filter-actions">
              <button className="rp-btn rp-btn-success rp-btn-sm" onClick={applyFilters} disabled={loading}>
                <Icon.Refresh /> Apply Filters
              </button>
              <button className="rp-btn rp-btn-ghost rp-btn-sm" onClick={clearFilters} disabled={loading}>
                Clear
              </button>
            </div>

            <div className="rp-table-wrap">
              <table className="rp-table">
                <thead>
                  <tr>
                    <th>Branch</th>
                    <th>POS</th>
                    <th>Work Date</th>
                    <th>Source File</th>
                    {viewMode === 'file' ? <th>Rows Backed Up</th> : null}
                    <th>Replaced At</th>
                    {viewMode === 'row' ? <th>Actions</th> : null}
                  </tr>
                </thead>
                <tbody>
                  {loading && backups.length === 0 ? (
                    <tr className="rp-loading-row"><td colSpan={viewMode === 'file' ? 6 : 6}>Loading backups…</td></tr>
                  ) : backups.length === 0 ? (
                    <tr>
                      <td colSpan={viewMode === 'file' ? 6 : 6}>
                        <div className="rp-empty">
                          <Icon.Database />
                          <br />
                          {backupsUnavailableMessage || 'No backups found'}
                        </div>
                      </td>
                    </tr>
                  ) : backups.map(b => (
                    <tr key={b._id}>
                      <td><span className="rp-tag">{b.branch}</span></td>
                      <td className="rp-mono">{b.pos}</td>
                      <td className="rp-mono">{formatDate(b.workDate)}</td>
                      <td className="rp-mono" style={{ maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={b.sourceFile}>{b.sourceFile || '—'}</td>
                      {viewMode === 'file' ? (
                        <td className="rp-mono">{Number(b.rowCount || 0)}</td>
                      ) : null}
                      <td className="rp-mono" style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                        {formatDateTime(b.replacedAt)}
                      </td>
                      {viewMode === 'row' ? (
                        <td>
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button className="rp-btn rp-btn-success rp-btn-sm" onClick={() => restoreBackup(b._id)} disabled={loading}>
                              <Icon.Restore /> Restore
                            </button>
                            <button className="rp-btn rp-btn-danger rp-btn-sm" onClick={() => deleteBackup(b._id)} disabled={loading}>
                              <Icon.Trash />
                            </button>
                          </div>
                        </td>
                      ) : null}
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="rp-pagination">
                <span className="rp-pagination-info">
                  {total === 0 ? 'No records' : `Showing ${((page - 1) * limit) + 1}–${Math.min(page * limit, total)} of ${total}`}
                </span>
                <div className="rp-pagination-btns">
                  <button className="rp-page-btn" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1 || loading}>
                    <Icon.ChevronLeft />
                  </button>
                  <button className="rp-page-btn" onClick={() => setPage(p => p + 1)} disabled={page >= totalPages || loading}>
                    <Icon.ChevronRight />
                  </button>
                </div>
              </div>
            </div>
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