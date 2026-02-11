'use client'

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2, Play, RotateCcw, Copy } from 'lucide-react'
import { fetchWithAuth } from '@/utils/auth'
import { useJobStatus } from '@/hooks/use-job-status'
import { Toast, showError } from '@/utils/swal'

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000'

export function DashboardQuickFetch() {
  const [branch, setBranch] = useState('')
  const [pos, setPos] = useState('')
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10))
  const job = useJobStatus()

  const handleStartFetch = async () => {
    const payload = {
      start: date,
      end: date,
      branches: branch || undefined,
      positions: pos || undefined,
    }
    try {
      const res = await fetchWithAuth(`${API_BASE}/api/fetch/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        showError('Fetch Failed', 'Could not start the fetch job.')
        return
      }
      const data = await res.json()
      if (data.jobId) {
        job.startJob(data.jobId)
        Toast.fire({ icon: 'success', title: `Job started: ${data.jobId.slice(0, 8)}...` })
      }
    } catch {
      showError('Network Error', 'Could not reach the server.')
    }
  }

  const copyJobId = () => {
    if (job.jobId) navigator.clipboard.writeText(job.jobId)
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Play className="h-4 w-4 text-primary" />
          Quick Fetch
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="branch" className="text-xs text-muted-foreground">Branch</Label>
            <Input
              id="branch"
              value={branch}
              onChange={(e) => setBranch(e.target.value)}
              placeholder="e.g. BETA"
              className="h-9"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="pos" className="text-xs text-muted-foreground">POS</Label>
            <Input
              id="pos"
              value={pos}
              onChange={(e) => setPos(e.target.value)}
              placeholder="1"
              className="h-9"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="date" className="text-xs text-muted-foreground">Date</Label>
            <Input
              id="date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="h-9"
            />
          </div>
        </div>

        <div className="mt-4 flex items-center gap-2">
          <Button
            onClick={handleStartFetch}
            disabled={job.status === 'running'}
            size="sm"
          >
            {job.status === 'running' ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Streaming...
              </>
            ) : (
              <>
                <Play className="h-4 w-4" />
                Start Fetch
              </>
            )}
          </Button>
          <Button variant="outline" size="sm" onClick={() => { setBranch(''); setPos(''); job.reset() }}>
            <RotateCcw className="h-3.5 w-3.5" />
            Reset
          </Button>

          {job.jobId && (
            <div className="ml-auto flex items-center gap-1.5 rounded-md bg-muted px-2.5 py-1">
              <span className="text-xs text-muted-foreground">Job:</span>
              <code className="font-mono text-xs text-foreground">{job.jobId.slice(0, 12)}...</code>
              <button onClick={copyJobId} className="text-muted-foreground hover:text-foreground" aria-label="Copy job ID">
                <Copy className="h-3 w-3" />
              </button>
            </div>
          )}
        </div>

        {/* Status indicator */}
        {job.status !== 'idle' && (
          <div className="mt-3 flex items-center gap-2">
            <div className={`h-2 w-2 rounded-full ${
              job.status === 'running' ? 'bg-primary animate-pulse' :
              job.status === 'completed' ? 'bg-green-500' : 'bg-destructive'
            }`} />
            <span className="text-xs capitalize text-muted-foreground">{job.status}</span>
            {job.status === 'running' && (
              <div className="ml-2 h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary transition-all duration-300"
                  style={{ width: `${job.progress}%` }}
                />
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
