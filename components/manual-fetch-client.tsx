"use client";
import React, { useEffect, useRef, useState } from 'react';
import { fetchWithAuth, getAccessToken } from '@/utils/auth'
const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000'

export default function ManualFetchClient() {
  const [branches, setBranches] = useState<string[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [date, setDate] = useState<string>('');
  const [positions, setPositions] = useState<string>('1,2');
  // token will be acquired from login via `getAccessToken`
  const [messages, setMessages] = useState<Array<any>>([]);
  const esRef = useRef<EventSource | null>(null);

  useEffect(() => {
    // fetch available branches from backend
    (async () => {
      try {
        const res = await fetchWithAuth(`${API_BASE}/api/fetch/branches`, { method: 'GET' })
        if (!res.ok) return
        const data = await res.json()
        if (data && Array.isArray(data.branches)) setBranches(data.branches)
      } catch (e) {}
    })()
  }, []);

  const toggleSelectAll = (checked: boolean) => {
    setSelected(checked ? branches.slice() : []);
  };

  const handleStart = async () => {
    if (!date) {
      alert('Please pick a date');
      return;
    }

    const body: any = { date };
    if (selected && selected.length) body.branches = selected;
    if (positions && String(positions).trim()) body.positions = positions;

    // Use fetchWithAuth which attaches the stored token and attempts refresh if needed
    const resp = await fetchWithAuth(`${API_BASE}/api/fetch/manual`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const json = await resp.json();
    if (!resp.ok) {
      alert(json && json.message ? json.message : 'Failed to start fetch');
      return;
    }

    const jobId = json.jobId;
    setMessages((m) => [...m, { type: 'queued', message: 'Job queued', jobId }]);

    // open SSE connection for job updates; include token as query param if provided
    // Include current access token as SSE query param so backend can accept it via protectWithQueryToken
    const token = getAccessToken();
    const tokenQuery = token ? `&token=${encodeURIComponent(token.startsWith('Bearer ') ? token.replace(/^Bearer\s+/, '') : token)}` : '';
    const url = `${API_BASE}/api/fetch/status/stream?jobId=${encodeURIComponent(jobId)}${tokenQuery}`;
    if (esRef.current) {
      esRef.current.close();
      esRef.current = null;
    }

    const es = new EventSource(url);
    esRef.current = es;

    es.onmessage = (ev) => {
      try {
        const data = JSON.parse(ev.data);
        setMessages((m) => [...m, data]);
        if (data.type === 'complete' || data.type === 'error') {
          // close after completion or error
          try { es.close(); } catch (e) {}
        }
      } catch (e) {
        setMessages((m) => [...m, { type: 'message', raw: ev.data }]);
      }
    };

    es.onerror = (err) => {
      setMessages((m) => [...m, { type: 'sse-error', message: 'SSE error' }]);
      try { es.close(); } catch (e) {}
    };
  };

  const handleStop = () => {
    if (esRef.current) {
      esRef.current.close();
      esRef.current = null;
      setMessages((m) => [...m, { type: 'stopped', message: 'Stopped by user' }]);
    }
  };

  return (
    <div style={{ border: '1px solid #ddd', padding: 12, borderRadius: 6 }}>
      <h3>Manual Fetch</h3>
      <div style={{ marginBottom: 8 }}>
        <label>Date: </label>
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
      </div>

      <div style={{ marginBottom: 8 }}>
        <label>Branches: </label>
        <div>
          <label style={{ marginRight: 8 }}>
            <input type="checkbox" onChange={(e) => toggleSelectAll(e.target.checked)} /> Select All
          </label>
        </div>
        <select multiple size={6} style={{ width: '100%' }} value={selected} onChange={(e) => setSelected(Array.from(e.target.selectedOptions).map((o) => o.value))}>
          {branches.map((b) => (
            <option key={b} value={b}>
              {b}
            </option>
          ))}
        </select>
      </div>

      <div style={{ marginBottom: 8 }}>
        <label>Positions (comma separated): </label>
        <input value={positions} onChange={(e) => setPositions(e.target.value)} placeholder="1,2" />
      </div>

      {/* token input removed — token is taken from login state automatically */}

      <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
        <button onClick={handleStart}>Start Manual Fetch</button>
        <button onClick={handleStop}>Stop Stream</button>
      </div>

      <div style={{ maxHeight: 300, overflow: 'auto', background: '#111', color: '#fff', padding: 8 }}>
        {messages.map((m, i) => (
          <pre key={i} style={{ whiteSpace: 'pre-wrap', margin: 0 }}>
            {JSON.stringify(m, null, 2)}
          </pre>
        ))}
      </div>
    </div>
  );
}
