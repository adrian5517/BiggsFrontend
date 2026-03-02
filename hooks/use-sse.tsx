import { useEffect, useRef } from 'react';

type UseSSEOptions = {
  reconnect?: boolean;
  maxReconnectDelayMs?: number;
  onOpen?: () => void;
};

export function useSSE(
  url: string | null,
  onMessage: (ev: MessageEvent) => void,
  onError?: (err?: any) => void,
  options?: UseSSEOptions
) {
  const esRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (!url) return;

    const reconnect = options?.reconnect !== false;
    const maxDelay = Math.max(1000, Number(options?.maxReconnectDelayMs || 30000));

    let disposed = false;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let attempts = 0;

    const clearReconnectTimer = () => {
      if (!reconnectTimer) return;
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    };

    const closeCurrent = () => {
      if (!esRef.current) return;
      try { esRef.current.close(); } catch (_) {}
      esRef.current = null;
    };

    const scheduleReconnect = () => {
      if (!reconnect || disposed) return;
      clearReconnectTimer();
      const delay = Math.min(maxDelay, 1000 * Math.pow(2, Math.min(attempts, 5)));
      reconnectTimer = setTimeout(() => {
        if (disposed) return;
        connect();
      }, delay);
    };

    const connect = () => {
      if (disposed) return;

      closeCurrent();
      const es = new EventSource(url);
      esRef.current = es;

      es.onopen = () => {
        attempts = 0;
        if (options?.onOpen) options.onOpen();
      };

      es.onmessage = onMessage;

      es.onerror = (e) => {
        if (onError) onError(e);
        attempts += 1;
        closeCurrent();
        scheduleReconnect();
      };
    };

    connect();

    return () => {
      disposed = true;
      clearReconnectTimer();
      closeCurrent();
    };
  }, [url, onMessage, onError, options?.reconnect, options?.maxReconnectDelayMs, options?.onOpen]);
}
