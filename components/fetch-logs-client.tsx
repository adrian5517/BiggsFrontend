"use client"

import React, { useEffect, useMemo, useState } from 'react'
import auth from '@/utils/auth'
import Table, { TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table'

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000'
const DEFAULT_BRANCHES = ["AYALA-FRN", "BETA", "B-CPOL", "B-SMS", "BIA", "BMC", "BRLN", "BPAG", "BGRAN", "BTAB", "CAMALIG", "CNTRO", "DAET", "DAR", "EME", "GOA", "IRIGA", "MAGS", "MAS", "OLA", "PACML", "ROB-FRN", "SANPILI", "SIPOCOT", "SMLGZ-FRN", "SMLIP", "SMNAG", "ROXAS"]

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@300;400;500&family=Sora:wght@300;400;500;600&display=swap');

  .fl-root {
    font-family: 'Sora', sans-serif;
    --ink: #0f0f0f;
    --ink-muted: #6b6b6b;
    --ink-faint: #161515;
    --surface: #fafaf8;
    --card: #ffffff;
    --border: #e8e8e4;
    --border-strong: #d0d0c8;
    --accent: #1a1a1a;
    --accent-text: #ffffff;
    --amber: #dbb625;
    --amber-light: #fef3c7;
    --rose: #be123c;
    --rose-light: #ffe4e6;
    --emerald: #065f46;
    --emerald-light: #d1fae5;
    --blue: #2091f3;
    --blue-light: #dbeafe;
    --shadow-sm: 0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04);
    --shadow-md: 0 4px 16px rgba(0,0,0,0.08), 0 2px 6px rgba(0,0,0,0.04);
    --shadow-lg: 0 20px 60px rgba(0,0,0,0.12), 0 8px 24px rgba(0,0,0,0.06);
    --radius: 10px;
    --radius-sm: 6px;
    --radius-lg: 16px;
    background: var(--surface);
    color: var(--ink);
    min-height: 100%;
  }

  .fl-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 28px;
    padding-bottom: 20px;
    border-bottom: 1px solid var(--border);
  }
  .fl-title {
    font-size: 1.25rem;
    font-weight: 600;
    letter-spacing: -0.02em;
    color: var(--ink);
    display: flex;
    align-items: center;
    gap: 10px;
  }
  .fl-title-icon {
    width: 32px; height: 32px;
    background: var(--blue);
    border-radius: 8px;
    display: flex; align-items: center; justify-content: center;
  }
  .fl-title-icon svg { color: #fff; }
  .fl-badge {
    font-family: 'DM Mono', monospace;
    font-size: 0.7rem;
    font-weight: 500;
    letter-spacing: 0.04em;
    background: green;
    color: #fff;
    padding: 3px 10px;
    border-radius: 100px;
  }

  .fl-controls {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    align-items: center;
    margin-bottom: 16px;
    padding: 16px;
    background: var(--card);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    box-shadow: var(--shadow-sm);
  }

  .fl-label {
    font-size: 0.65rem;
    font-weight: 600;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--ink-faint);
    margin-bottom: 4px;
  }

  .fl-field-group {
    display: flex;
    flex-direction: column;
  }

  .fl-select, .fl-date-input {
    font-family: 'Sora', sans-serif;
    font-size: 0.8rem;
    color: var(--ink);
    background: var(--surface);
    border: 1px solid var(--border-strong);
    border-radius: var(--radius-sm);
    padding: 7px 10px;
    outline: none;
    transition: border-color 0.15s, box-shadow 0.15s;
    min-width: 140px;
    appearance: none;
    -webkit-appearance: none;
    cursor: pointer;
  }
  .fl-select:focus, .fl-date-input:focus {
    border-color: var(--ink);
    box-shadow: 0 0 0 3px rgba(15,15,15,0.08);
  }

  .fl-select-wrap {
    position: relative;
  }
  .fl-select-wrap::after {
    content: '';
    position: absolute;
    right: 10px;
    top: 50%;
    transform: translateY(-50%);
    width: 0; height: 0;
    border-left: 4px solid transparent;
    border-right: 4px solid transparent;
    border-top: 5px solid var(--ink-muted);
    pointer-events: none;
  }

  .fl-divider {
    width: 1px;
    height: 36px;
    background: var(--border);
    margin: 0 4px;
  }

  .fl-btn {
    font-family: 'Sora', sans-serif;
    font-size: 0.78rem;
    font-weight: 500;
    border: 1px solid transparent;
    border-radius: var(--radius-sm);
    padding: 7px 14px;
    cursor: pointer;
    transition: all 0.15s;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    white-space: nowrap;
    outline: none;
  }
  .fl-btn:disabled { opacity: 0.4; cursor: not-allowed; }

  .fl-btn-apply {
    background: var(--amber);
    color: var(--accent-text);
   
  }
  .fl-btn-apply:hover:not(:disabled) { background: #333; }

  .fl-btn-clear {
    background: var(--surface);
    color: var(--ink-muted);
    border-color: var(--border-strong);
  }
  .fl-btn-clear:hover:not(:disabled) { background: #f0f0ec; color: var(--ink); }

  .fl-btn-export {
    background: var(--surface);
    color: var(--ink);
    border-color: var(--border-strong);
  }
  .fl-btn-export:hover:not(:disabled) { background: #f0f0ec; }

  .fl-btn-export-gz {
    background: var(--ink);
    color: #fff;
    border-color: var(--ink);
  }
  .fl-btn-export-gz:hover:not(:disabled) { background: #333; }

  .fl-btn-action {
    font-size: 0.72rem;
    padding: 4px 10px;
    color: var(--ink);
    border-color: var(--border-strong);
    border-radius: 5px;
  }
  .fl-btn-action:hover { background: var(--ink); color: #fff; border-color: var(--ink); }

  .fl-btn-sm-icon {
    font-size: 0.72rem;
    padding: 4px 8px;
    background: transparent;
    color: var(--ink-muted);
    border-color: transparent;
    border-radius: 5px;
  }
  .fl-btn-sm-icon:hover { background: #f0f0ec; color: var(--ink); }

  .fl-spacer { flex: 1; }

  .fl-table-wrap {
    background: var(--card);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    box-shadow: var(--shadow-sm);
    overflow: hidden;
  }

  .fl-table {
    width: 100%;
    border-collapse: collapse;
  }
  .fl-table thead {
    background: #32a7de;
    border-bottom: 1px solid var(--border);
  }
  .fl-table th {
    font-size: 0.67rem;
    font-weight: 600;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--ink-faint);
    padding: 11px 16px;
    text-align: left;
    white-space: nowrap;
  }
  .fl-table td {
    padding: 12px 16px;
    font-size: 0.8rem;
    color: var(--ink);
    border-bottom: 1px solid var(--border);
    vertical-align: middle;
  }
  .fl-table tr:last-child td { border-bottom: none; }
  .fl-table tbody tr { transition: background 0.1s; }
  .fl-table tbody tr:hover { background: #fafaf6; }

  .fl-mono {
    font-family: 'DM Mono', monospace;
    font-size: 0.72rem;
    color: var(--ink-muted);
    letter-spacing: 0.02em;
  }

  .fl-file-path {
    font-size: 0.75rem;
    color: var(--ink-muted);
    max-width: 260px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .fl-status-badge {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    font-size: 0.68rem;
    font-weight: 600;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    padding: 3px 8px;
    border-radius: 100px;
    white-space: nowrap;
  }
  .fl-status-badge::before {
    content: '';
    width: 5px; height: 5px;
    border-radius: 50%;
    background: currentColor;
    opacity: 0.7;
  }
  .fl-status-success { background: var(--emerald-light); color: var(--emerald); }
  .fl-status-error { background: var(--rose-light); color: var(--rose); }
  .fl-status-pending { background: var(--amber-light); color: var(--amber); }
  .fl-status-default { background: #f1f1ef; color: var(--ink-muted); }

  .fl-actions { display: flex; gap: 4px; }

  .fl-loading {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 64px 0;
    gap: 12px;
    color: var(--ink-muted);
    font-size: 0.82rem;
  }
  .fl-spinner {
    width: 18px; height: 18px;
    border: 2px solid var(--border);
    border-top-color: var(--ink);
    border-radius: 50%;
    animation: fl-spin 0.6s linear infinite;
  }
  @keyframes fl-spin { to { transform: rotate(360deg); } }

  .fl-empty {
    text-align: center;
    padding: 64px 0;
    color: var(--ink-faint);
    font-size: 0.82rem;
  }

  .fl-pagination {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 14px 0;
    font-size: 0.78rem;
    color: var(--ink-muted);
  }
  .fl-pagination-info { font-family: 'DM Mono', monospace; font-size: 0.72rem; }
  .fl-page-btns { display: flex; gap: 6px; }

  /* Modal */
  .fl-overlay {
    position: fixed;
    inset: 0;
    z-index: 50;
    display: flex;
    align-items: flex-start;
    justify-content: center;
    padding: 48px 24px;
    background: rgba(0,0,0,0.45);
    backdrop-filter: blur(4px);
    animation: fl-fade-in 0.2s ease;
  }
  @keyframes fl-fade-in { from { opacity: 0; } to { opacity: 1; } }

  .fl-modal {
    position: relative;
    background: var(--card);
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow-lg);
    width: 100%;
    margin-top: 15vh;
    max-width: 1200px;
    max-height: 80vh;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    animation: fl-slide-up 0.25s cubic-bezier(0.16, 1, 0.3, 1);
  }
  @keyframes fl-slide-up { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }

  .fl-modal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 20px 24px;
    border-bottom: 1px solid var(--border);
    flex-shrink: 0;
  }
  .fl-modal-title {
    font-size: 0.95rem;
    font-weight: 600;
    letter-spacing: -0.01em;
  }
  .fl-modal-actions { display: flex; gap: 6px; }

  .fl-modal-body {
    padding: 24px;
    overflow: auto;
  }

  .fl-panel {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    overflow: hidden;
  }
  .fl-panel-header {
    padding: 10px 14px;
    border-bottom: 1px solid var(--border);
    font-size: 0.72rem;
    font-weight: 600;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--ink-muted);
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  .fl-panel-count {
    font-family: 'DM Mono', monospace;
    font-size: 0.68rem;
    background: var(--border);
    color: var(--ink-muted);
    padding: 2px 6px;
    border-radius: 4px;
  }
  .fl-panel-body {
    padding: 12px 14px;
    font-family: 'DM Mono', monospace;
    font-size: 0.72rem;
    line-height: 1.6;
    overflow: auto;
    max-height: 55vh;
    color: var(--ink-muted);
    white-space: pre-wrap;
    word-break: break-all;
  }

  .fl-preview-table { width: 100%; border-collapse: collapse; }
  .fl-preview-table th, .fl-preview-table td {
    padding: 8px 12px;
    text-align: left;
    font-size: 0.7rem;
    font-family: 'DM Mono', monospace;
    border-bottom: 1px solid var(--border);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 200px;
  }
  .fl-preview-table th {
    font-weight: 600;
    color: var(--ink-faint);
    font-size: 0.65rem;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    background: var(--surface);
    position: sticky;
    top: 0;
  }
  .fl-preview-table tr:last-child td { border-bottom: none; }
  .fl-preview-table tbody tr:hover { background: #fafaf6; }
`

function getStatusClass(status: string) {
  if (!status) return 'fl-status-default'
  const s = status.toLowerCase()
  if (s.includes('success') || s.includes('done') || s.includes('ok') || s.includes('complete')) return 'fl-status-success'
  if (s.includes('error') || s.includes('fail')) return 'fl-status-error'
  if (s.includes('pending') || s.includes('process') || s.includes('running')) return 'fl-status-pending'
  return 'fl-status-default'
}

// Icons
const Icons = {
  Logs: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
      <polyline points="14 2 14 8 20 8"/>
      <line x1="16" y1="13" x2="8" y2="13"/>
      <line x1="16" y1="17" x2="8" y2="17"/>
      <polyline points="10 9 9 9 8 9"/>
    </svg>
  ),
  Search: () => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
    </svg>
  ),
  X: () => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
    </svg>
  ),
  Download: () => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
      <polyline points="7 10 12 15 17 10"/>
      <line x1="12" y1="15" x2="12" y2="3"/>
    </svg>
  ),
  Archive: () => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="21 8 21 21 3 21 3 8"/>
      <rect x="1" y="3" width="22" height="5"/>
      <line x1="10" y1="12" x2="14" y2="12"/>
    </svg>
  ),
  Eye: () => (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
      <circle cx="12" cy="12" r="3"/>
    </svg>
  ),
  Code: () => (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="16 18 22 12 16 6"/>
      <polyline points="8 6 2 12 8 18"/>
    </svg>
  ),
  Info: () => (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <line x1="12" y1="16" x2="12" y2="12"/>
      <line x1="12" y1="8" x2="12.01" y2="8"/>
    </svg>
  ),
  Prev: () => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="15 18 9 12 15 6"/>
    </svg>
  ),
  Next: () => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 18 15 12 9 6"/>
    </svg>
  ),
  ExternalLink: () => (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
      <polyline points="15 3 21 3 21 9"/>
      <line x1="10" y1="14" x2="21" y2="3"/>
    </svg>
  ),
}

export default function FetchLogsClient() {
  const [items, setItems] = useState<any[]>([])
  const [total, setTotal] = useState<number>(0)
  const [page, setPage] = useState(1)
  const [limit] = useState(50)
  const [loading, setLoading] = useState(false)
  const [branches, setBranches] = useState<string[]>([])
  const [filterBranch, setFilterBranch] = useState<string>('')
  const [startDate, setStartDate] = useState<string>('')
  const [endDate, setEndDate] = useState<string>('')
  const [quickSearch, setQuickSearch] = useState<string>('')

  const [modalOpen, setModalOpen] = useState(false)
  const [modalItem, setModalItem] = useState<any>(null)
  const [previewRows, setPreviewRows] = useState<any[]>([])
  const [previewInfo, setPreviewInfo] = useState<string>('Loading preview...')
  const [modalType, setModalType] = useState<'preview' | 'details'>('preview')

  useEffect(() => { load() }, [page])
  useEffect(() => { loadBranches() }, [])

  async function loadBranches() {
    try {
      const res = await auth.fetchWithAuth(`${API_BASE}/api/fetch/branches`)
      if (!res.ok) { setBranches(DEFAULT_BRANCHES); return }
      const data = await res.json().catch(() => null)
      const values = Array.isArray(data)
        ? data
        : (Array.isArray(data?.branches) ? data.branches : [])
      if (values.length) setBranches(values.map(String))
      else setBranches(DEFAULT_BRANCHES)
    } catch (e) {
      console.warn('loadBranches', e)
      setBranches(DEFAULT_BRANCHES)
    }
  }

  async function load() {
    setLoading(true)
    try {
      const q = new URLSearchParams()
      q.set('limit', String(limit))
      q.set('page', String(page))
      if (filterBranch) q.set('branch', filterBranch)
      if (startDate) q.set('startDate', startDate)
      if (endDate) q.set('endDate', endDate)
      if (quickSearch.trim()) q.set('search', quickSearch.trim())
      const res = await auth.fetchWithAuth(`${API_BASE}/api/fetch/files?${q.toString()}`)
      if (!res.ok) {
        if (res.status === 401) {
          setItems([])
          setTotal(0)
          return
        }
        setItems([])
        setTotal(0)
        return
      }
      const data = await res.json().catch(() => null)
      if (data) {
        const normalizedItems = (data.items || []).map((item: any) => ({
          ...item,
          sourceFile: item.sourceFile ?? item.source_file,
          workDate: item.workDate ?? item.work_date,
        }))
        setItems(normalizedItems)
        setTotal(Number(data.total || 0))
      }
    } catch (e) {
      setItems([])
      setTotal(0)
    } finally { setLoading(false) }
  }

  async function viewRaw(id: string) {
    try {
      const url = `${API_BASE}/api/fetch/files/${id}/raw`
      const res = await auth.fetchWithAuth(url)
      if (!res.ok) throw new Error(`Failed raw: ${res.status}`)

      const blob = await res.blob()
      const blobUrl = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = blobUrl
      a.download = `file_${id}.csv`
      a.click()
      URL.revokeObjectURL(blobUrl)
    } catch (e) {
      console.error('view raw error', e)
      alert('Failed to download raw file.')
    }
  }

  function viewRows(id: string) {
    const url = `${API_BASE}/api/fetch/files/${id}/rows?limit=200`;
    const it = items.find((i: any) => String(i._id) === String(id))
    setModalItem(it || null)
    setModalType('preview')
    setPreviewRows([])
    setPreviewInfo('Loading preview...')
    setModalOpen(true)

    ;
    (async () => {
      try {
        const res = await auth.fetchWithAuth(url)
        if (!res.ok) {
          if (res.status === 404) {
            setPreviewRows([])
            setPreviewInfo('No parsed rows available for this file.')
            return
          }
          if (res.status === 401) {
            setPreviewRows([])
            setPreviewInfo('Unauthorized. Please login again.')
            return
          }
          setPreviewRows([])
          setPreviewInfo(`Failed to load rows (${res.status}).`)
          return
        }
        const data = await res.json().catch(() => null)
        const rows = Array.isArray(data)
          ? data
          : (Array.isArray(data?.items) ? data.items : [])
        setPreviewRows(rows)
        setPreviewInfo(rows.length === 0 ? 'No parsed rows available for this file.' : '')
      } catch (e) {
        setPreviewRows([])
        setPreviewInfo('Failed to load preview rows.')
      }
    })()
  }

  function closeModal() {
    setModalOpen(false)
    setModalItem(null)
    setPreviewRows([])
    setPreviewInfo('Loading preview...')
    setModalType('preview')
  }

  function formatFileSize(value: any) {
    const bytes = Number(value)
    if (!Number.isFinite(bytes) || bytes < 0) return '—'
    if (bytes < 1024) return `${bytes} B`

    const units = ['KB', 'MB', 'GB', 'TB']
    let size = bytes / 1024
    let unitIndex = 0
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024
      unitIndex += 1
    }
    return `${size.toFixed(size >= 10 ? 1 : 2)} ${units[unitIndex]}`
  }

  function formatSourceFilePath(value: any) {
    const raw = String(value ?? '').trim()
    if (!raw) return '—'
    
    // Remove URL protocol and host
    let cleaned = raw.replace(/^https?:\/\/[^/]+\//i, '')
    
    // Remove common prefixes
    cleaned = cleaned.replace(/^data_archive[\\/]+/i, '')
    cleaned = cleaned.replace(/^local-fallback[\\/]+/i, '')
    
    // Extract just the filename (last part after /)
    const parts = cleaned.split(/[\\/]/)
    const filename = parts[parts.length - 1]
    
    return filename || cleaned
  }

  function exportCSV() {
    if (!items || !items.length) return
    const cols = ['_id', 'source_file', 'branch', 'pos', 'work_date', 'size', 'status']
    const lines = [cols.join(',')]
    for (const it of items) {
      const row = cols.map(c => {
        const normalized = {
          _id: it._id,
          source_file: it.source_file ?? it.sourceFile,
          branch: it.branch,
          pos: it.pos,
          work_date: it.work_date ?? it.workDate,
          size: it.size,
          status: it.status,
        } as any
        const v = normalized[c] != null ? String(normalized[c]) : ''
        return '"' + v.replace(/"/g, '""') + '"'
      }).join(',')
      lines.push(row)
    }
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `fetchlogs_page${page}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const totalPages = Math.ceil(total / limit)
  const filteredItems = useMemo(() => {
    const needle = quickSearch.trim().toLowerCase()
    if (!needle) return items
    return items.filter((it: any) => {
      const id = String(it._id ?? '')
      const file = formatSourceFilePath(it.sourceFile ?? it.source_file ?? it.filename ?? it.url ?? '')
      const branch = String(it.branch ?? '')
      const workDateRaw = it.work_date || it.workDate
      const workDate = workDateRaw ? new Date(workDateRaw).toISOString().slice(0, 10) : ''
      const haystack = `${id} ${file} ${branch} ${workDate}`.toLowerCase()
      return haystack.includes(needle)
    })
  }, [items, quickSearch])

  return (
    <>
      <style>{styles}</style>
      <div className="fl-root">

        {/* Header */}
        <div className="fl-header">
          <div className="fl-title">
            <div className="fl-title-icon">
              <Icons.Logs />
            </div>
            Fetch Logs
          </div>
          <span className="bg-green-500 fl-badge">{total.toLocaleString()} records</span>
        </div>

        {/* Controls */}
        <div className="fl-controls">
          <div className="fl-field-group">
            <div className="fl-label">Branch</div>
            <div className="fl-select-wrap">
              <select className="fl-select" value={filterBranch} onChange={e => setFilterBranch(e.target.value)}>
                <option value="">All branches</option>
                {branches.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>
          </div>

          <div className="fl-field-group">
            <div className="fl-label">From</div>
            <input type="date" className="fl-date-input" value={startDate} onChange={e => setStartDate(e.target.value)} />
          </div>

          <div className="fl-field-group">
            <div className="fl-label">To</div>
            <input type="date" className="fl-date-input" value={endDate} onChange={e => setEndDate(e.target.value)} />
          </div>

          <div className="fl-field-group" style={{ minWidth: 220 }}>
            <div className="fl-label">Quick Search</div>
            <input
              type="text"
              className="fl-date-input"
              placeholder="ID, file, branch, work date"
              value={quickSearch}
              onChange={e => setQuickSearch(e.target.value)}
            />
          </div>

          <div className="fl-field-group" style={{ justifyContent: 'flex-end' }}>
            <div className="fl-label">&nbsp;</div>
            <div style={{ display: 'flex', gap: 6 }}>
              <button className="fl-btn fl-btn-apply" onClick={() => { setPage(1); load() }}>
                <Icons.Search /> Apply
              </button>
              <button className="fl-btn fl-btn-clear" onClick={() => { setFilterBranch(''); setStartDate(''); setEndDate(''); setQuickSearch(''); setPage(1); load() }}>
                <Icons.X /> Clear
              </button>
            </div>
          </div>

          <div className="fl-divider" />

          <div className="fl-spacer" />

          <div className="fl-field-group" style={{ justifyContent: 'flex-end' }}>
            <div className="fl-label">Export</div>
            <div style={{ display: 'flex', gap: 6 }}>
              <button className="fl-btn fl-btn-export" onClick={exportCSV}>
                <Icons.Download /> CSV
              </button>
              <button className="fl-btn fl-btn-export-gz" onClick={() => {
                const q = new URLSearchParams()
                if (filterBranch) q.set('branch', filterBranch)
                if (startDate) q.set('startDate', startDate)
                if (endDate) q.set('endDate', endDate)
                q.set('zip', 'true')
                const url = `${API_BASE}/api/fetch/files/export?${q.toString()}`
                ;(async () => {
                  try {
                    const res = await auth.fetchWithAuth(url)
                    if (!res.ok) throw new Error(`Failed export: ${res.status}`)
                    const blob = await res.blob()
                    const blobUrl = URL.createObjectURL(blob)
                    const a = document.createElement('a')
                    a.href = blobUrl
                    a.download = 'fetch_records.csv.gz'
                    a.click()
                    URL.revokeObjectURL(blobUrl)
                  } catch (e) {
                    console.error('export gz error', e)
                    alert('Failed to export gz file.')
                  }
                })()
              }}>
                <Icons.Archive /> All (gz)
              </button>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="fl-table-wrap">
          {loading ? (
            <div className="fl-loading">
              <div className="fl-spinner" />
              Loading records…
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="fl-empty">No records found</div>
          ) : (
            <table className="fl-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>File</th>
                  <th>Branch</th>
                  <th>POS</th>
                  <th>Work Date</th>
                  <th>Size</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.map((it: any) => (
                  <tr key={it._id}>
                    <td>
                      <span className="fl-mono">…{String(it._id).slice(-8)}</span>
                    </td>
                    <td>
                      <span className="fl-file-path" title={formatSourceFilePath(it.sourceFile || it.filename || it.url || '')}>
                        {formatSourceFilePath(it.sourceFile || it.filename || it.url || '')}
                      </span>
                    </td>
                    <td>
                      {it.branch ? (
                        <span className="fl-mono" style={{ color: 'var(--ink)' }}>{it.branch}</span>
                      ) : '—'}
                    </td>
                    <td>
                      <span className="fl-mono">{it.pos != null ? String(it.pos) : '—'}</span>
                    </td>
                    <td>
                      <span className="fl-mono" style={{ color: 'var(--ink)' }}>
                        {(it.work_date || it.workDate) ? new Date(it.work_date || it.workDate).toISOString().slice(0, 10) : '—'}
                      </span>
                    </td>
                    <td>
                      <span className="fl-mono">
                        {formatFileSize(it.size)}
                      </span>
                    </td>
                    <td>
                      {it.status ? (
                        <span className={`fl-status-badge ${getStatusClass(it.status)}`}>
                          {it.status}
                        </span>
                      ) : '—'}
                    </td>
                    <td>
                      <div className="fl-actions">
                        <button className="fl-btn bg-sky-500 hover:bg-sky-600 text-white rounded-lg" onClick={() => viewRaw(it._id)} title="View raw">
                          <Icons.Code /> Raw
                        </button>
                        <button className="fl-btn bg-yellow-500 hover:bg-yellow-600 text-white rounded-lg" onClick={() => viewRows(it._id)} title="Preview rows">
                          <Icons.Eye /> Preview
                        </button>
                        <button className="fl-btn bg-red-500 hover:bg-red-600 text-white rounded-lg" onClick={() => { setModalItem(it); setModalType('details'); setModalOpen(true); setPreviewRows([]) }} title="Details">
                          <Icons.Info /> Details
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        <div className="fl-pagination">
          <div className="fl-pagination-info">
            Page {page}{totalPages > 0 ? ` of ${totalPages}` : ''} — {total.toLocaleString()} total
          </div>
          <div className="fl-page-btns">
            <button className="fl-btn fl-btn-clear" disabled={page <= 1} onClick={() => setPage(p => Math.max(1, p - 1))}>
              <Icons.Prev /> Prev
            </button>
            <button className="fl-btn fl-btn-clear" disabled={items.length < limit} onClick={() => setPage(p => p + 1)}>
              Next <Icons.Next />
            </button>
          </div>
        </div>

        {/* Modal */}
        {modalOpen && (
          <div className="fl-overlay" onClick={e => { if (e.target === e.currentTarget) closeModal() }}>
            <div className="fl-modal">
              <div className="fl-modal-header">
                <div className="fl-modal-title">
                  {modalType === 'preview' ? 'Preview Rows' : 'Record Details'}
                  {modalItem && (
                    <span className="fl-mono" style={{ fontFamily: 'DM Mono, monospace', fontSize: '0.7rem', marginLeft: '8px', color: 'var(--ink-faint)' }}>
                      …{String(modalItem._id).slice(-12)}
                    </span>
                  )}
                </div>
                <div className="fl-modal-actions">
                  {modalItem && modalType === 'preview' && (
                    <button className="fl-btn fl-btn-export" onClick={() => viewRaw(modalItem._id)}>
                      <Icons.ExternalLink /> Download CSV
                    </button>
                  )}
                  <button className="fl-btn fl-btn-apply" onClick={closeModal}>
                    <Icons.X /> Close
                  </button>
                </div>
              </div>

              {modalItem && (
                <div className="fl-modal-body">
                  {modalType === 'details' ? (
                    <div className="fl-panel">
                      <div className="fl-panel-header">
                        Record JSON
                      </div>
                      <div className="fl-panel-body">
                        {JSON.stringify(modalItem, null, 2)}
                      </div>
                    </div>
                  ) : (
                    <div className="fl-panel">
                      <div className="fl-panel-header">
                        Data Preview
                        <span className="fl-panel-count">{previewRows.length} rows</span>
                      </div>
                      <div className="fl-panel-body" style={{ padding: 0 }}>
                        {previewRows.length === 0 ? (
                          <div style={{ padding: '20px', color: 'var(--ink-faint)', textAlign: 'center', fontSize: '0.75rem' }}>
                            {previewInfo || 'Loading preview...'}
                          </div>
                        ) : (
                          <table className="fl-preview-table">
                            <thead>
                              <tr>
                                {(previewRows[0] ? Object.keys(previewRows[0]) : []).map(h => (
                                  <th key={h}>{h}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {previewRows.map((r, i) => (
                                <tr key={i}>
                                  {(Object.values(r) as any[]).map((v, j) => (
                                    <td key={j} title={String(v)}>{String(v)}</td>
                                  ))}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  )
}