import { useEffect, useRef, useCallback } from 'react'

export function useSSE(url: string | null, onEvent: (ev: MessageEvent) => void) {
  const esRef = useRef<EventSource | null>(null)
  const onEventRef = useRef(onEvent)
  onEventRef.current = onEvent

  const close = useCallback(() => {
    if (esRef.current) {
      esRef.current.close()
      esRef.current = null
    }
  }, [])

  useEffect(() => {
    if (!url) return
    close()
    const es = new EventSource(url)
    es.onmessage = (ev) => onEventRef.current(ev)
    es.onerror = () => {
      es.close()
      esRef.current = null
    }
    esRef.current = es
    return () => {
      es.close()
      esRef.current = null
    }
  }, [url, close])

  return { close }
}
