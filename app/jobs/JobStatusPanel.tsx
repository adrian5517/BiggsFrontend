"use client";
import React, { useCallback, useEffect, useState } from 'react';
import { useSSE } from '../../hooks/use-sse';

export default function JobStatusPanel({ jobId }: { jobId: string }) {
  const [events, setEvents] = useState<Array<{ t: string; d: string }>>([]);
  const [progress, setProgress] = useState<number>(0);
  const [status, setStatus] = useState<string>('pending');

  const onMessage = useCallback((ev: MessageEvent) => {
    try {
      const data = JSON.parse(ev.data);
      // expected { type: 'progress'|'log'|'done', pct?, message }
      if (data.type === 'progress' && typeof data.pct === 'number') {
        setProgress(data.pct);
        setStatus('running');
      }
      if (data.type === 'log') {
        setEvents((s) => [{ t: new Date().toISOString(), d: data.message }, ...s].slice(0, 200));
      }
      if (data.type === 'done') {
        setProgress(100);
        setStatus('done');
        setEvents((s) => [{ t: new Date().toISOString(), d: 'Job completed' }, ...s]);
      }
    } catch (err) {
      setEvents((s) => [{ t: new Date().toISOString(), d: ev.data }, ...s]);
    }
  }, []);

  useSSE(jobId ? `/api/fetch/status/stream?jobId=${jobId}` : null, onMessage, (e) => setEvents((s) => [{ t: new Date().toISOString(), d: 'SSE error' }, ...s]));

  useEffect(() => {
    // initial fetch for last-known status
    async function init() {
      try {
        const res = await fetch(`/api/jobs/${jobId}/status`);
        if (!res.ok) return;
        const j = await res.json();
        setStatus(j.status || 'pending');
        setProgress(j.progress || 0);
      } catch (e) {
        // ignore
      }
    }
    init();
  }, [jobId]);

  return (
    <div className="p-4 bg-white dark:bg-slate-800 rounded shadow">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h2 className="text-lg font-semibold">Job {jobId}</h2>
          <div className="text-sm text-slate-500">Status: {status} • {progress}%</div>
        </div>
        <div className="flex gap-2">
          <a href={`/api/master/download?jobId=${jobId}`} className="px-3 py-2 bg-green-600 text-white rounded">Download CSV</a>
        </div>
      </div>

      <div className="mb-3">
        <div className="h-2 bg-slate-200 rounded overflow-hidden">
          <div style={{ width: `${progress}%` }} className="h-2 bg-sky-600"></div>
        </div>
      </div>

      <div className="max-h-64 overflow-auto text-sm">
        {events.length === 0 ? <div className="text-slate-500">No events yet.</div> : (
          <ul className="space-y-2">
            {events.map((ev, i) => (
              <li key={i} className="text-xs text-slate-700 dark:text-slate-300"><span className="text-slate-400 mr-2">{ev.t}</span>{ev.d}</li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
