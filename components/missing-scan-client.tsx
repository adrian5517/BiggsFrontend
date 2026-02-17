"use client";

import { useState, useRef, useEffect } from "react";
import { fetchWithAuth, getAccessToken } from "@/utils/auth";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5000";
const MOCK_BRANCHES = ["ATL-001", "CHI-002", "DAL-003", "HOU-004", "LAX-005", "NYC-006", "PHX-007", "SEA-008"];

/* ─────────────────────────── CSS ─────────────────────────── */
const css = `
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700;800&family=DM+Sans:wght@300;400;500;600;700&family=DM+Mono:wght@400;500&display=swap');

.msc-root *,
.msc-root *::before,
.msc-root *::after { box-sizing: border-box; margin: 0; padding: 0; }

.msc-root {
  --navy:       #0f1f3d;
  --navy-mid:   #162848;
  --navy-light: #1e3560;
  --red:        #c0272d;
  --red-light:  #d63d43;
  --red-muted:  rgba(192,39,45,0.09);
  --gold:       #e8a820;
  --gold-light: #f0bc44;
  --gold-muted: rgba(232,168,32,0.1);
  --sky:        #4db6e8;
  --sky-light:  #72caee;
  --sky-muted:  rgba(77,182,232,0.1);
  --sky-border: rgba(77,182,232,0.22);

  --surface:    #ffffff;
  --surface-2:  #f9fafb;
  --surface-3:  #f2f4f7;
  --border:     rgba(15,31,61,0.08);
  --border-md:  rgba(15,31,61,0.13);

  --text-primary:   #0f1f3d;
  --text-secondary: #374a6b;
  --text-muted:     #6d7f9e;
  --text-faint:     #a3adc0;

  --radius-sm:  8px;
  --radius:     12px;
  --radius-lg:  16px;
  --font-ui:    'DM Sans', sans-serif;
  --font-mono:  'DM Mono', monospace;
  --t:          220ms cubic-bezier(0.4,0,0.2,1);

  --shadow-md:  0 4px 16px rgba(15,31,61,0.08), 0 1px 4px rgba(15,31,61,0.06);

  font-family: var(--font-ui);
  color: var(--text-primary);
}

/* ── Card ── */
.msc-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-md);
  overflow: hidden;
  animation: msc-fade 0.35s ease both;
}

@keyframes msc-fade {
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
}

/* ── Header — uses sky/red palette for scan identity ── */
.msc-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 18px 22px;
  background: var(--navy);
  position: relative;
  overflow: hidden;
}
.msc-header::after {
  content: '';
  position: absolute; inset: 0;
  background: linear-gradient(135deg, rgba(77,182,232,0.06) 0%, transparent 55%);
  pointer-events: none;
}
.msc-header-stripe {
  position: absolute;
  bottom: 0; left: 0; right: 0;
  height: 3px;
  background: linear-gradient(90deg, var(--sky) 0%, var(--red) 55%, var(--gold) 100%);
}

.msc-header-left { display: flex; align-items: center; gap: 14px; position: relative; z-index: 1; }

.msc-icon-wrap {
  width: 38px; height: 38px;
  border-radius: 10px;
  display: flex; align-items: center; justify-content: center;
  background: rgba(77,182,232,0.14);
  border: 1px solid rgba(77,182,232,0.3);
  font-size: 17px; flex-shrink: 0;
}

.msc-title {
  font-family: 'Playfair Display', Georgia, serif;
  font-size: 17px; font-weight: 700;
  color: #fff; line-height: 1.2;
  letter-spacing: 0.01em;
}
.msc-subtitle {
  font-size: 11px; color: rgba(255,255,255,0.42);
  font-weight: 400; margin-top: 1px; letter-spacing: 0.02em;
}

.msc-badge {
  font-family: var(--font-mono);
  font-size: 9.5px; letter-spacing: 0.12em; text-transform: uppercase;
  padding: 3px 9px; border-radius: 20px;
  background: rgba(77,182,232,0.12);
  color: var(--sky-light);
  border: 1px solid rgba(77,182,232,0.25);
  flex-shrink: 0;
}

.msc-header-right { display: flex; align-items: center; gap: 8px; position: relative; z-index: 1; }

/* ── Body ── */
.msc-body { padding: 22px; }

/* ── Date range row ── */
.msc-date-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
  margin-bottom: 18px;
}
@media (max-width: 600px) { .msc-date-row { grid-template-columns: 1fr; } }

/* ── Field ── */
.msc-field { display: flex; flex-direction: column; gap: 7px; }

.msc-label {
  font-size: 11px; font-weight: 600;
  letter-spacing: 0.09em; text-transform: uppercase;
  color: var(--text-muted);
  display: flex; align-items: center; gap: 6px;
}
.msc-label-icon { color: var(--sky); opacity: 0.9; flex-shrink: 0; }

.msc-input {
  background: var(--surface-2);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  padding: 10px 13px;
  font-family: var(--font-mono);
  font-size: 13px; color: var(--text-primary);
  outline: none; width: 100%;
  transition: all var(--t);
  color-scheme: light;
}
.msc-input:focus {
  border-color: var(--sky);
  background: var(--surface);
  box-shadow: 0 0 0 3px var(--sky-muted);
}
.msc-input::placeholder { color: var(--text-faint); }

/* ── Divider ── */
.msc-divider { border: none; border-top: 1px solid var(--border); margin: 18px 0; }

/* ── Section heading ── */
.msc-section-head {
  font-size: 11px; font-weight: 600;
  letter-spacing: 0.09em; text-transform: uppercase;
  color: var(--text-muted);
  display: flex; align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}
.msc-section-left { display: flex; align-items: center; gap: 6px; }
.msc-section-icon { color: var(--sky); opacity: 0.9; }

/* ── Select all ── */
.msc-select-all {
  display: flex; align-items: center; gap: 7px;
  cursor: pointer; user-select: none;
  font-size: 12px; font-weight: 500; color: var(--text-muted);
  padding: 4px 10px; border-radius: 20px;
  border: 1px solid var(--border);
  background: var(--surface-2);
  transition: all var(--t);
}
.msc-select-all:hover { border-color: var(--sky); color: var(--text-secondary); }
.msc-select-all input[type="checkbox"] {
  appearance: none; -webkit-appearance: none;
  width: 13px; height: 13px;
  border: 1.5px solid var(--border-md);
  border-radius: 3px; background: var(--surface);
  cursor: pointer; position: relative;
  transition: all var(--t); flex-shrink: 0;
}
.msc-select-all input[type="checkbox"]:checked { background: var(--sky); border-color: var(--sky); }
.msc-select-all input[type="checkbox"]:checked::after {
  content: '✓'; position: absolute;
  font-size: 8px; font-weight: 700; color: #fff;
  top: 50%; left: 50%; transform: translate(-50%,-50%);
}

/* ── Branch list ── */
.msc-branch-list {
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  overflow: hidden;
  max-height: 172px;
  overflow-y: auto;
  background: var(--surface);
  scrollbar-width: thin;
  scrollbar-color: var(--border-md) transparent;
}

.msc-branch-row {
  display: flex; align-items: center;
  gap: 12px; padding: 9px 14px;
  cursor: pointer;
  border-bottom: 1px solid var(--border);
  transition: background var(--t);
  user-select: none;
}
.msc-branch-row:last-child { border-bottom: none; }
.msc-branch-row:hover { background: var(--surface-3); }
.msc-branch-row.sel { background: rgba(77,182,232,0.05); }

.msc-branch-cb {
  width: 16px; height: 16px; border-radius: 4px;
  border: 1.5px solid var(--border-md);
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0; transition: all var(--t);
  font-size: 9px; font-weight: 700; color: #fff;
}
.msc-branch-row.sel .msc-branch-cb { background: var(--sky); border-color: var(--sky); }

.msc-branch-name {
  font-family: var(--font-mono);
  font-size: 12.5px; color: var(--text-muted);
  transition: color var(--t);
}
.msc-branch-row.sel .msc-branch-name { color: var(--text-primary); font-weight: 500; }
.msc-branch-empty { padding: 28px; text-align: center; color: var(--text-faint); font-size: 12px; font-family: var(--font-mono); }
.msc-branch-count { margin-top: 8px; font-size: 11px; font-family: var(--font-mono); color: var(--text-faint); }

/* ── Options row ── */
.msc-options-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
  margin-top: 18px;
}
@media (max-width: 600px) { .msc-options-row { grid-template-columns: 1fr; } }

/* ── Toggle ── */
.msc-toggle-wrap {
  display: flex; align-items: center; gap: 10px;
  cursor: pointer; user-select: none;
  padding: 12px 14px;
  background: var(--surface-2);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  transition: all var(--t);
}
.msc-toggle-wrap:hover { border-color: var(--sky-border); }
.msc-toggle-wrap.on { border-color: var(--sky-border); background: rgba(77,182,232,0.04); }

.msc-toggle-track {
  width: 36px; height: 20px;
  border-radius: 10px;
  background: var(--surface-3);
  border: 1px solid var(--border-md);
  position: relative; flex-shrink: 0;
  transition: all var(--t);
}
.msc-toggle-wrap.on .msc-toggle-track {
  background: rgba(77,182,232,0.2);
  border-color: var(--sky);
}
.msc-toggle-thumb {
  width: 14px; height: 14px;
  border-radius: 50%;
  background: var(--text-faint);
  position: absolute; top: 2px; left: 2px;
  transition: all var(--t);
}
.msc-toggle-wrap.on .msc-toggle-thumb { background: var(--sky); left: 18px; }

.msc-toggle-text { display: flex; flex-direction: column; gap: 1px; }
.msc-toggle-label { font-size: 13px; font-weight: 600; color: var(--text-primary); }
.msc-toggle-desc { font-size: 11px; color: var(--text-muted); }

/* ── Chips ── */
.msc-chips {
  display: flex; flex-wrap: wrap; gap: 7px;
  margin-top: 16px; padding: 12px 14px;
  background: linear-gradient(135deg, rgba(77,182,232,0.04), rgba(192,39,45,0.03));
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
}
.msc-chip {
  display: inline-flex; align-items: center; gap: 5px;
  font-family: var(--font-mono); font-size: 11px;
  padding: 4px 10px; border-radius: 20px; font-weight: 500;
}
.chip-sky  { background: var(--sky-muted); color: var(--sky); border: 1px solid rgba(77,182,232,0.22); }
.chip-date { background: rgba(232,168,32,0.09); color: var(--gold); border: 1px solid rgba(232,168,32,0.2); }
.chip-red  { background: rgba(192,39,45,0.07); color: var(--red); border: 1px solid rgba(192,39,45,0.18); }

/* ── Actions ── */
.msc-actions { display: flex; gap: 10px; flex-wrap: wrap; margin-top: 18px; }

.msc-btn {
  display: inline-flex; align-items: center; gap: 8px;
  padding: 10px 20px; border-radius: var(--radius-sm);
  border: none; cursor: pointer;
  font-family: var(--font-ui); font-size: 13px; font-weight: 600;
  letter-spacing: 0.02em; transition: all var(--t); white-space: nowrap;
}
.msc-btn-primary {
  background: var(--navy); color: #fff;
  box-shadow: 0 2px 8px rgba(15,31,61,0.22);
}
.msc-btn-primary:hover {
  background: var(--navy-light);
  box-shadow: 0 4px 16px rgba(15,31,61,0.3);
  transform: translateY(-1px);
}
.msc-btn-primary:disabled { opacity: 0.55; cursor: not-allowed; transform: none; }

.msc-btn-sky {
  background: var(--sky); color: var(--navy);
  box-shadow: 0 2px 8px rgba(77,182,232,0.28);
  font-weight: 700;
}
.msc-btn-sky:hover {
  background: var(--sky-light);
  box-shadow: 0 4px 16px rgba(77,182,232,0.35);
  transform: translateY(-1px);
}
.msc-btn-sky:disabled { opacity: 0.55; cursor: not-allowed; transform: none; }

.msc-btn-ghost {
  background: var(--surface-2); color: var(--text-secondary);
  border: 1px solid var(--border-md);
}
.msc-btn-ghost:hover { background: var(--surface-3); color: var(--text-primary); }

/* ── Live ── */
.msc-live {
  display: inline-flex; align-items: center; gap: 5px;
  font-family: var(--font-mono); font-size: 10px;
  letter-spacing: 0.1em; text-transform: uppercase;
  padding: 4px 10px; border-radius: 20px;
  color: #22c55e; background: rgba(34,197,94,0.1);
  border: 1px solid rgba(34,197,94,0.25);
}
.msc-live-dot { width: 5px; height: 5px; border-radius: 50%; background: #22c55e; animation: msc-pulse 1.4s ease infinite; }

@keyframes msc-pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }

/* ── Icon btn (header) ── */
.msc-icon-btn {
  width: 32px; height: 32px; border-radius: var(--radius-sm);
  border: 1px solid rgba(255,255,255,0.1);
  background: rgba(255,255,255,0.06);
  color: rgba(255,255,255,0.5);
  display: flex; align-items: center; justify-content: center;
  cursor: pointer; transition: all var(--t);
}
.msc-icon-btn:hover { background: rgba(255,255,255,0.13); color: rgba(255,255,255,0.9); }

/* ── Two-panel output area ── */
.msc-output-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
  margin-top: 20px;
}
@media (max-width: 640px) { .msc-output-grid { grid-template-columns: 1fr; } }

.msc-panel {
  border-radius: var(--radius);
  overflow: hidden;
  border: 1px solid rgba(15,31,61,0.1);
}

.msc-panel-bar {
  display: flex; align-items: center; justify-content: space-between;
  padding: 9px 14px;
  background: var(--navy);
}
.msc-panel-title {
  display: flex; align-items: center; gap: 8px;
  font-family: var(--font-mono); font-size: 10.5px;
  letter-spacing: 0.1em; text-transform: uppercase;
  color: rgba(255,255,255,0.4);
}
.msc-panel-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--text-faint); }
.msc-panel-dot.live { background: #22c55e; animation: msc-pulse 1.4s ease infinite; }
.msc-panel-count { font-family: var(--font-mono); font-size: 10px; color: rgba(255,255,255,0.3); background: rgba(255,255,255,0.06); padding: 2px 8px; border-radius: 10px; }

.msc-panel-body {
  background: #0b1628;
  height: 230px;
  overflow-y: auto;
  padding: 14px;
  scrollbar-width: thin;
  scrollbar-color: rgba(255,255,255,0.07) transparent;
}

.msc-panel-empty {
  height: 100%; display: flex; flex-direction: column;
  align-items: center; justify-content: center;
  gap: 8px; color: rgba(255,255,255,0.18);
  font-family: var(--font-mono); font-size: 12px;
}

/* ── Console messages ── */
.msc-msg { margin-bottom: 12px; }
.msc-msg-type {
  font-family: var(--font-mono); font-size: 10px;
  letter-spacing: 0.08em; text-transform: uppercase;
  margin-bottom: 5px; display: flex; align-items: center; gap: 6px;
}
.msc-msg-type.t-queued     { color: #60c8ff; }
.msc-msg-type.t-complete   { color: #4ade80; }
.msc-msg-type.t-error,
.msc-msg-type.t-sse-error  { color: #f87171; }
.msc-msg-type.t-stopped    { color: #f0bc44; }
.msc-msg-type.t-scan-start { color: #c4a8ff; }
.msc-msg-type.t-scan-result{ color: #4ade80; }
.msc-msg-type.t-message    { color: #a5b4fc; }
.msc-msg-type.t-default    { color: rgba(255,255,255,0.3); }

.msc-msg-pre {
  font-family: var(--font-mono); font-size: 11.5px; color: #c8d4e8;
  white-space: pre-wrap; word-break: break-all; line-height: 1.65;
  background: rgba(255,255,255,0.025);
  border-left: 2px solid rgba(255,255,255,0.07);
  padding: 8px 12px; border-radius: 0 4px 4px 0;
}
.msc-msg-hr { border: none; border-top: 1px solid rgba(255,255,255,0.04); margin: 10px 0; }

/* Result panel ── light body ── */
.msc-result-body {
  background: var(--surface-2);
  height: 230px;
  overflow-y: auto;
  padding: 14px;
  scrollbar-width: thin;
  scrollbar-color: var(--border-md) transparent;
}
.msc-result-body .msc-panel-bar { background: var(--navy); }
.msc-result-pre {
  font-family: var(--font-mono); font-size: 11.5px;
  color: var(--text-secondary); white-space: pre-wrap;
  word-break: break-all; line-height: 1.7;
}
.msc-result-empty {
  height: 100%; display: flex; flex-direction: column;
  align-items: center; justify-content: center;
  gap: 6px; color: var(--text-faint);
  font-family: var(--font-mono); font-size: 12px;
}
`;

/* ─────────────────────────── Icons ─────────────────────────── */
const Ico = {
  Scan: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="16" height="16">
      <path d="M3 7V5a2 2 0 0 1 2-2h2"/><path d="M17 3h2a2 2 0 0 1 2 2v2"/>
      <path d="M21 17v2a2 2 0 0 1-2 2h-2"/><path d="M7 21H5a2 2 0 0 1-2-2v-2"/>
      <circle cx="12" cy="12" r="3"/>
    </svg>
  ),
  Calendar: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="12" height="12">
      <rect x="3" y="4" width="18" height="18" rx="2"/>
      <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/>
      <line x1="3" y1="10" x2="21" y2="10"/>
    </svg>
  ),
  Hash: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="12" height="12">
      <line x1="4" y1="9" x2="20" y2="9"/><line x1="4" y1="15" x2="20" y2="15"/>
      <line x1="10" y1="3" x2="8" y2="21"/><line x1="16" y1="3" x2="14" y2="21"/>
    </svg>
  ),
  Git: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="12" height="12">
      <circle cx="18" cy="18" r="3"/><circle cx="6" cy="6" r="3"/>
      <path d="M13 6h3a2 2 0 0 1 2 2v7"/><line x1="6" y1="9" x2="6" y2="21"/>
    </svg>
  ),
  File: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="12" height="12">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
      <polyline points="14 2 14 8 20 8"/>
    </svg>
  ),
  Play: () => (
    <svg viewBox="0 0 24 24" fill="currentColor" width="13" height="13"><path d="M8 5v14l11-7z"/></svg>
  ),
  Square: () => (
    <svg viewBox="0 0 24 24" fill="currentColor" width="11" height="11"><rect x="6" y="6" width="12" height="12" rx="1.5"/></svg>
  ),
  Trash: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="13" height="13">
      <polyline points="3 6 5 6 21 6"/>
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
      <path d="M10 11v6M14 11v6"/>
      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
    </svg>
  ),
  Terminal: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="11" height="11">
      <polyline points="4 17 10 11 4 5"/><line x1="12" y1="19" x2="20" y2="19"/>
    </svg>
  ),
  Results: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="11" height="11">
      <rect x="3" y="3" width="18" height="18" rx="2"/>
      <line x1="8" y1="12" x2="16" y2="12"/><line x1="8" y1="8" x2="16" y2="8"/><line x1="8" y1="16" x2="12" y2="16"/>
    </svg>
  ),
  Arrow: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="10" height="10">
      <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
    </svg>
  ),
};

/* ─────────────────────────── Hooks ─────────────────────────── */
function useBranches() {
  const [branches, setBranches] = useState<string[]>([]);
  useEffect(() => {
    (async () => {
      try {
        const res = await fetchWithAuth(`${API_BASE}/api/fetch/branches`, { method: "GET" });
        if (!res.ok) { setBranches(MOCK_BRANCHES); return; }
        const data = await res.json();
        setBranches(data?.branches?.length ? data.branches : MOCK_BRANCHES);
      } catch { setBranches(MOCK_BRANCHES); }
    })();
  }, []);
  return branches;
}

/* ─────────────────────────── Sub-components ─────────────────────────── */
function ConsoleMessage({ m }: { m: any }) {
  const typeMap: Record<string, string> = {
    queued: "t-queued", progress: "t-message", complete: "t-complete",
    error: "t-error", "sse-error": "t-sse-error", stopped: "t-stopped",
    "scan-start": "t-scan-start", "scan-result": "t-scan-result",
    message: "t-message",
  };
  const cls = typeMap[m?.type ?? ""] ?? "t-default";
  return (
    <div className="msc-msg">
      <div className={`msc-msg-type ${cls}`}><span style={{ opacity: 0.4 }}>▶</span> {m.type ?? "raw"}</div>
      <pre className="msc-msg-pre">{JSON.stringify(m, null, 2)}</pre>
      <hr className="msc-msg-hr" />
    </div>
  );
}

/* ─────────────────────────── Main Component ─────────────────────────── */
export default function MissingScanClient() {
  const branches = useBranches();
  const [selected, setSelected] = useState<string[]>([]);
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [positions, setPositions] = useState("1,2");
  const [sampleFile, setSampleFile] = useState("");
  const [autoQueue, setAutoQueue] = useState(false);
  const [messages, setMessages] = useState<any[]>([]);
  const [scanResult, setScanResult] = useState<any>(null);
  const [live, setLive] = useState(false);
  const esRef = useRef<EventSource | null>(null);
  const consoleRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (consoleRef.current) consoleRef.current.scrollTop = consoleRef.current.scrollHeight;
  }, [messages]);

  const allSel = branches.length > 0 && selected.length === branches.length;
  const toggle = (b: string) => setSelected(sel => sel.includes(b) ? sel.filter(x => x !== b) : [...sel, b]);

  const handleStartScan = async () => {
    const body: any = {};
    if (selected.length) body.branches = selected;
    if (positions) body.positions = positions;
    if (start) body.start = start;
    if (end) body.end = end;
    if (sampleFile) body.sampleFile = sampleFile;
    if (autoQueue) body.autoQueue = true;

    setMessages(m => [...m, { type: "scan-start", body }]);

    try {
      const resp = await fetchWithAuth(`${API_BASE}/api/fetch/missing/scan`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await resp.json();
      if (!resp.ok) {
        setMessages(m => [...m, { type: "error", message: json?.message ?? "Scan failed" }]);
        return;
      }
      setScanResult(json);
      setMessages(m => [...m, { type: "scan-result", json }]);

      if (json.queued && json.jobId) {
        setLive(true);
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
            if (d.type === "complete" || d.type === "error") { es.close(); setLive(false); }
          } catch { setMessages(m => [...m, { type: "sse-raw", data: ev.data }]); }
        };
        es.onerror = () => { setMessages(m => [...m, { type: "sse-error" }]); es.close(); setLive(false); };
      }
    } catch (e) {
      setMessages(m => [...m, { type: "error", message: String(e) }]);
    }
  };

  const handleStop = () => {
    if (esRef.current) { esRef.current.close(); esRef.current = null; }
    setMessages(m => [...m, { type: "stopped" }]);
    setLive(false);
  };

  return (
    <div className="msc-root">
      <style>{css}</style>
      <div className="msc-card">
        {/* Header */}
        <div className="msc-header">
          <div className="msc-header-left">
            <div className="msc-icon-wrap"><Ico.Scan /></div>
            <div>
              <div className="msc-title">Missing Scan</div>
              <div className="msc-subtitle">Inspect & queue missing records</div>
            </div>
            <span className="msc-badge">Inspection</span>
          </div>
          <div className="msc-header-right">
            {live && <span className="msc-live"><span className="msc-live-dot" />Live</span>}
            <button className="msc-icon-btn" title="Clear" onClick={() => setMessages([])}><Ico.Trash /></button>
          </div>
          <div className="msc-header-stripe" />
        </div>

        {/* Body */}
        <div className="msc-body">
          {/* Date range */}
          <div className="msc-date-row">
            <div className="msc-field">
              <label className="msc-label"><span className="msc-label-icon"><Ico.Calendar /></span>Start Date</label>
              <input className="msc-input" type="date" value={start} onChange={e => setStart(e.target.value)} />
            </div>
            <div className="msc-field">
              <label className="msc-label"><span className="msc-label-icon"><Ico.Calendar /></span>End Date</label>
              <input className="msc-input" type="date" value={end} onChange={e => setEnd(e.target.value)} />
            </div>
          </div>

          <hr className="msc-divider" />

          {/* Branches */}
          <div className="msc-section-head">
            <span className="msc-section-left">
              <span className="msc-section-icon"><Ico.Git /></span>
              Branches
            </span>
            <label className="msc-select-all">
              <input type="checkbox" checked={allSel} onChange={e => setSelected(e.target.checked ? branches.slice() : [])} />
              Select all
            </label>
          </div>

          <div className="msc-branch-list">
            {branches.length === 0
              ? <div className="msc-branch-empty">Loading branches…</div>
              : branches.map(b => {
                  const sel = selected.includes(b);
                  return (
                    <div key={b} className={`msc-branch-row ${sel ? "sel" : ""}`} onClick={() => toggle(b)}>
                      <div className="msc-branch-cb">{sel && "✓"}</div>
                      <span className="msc-branch-name">{b}</span>
                    </div>
                  );
                })
            }
          </div>
          {selected.length > 0 && (
            <div className="msc-branch-count">{selected.length} of {branches.length} selected</div>
          )}

          <hr className="msc-divider" />

          {/* Options */}
          <div className="msc-options-row">
            <div className="msc-field">
              <label className="msc-label"><span className="msc-label-icon"><Ico.Hash /></span>Positions</label>
              <input className="msc-input" value={positions} onChange={e => setPositions(e.target.value)} placeholder="1,2" />
            </div>
            <div className="msc-field">
              <label className="msc-label"><span className="msc-label-icon"><Ico.File /></span>Sample File <span style={{ fontSize: 9, opacity: 0.5, fontWeight: 400, textTransform: "none", letterSpacing: 0 }}>(optional)</span></label>
              <input className="msc-input" value={sampleFile} onChange={e => setSampleFile(e.target.value)} placeholder="latest/BRANCH/2026-02-01/sample.csv" />
            </div>
          </div>

          {/* Auto-queue toggle */}
          <div style={{ marginTop: 14 }}>
            <div
              className={`msc-toggle-wrap ${autoQueue ? "on" : ""}`}
              onClick={() => setAutoQueue(v => !v)}
            >
              <div className="msc-toggle-track"><div className="msc-toggle-thumb" /></div>
              <div className="msc-toggle-text">
                <span className="msc-toggle-label">Auto-queue missing fetches</span>
                <span className="msc-toggle-desc">Automatically queue any gaps found during scan</span>
              </div>
            </div>
          </div>

          {/* Summary chips */}
          {(selected.length > 0 || start || end || positions) && (
            <div className="msc-chips">
              {selected.length > 0 && (
                <span className="msc-chip chip-sky">
                  <Ico.Git /> {selected.length} branch{selected.length > 1 ? "es" : ""}
                </span>
              )}
              {(start || end) && (
                <span className="msc-chip chip-date">
                  <Ico.Calendar /> {start || "…"} <Ico.Arrow /> {end || "now"}
                </span>
              )}
              {positions && (
                <span className="msc-chip chip-red"><Ico.Hash /> {positions}</span>
              )}
              {autoQueue && (
                <span className="msc-chip" style={{ background: "rgba(77,182,232,0.07)", color: "var(--sky)", border: "1px solid rgba(77,182,232,0.18)" }}>
                  ⚡ auto-queue
                </span>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="msc-actions">
            <button className="msc-btn msc-btn-sky" onClick={handleStartScan} disabled={live}>
              <Ico.Play /> {live ? "Scanning…" : "Start Scan"}
            </button>
            <button className="msc-btn msc-btn-ghost" onClick={handleStop}>
              <Ico.Square /> Stop
            </button>
          </div>

          {/* Output panels */}
          <div className="msc-output-grid">
            {/* Console */}
            <div className="msc-panel">
              <div className="msc-panel-bar">
                <span className="msc-panel-title">
                  <span className={`msc-panel-dot ${live ? "live" : ""}`} />
                  <Ico.Terminal /> Console
                </span>
                <span className="msc-panel-count">{messages.length} events</span>
              </div>
              <div className="msc-panel-body" ref={consoleRef}>
                {messages.length === 0
                  ? <div className="msc-panel-empty"><Ico.Terminal /><span>Awaiting output…</span></div>
                  : messages.map((m, i) => <ConsoleMessage key={i} m={m} />)
                }
              </div>
            </div>

            {/* Scan Result */}
            <div className="msc-panel">
              <div className="msc-panel-bar">
                <span className="msc-panel-title">
                  <span className="msc-panel-dot" style={{ background: scanResult ? "#4ade80" : undefined }} />
                  <Ico.Results /> Scan Result
                </span>
                {scanResult && <span className="msc-panel-count">ready</span>}
              </div>
              <div className="msc-result-body">
                {scanResult
                  ? <pre className="msc-result-pre">{JSON.stringify(scanResult, null, 2)}</pre>
                  : <div className="msc-result-empty"><Ico.Results /><span>No result yet</span></div>
                }
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}