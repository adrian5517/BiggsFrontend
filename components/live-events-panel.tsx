'use client'

import React, { useState, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Radio, Pause, Trash2 } from 'lucide-react'
import { useSSE } from '@/hooks/use-sse'
import { getAccessToken } from '@/utils/auth'
import type { JobEvent } from '@/hooks/use-job-status'

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000'

export function LiveEventsPanel() {
  const [events, setEvents] = useState<JobEvent[]>([])
  const [listening, setListening] = useState(false)

  const token = getAccessToken()
  const url = listening
    ? `${API_BASE}/api/queue/events?queue=importQueue${token ? `&token=${encodeURIComponent(token)}` : ''}`
    : null

  const handleEvent = useCallback((ev: MessageEvent) => {
    try {
      const data = JSON.parse(ev.data)
      setEvents(prev => [data, ...prev].slice(0, 100))
    } catch {
      setEvents(prev => [{ type: 'raw', message: ev.data }, ...prev].slice(0, 100))
    }
  }, [])

  useSSE(url, handleEvent)

  const eventTypeColor = (type: string) => {
    switch (type) {
      case 'complete': return 'text-green-500'
      case 'error': return 'text-destructive'
      case 'progress': return 'text-primary'
      default: return 'text-accent'
    }
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Radio className={`h-4 w-4 ${listening ? 'text-green-500 animate-pulse' : 'text-muted-foreground'}`} />
            Live Events
          </CardTitle>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setListening(!listening)}
              className="h-7 text-xs"
            >
              {listening ? <Pause className="h-3 w-3" /> : <Radio className="h-3 w-3" />}
              {listening ? 'Stop' : 'Listen'}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setEvents([])}
              className="h-7 text-xs"
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="max-h-72 overflow-y-auto">
          {events.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <Radio className="mb-2 h-8 w-8 opacity-30" />
              <p className="text-sm">No events yet</p>
              <p className="text-xs">{listening ? 'Waiting for events...' : 'Click Listen to start'}</p>
            </div>
          ) : (
            <div className="flex flex-col gap-1.5">
              {events.map((ev, i) => (
                <div key={i} className="flex items-start gap-2 rounded-md border border-border bg-muted/30 px-3 py-2">
                  <span className={`mt-0.5 font-mono text-[10px] font-semibold uppercase ${eventTypeColor(ev.type)}`}>
                    {ev.type}
                  </span>
                  <div className="flex-1 min-w-0">
                    {ev.message && <p className="truncate text-xs text-foreground">{ev.message}</p>}
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
  )
}
