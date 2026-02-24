'use client'
import React, { useEffect, useState } from 'react'
import fetchWithAuth from '../utils/auth'
import ToastProvider, { useToast } from './ToastProvider'

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

  .rp-config-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
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

  .rp-divider {
    height: 1px;
    background: var(--border);
    margin: 24px 0;
  }

  .rp-action-row {
    display: flex;
    gap: 10px;
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
  const [backups, setBackups] = useState<any[]>([])
  const [page, setPage] = useState(1)
  const [limit] = useState(10)
  const [total, setTotal] = useState(0)
  const [refreshKey, setRefreshKey] = useState(0)

  const base = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000'

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
    } catch { toast.addToast('Failed to load status', 'error') }
    finally { setLoading(false) }
  }

  async function loadBackups(p = 1) {
    setLoading(true)
    try {
      const res = await fetchWithAuth.fetchWithAuth(`${base}/api/admin/backups?page=${p}&limit=${limit}`)
      if (!res.ok) {
        let msg = `Backups fetch failed: ${res.status}`
        try { const body = await res.json(); if (body?.message) msg = body.message } catch {}
        toast.addToast(msg, 'error'); return
      }
      const data = await res.json()
      setBackups(data.docs || [])
      setTotal(data.total || 0)
      setPage(data.page || p)
    } catch { toast.addToast('Failed to load backups', 'error') }
    finally { setLoading(false) }
  }

  useEffect(() => { loadStatus() }, [])
  useEffect(() => { loadBackups(page) }, [page, limit, refreshKey])

  function listenJob(jobId: string, onComplete: () => void) {
    const es = new EventSource(`${base}/api/stream/status?jobId=${jobId}`)
    es.onmessage = (ev) => {
      try {
        const parsed = JSON.parse(ev.data)
        if (parsed.type === 'progress') toast.addToast(parsed.message || JSON.stringify(parsed))
        if (['file-complete', 'complete'].includes(parsed.type)) {
          toast.addToast('Operation completed', 'success'); es.close(); onComplete()
        }
        if (parsed.type === 'error') {
          toast.addToast(`Error: ${parsed.message || 'unknown'}`, 'error'); es.close()
        }
      } catch {}
    }
    es.onerror = () => es.close()
  }

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
        await loadStatus()
      }
    } catch { toast.addToast('Retention request failed', 'error') }
    finally { setLoading(false); setApplyConfirm(false) }
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
        </div>

        <div className="rp-body">
          {/* Stats */}
          <div className="rp-stat-row rp-section">
            <div className="rp-stat">
              <span className="rp-stat-value">{status?.backupsCount ?? '—'}</span>
              <span className="rp-stat-label">Total Backups</span>
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
                    value={intervalHours as any}
                    onChange={e => setIntervalHours(e.target.value === '' ? '' : Number(e.target.value))}
                  />
                  <span className="rp-input-unit">hrs</span>
                </div>
              </div>
            </div>
          </div>

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
            <div className="rp-table-wrap">
              <table className="rp-table">
                <thead>
                  <tr>
                    <th>Branch</th>
                    <th>POS</th>
                    <th>Work Date</th>
                    <th>Source File</th>
                    <th>Replaced At</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading && backups.length === 0 ? (
                    <tr className="rp-loading-row"><td colSpan={6}>Loading backups…</td></tr>
                  ) : backups.length === 0 ? (
                    <tr><td colSpan={6}><div className="rp-empty"><Icon.Database /><br />No backups found</div></td></tr>
                  ) : backups.map(b => (
                    <tr key={b._id}>
                      <td><span className="rp-tag">{b.branch}</span></td>
                      <td className="rp-mono">{b.pos}</td>
                      <td className="rp-mono">{b.workDate ? new Date(b.workDate).toISOString().slice(0, 10) : '—'}</td>
                      <td className="rp-mono" style={{ maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={b.sourceFile}>{b.sourceFile || '—'}</td>
                      <td className="rp-mono" style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                        {b.replacedAt ? new Date(b.replacedAt).toLocaleString() : '—'}
                      </td>
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