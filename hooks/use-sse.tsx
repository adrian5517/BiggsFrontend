import { useEffect, useRef } from 'react';

export function useSSE(url: string | null, onMessage: (ev: MessageEvent) => void, onError?: (err?: any) => void) {
  const esRef = useRef<EventSource | null>(null);
  useEffect(() => {
    if (!url) return;
    const es = new EventSource(url);
    es.onmessage = onMessage;
    es.onerror = (e) => {
      if (onError) onError(e);
      try { es.close(); } catch (_) {}
    };
    esRef.current = es;
    return () => {
      try { es.close(); } catch (_) {}
    };
  }, [url, onMessage, onError]);
}
