"use client";
import React, { useEffect, useRef, useState } from 'react';
import { fetchWithAuth, getAccessToken } from '@/utils/auth';
const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000';

export default function MissingScanClient() {
  const [branches, setBranches] = useState<string[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [start, setStart] = useState<string>('');
  const [end, setEnd] = useState<string>('');
  const [positions, setPositions] = useState<string>('1,2');
  const [sampleFile, setSampleFile] = useState<string>('');
  const [autoQueue, setAutoQueue] = useState<boolean>(false);
  const [messages, setMessages] = useState<any[]>([]);
  const [scanResult, setScanResult] = useState<any>(null);
  const esRef = useRef<EventSource | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetchWithAuth(`${API_BASE}/api/fetch/branches`, { method: 'GET' });
        if (!res.ok) return;
        const data = await res.json();
        if (data && Array.isArray(data.branches)) setBranches(data.branches);
      } catch (e) {}
    })();
  }, []);

  const toggleSelectAll = (checked: boolean) => setSelected(checked ? branches.slice() : []);

  const handleStartScan = async () => {
    const body: any = {};
    if (selected && selected.length) body.branches = selected;
    if (positions) body.positions = positions;
    if (start) body.start = start;
    if (end) body.end = end;
    if (sampleFile) body.sampleFile = sampleFile;
    if (autoQueue) body.autoQueue = true;

    setMessages((m) => [...m, { type: 'scan-start', body }]);

    const resp = await fetchWithAuth(`${API_BASE}/api/fetch/missing/scan`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const json = await resp.json();
    if (!resp.ok) {
      setMessages((m) => [...m, { type: 'error', message: json && json.message ? json.message : 'Scan failed' }]);
      return;
    }

    setScanResult(json);
    setMessages((m) => [...m, { type: 'scan-result', json }]);

    // if queued, open SSE for jobId
    if (json.queued && json.jobId) {
      const token = getAccessToken();
      const tokenQuery = token ? `&token=${encodeURIComponent(token.startsWith('Bearer ') ? token.replace(/^Bearer\s+/, '') : token)}` : '';
      const url = `${API_BASE}/api/fetch/status/stream?jobId=${encodeURIComponent(json.jobId)}${tokenQuery}`;
      if (esRef.current) { esRef.current.close(); esRef.current = null; }
      const es = new EventSource(url);
      esRef.current = es;
      es.onmessage = (ev) => {
        try { const d = JSON.parse(ev.data); setMessages((m) => [...m, d]); if (d.type==='complete' || d.type==='error') { try{es.close()}catch(e){} } } catch(e){ setMessages((m)=>[...m,{type:'sse-raw',data:ev.data}]); }
      };
      es.onerror = () => { setMessages((m)=>[...m,{type:'sse-error'}]); try{es.close()}catch(e){} };
    }
  };

  const handleStop = () => { if (esRef.current) { esRef.current.close(); esRef.current = null; setMessages((m)=>[...m,{type:'stopped'}]); } };

  return (
    <div style={{ border: '1px solid #ddd', padding: 12, borderRadius: 6 }}>
      <h3>Missing Scan</h3>
      <div style={{ marginBottom: 8 }}>
        <label>Start: </label>
        <input type="date" value={start} onChange={(e) => setStart(e.target.value)} />
        <label style={{ marginLeft: 8 }}>End: </label>
        <input type="date" value={end} onChange={(e) => setEnd(e.target.value)} />
      </div>

      <div style={{ marginBottom: 8 }}>
        <label>Branches: </label>
        <div>
          <label style={{ marginRight: 8 }}>
            <input type="checkbox" onChange={(e) => toggleSelectAll(e.target.checked)} /> Select All
          </label>
        </div>
        <select multiple size={6} style={{ width: '100%' }} value={selected} onChange={(e) => setSelected(Array.from(e.target.selectedOptions).map((o) => o.value))}>
          {branches.map((b) => (<option key={b} value={b}>{b}</option>))}
        </select>
      </div>

      <div style={{ marginBottom: 8 }}>
        <label>Positions: </label>
        <input value={positions} onChange={(e) => setPositions(e.target.value)} placeholder="1,2" />
      </div>

      <div style={{ marginBottom: 8 }}>
        <label>Sample file (optional path): </label>
        <input value={sampleFile} onChange={(e) => setSampleFile(e.target.value)} placeholder="latest/BRANCH/2026-02-01/sample.csv" style={{ width: '100%' }} />
      </div>

      <div style={{ marginBottom: 8 }}>
        <label><input type="checkbox" checked={autoQueue} onChange={(e)=>setAutoQueue(e.target.checked)} /> Auto queue missing fetch</label>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
        <button onClick={handleStartScan}>Start Scan</button>
        <button onClick={handleStop}>Stop Stream</button>
      </div>

      <div style={{ display: 'flex', gap: 12 }}>
        <div style={{ flex: 1, maxHeight: 300, overflow: 'auto', background: '#111', color: '#fff', padding: 8 }}>
          <h4 style={{ marginTop: 0 }}>Messages</h4>
          {messages.map((m, i) => (<pre key={i} style={{ whiteSpace: 'pre-wrap', margin: 0 }}>{JSON.stringify(m, null, 2)}</pre>))}
        </div>
        <div style={{ flex: 1, maxHeight: 300, overflow: 'auto', background: '#fafafa', padding: 8 }}>
          <h4 style={{ marginTop: 0 }}>Scan Result</h4>
          <pre style={{ whiteSpace: 'pre-wrap' }}>{scanResult ? JSON.stringify(scanResult, null, 2) : 'No results yet'}</pre>
        </div>
      </div>
    </div>
  ); 
}
