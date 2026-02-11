import { useState, useCallback } from 'react'
import { useSSE } from './use-sse'
import { getAccessToken } from '@/utils/auth'

export type JobEvent = {
  type: string
  message?: string
  batchRows?: number
  totalRows?: number
  progress?: number
  error?: string
  timestamp?: string
}

export type JobStatusState = {
  status: 'idle' | 'running' | 'completed' | 'error'
  progress: number
  events: JobEvent[]
  jobId: string
}

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000'

export function useJobStatus() {
  const [state, setState] = useState<JobStatusState>({
    status: 'idle',
    progress: 0,
    events: [],
    jobId: '',
  })

  const sseUrl = state.status === 'running' && state.jobId
    ? `${API_BASE}/api/fetch/status/stream?jobId=${encodeURIComponent(state.jobId)}${getAccessToken() ? `&token=${encodeURIComponent(getAccessToken()!)}` : ''}`
    : null

  const handleEvent = useCallback((ev: MessageEvent) => {
    try {
      const data: JobEvent = JSON.parse(ev.data)
      setState(prev => {
        const events = [data, ...prev.events].slice(0, 200)
        const progress = data.progress ?? prev.progress
        if (data.type === 'complete') {
          return { ...prev, events, progress: 100, status: 'completed' }
        }
        if (data.type === 'error') {
          return { ...prev, events, status: 'error' }
        }
        return { ...prev, events, progress }
      })
    } catch {
      setState(prev => ({
        ...prev,
        events: [{ type: 'message', message: ev.data }, ...prev.events].slice(0, 200),
      }))
    }
  }, [])

  useSSE(sseUrl, handleEvent)

  const startJob = useCallback((jobId: string) => {
    setState({
      status: 'running',
      progress: 0,
      events: [],
      jobId,
    })
  }, [])

  const reset = useCallback(() => {
    setState({ status: 'idle', progress: 0, events: [], jobId: '' })
  }, [])

  return { ...state, startJob, reset }
}
