"use client";

import { useState, useRef, useEffect } from "react";
import { fetchWithAuth, getAccessToken } from "@/utils/auth";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5000";

/* ─────────────────────────── CSS ─────────────────────────── */
const css = `
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700;800&family=DM+Sans:wght@300;400;500;600;700&family=DM+Mono:wght@400;500&display=swap');

.cmb-root *,
.cmb-root *::before,
.cmb-root *::after { box-sizing: border-box; margin: 0; padding: 0; }

.cmb-root {
  --navy:       #0f1f3d;
  --navy-mid:   #162848;
  --navy-light: #1e3560;
  --red:        #c0272d;
  --red-light:  #d63d43;
  --red-muted:  rgba(192,39,45,0.09);
  --gold:       #e8a820;
  --gold-light: #f0bc44;
  --gold-muted: rgba(232,168,32,0.1);
  --teal:       #14b8a6;
  --sky:        #4db6e8;
  --teal-muted: rgba(20,184,166,0.1);

  --bg:         #f5f6f8;
  --surface:    #ffffff;
  --surface-2:  #f9fafb;
  --surface-3:  #f2f4f7;
  --border:     rgba(15,31,61,0.08);
  --border-md:  rgba(15,31,61,0.13);

  --text-primary:   #0f1f3d;
  --text-secondary: #374a6b;
  --text-muted:     #6d7f9e;
  --text-faint:     #a3adc0;

  --console-bg: #0b1628;
  --console-text: #c8d4e8;

  --radius-sm:  8px;
  --radius:     12px;
  --radius-lg:  16px;
  --font-ui:    'Poppins', sans-serif;
  --font-mono:  'DM Mono', monospace;
  --t:          220ms cubic-bezier(0.4,0,0.2,1);

  --shadow-sm:  0 2px 6px rgba(15,31,61,0.07), 0 1px 2px rgba(15,31,61,0.05);
  --shadow-md:  0 4px 16px rgba(15,31,61,0.08), 0 1px 4px rgba(15,31,61,0.06);

  font-family: var(--font-ui);
  color: var(--text-primary);
}

.cmb-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-md);
  overflow: hidden;
  animation: cmb-fade-up 0.35s ease both;
}

@keyframes cmb-fade-up {
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
}

.cmb-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 18px 22px;
  background: var(--sky);
  position: relative;
  overflow: hidden;
}

.cmb-header::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, rgba(255,255,255,0.04) 0%, transparent 60%);
  pointer-events: none;
}

.cmb-header-stripe {
  position: absolute;
  bottom: 0; left: 0; right: 0;
  height: 3px;
  background: linear-gradient(90deg, var(--teal) 0%, var(--gold) 50%, var(--red) 100%);
}

.cmb-header-left { display: flex; align-items: center; gap: 14px; position: relative; z-index: 1; }

.cmb-icon-wrap {
  width: 38px; height: 38px;
  border-radius: 10px;
  display: flex; align-items: center; justify-content: center;
  background: rgba(20,184,166,0.2);
  border: 1px solid rgba(20,184,166,0.4);
  font-size: 18px;
  flex-shrink: 0;
}

.cmb-title {
  font-family: 'Poppins', sans-serif;
  font-size: 17px;
  font-weight: 700;
  color: #fff;
  line-height: 1.2;
  letter-spacing: 0.01em;
}

.cmb-subtitle {
  font-size: 11px;
  color: rgba(255,255,255,0.45);
  font-weight: 400;
  margin-top: 1px;
  letter-spacing: 0.02em;
}

.cmb-header-right {
  display: flex; align-items: center; gap: 8px;
  position: relative; z-index: 1;
}

.cmb-live {
  display: inline-flex; align-items: center; gap: 6px;
  font-family: var(--font-mono);
  font-size: 10px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  padding: 4px 10px;
  border-radius: 20px;
  color: #22c55e;
  background: rgba(34,197,94,0.1);
  border: 1px solid rgba(34,197,94,0.25);
}

.cmb-live-dot {
  width: 5px; height: 5px;
  border-radius: 50%;
  background: #22c55e;
  animation: cmb-pulse 1.4s ease-in-out infinite;
}

@keyframes cmb-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}

.cmb-body { padding: 22px; }

.cmb-form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  margin-bottom: 20px;
}

.cmb-field {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.cmb-label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--text-muted);
}

.cmb-label-icon { width: 12px; height: 12px; display: flex; }

.cmb-input,
.cmb-select {
  padding: 10px 12px;
  border: 1px solid var(--border-md);
  border-radius: var(--radius-sm);
  background: var(--surface);
  font-family: var(--font-ui);
  font-size: 13px;
  color: var(--text-primary);
  transition: all var(--t);
}

.cmb-input:hover,
.cmb-select:hover {
  border-color: rgba(15,31,61,0.2);
}

.cmb-input:focus,
.cmb-select:focus {
  outline: none;
  border-color: var(--teal);
  box-shadow: 0 0 0 2px rgba(20,184,166,0.1);
}

.cmb-divider {
  border: none;
  border-top: 1px solid var(--border);
  margin: 20px 0;
}

.cmb-config-info {
  padding: 12px 14px;
  background: var(--teal-muted);
  border: 1px solid rgba(20,184,166,0.2);
  border-radius: var(--radius-sm);
  margin-bottom: 20px;
}

.cmb-config-info p {
  margin: 0;
  font-size: 12px;
  color: var(--text-secondary);
  line-height: 1.5;
}

.cmb-actions {
  display: flex;
  gap: 12px;
  margin-bottom: 20px;
}

.cmb-btn {
  padding: 11px 18px;
  border-radius: var(--radius-sm);
  border: 1px solid transparent;
  font-family: var(--font-ui);
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.02em;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: all var(--t);
  white-space: nowrap;
}

.cmb-btn-accent {
  background: var(--sky);
  color: #fff;
  border-color: var(--sky);
}

.cmb-btn-accent:hover:not(:disabled) {
  background: var(--sky);
  border-color: var(--teal-light);
  box-shadow: var(--shadow-sm);
}

.cmb-btn-accent:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.cmb-btn-ghost {
  background: transparent;
  color: var(--text-secondary);
  border-color: var(--border-md);
}

.cmb-btn-ghost:hover:not(:disabled) {
  background: var(--surface-3);
  color: var(--text-primary);
}

.cmb-console {
  margin-top: 20px;
  border-radius: var(--radius);
  overflow: hidden;
  border: 1px solid rgba(15,31,61,0.12);
  box-shadow: inset 0 2px 8px rgba(0,0,0,0.04);
}

.cmb-console-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 9px 14px;
  background: var(--navy);
}

.cmb-console-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-family: var(--font-mono);
  font-size: 10.5px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: rgba(255,255,255,0.45);
}

.cmb-console-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--text-faint);
}

.cmb-console-dot.live {
  background: #22c55e;
  animation: cmb-pulse 1.4s ease-in-out infinite;
}

.cmb-console-count {
  font-family: var(--font-mono);
  font-size: 10px;
  padding: 2px 8px;
  border-radius: 10px;
  background: rgba(255,255,255,0.07);
  color: rgba(255,255,255,0.4);
}

.cmb-console-body {
  background: #0b1628;
  height: 240px;
  overflow-y: auto;
  padding: 14px;
  scrollbar-width: thin;
  scrollbar-color: rgba(255,255,255,0.08) transparent;
}

.cmb-console-empty {
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: rgba(255,255,255,0.2);
  font-family: var(--font-mono);
  font-size: 12px;
}

.cmb-msg { margin-bottom: 12px; }

.cmb-msg-type {
  font-family: var(--font-mono);
  font-size: 10px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  margin-bottom: 5px;
  display: flex;
  align-items: center;
  gap: 6px;
}

.cmb-msg-type.t-queued   { color: #60c8ff; }
.cmb-msg-type.t-complete { color: #4ade80; }
.cmb-msg-type.t-error    { color: #f87171; }
.cmb-msg-type.t-stopped  { color: var(--gold-light, #f0bc44); }
.cmb-msg-type.t-message,
.cmb-msg-type.t-progress { color: #a5b4fc; }
.cmb-msg-type.t-default  { color: rgba(255,255,255,0.3); }

.cmb-msg-pre {
  font-family: var(--font-mono);
  font-size: 11.5px;
  color: #c8d4e8;
  white-space: pre-wrap;
  word-break: break-all;
  line-height: 1.65;
  background: rgba(255,255,255,0.025);
  border-left: 2px solid rgba(255,255,255,0.07);
  padding: 8px 12px;
  border-radius: 0 4px 4px 0;
}

.cmb-msg-hr {
  border: none;
  border-top: 1px solid rgba(255,255,255,0.04);
  margin: 10px 0;
}

/* ──── Progress Styles ──── */
@keyframes cmb-spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

@keyframes cmb-pulse-ring {
  0% { box-shadow: 0 0 0 0 rgba(20,184,166,0.7); }
  70% { box-shadow: 0 0 0 10px rgba(20,184,166,0); }
  100% { box-shadow: 0 0 0 0 rgba(20,184,166,0); }
}

@keyframes cmb-wave {
  0%, 100% { transform: scaleY(0.5); }
  50% { transform: scaleY(1); }
}

.cmb-progress-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 16px;
  margin-bottom: 16px;
  display: none;
}

.cmb-progress-card.active {
  display: block;
  animation: cmb-fade-up 0.35s ease both;
}

.cmb-progress-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
  gap: 10px;
}

.cmb-progress-title {
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--text-muted);
  display: flex;
  align-items: center;
  gap: 6px;
}

.cmb-spinner {
  width: 14px;
  height: 14px;
  border: 2px solid rgba(20,184,166,0.2);
  border-top-color: var(--teal);
  border-radius: 50%;
  animation: cmb-spin 0.8s linear infinite;
}

.cmb-progress-stats {
  display: flex;
  gap: 12px;
  font-size: 11px;
  color: var(--text-secondary);
}

.cmb-stat-item {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  background: var(--surface-3);
  border-radius: var(--radius-sm);
}

.cmb-stat-label {
  font-weight: 600;
  color: var(--text-muted);
}

.cmb-stat-value {
  color: var(--text-primary);
  font-weight: 700;
}

.cmb-progress-bar-wrapper {
  margin-bottom: 12px;
}

.cmb-progress-bar {
  width: 100%;
  height: 6px;
  background: var(--border-md);
  border-radius: 3px;
  overflow: hidden;
  position: relative;
}

.cmb-progress-bar-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--teal), #06d6a0);
  border-radius: 3px;
  transition: width 0.4s ease;
  position: relative;
}

.cmb-progress-bar-fill::after {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  bottom: 0;
  right: 0;
  background: linear-gradient(
    90deg,
    transparent,
    rgba(255,255,255,0.3),
    transparent
  );
  animation: cmb-shimmer 1.5s ease-in-out infinite;
}

@keyframes cmb-shimmer {
  0% { transform: translateX(-100%); }
  100% { transform: translateX(100%); }
}

.cmb-progress-text {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 6px;
  font-size: 10px;
}

.cmb-progress-label {
  color: var(--text-muted);
}

.cmb-progress-percent {
  font-weight: 700;
  color: var(--teal);
}

.cmb-current-file {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 10px;
  background: var(--surface-3);
  border-left: 3px solid var(--teal);
  border-radius: 0 var(--radius-sm) var(--radius-sm) 0;
  margin-top: 10px;
}

.cmb-current-file-icon {
  width: 14px;
  height: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--teal);
}

.cmb-current-file-text {
  flex: 1;
  font-size: 11px;
  color: var(--text-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.cmb-loader-bars {
  display: flex;
  align-items: flex-end;
  justify-content: center;
  height: 20px;
  gap: 3px;
}

.cmb-loader-bar {
  width: 3px;
  background: var(--teal);
  border-radius: 2px;
  animation: cmb-wave 0.8s ease-in-out infinite;
}

.cmb-loader-bar:nth-child(1) { animation-delay: 0s; }
.cmb-loader-bar:nth-child(2) { animation-delay: 0.1s; }
.cmb-loader-bar:nth-child(3) { animation-delay: 0.2s; }
.cmb-loader-bar:nth-child(4) { animation-delay: 0.3s; }
.cmb-loader-bar:nth-child(5) { animation-delay: 0.4s; }
`;



/* ─────────────────────────── Icons ─────────────────────────── */
const Ico = {
  Merge: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
      <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
      <path d="M18 8v-1"/>
      <path d="M18 16v-1"/><path d="M6 15v4"/><path d="M9 12h9"/>
    </svg>
  ),
  Folder: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="12" height="12">
      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
    </svg>
  ),
  File: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="12" height="12">
      <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><polyline points="13 2 13 9 20 9"/>
    </svg>
  ),
  Play: () => (
    <svg viewBox="0 0 24 24" fill="currentColor" width="13" height="13">
      <path d="M8 5v14l11-7z"/>
    </svg>
  ),
  Square: () => (
    <svg viewBox="0 0 24 24" fill="currentColor" width="11" height="11">
      <rect x="6" y="6" width="12" height="12" rx="1.5"/>
    </svg>
  ),
  Terminal: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="11" height="11">
      <polyline points="4 17 10 11 4 5"/><line x1="12" y1="19" x2="20" y2="19"/>
    </svg>
  ),
};

/* ─────────────────────────── Main Component ─────────────────────────── */
function ConsoleMessage({ m }: { m: any }) {
  const typeMap: Record<string, string> = {
    queued: "t-queued",
    progress: "t-message",
    complete: "t-complete",
    error: "t-error",
    stopped: "t-stopped",
    default: "t-default",
  };
  const cls = typeMap[m.type] || "t-default";
  return (
    <div className="cmb-msg">
      <div className={`cmb-msg-type ${cls}`}>{m.type}</div>
      {m.message && <pre className="cmb-msg-pre">{m.message}</pre>}
      {m.raw && <pre className="cmb-msg-pre">{m.raw}</pre>}
    </div>
  );
}

export default function CombineClient() {
  const [workdir, setWorkdir] = useState("latest");
  const [skipTypes, setSkipTypes] = useState<string[]>([]);
  const [forceRecombine, setForceRecombine] = useState(false);
  const [live, setLive] = useState(false);
  const [messages, setMessages] = useState<any[]>([]);
  const [filesProcessed, setFilesProcessed] = useState(0);
  const [filesTotal, setFilesTotal] = useState(0);
  const [currentFile, setCurrentFile] = useState("");
  const [estimatedTimeRemaining, setEstimatedTimeRemaining] = useState(0);
  const [totalInsertedRows, setTotalInsertedRows] = useState(0);
  const [skippedExistingFiles, setSkippedExistingFiles] = useState(0);
  const [skippedExistingRows, setSkippedExistingRows] = useState(0);
  const consoleRef = useRef<HTMLDivElement>(null);
  const esRef = useRef<EventSource | null>(null);

  // Extract progress info from messages
  useEffect(() => {
    let processed = 0;
    let total = 0;
    let current = "";
    let timeRemaining = 0;
    let inserted = 0;
    let skippedFiles = 0;
    let skippedRows = 0;

    for (const msg of messages) {
      if (msg.type === "progress" && msg.message) {
        const text = msg.message;
        
        // Look for patterns like "Processing file 3/10"
        const fileMatch = text.match(/file\s+(\d+)\/(\d+)/i);
        if (fileMatch) {
          processed = parseInt(fileMatch[1], 10);
          total = parseInt(fileMatch[2], 10);
        }

        // Look for current filename
        const nameMatch = text.match(/Processing|Merging\s+([^:]+)/i);
        if (nameMatch && nameMatch[1]) {
          current = nameMatch[1].trim();
        }

        // Get estimated time remaining
        if (msg.estimatedSecondsRemaining !== undefined) {
          timeRemaining = msg.estimatedSecondsRemaining;
        }
      }

      if (msg.type === "complete") {
        if (typeof msg.totalInserted === "number") inserted = msg.totalInserted;
        if (typeof msg.skippedExistingFiles === "number") skippedFiles = msg.skippedExistingFiles;
        if (typeof msg.skippedExistingRows === "number") skippedRows = msg.skippedExistingRows;
      }
    }

    setFilesProcessed(processed);
    setFilesTotal(total);
    setCurrentFile(current);
    setEstimatedTimeRemaining(timeRemaining);
    setTotalInsertedRows(inserted);
    setSkippedExistingFiles(skippedFiles);
    setSkippedExistingRows(skippedRows);
  }, [messages]);

  useEffect(() => {
    if (consoleRef.current) {
      consoleRef.current.scrollTop = consoleRef.current.scrollHeight;
    }
  }, [messages]);

  const handleStart = async () => {
    setMessages([]);
    setTotalInsertedRows(0);
    setSkippedExistingFiles(0);
    setSkippedExistingRows(0);
    setLive(true);

    try {
      const res = await fetchWithAuth(`${API_BASE}/api/fetch/combine/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workdir: workdir || "latest",
          ...(skipTypes.length > 0 && { skipTypes }),
          ...(forceRecombine && { forceRecombine }),
        }),
      });

      if (!res.ok) {
        setLive(false);
        setMessages(m => [...m, { type: "error", message: `HTTP ${res.status}: ${res.statusText}` }]);
        return;
      }

      const json = await res.json();
      setMessages(m => [...m, { type: "queued", message: `Job queued: ${json.jobId}` }]);

      const token = getAccessToken();
      const tq = token ? `&token=${encodeURIComponent(token.replace(/^Bearer\s+/, ""))}` : "";
      const url = `${API_BASE}/api/fetch/status/stream?jobId=${encodeURIComponent(json.jobId)}${tq}`;

      if (esRef.current) esRef.current.close();
      const es = new EventSource(url);
      esRef.current = es;

      es.onmessage = ev => {
        try {
          const d = JSON.parse(ev.data);
          setMessages(m => [...m, d]);
          if (d.type === "complete" || d.type === "error") {
            es.close();
            setLive(false);
          }
        } catch {
          setMessages(m => [...m, { type: "message", raw: ev.data }]);
        }
      };

      es.onerror = () => {
        setMessages(m => [...m, { type: "error", message: "SSE connection error" }]);
        es.close();
        setLive(false);
      };
    } catch (e) {
      setMessages(m => [...m, { type: "error", message: String(e) }]);
      setLive(false);
    }
  };

  const handleStop = () => {
    if (esRef.current) {
      esRef.current.close();
      esRef.current = null;
    }
    setMessages(m => [...m, { type: "stopped", message: "Stopped by user" }]);
    setLive(false);
  };

  return (
    <div className="cmb-root">
      <style>{css}</style>
      <div className="cmb-card">
        {/* Header */}
        <div className="cmb-header">
          <div className="cmb-header-left">
            <div className="cmb-icon-wrap"><Ico.Merge /></div>
            <div>
              <div className="cmb-title">Combine & Merge</div>
              <div className="cmb-subtitle">Merge multiple CSV files into master dataset</div>
            </div>
          </div>
          <div className="cmb-header-right">
            {live && (
              <span className="cmb-live">
                <span className="cmb-live-dot" /> Live
              </span>
            )}
          </div>
          <div className="cmb-header-stripe" />
        </div>

        {/* Body */}
        <div className="cmb-body">
          <div className="cmb-form-row">
            <div className="cmb-field">
              <label className="cmb-label">
                <span className="cmb-label-icon"><Ico.Folder /></span>
                Working Directory
              </label>
              <input
                className="cmb-input"
                type="text"
                placeholder="latest"
                value={workdir}
                onChange={e => setWorkdir(e.target.value)}
              />
            </div>
          </div>

          {/* Skip File Types
          <div style={{ marginBottom: "16px", paddingBottom: "16px", borderBottom: "1px solid var(--border)" }}>
            <label className="cmb-label" style={{ marginBottom: "10px", display: "block" }}>Skip File Types (optional)</label>
            <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
              {["rd5500", "rd1800", "discount", "rd5800", "rd5900", "blpr"].map(type => (
                <label key={type} style={{ display: "flex", alignItems: "center", gap: "6px", padding: "6px 10px", background: "var(--surface-3)", borderRadius: "var(--radius-sm)", cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={skipTypes.includes(type)}
                    onChange={e => {
                      if (e.target.checked) {
                        setSkipTypes([...skipTypes, type]);
                      } else {
                        setSkipTypes(skipTypes.filter(t => t !== type));
                      }
                    }}
                    style={{ cursor: "pointer" }}
                  />
                  <span style={{ fontSize: "11px", fontWeight: "600", color: "var(--text-secondary)" }}>{type}</span>
                </label>
              ))}
            </div>
          </div> */}

          {/* Combine options */}
          <div style={{ marginBottom: "16px", paddingBottom: "16px", borderBottom: "1px solid var(--border)" }}>
            <label style={{ display: "flex", alignItems: "center", gap: "8px", padding: "10px", background: "var(--surface-3)", borderRadius: "var(--radius-sm)", cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={forceRecombine}
                onChange={e => setForceRecombine(e.target.checked)}
                style={{ width: "18px", height: "18px", cursor: "pointer" }}
              />
              <span><strong>🔁 Force Recombine</strong> — Ignore "already-combined" skip checks and reprocess current files.</span>
            </label>
          </div>

          <div className="cmb-config-info">
            <p>
              📁 Scans all CSV files in <strong>{workdir || "latest"}</strong> and merges them into a single master dataset.
            </p>
          </div>

          {!live && skippedExistingFiles > 0 && (
            <div
              style={{
                marginBottom: "16px",
                padding: "10px 12px",
                borderRadius: "var(--radius-sm)",
                background: "rgba(232,168,32,0.12)",
                border: "1px solid rgba(232,168,32,0.35)",
                color: "var(--text-secondary)",
                fontSize: "12px",
                lineHeight: 1.5,
              }}
            >
              <strong>Skipped existing combined files:</strong> {skippedExistingFiles} file(s)
              {skippedExistingRows > 0 ? `, ${skippedExistingRows} row(s)` : ""}. If you need to regenerate outputs after refetch/cleanup,
              enable <strong>Force Recombine</strong> and run combine again.
            </div>
          )}

          <div className="cmb-actions">
            <button className="cmb-btn cmb-btn-accent" onClick={handleStart} disabled={live}>
              <Ico.Play /> {live ? "Running…" : "Start Combine"}
            </button>
            <button className="cmb-btn cmb-btn-ghost" onClick={handleStop}>
              <Ico.Square /> Stop
            </button>
          </div>

          {/* Progress Card */}
          {live && (filesProcessed > 0 || filesTotal > 0) && (
            <div className="cmb-progress-card active">
              <div className="cmb-progress-header">
                <span className="cmb-progress-title">
                  <div className="cmb-spinner" />
                  Processing Files
                </span>
                <div className="cmb-progress-stats">
                  <div className="cmb-stat-item">
                    <span className="cmb-stat-label">Files:</span>
                    <span className="cmb-stat-value">{filesProcessed}</span>
                    <span style={{ color: "var(--text-muted)" }}>/</span>
                    <span className="cmb-stat-value">{filesTotal}</span>
                  </div>
                  {estimatedTimeRemaining > 0 && (
                    <div className="cmb-stat-item" style={{ marginLeft: "auto" }}>
                      <span className="cmb-stat-label">⏱ ETA:</span>
                      <span className="cmb-stat-value">{estimatedTimeRemaining}s</span>
                    </div>
                  )}
                </div>
              </div>

              {filesTotal > 0 && (
                <>
                  <div className="cmb-progress-bar-wrapper">
                    <div className="cmb-progress-bar">
                      <div
                        className="cmb-progress-bar-fill"
                        style={{ width: `${(filesProcessed / filesTotal) * 100}%` }}
                      />
                    </div>
                    <div className="cmb-progress-text">
                      <span className="cmb-progress-label">
                        {filesProcessed} of {filesTotal} files combined
                      </span>
                      <span className="cmb-progress-percent">
                        {Math.round((filesProcessed / filesTotal) * 100)}%
                      </span>
                    </div>
                  </div>

                  {currentFile && (
                    <div className="cmb-current-file">
                      <div className="cmb-current-file-icon">
                        <Ico.File />
                      </div>
                      <div className="cmb-current-file-text" title={currentFile}>
                        {currentFile}
                      </div>
                      <div style={{ display: "flex", gap: "2px", marginLeft: "auto" }}>
                        {[...Array(5)].map((_, i) => (
                          <div
                            key={i}
                            className="cmb-loader-bar"
                            style={{ height: `${8 + i * 3}px` }}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {!live && (totalInsertedRows > 0 || skippedExistingFiles > 0 || skippedExistingRows > 0) && (
            <div className="cmb-progress-card" style={{ marginTop: "12px" }}>
              <div className="cmb-progress-header">
                <span className="cmb-progress-title">Combine Summary</span>
                <div className="cmb-progress-stats" style={{ gap: "12px", flexWrap: "wrap" }}>
                  <div className="cmb-stat-item">
                    <span className="cmb-stat-label">Inserted Rows:</span>
                    <span className="cmb-stat-value">{totalInsertedRows}</span>
                  </div>
                  <div className="cmb-stat-item">
                    <span className="cmb-stat-label">Skipped Files:</span>
                    <span className="cmb-stat-value">{skippedExistingFiles}</span>
                  </div>
                  <div className="cmb-stat-item">
                    <span className="cmb-stat-label">Skipped Rows:</span>
                    <span className="cmb-stat-value">{skippedExistingRows}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Console */}
          <div className="cmb-console">
            <div className="cmb-console-bar">
              <span className="cmb-console-title">
                <span className={`cmb-console-dot ${live ? "live" : ""}`} />
                <Ico.Terminal /> Output Stream
              </span>
              <span className="cmb-console-count">{messages.length} events</span>
            </div>
            <div className="cmb-console-body" ref={consoleRef}>
              {messages.length === 0
                ? <div className="cmb-console-empty"><Ico.Terminal /><span>Awaiting output…</span></div>
                : messages.map((m, i) => <ConsoleMessage key={i} m={m} />)
              }
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
