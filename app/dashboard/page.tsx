"use client"

import React, { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { useRouter } from 'next/navigation'
import auth, { fetchWithAuth, getAccessToken } from '@/utils/auth'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import LoginLayout from '@/components/login-layout'

import Link from 'next/link'

type FetchEvent = { type: string; message?: string; batchRows?: number; totalRows?: number }

export default function DashboardPage() {
  const router = useRouter()
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000'

  const [query, setQuery] = useState('')
  const [branch, setBranch] = useState('')
  const [pos, setPos] = useState('')
  const [events, setEvents] = useState<FetchEvent[]>([])
  const [status, setStatus] = useState<'idle' | 'running' | 'completed' | 'error'>('idle')
  const [jobId, setJobId] = useState('')
  const eventSourceRef = useRef<EventSource | null>(null)

  useEffect(() => {
    const token = auth.getAccessToken()
    if (!token) router.push('/login')
  }, [router])

  useEffect(() => () => { if (eventSourceRef.current) eventSourceRef.current.close() }, [])

  const startFetch = async () => {
    setStatus('running')
    setEvents([])
    const payload = { start: new Date().toISOString().slice(0,10), end: new Date().toISOString().slice(0,10), branches: branch || undefined, positions: pos || undefined }
    try {
      const res = await fetchWithAuth(`${apiBaseUrl}/api/fetch/start`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      if (res.status === 401) { auth.clearAccessToken(); router.push('/login'); return }
      const data = await res.json()
      if (!res.ok) { setStatus('error'); return }
      setJobId(data.jobId || '')
      connectToStream(data.jobId || '')
    } catch (e) { setStatus('error') }
  }

  const connectToStream = (id: string) => {
    if (!id) return
    if (eventSourceRef.current) eventSourceRef.current.close()
    const token = getAccessToken()
    const url = `${apiBaseUrl}/api/fetch/status/stream?jobId=${encodeURIComponent(id)}${token ? `&token=${encodeURIComponent(token)}` : ''}`
    const es = new EventSource(url)
    eventSourceRef.current = es
    es.onmessage = (ev) => {
      try {
        const d = JSON.parse(ev.data)
        setEvents(prev => [d, ...prev].slice(0, 150))
        if (d.type === 'complete') { setStatus('completed'); es.close() }
      } catch {
        setEvents(prev => [{ type: 'message', message: ev.data }, ...prev].slice(0, 150))
      }
    }
    es.onerror = () => { setStatus('error'); es.close() }
  }

  const openSse = () => {
    const token = getAccessToken()
    const url = `${apiBaseUrl}/api/queue/events?queue=importQueue${token ? `&token=${encodeURIComponent(token)}` : ''}`
    window.open(url, '_blank')
  }

  return (
    <LoginLayout>
      <div />
      <div className="min-h-screen ">
        {/* Centered white content card with single internal gradient header */}
        <div className="max-w-8xl mx-auto -mt-10 relative block">
          <div className="bg-white rounded-xl shadow-lg relative block overflow-hidden">
           
            <div className="p-6">
              {/* Overview stat cards (slightly lifted) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 mb-6 -mt-8">
                <motion.div whileHover={{ y: -6 }} whileTap={{ scale: 0.98 }} className="bg-white shadow rounded-lg p-4">
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-md bg-[#29a8e0]/10 text-[#29a8e0]">
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M3 12h18" strokeLinecap="round" strokeLinejoin="round" />
                        <path d="M12 3v18" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Active Jobs</div>
                      <div className="text-xl font-semibold">{jobId ? 1 : 0}</div>
                    </div>
                  </div>
                </motion.div>

                <motion.div whileHover={{ y: -6 }} whileTap={{ scale: 0.98 }} className="bg-white shadow rounded-lg p-4">
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-md bg-[#bd202e]/10 text-[#bd202e]">
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M12 6v6l4 2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Live Events</div>
                      <div className="text-xl font-semibold">{events.length}</div>
                    </div>
                  </div>
                </motion.div>

                <motion.div whileHover={{ y: -6 }} whileTap={{ scale: 0.98 }} className="bg-white shadow rounded-lg p-4">
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-md bg-[#ecbc32]/10 text-[#ecbc32]">
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M12 2l3 7h7l-5.5 4 2 7L12 16l-6.5 4 2-7L2 9h7z" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Uploads</div>
                      <div className="text-xl font-semibold">—</div>
                    </div>
                  </div>
                </motion.div>

                <motion.div whileHover={{ y: -6 }} whileTap={{ scale: 0.98 }} className="bg-white shadow rounded-lg p-4">
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-md bg-[#29a8e0]/10 text-[#29a8e0]">
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M3 7h18M3 12h18M3 17h18" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Files</div>
                      <div className="text-xl font-semibold">—</div>
                    </div>
                  </div>
                </motion.div>
              </div>

              {/* <nav className="mb-6 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <Link href="/dashboard" className="text-sm text-muted-foreground">Dashboard</Link>
                  <Link href="/files" className="text-sm text-muted-foreground">Files</Link>
                  <Link href="/master" className="text-sm text-muted-foreground">Master</Link>
                </div>
                <div className="flex items-center gap-3">
                  <Button variant="ghost" onClick={openSse}>Open Queue Events (SSE)</Button>
                  <Button onClick={() => router.push('/upload')}>Upload CSVs</Button>
                </div>
              </nav> */}

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                  <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
                    <Card className="bg-white text-slate-900 shadow">
                      <CardHeader>
                        <CardTitle className="text-2xl text-[#29a8e0]">Quick Fetch</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <div>
                            <Label>Search</Label>
                            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search product, txn, OR" />
                          </div>
                          <div>
                            <Label>Branch (optional)</Label>
                            <Input value={branch} onChange={(e) => setBranch(e.target.value)} placeholder="e.g. BETA" />
                          </div>
                          <div>
                            <Label>POS</Label>
                            <Input value={pos} onChange={(e) => setPos(e.target.value)} placeholder="1" />
                          </div>
                        </div>
                        <div className="mt-4 flex items-center gap-3">
                          <Button onClick={startFetch} className="bg-[#ecbc32] text-black hover:brightness-95">{status === 'running' ? 'Streaming...' : 'Start Fetch'}</Button>
                          <Button variant="outline" onClick={() => { setQuery(''); setBranch(''); setPos('') }} className="border-[#29a8e0] text-[#29a8e0]">Reset</Button>
                          <div className="ml-auto text-sm">Job: <span className="font-mono">{jobId || '—'}</span></div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>

                  <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: 0.05 }}>
                    <Card className="bg-white text-slate-900 shadow">
                      <CardHeader>
                        <CardTitle className="text-2xl text-[#29a8e0]">Live Events</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="max-h-80 overflow-auto space-y-2">
                          {events.length === 0 ? (
                            <div className="text-sm text-muted-foreground">No events yet.</div>
                          ) : (
                            events.map((ev, i) => (
                              <motion.div key={i} className="p-3 rounded border" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.02 }}>
                                <div className="text-xs font-semibold text-amber-700">{ev.type}</div>
                                {ev.message && <div className="text-sm">{ev.message}</div>}
                                {(ev.batchRows || ev.totalRows) && (
                                  <div className="text-xs text-muted-foreground">Batch: {ev.batchRows || 0} • Total: {ev.totalRows || 0}</div>
                                )}
                              </motion.div>
                            ))
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                </div>

                <aside className="space-y-6">
                  <motion.div initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3 }}>
                    <Card className="bg-white text-slate-900 shadow">
                      <CardHeader>
                        <CardTitle className="text-2xl text-[#29a8e0]">Filters & Quick Actions</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <Button onClick={() => router.push('/reports')} variant="ghost" className="flex items-center gap-2 text-[#29a8e0]"><svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 12h18" strokeLinecap="round" strokeLinejoin="round"/></svg>View Reports</Button>
                        <Button onClick={() => router.push('/files')} variant="ghost" className="flex items-center gap-2 text-[#29a8e0]"><svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 7h18M3 12h18M3 17h18" strokeLinecap="round" strokeLinejoin="round"/></svg>Browse Files</Button>
                        <Button onClick={() => router.push('/master')} variant="ghost" className="flex items-center gap-2 text-[#29a8e0]"><svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 3v18" strokeLinecap="round" strokeLinejoin="round"/></svg>Download Master</Button>
                      </CardContent>
                    </Card>
                  </motion.div>

                  <motion.div initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.35, delay: 0.05 }}>
                    <Card className="bg-white text-slate-900 shadow">
                      <CardHeader>
                        <CardTitle className="text-2xl text-[#29a8e0]">Shortcuts</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ul className="text-sm space-y-2">
                          <li className="flex items-center gap-2"> <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-[#ecbc32]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" strokeLinecap="round" strokeLinejoin="round"/></svg> Upload CSVs → <Link href="/uploads" className="text-[#ecbc32]">Upload</Link></li>
                          <li className="flex items-center gap-2"> <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-[#29a8e0]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 12h18" strokeLinecap="round" strokeLinejoin="round"/></svg> Monitor queue → <Button variant="link" onClick={openSse} className="text-[#29a8e0]">Open SSE</Button></li>
                        </ul>
                      </CardContent>
                    </Card>
                  </motion.div>
                </aside>
              </div>
            </div>
          </div>
        </div>
      </div>
    </LoginLayout>
  )
}
