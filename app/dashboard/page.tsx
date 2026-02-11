"use client"

import React, { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'

import auth, { fetchWithAuth, getAccessToken } from '@/utils/auth'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import LoginLayout from '@/components/login-layout'
import GeometricDecorations from '@/components/geometric-decorations'

type FetchEvent = {
  type: string
  jobId?: string
  message?: string
  fileUrl?: string
  batchRows?: number
  totalRows?: number
  filesCompleted?: number
  filesTotal?: number
}

type ReportItem = {
  _id: string
  branch?: string
  pos?: number
  workDate?: string
  sourceFile?: string
  data?: Record<string, unknown>
}

const DEFAULT_BRANCHES = 'AYALA-FRN, BETA, B-CPOL, B-SMS, BIA, BMC, BRLN, BPAG, BGRAN, BTAB, CAMALIG, CNTRO, DAET, DAR, EME, GOA, IRIGA, MAGS, MAS, OLA, PACML, ROB-FRN, SANPILI, SIPOCOT, SMLGZ-FRN, SMLIP, SMNAG, ROXAS'
const BRANCH_OPTIONS = DEFAULT_BRANCHES.split(',').map((branch) => branch.trim()).filter(Boolean)

const formatDateInput = (date: Date) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const getDefaultDateRange = () => {
  const end = new Date()
  const start = new Date()
  return {
    startDate: formatDateInput(start),
    endDate: formatDateInput(end),
  }
}

export default function DashboardPage() {
  const router = useRouter()
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000'

  const defaultDates = getDefaultDateRange()
  const [startDate, setStartDate] = useState(defaultDates.startDate)
  const [endDate, setEndDate] = useState(defaultDates.endDate)
  const [selectedBranches, setSelectedBranches] = useState<string[]>(BRANCH_OPTIONS)
  const [selectedPositions, setSelectedPositions] = useState<string[]>(['1'])
  const [jobId, setJobId] = useState('')
  const [events, setEvents] = useState<FetchEvent[]>([])
  const [status, setStatus] = useState<'idle' | 'running' | 'completed' | 'error'>('idle')
  const [error, setError] = useState('')

  const [reportRows, setReportRows] = useState<ReportItem[]>([])
  const [reportTotal, setReportTotal] = useState(0)
  const [reportPage, setReportPage] = useState(1)
  const [reportPageSize, setReportPageSize] = useState(25)
  const [reportBranch, setReportBranch] = useState('')
  const [reportPos, setReportPos] = useState('')
  const [reportDate, setReportDate] = useState('')
  const [reportLoading, setReportLoading] = useState(false)
  const [reportError, setReportError] = useState('')

  const eventSourceRef = useRef<EventSource | null>(null)

  useEffect(() => {
    const token = auth.getAccessToken()
    if (!token) router.push('/')
  }, [router])

  useEffect(() => {
    loadReports(1)
  }, [])

  useEffect(() => {
    return () => {
      if (eventSourceRef.current) eventSourceRef.current.close()
    }
  }, [])

  const startFetch = async () => {
    setError('')
    setEvents([])
    setStatus('running')

    const payload = {
      start: startDate,
      end: endDate,
      branches: selectedBranches.join(', '),
      positions: selectedPositions.join(','),
    }

    try {
      const res = await fetchWithAuth(`${apiBaseUrl}/api/fetch/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (res.status === 401) {
        auth.clearAccessToken()
        router.push('/')
        return
      }

      const data = await res.json()
      if (!res.ok) {
        setError(data.message || 'Failed to start fetch job')
        setStatus('error')
        return
      }

      setJobId(data.jobId || '')
      connectToStream(data.jobId)
    } catch (err) {
      console.error('Fetch start error:', err)
      setError('Network error — try again')
      setStatus('error')
    }
  }

  const connectToStream = (id: string) => {
    if (!id) return
    if (eventSourceRef.current) eventSourceRef.current.close()

    const token = getAccessToken()
    const url = `${apiBaseUrl}/api/fetch/status/stream?jobId=${encodeURIComponent(id)}${token ? `&token=${encodeURIComponent(token)}` : ''}`
    const es = new EventSource(url)
    eventSourceRef.current = es

    es.onmessage = (event) => {
      try {
        const data: FetchEvent = JSON.parse(event.data)
        setEvents((prev) => [data, ...prev].slice(0, 150))
        if (data.type === 'complete') {
          setStatus('completed')
          es.close()
        }
        if (data.type === 'error') {
          setStatus('error')
        }
      } catch (e) {
        setEvents((prev) => [{ type: 'message', message: event.data }, ...prev].slice(0, 150))
      }
    }

    es.onerror = () => {
      setStatus('error')
      es.close()
    }
  }


  const loadReports = async (page = reportPage) => {
    setReportLoading(true)
    setReportError('')

    const params = new URLSearchParams()
    params.set('page', String(page))
    params.set('limit', String(reportPageSize))
    if (reportBranch.trim()) params.set('branch', reportBranch.trim())
    if (reportPos.trim()) params.set('pos', reportPos.trim())
    if (reportDate.trim()) params.set('date', reportDate.trim())

    try {
      const res = await fetchWithAuth(`${apiBaseUrl}/api/reports?${params.toString()}`, { method: 'GET' })
      if (res.status === 401) {
        auth.clearAccessToken()
        router.push('/')
        return
      }
      const data = await res.json()
      if (!res.ok) {
        setReportError(data.message || 'Failed to load reports')
        return
      }

      setReportRows(data.items || [])
      setReportTotal(data.total || 0)
      setReportPage(data.page || page)
    } catch (err) {
      console.error('Report load error:', err)
      setReportError('Network error — try again')
    } finally {
      setReportLoading(false)
    }
  }

  const totalPages = Math.max(1, Math.ceil(reportTotal / reportPageSize))
  const selectedBranchesLabel = selectedBranches.length === BRANCH_OPTIONS.length
    ? 'All branches'
    : `${selectedBranches.length} selected`
  const selectedPositionsLabel = selectedPositions.length
    ? `POS ${selectedPositions.join(', ')}`
    : 'Select POS'

  const summarizeRow = (row?: Record<string, unknown>) => {
    if (!row) return ''
    const entries = Object.entries(row).slice(0, 3)
    return entries
      .map(([key, value]) => `${key}: ${value == null ? '' : String(value)}`)
      .join(' | ')
  }

  return (
    <LoginLayout>
      <GeometricDecorations />
      <div className="relative z-10 min-h-screen px-4 py-10 sm:px-8">
        <div className="mx-auto w-full max-w-6xl space-y-6">
          <header className="rounded-2xl border border-amber-100 bg-gradient-to-br from-amber-50 via-white to-amber-100 p-6 shadow-xl animate-in fade-in slide-in-from-bottom-4">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">BIGGS OPS</p>
            <h1 className="mt-2 text-3xl font-bold text-foreground sm:text-4xl">Streaming POS Fetcher</h1>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              Trigger streaming ingestion jobs, watch progress in real time, and keep historical POS data flowing.
            </p>
          </header>

          <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
            <Card className="border-amber-100/60 shadow-lg">
              <CardHeader>
                <CardTitle>Fetch Controls</CardTitle>
                <CardDescription>Start a new job for a date range or provide direct file URLs.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="startDate">Start date</Label>
                    <Input id="startDate" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="endDate">End date</Label>
                    <Input id="endDate" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="branches">Branches</Label>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" className="w-full justify-between">
                          <span className="text-left">{selectedBranchesLabel}</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent className="max-h-72 w-64 overflow-auto">
                        <DropdownMenuLabel>Branches</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuCheckboxItem
                          checked={selectedBranches.length === BRANCH_OPTIONS.length}
                          onCheckedChange={(checked) => {
                            setSelectedBranches(checked ? BRANCH_OPTIONS : [])
                          }}
                        >
                          Select all
                        </DropdownMenuCheckboxItem>
                        <DropdownMenuSeparator />
                        {BRANCH_OPTIONS.map((branch) => (
                          <DropdownMenuCheckboxItem
                            key={branch}
                            checked={selectedBranches.includes(branch)}
                            onCheckedChange={(checked) => {
                              setSelectedBranches((prev) => {
                                if (checked) return [...prev, branch]
                                return prev.filter((item) => item !== branch)
                              })
                            }}
                          >
                            {branch}
                          </DropdownMenuCheckboxItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="positions">POS numbers</Label>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" className="w-full justify-between">
                          <span className="text-left">{selectedPositionsLabel}</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent className="w-48">
                        <DropdownMenuLabel>POS</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        {['1', '2'].map((pos) => (
                          <DropdownMenuCheckboxItem
                            key={pos}
                            checked={selectedPositions.includes(pos)}
                            onCheckedChange={(checked) => {
                              setSelectedPositions((prev) => {
                                if (checked) return [...prev, pos]
                                return prev.filter((item) => item !== pos)
                              })
                            }}
                          >
                            POS {pos}
                          </DropdownMenuCheckboxItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>

                {error && <p className="text-sm text-red-600">{error}</p>}

                <div className="flex flex-wrap items-center gap-3">
                  <Button
                    className="bg-accent text-accent-foreground hover:bg-yellow-500"
                    onClick={startFetch}
                    disabled={status === 'running'}
                  >
                    {status === 'running' ? 'Streaming...' : 'Start Fetch'}
                  </Button>
                  <div className="text-xs text-muted-foreground">
                    Job ID: <span className="font-mono text-foreground">{jobId || '—'}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-amber-100/60 shadow-lg">
              <CardHeader>
                <CardTitle>Live Progress</CardTitle>
                <CardDescription>Latest events from the streaming worker.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="rounded-xl border border-amber-100 bg-white/80 p-4 shadow-inner">
                  <div className="flex items-center justify-between text-xs uppercase tracking-[0.2em] text-muted-foreground">
                    <span>Status</span>
                    <span className="font-semibold text-foreground">{status}</span>
                  </div>
                  <div className="mt-4 max-h-[360px] space-y-3 overflow-auto pr-2">
                    {events.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No events yet. Start a job to see streaming updates.</p>
                    ) : (
                      events.map((event, index) => (
                        <div key={`${event.type}-${index}`} className="rounded-lg border border-amber-100/70 bg-white p-3">
                          <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">{event.type}</p>
                          {event.fileUrl && <p className="mt-1 break-all text-xs text-muted-foreground">{event.fileUrl}</p>}
                          {event.message && <p className="mt-1 text-sm text-foreground">{event.message}</p>}
                          {(event.batchRows || event.totalRows) && (
                            <p className="mt-2 text-sm text-foreground">
                              Batch: {event.batchRows || 0} rows • Total: {event.totalRows || 0} rows
                            </p>
                          )}
                          {(event.filesCompleted != null || event.filesTotal != null) && (
                            <p className="mt-1 text-xs text-muted-foreground">
                              Files: {event.filesCompleted || 0} / {event.filesTotal || 0}
                            </p>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="border-amber-100/60 shadow-lg">
            <CardHeader>
              <CardTitle>Fetched Data</CardTitle>
              <CardDescription>Browse stored rows with filters and pagination.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="reportBranch">Branch</Label>
                  <Input
                    id="reportBranch"
                    placeholder="BR1"
                    value={reportBranch}
                    onChange={(e) => setReportBranch(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reportPos">POS</Label>
                  <Input
                    id="reportPos"
                    placeholder="1"
                    value={reportPos}
                    onChange={(e) => setReportPos(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reportDate">Work date</Label>
                  <Input
                    id="reportDate"
                    type="date"
                    value={reportDate}
                    onChange={(e) => setReportDate(e.target.value)}
                  />
                </div>
              </div>

              {reportError && <p className="text-sm text-red-600">{reportError}</p>}

              <div className="flex flex-wrap items-center gap-3">
                <Button
                  className="bg-accent text-accent-foreground hover:bg-yellow-500"
                  onClick={() => loadReports(1)}
                  disabled={reportLoading}
                >
                  {reportLoading ? 'Loading...' : 'Load Data'}
                </Button>
                <div className="text-xs text-muted-foreground">
                  Total rows: <span className="font-mono text-foreground">{reportTotal}</span>
                </div>
              </div>

              <div className="overflow-hidden rounded-xl border border-amber-100">
                <div className="grid grid-cols-[140px_90px_140px_1fr] gap-2 bg-amber-50 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-amber-700">
                  <span>Branch</span>
                  <span>POS</span>
                  <span>Date</span>
                  <span>Row summary</span>
                </div>
                <div className="divide-y divide-amber-100 bg-white">
                  {reportRows.length === 0 ? (
                    <div className="px-4 py-6 text-sm text-muted-foreground">
                      No data yet. Run a fetch job and reload.
                    </div>
                  ) : (
                    reportRows.map((row) => (
                      <div key={row._id} className="grid grid-cols-[140px_90px_140px_1fr] gap-2 px-4 py-3 text-sm">
                        <span className="font-medium text-foreground">{row.branch || '-'}</span>
                        <span className="text-muted-foreground">{row.pos ?? '-'}</span>
                        <span className="text-muted-foreground">
                          {row.workDate ? new Date(row.workDate).toLocaleDateString() : '-'}
                        </span>
                        <span className="text-muted-foreground">
                          {summarizeRow(row.data) || 'No preview available'}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="text-xs text-muted-foreground">
                  Page {reportPage} of {totalPages}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    onClick={() => loadReports(Math.max(1, reportPage - 1))}
                    disabled={reportLoading || reportPage <= 1}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => loadReports(Math.min(totalPages, reportPage + 1))}
                    disabled={reportLoading || reportPage >= totalPages}
                  >
                    Next
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </LoginLayout>
  )
}
