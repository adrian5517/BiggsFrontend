'use client'

import React, { useEffect, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { DashboardShell } from '@/components/dashboard-shell'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  ArrowLeft,
  Download,
  Radio,
  CheckCircle2,
  AlertCircle,
  Clock,
  Loader2,
} from 'lucide-react'
import { useSSE } from '@/hooks/use-sse'
import { fetchWithAuth, getAccessToken } from '@/utils/auth'
import type { JobEvent } from '@/hooks/use-job-status'

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000'

type JobSummary = {
  jobId: string
  status: string
  progress: number
  branch?: string
  pos?: string | number
  date?: string
  createdAt?: string
}

export default function JobDetailPage() {
  const params = useParams()
  const jobId = params?.jobId as string

  const [summary, setSummary] = useState<JobSummary | null>(null)
  const [events, setEvents] = useState<JobEvent[]>([])
  const [loading, setLoading] = useState(true)

  // Fetch initial status
  useEffect(() => {
    if (!jobId) return
    const load = async () => {
      try {
        const res = await fetchWithAuth(`${API_BASE}/api/jobs/${jobId}/status`)
        if (res.ok) {
          const data = await res.json()
          setSummary(data)
        }
      } catch {
        // failed
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [jobId])

  // SSE for live updates
  const isActive = summary?.status === 'running' || summary?.status === 'processing'
  const token = getAccessToken()
  const sseUrl = isActive
    ? `${API_BASE}/api/fetch/status/stream?jobId=${encodeURIComponent(jobId)}${token ? `&token=${encodeURIComponent(token)}` : ''}`
    : null

  const handleEvent = useCallback((ev: MessageEvent) => {
    try {
      const data: JobEvent = JSON.parse(ev.data)
      setEvents(prev => [data, ...prev].slice(0, 200))
      if (data.progress != null) {
        setSummary(prev => prev ? { ...prev, progress: data.progress! } : prev)
      }
      if (data.type === 'complete') {
        setSummary(prev => prev ? { ...prev, status: 'completed', progress: 100 } : prev)
      }
      if (data.type === 'error') {
        setSummary(prev => prev ? { ...prev, status: 'error' } : prev)
      }
    } catch {
      setEvents(prev => [{ type: 'raw', message: ev.data }, ...prev].slice(0, 200))
    }
  }, [])

  useSSE(sseUrl, handleEvent)

  const statusIcon = (status?: string) => {
    switch (status) {
      case 'completed': return <CheckCircle2 className="h-4 w-4 text-green-500" />
      case 'error':
      case 'failed': return <AlertCircle className="h-4 w-4 text-destructive" />
      case 'running':
      case 'processing': return <Loader2 className="h-4 w-4 animate-spin text-primary" />
      default: return <Clock className="h-4 w-4 text-muted-foreground" />
    }
  }

  const eventTypeColor = (type: string) => {
    switch (type) {
      case 'complete': return 'text-green-500'
      case 'error': return 'text-destructive'
      case 'progress': return 'text-primary'
      default: return 'text-accent'
    }
  }

  if (loading) {
    return (
      <DashboardShell title="Job Details">
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </DashboardShell>
    )
  }

  return (
    <DashboardShell title="Job Details">
      <div className="mb-4">
        <Link href="/dashboard" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Dashboard
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Job info */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Job Info</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <div>
                <p className="text-xs text-muted-foreground">Job ID</p>
                <code className="font-mono text-sm text-foreground">{jobId}</code>
              </div>
              <div className="flex items-center gap-2">
                <p className="text-xs text-muted-foreground">Status</p>
                {statusIcon(summary?.status)}
                <Badge variant={summary?.status === 'completed' ? 'default' : summary?.status === 'error' ? 'destructive' : 'secondary'}>
                  {summary?.status || 'unknown'}
                </Badge>
              </div>
              {summary?.branch && (
                <div>
                  <p className="text-xs text-muted-foreground">Branch</p>
                  <p className="text-sm text-foreground">{summary.branch}</p>
                </div>
              )}
              {summary?.pos != null && (
                <div>
                  <p className="text-xs text-muted-foreground">POS</p>
                  <p className="text-sm text-foreground">{summary.pos}</p>
                </div>
              )}
              {summary?.createdAt && (
                <div>
                  <p className="text-xs text-muted-foreground">Created</p>
                  <p className="text-sm text-foreground">{new Date(summary.createdAt).toLocaleString()}</p>
                </div>
              )}

              {/* Progress */}
              <div className="mt-2">
                <div className="mb-1 flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">Progress</p>
                  <p className="text-xs font-medium text-foreground">{summary?.progress ?? 0}%</p>
                </div>
                <Progress value={summary?.progress ?? 0} className="h-2" />
              </div>

              {summary?.status === 'completed' && (
                <Button asChild className="mt-2">
                  <a href={`${API_BASE}/api/master/download?jobId=${jobId}`} download>
                    <Download className="h-4 w-4" />
                    Download Masterfile
                  </a>
                </Button>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Event log */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Radio className={`h-4 w-4 ${isActive ? 'text-green-500 animate-pulse' : 'text-muted-foreground'}`} />
                Event Log
                {isActive && <span className="text-xs font-normal text-muted-foreground">(live)</span>}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="max-h-[500px] overflow-y-auto">
                {events.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                    <Radio className="mb-2 h-8 w-8 opacity-30" />
                    <p className="text-sm">No events recorded</p>
                    {isActive && <p className="text-xs">Waiting for stream data...</p>}
                  </div>
                ) : (
                  <div className="flex flex-col gap-1.5">
                    {events.map((ev, i) => (
                      <div key={i} className="flex items-start gap-2 rounded-md border border-border bg-muted/30 px-3 py-2">
                        <span className={`mt-0.5 font-mono text-[10px] font-semibold uppercase ${eventTypeColor(ev.type)}`}>
                          {ev.type}
                        </span>
                        <div className="flex-1 min-w-0">
                          {ev.message && <p className="text-xs text-foreground">{ev.message}</p>}
                          {(ev.batchRows != null || ev.totalRows != null) && (
                            <p className="text-[10px] text-muted-foreground">
                              Batch: {ev.batchRows ?? 0} / Total: {ev.totalRows ?? 0}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardShell>
  )
}
