"use client";
import React, { useCallback, useEffect, useState } from 'react';
import { useSSE } from '../../hooks/use-sse';
import { fetchWithAuth } from '@/utils/auth';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000';

type JobEvent = { t: string; d: string; type: string };
type JobMeta = {
  status?: string;
  mode?: string | null;
  progress?: number;
  filesTotal?: number;
  filesCompleted?: number;
  rowsInserted?: number;
  errors?: string[];
  startedAt?: string | null;
  finishedAt?: string | null;
  updatedAt?: string | null;
};

function formatDateTime(value?: string | null, timeZone?: string) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  try {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
      timeZone: timeZone || 'Asia/Manila',
    }).format(d);
  } catch (_) {
    return d.toLocaleString();
  }
}

function statusStyles(status: string) {
  const s = String(status || '').toLowerCase();
  if (s.includes('fail') || s.includes('error')) return 'bg-red-100 text-red-700 border-red-200';
  if (s.includes('complete') || s.includes('done') || s.includes('success')) return 'bg-emerald-100 text-emerald-700 border-emerald-200';
  if (s.includes('run')) return 'bg-sky-100 text-sky-700 border-sky-200';
  return 'bg-amber-100 text-amber-700 border-amber-200';
}

export default function JobStatusPanel({ jobId }: { jobId: string }) {
  const [events, setEvents] = useState<JobEvent[]>([]);
  const [progress, setProgress] = useState<number>(0);
  const [status, setStatus] = useState<string>('pending');
  const [connected, setConnected] = useState<boolean>(false);
  const [meta, setMeta] = useState<JobMeta>({});
  const [timeZone, setTimeZone] = useState<string>('Asia/Manila');

  const storageKey = `jobs:status:${jobId}`;

  const pushEvent = useCallback((type: string, message: string) => {
    const text = String(message || '').trim();
    if (!text) return;
    setEvents((s) => [{ t: new Date().toISOString(), d: text, type }, ...s].slice(0, 300));
  }, []);

  const onMessage = useCallback((ev: MessageEvent) => {
    try {
      setConnected(true);
      const data = JSON.parse(ev.data);
      const type = String(data.type || 'message');
      const msg = String(data.message || data.error || '').trim();

      if (typeof data.progress === 'number') {
        setProgress(Math.max(0, Math.min(100, Number(data.progress))));
      } else if (typeof data.pct === 'number') {
        setProgress(Math.max(0, Math.min(100, Number(data.pct))));
      }

      if (typeof data.filesTotal === 'number' || typeof data.filesCompleted === 'number' || typeof data.totalInserted === 'number') {
        setMeta((prev) => ({
          ...prev,
          filesTotal: typeof data.filesTotal === 'number' ? Number(data.filesTotal) : prev.filesTotal,
          filesCompleted: typeof data.filesCompleted === 'number' ? Number(data.filesCompleted) : prev.filesCompleted,
          rowsInserted: typeof data.totalInserted === 'number' ? Number(data.totalInserted) : prev.rowsInserted,
        }));
      }

      if (type === 'queued') setStatus('queued');
      if (type === 'progress' || type === 'file-start' || type === 'file-complete') setStatus('running');
      if (type === 'complete') {
        setProgress(100);
        setStatus('complete');
      }
      if (type === 'error') {
        setStatus('failed');
      }

      if (msg) {
        pushEvent(type, msg);
      } else if (type !== 'heartbeat') {
        pushEvent(type, JSON.stringify(data));
      }
    } catch (err) {
      pushEvent('raw', ev.data);
    }
  }, [pushEvent]);

  useSSE(
    jobId ? `${API_BASE}/api/fetch/status/stream?jobId=${encodeURIComponent(jobId)}` : null,
    onMessage,
    () => {
      setConnected(false);
      pushEvent('error', 'Live stream disconnected');
    },
    {
      reconnect: true,
      maxReconnectDelayMs: 15000,
      onOpen: () => {
        setConnected(true);
        pushEvent('system', 'Live stream connected');
      },
    }
  );

  useEffect(() => {
    try {
      if (!jobId) return;
      const raw = sessionStorage.getItem(storageKey);
      if (!raw) return;
      const saved = JSON.parse(raw);
      if (typeof saved.progress === 'number') setProgress(saved.progress);
      if (typeof saved.status === 'string') setStatus(saved.status);
      if (saved.meta && typeof saved.meta === 'object') setMeta(saved.meta);
      if (Array.isArray(saved.events)) {
        setEvents(saved.events.slice(0, 300));
      }
    } catch (_) {
      // ignore malformed cache
    }
  }, [jobId, storageKey]);

  useEffect(() => {
    try {
      if (!jobId) return;
      sessionStorage.setItem(storageKey, JSON.stringify({
        progress,
        status,
        meta,
        events,
        savedAt: new Date().toISOString(),
      }));
      localStorage.setItem('jobs:lastViewedJobId', jobId);
    } catch (_) {
      // ignore storage errors
    }
  }, [jobId, progress, status, meta, events, storageKey]);

  useEffect(() => {
    async function loadTimezone() {
      try {
        const res = await fetchWithAuth(`${API_BASE}/api/admin/settings`);
        if (!res.ok) return;
        const data = await res.json().catch(() => null);
        const tz = String(data?.settings?.uiPreferences?.timezone || '').trim();
        if (tz) setTimeZone(tz);
      } catch (_) {
        // ignore settings fetch errors
      }
    }

    loadTimezone().catch(() => {});
  }, []);

  useEffect(() => {
    async function init() {
      try {
        const res = await fetch(`${API_BASE}/api/fetch/jobs/${encodeURIComponent(jobId)}/status`, { cache: 'no-store' });
        if (!res.ok) return;
        const j = await res.json();
        setStatus(j.status || 'pending');
        setProgress(j.progress || 0);
        setMeta(j || {});
        if (Array.isArray(j.errors) && j.errors.length) {
          setEvents((s) => {
            const seeded = j.errors.map((e: string) => ({ t: new Date().toISOString(), d: e, type: 'error' }));
            return [...seeded, ...s].slice(0, 300);
          });
        }
      } catch (e) {
        pushEvent('error', 'Unable to load initial job status');
      }
    }
    init();
  }, [jobId, pushEvent]);

  useEffect(() => {
    const refreshFromApi = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/fetch/jobs/${encodeURIComponent(jobId)}/status`, { cache: 'no-store' });
        if (!res.ok) return;
        const j = await res.json();
        if (j && typeof j === 'object') {
          if (typeof j.status === 'string') setStatus(j.status);
          if (typeof j.progress === 'number') setProgress(j.progress);
          setMeta((prev) => ({ ...prev, ...j }));
        }
      } catch (_) {
        // ignore
      }
    };

    const onFocus = () => {
      refreshFromApi().catch(() => {});
    };
    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        refreshFromApi().catch(() => {});
      }
    };

    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [jobId]);

  const filesTotal = Number(meta.filesTotal || 0);
  const filesCompleted = Number(meta.filesCompleted || 0);
  const rowsInserted = Number(meta.rowsInserted || 0);

  return (
    <div className="space-y-4">
      <div className="rounded-lg border bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Job Monitor</h2>
            <div className="text-xs text-slate-500 mt-1">Job ID: {jobId}</div>
            <div className="text-xs text-slate-500">Mode: {meta.mode || '—'}</div>
          </div>
          <div className="flex items-center gap-2">
            <span className={`px-2 py-1 text-xs rounded border ${statusStyles(status)}`}>{String(status || 'pending').toUpperCase()}</span>
            <span className={`px-2 py-1 text-xs rounded border ${connected ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-600 border-slate-200'}`}>
              {connected ? 'LIVE' : 'OFFLINE'}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-4 text-xs">
          <div className="rounded border bg-slate-50 p-2">
            <div className="text-slate-500">Progress</div>
            <div className="font-semibold text-slate-800">{progress}%</div>
          </div>
          <div className="rounded border bg-slate-50 p-2">
            <div className="text-slate-500">Files</div>
            <div className="font-semibold text-slate-800">{filesCompleted}/{filesTotal}</div>
          </div>
          <div className="rounded border bg-slate-50 p-2">
            <div className="text-slate-500">Rows Inserted</div>
            <div className="font-semibold text-slate-800">{rowsInserted.toLocaleString()}</div>
          </div>
          <div className="rounded border bg-slate-50 p-2">
            <div className="text-slate-500">Updated</div>
            <div className="font-semibold text-slate-800">{formatDateTime(meta.updatedAt, timeZone)}</div>
          </div>
        </div>

        <div className="mt-4">
          <div className="h-2 bg-slate-200 rounded overflow-hidden">
            <div style={{ width: `${progress}%` }} className="h-2 bg-sky-600 transition-all"></div>
          </div>
        </div>
      </div>

      <div className="rounded-lg border bg-white shadow-sm">
        <div className="px-4 py-3 border-b flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-800">Event Timeline</h3>
          <span className="text-xs text-slate-500">Latest {events.length} events</span>
        </div>
        <div className="max-h-96 overflow-auto p-3">
          {events.length === 0 ? (
            <div className="text-sm text-slate-500">Waiting for job events...</div>
          ) : (
            <ul className="space-y-2">
              {events.map((ev, i) => (
                <li key={`${ev.t}-${i}`} className="text-xs border rounded p-2 bg-slate-50">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="uppercase tracking-wide text-[10px] text-slate-600">{ev.type}</span>
                    <span className="text-[10px] text-slate-400">{formatDateTime(ev.t, timeZone)}</span>
                  </div>
                  <div className="text-slate-700 break-words">{ev.d}</div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
