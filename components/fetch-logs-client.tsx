"use client"

import React, { useEffect, useState } from 'react'
import { fetchWithAuth, getAccessToken } from '@/utils/auth'
import Table, { TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table'

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000'

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

  const [modalOpen, setModalOpen] = useState(false)
  const [modalItem, setModalItem] = useState<any>(null)
  const [previewRows, setPreviewRows] = useState<any[]>([])

  useEffect(() => { load(); }, [page])
  useEffect(() => { loadBranches(); }, [])

  async function loadBranches() {
    try {
      const res = await fetchWithAuth(`${API_BASE}/api/fetch/branches`)
      if (!res.ok) return
      const data = await res.json().catch(()=>null)
      if (Array.isArray(data)) setBranches(data.map(String))
    } catch (e) { console.warn('loadBranches', e) }
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
      const res = await fetchWithAuth(`${API_BASE}/api/fetch/files?${q.toString()}`)
      if (!res.ok) throw new Error(`Failed: ${res.status}`)
      const data = await res.json().catch(() => null)
      if (data) {
        setItems(data.items || [])
        setTotal(Number(data.total || 0))
      }
    } catch (e) {
      console.error('load fetch logs error', e)
    } finally { setLoading(false) }
  }

  function viewRaw(id: string) {
    const token = getAccessToken()
    const url = `${API_BASE}/api/fetch/files/${id}/raw${token ? `?token=${encodeURIComponent(token)}` : ''}`
    window.open(url, '_blank')
  }

  function viewRows(id: string) {
    // Open preview modal: fetch rows and show JSON
    const token = getAccessToken()
    const url = `${API_BASE}/api/fetch/files/${id}/rows?limit=200${token ? `&token=${encodeURIComponent(token)}` : ''}`
    (async () => {
      try {
        const res = await fetchWithAuth(url)
        if (!res.ok) throw new Error(`Failed rows: ${res.status}`)
        const data = await res.json().catch(()=>null)
        setPreviewRows(Array.isArray(data) ? data : [])
        const it = items.find((i:any)=>String(i._id)===String(id))
        setModalItem(it || null)
        setModalOpen(true)
      } catch (e) {
        console.error('preview rows error', e)
      }
    })()
  }

  function closeModal() { setModalOpen(false); setModalItem(null); setPreviewRows([]) }

  function exportCSV() {
    if (!items || !items.length) return
    const cols = ['_id','sourceFile','branch','pos','workDate','size','status']
    const lines = [cols.join(',')]
    for (const it of items) {
      const row = cols.map(c => {
        const v = it[c] != null ? String(it[c]) : ''
        return '"' + v.replace(/"/g,'""') + '"'
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

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold">Fetch Logs / File Records</h3>
        <div className="text-sm text-muted-foreground">{total} records</div>
      </div>

      <div className="mb-3 flex flex-wrap gap-2 items-center">
        <select className="input" value={filterBranch} onChange={(e)=>setFilterBranch(e.target.value)}>
          <option value="">All branches</option>
          {branches.map(b => <option key={b} value={b}>{b}</option>)}
        </select>
        <input type="date" className="input" value={startDate} onChange={e=>setStartDate(e.target.value)} />
        <input type="date" className="input" value={endDate} onChange={e=>setEndDate(e.target.value)} />
        <button className="btn btn-sm" onClick={()=>{ setPage(1); load(); }}>Apply</button>
        <button className="btn btn-sm" onClick={()=>{ setFilterBranch(''); setStartDate(''); setEndDate(''); setPage(1); load(); }}>Clear</button>
        <div className="ml-auto flex gap-2">
          <button className="btn btn-sm" onClick={exportCSV} style={{background:'hsl(var(--accent))',color:'#fff'}}>Export Page CSV</button>
          <button className="btn btn-sm" onClick={() => {
            const q = new URLSearchParams(); if (filterBranch) q.set('branch', filterBranch); if (startDate) q.set('startDate', startDate); if (endDate) q.set('endDate', endDate);
            q.set('zip','true');
            const token = getAccessToken();
            const url = `${API_BASE}/api/fetch/files/export?${q.toString()}${token?`&token=${encodeURIComponent(token)}`:''}`;
            window.open(url, '_blank');
          }} style={{background:'hsl(var(--primary))',color:'#fff'}}>Export All (gz)</button>
        </div>
      </div>

      <div className="overflow-auto border rounded bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-36">ID</TableHead>
              <TableHead>File</TableHead>
              <TableHead>Branch</TableHead>
              <TableHead>POS</TableHead>
              <TableHead>Work Date</TableHead>
              <TableHead>Size</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((it: any) => (
              <TableRow key={it._id}>
                <TableCell className="text-xs">{String(it._id).slice(-8)}</TableCell>
                <TableCell className="text-xs break-words max-w-lg">{it.sourceFile || it.filename || it.url || ''}</TableCell>
                <TableCell>{it.branch || ''}</TableCell>
                <TableCell>{it.pos != null ? String(it.pos) : ''}</TableCell>
                <TableCell>{it.workDate ? new Date(it.workDate).toISOString().slice(0,10) : ''}</TableCell>
                <TableCell>{it.size != null ? String(it.size) : ''}</TableCell>
                <TableCell>{it.status || ''}</TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    <button className="btn btn-sm" onClick={() => viewRaw(it._id)}>Raw</button>
                    <button className="btn btn-sm" onClick={() => viewRows(it._id)}>Preview</button>
                    <button className="btn btn-sm" onClick={() => { setModalItem(it); setModalOpen(true); setPreviewRows([]); }}>Details</button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="mt-3 flex items-center justify-between text-sm">
        <div>Page {page}</div>
        <div className="flex gap-2">
          <button className="btn btn-sm" disabled={page<=1} onClick={() => setPage(p=>Math.max(1,p-1))}>Prev</button>
          <button className="btn btn-sm" disabled={items.length < limit} onClick={() => setPage(p=>p+1)}>Next</button>
        </div>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-6">
          <div className="absolute inset-0 bg-black opacity-50" onClick={closeModal}></div>
          <div className="relative bg-white dark:bg-slate-800 rounded shadow-lg w-full max-w-4xl p-4 overflow-auto">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-semibold">File Record Details</h4>
              <div className="flex gap-2">
                <button className="btn btn-sm" onClick={() => { if (modalItem && modalItem._id) viewRaw(modalItem._id) }}>Open Raw</button>
                <button className="btn btn-sm" onClick={() => { if (modalItem && modalItem._id) viewRows(modalItem._id) }}>Open Rows</button>
                <button className="btn btn-sm" onClick={closeModal}>Close</button>
              </div>
            </div>

            {modalItem && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h5 className="font-medium">Record JSON</h5>
                  <pre className="text-xs overflow-auto max-h-72 bg-slate-100 p-2 rounded">{JSON.stringify(modalItem, null, 2)}</pre>
                </div>
                <div>
                  <h5 className="font-medium">Preview Rows ({previewRows.length})</h5>
                  <div className="overflow-auto max-h-72">
                    <table className="min-w-full text-xs">
                      <thead>
                        <tr>
                          {(previewRows[0] ? Object.keys(previewRows[0]) : []).slice(0,8).map(h => <th key={h} className="px-1 py-0 text-left">{h}</th>)}
                        </tr>
                      </thead>
                      <tbody>
                        {previewRows.map((r,i) => (
                          <tr key={i}>
                            {(Object.values(r) as any[]).slice(0,8).map((v,j) => <td key={j} className="px-1 py-0">{String(v)}</td>)}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
