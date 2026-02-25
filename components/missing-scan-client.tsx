"use client";

import { useState, useRef, useEffect } from "react";
import { fetchWithAuth } from "@/utils/auth";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5000";
const MISSING_SCAN_RESULT_KEY = "missingScan:lastResult";
const MOCK_BRANCHES = ["AYALA-FRN", "BETA", "B-CPOL", "B-SMS", "BIA", "BMC", "BRLN", "BPAG", "BGRAN", "BTAB", "CAMALIG", "CNTRO", "DAET", "DAR", "EME", "GOA", "IRIGA", "MAGS", "MAS", "OLA", "PACML", "ROB-FRN", "SANPILI", "SIPOCOT", "SMLGZ-FRN", "SMLIP", "SMNAG", "ROXAS"];

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
  background: var(--red);
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
  border: 1px solid var(--red);
  font-size: 17px; flex-shrink: 0;
}

.msc-title {
  font-family: 'Poppins', sans-serif;
  font-size: 17px; font-weight: 700;
  color: var(--surface); line-height: 1.2;
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
.msc-label-icon { color: var(--red); opacity: 0.9; flex-shrink: 0; }

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
.msc-section-icon { color: var(--red); opacity: 0.9; }

/* ── Select all ── */
.msc-select-all {
  display: flex; align-items: center; gap: 7px;
  cursor: pointer; user-select: none;
  font-size: 12px; font-weight: 500; color: var(--text-muted);
  padding: 4px 10px; border-radius: 20px;
  border: 1px solid var(--red);
  background: var(--surface-2);
  transition: all var(--t);
}
.msc-select-all:hover { border-color: var(--red); color: var(--text-secondary); }
.msc-select-all input[type="checkbox"] {
  appearance: none; -webkit-appearance: none;
  width: 13px; height: 13px;
  border: 1.5px solid var(--border-md);
  border-radius: 3px; background: var(--surface);
  cursor: pointer; position: relative;
  transition: all var(--t); flex-shrink: 0;
}
.msc-select-all input[type="checkbox"]:checked { background: var(--red); border-color: var(--red); }
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
.msc-branch-row.sel .msc-branch-cb { background: var(--red); border-color: var(--red); }

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
.msc-toggle-wrap.on .msc-toggle-thumb { background: var(--red); left: 18px; }

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
  background: var(--red-light); color: var(--text-primary);
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
  background: var(--red);
}
.msc-panel-title {
  display: flex; align-items: center; gap: 8px;
  font-family: var(--font-mono); font-size: 10.5px;
  letter-spacing: 0.1em; text-transform: uppercase;
  color: white;
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
  scrollbar-color: rgba(150, 89, 89, 0.91) transparent;
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
  max-height: 600px;
  overflow: auto;
  padding: 14px;
  scrollbar-width: thin;
  scrollbar-color: var(--border-md) transparent;
}
.msc-result-body .msc-panel-bar { background: var(--navy); }
.msc-result-body table {
  width: 100%;
  border-collapse: collapse;
  font-family: var(--font-mono);
  font-size: 11px;
}
.msc-result-body table thead tr {
  background: linear-gradient(180deg, rgba(15,31,61,0.4), rgba(15,31,61,0.2));
  border-bottom: 1px solid rgba(77,182,232,0.15);
}
.msc-result-body table th {
  padding: 10px 8px;
  text-align: left;
  font-weight: 600;
  color: #60c8ff;
  letter-spacing: 0.05em;
  text-transform: capitalize;
}
.msc-result-body table tbody tr {
  border-bottom: 1px solid rgba(255,255,255,0.04);
  transition: background 0.15s ease;
}
.msc-result-body table tbody tr:hover {
  background: rgba(77,182,232,0.06);
}
.msc-result-body table td {
  padding: 10px 8px;
  color: var(--text-secondary);
}
.msc-result-body table tbody tr td {
  vertical-align: middle;
}
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
  Upload: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="11" height="11">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
      <polyline points="17 8 12 3 7 8"/>
      <line x1="12" y1="3" x2="12" y2="15"/>
    </svg>
  ),
};

function useBranches() {
  const [branches, setBranches] = useState<string[]>([]);
  useEffect(() => {
    (async () => {
      try {
        const res = await fetchWithAuth(`${API_BASE}/api/fetch/branches`, { method: "GET" });
        if (!res.ok) { setBranches(MOCK_BRANCHES); return; }
        const data = await res.json();
        setBranches(data?.branches?.length ? data.branches : MOCK_BRANCHES);
      } catch {
        setBranches(MOCK_BRANCHES);
      }
    })();
  }, []);
  return branches;
}

/* ─────────────────────────── Main Component ─────────────────────────── */
export default function MissingScanClient() {
  const branches = useBranches();
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [positions] = useState("1,2");
  const [messages, setMessages] = useState<string[]>([]);
  const [scanResult, setScanResult] = useState<any>(null);
  const [tableSearch, setTableSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [progressValue, setProgressValue] = useState(0);
  const [live, setLive] = useState(false);
  const [queueing, setQueueing] = useState(false);
  const [reingesting, setReingesting] = useState(false);
  const [queueStatus, setQueueStatus] = useState("");
  const itemsPerPage = 10;

  const getFailureReason = (row: any) => {
    const missingCount = Array.isArray(row?.missingDates) ? row.missingDates.length : 0;
    const totalDates = Number(row?.totalDates ?? 0);
    const existingCount = Number(row?.existingCount ?? 0);

    if (missingCount <= 0) return "No missing dates";
    if (existingCount === 0 || (totalDates > 0 && missingCount === totalDates)) {
      return "No ingested files found in selected range";
    }
    if (missingCount >= 7) {
      return "Likely no/late submission or repeated fetch failure";
    }
    return "Partial gap (late upload or ingest failure)";
  };

  const handleStartScan = async () => {
    const body: any = { positions };
    if (branches.length) body.branches = branches;
    if (start) body.start = start;
    if (end) body.end = end;

    setLive(true);
    setProgressValue(20);
    setMessages(m => [...m, `Scan started (${branches.length} branches)`]);
    setMessages(m => [...m, `Date range: ${start || "auto"} to ${end || "auto"}`]);

    try {
      const resp = await fetchWithAuth(`${API_BASE}/api/fetch/missing/scan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      setProgressValue(65);
      const json = await resp.json();
      if (!resp.ok) {
        setMessages(m => [...m, `Error: ${json?.message ?? 'Scan failed'}`]);
        setProgressValue(0);
        setLive(false);
        return;
      }

      setScanResult(json);
      setCurrentPage(1);
      setMessages(m => [...m, `Scan complete: ${json?.results?.length || 0} rows generated`]);
      setMessages(m => [...m, `Date range: ${json?.start || 'N/A'} to ${json?.end || 'N/A'}`]);
      setProgressValue(100);
      setLive(false);
      if (typeof window !== "undefined") {
        window.localStorage.setItem(MISSING_SCAN_RESULT_KEY, JSON.stringify(json));
        window.dispatchEvent(new CustomEvent("missing-scan-result", { detail: json }));
      }
    } catch (e) {
      setMessages(m => [...m, `Error: ${String(e)}`]);
      setProgressValue(0);
      setLive(false);
    }
  };

  const handleStop = () => {
    setMessages(m => [...m, "Stopped by user"]);
    setProgressValue(0);
    setLive(false);
  };

  const handleQueueFetchScan = async (targetRow?: any) => {
    if (!scanResult || !scanResult.results || scanResult.results.length === 0) {
      setQueueStatus("No scan results to queue.");
      return;
    }
    if (!scanResult.snapshotId) {
      setQueueStatus("Snapshot not found. Run scan again, then queue.");
      return;
    }

    setQueueing(true);
    const scopeText = targetRow ? `${targetRow.branch} POS${targetRow.pos}` : 'selected scope';
    setQueueStatus(`Queuing fetch for missing dates (${scanResult.start || 'auto'} to ${scanResult.end || 'auto'}) • ${scopeText}...`);

    try {
      const body: any = {
        autoQueue: true,
        snapshotId: scanResult.snapshotId,
      };

      // Optional filters for this queue action while keeping same snapshot
      if (targetRow) {
        body.branches = [String(targetRow.branch)];
        body.positions = [String(targetRow.pos)];
      } else {
        if (branches.length) {
          body.branches = branches;
        }
        if (positions.length) body.positions = positions;
      }

      const resp = await fetchWithAuth(`${API_BASE}/api/fetch/missing/scan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      const json = await resp.json();
      if (!resp.ok) {
        setQueueStatus(`Error: ${json?.message ?? 'Queue failed'}`);
        setQueueing(false);
        return;
      }

      setQueueStatus(`✅ Queued successfully! Job ID: ${json.jobId || 'N/A'}`);
      // Add helpful message about re-scanning
      setTimeout(() => {
        setQueueStatus("💡 Tip: Run scan again after fetch completes to see updated results.");
      }, 3000);
      setTimeout(() => setQueueStatus(""), 10000);
    } catch (e) {
      setQueueStatus(`Error: ${String(e)}`);
    } finally {
      setQueueing(false);
    }
  };

  const handleReIngest = async (targetRow?: any) => {
    if (!scanResult || !scanResult.results || scanResult.results.length === 0) {
      setQueueStatus("No scan results to re-ingest.");
      return;
    }
    if (!scanResult.start || !scanResult.end) {
      setQueueStatus("Missing scan date range. Run scan again before re-ingest.");
      return;
    }

    setReingesting(true);
    const scopeText = targetRow ? `${targetRow.branch} POS${targetRow.pos}` : 'selected scope';
    setQueueStatus(`Starting re-ingest (${scanResult.start} to ${scanResult.end}) • ${scopeText}...`);

    try {
      const body: any = {
        start: scanResult.start,
        end: scanResult.end,
        mode: 're-ingest-missing-scan',
      };

      if (targetRow) {
        body.branches = [String(targetRow.branch)];
        body.positions = [String(targetRow.pos)];
      } else {
        if (branches.length) {
          body.branches = branches;
        } else if (scanResult.results && scanResult.results.length) {
          body.branches = [...new Set(scanResult.results.map((r: any) => r.branch))];
        }

        if (positions.length) {
          body.positions = positions;
        } else if (scanResult.results && scanResult.results.length) {
          body.positions = [...new Set(scanResult.results.map((r: any) => String(r.pos)))];
        }
      }

      const resp = await fetchWithAuth(`${API_BASE}/api/fetch/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const json = await resp.json();
      if (!resp.ok) {
        setQueueStatus(`Re-ingest failed: ${json?.message ?? 'Request failed'}`);
        return;
      }

      setQueueStatus(`✅ Re-ingest queued! Job ID: ${json?.jobId || 'N/A'}. Check Fetch Logs for progress.`);
    } catch (e) {
      setQueueStatus(`Re-ingest failed: ${String(e)}`);
    } finally {
      setReingesting(false);
    }
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
              <div className="msc-subtitle">Read-only scan controls for dashboard</div>
            </div>
          </div>
          <div className="msc-header-right">
            {live && <span className="msc-live"><span className="msc-live-dot" />Live</span>}
            <span className="msc-badge">READ ONLY</span>
          </div>
          <div className="msc-header-stripe" />
        </div>

        <div className="msc-body">
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
          <div className="msc-branch-count">All branches are selected by default ({branches.length})</div>

          <div className="msc-options-row" style={{ marginTop: 0 }}>
            <div className="msc-field">
              <label className="msc-label"><span className="msc-label-icon"><Ico.Hash /></span>Position</label>
              <input className="msc-input" value={positions} readOnly />
            </div>
          </div>

          <div className="msc-actions">
            <button className="msc-btn msc-btn-sky" onClick={handleStartScan}>
              <Ico.Play /> Start Scan
            </button>
            <button className="msc-btn msc-btn-ghost" onClick={handleStop}>
              <Ico.Square /> Stop Scan
            </button>
            {messages.length > 0 && (
              <span style={{
                marginLeft: 'auto',
                fontSize: '12px',
                color: 'var(--text-muted)',
                fontFamily: 'var(--font-mono)',
                alignSelf: 'center'
              }}>
                {messages.length} line{messages.length !== 1 ? 's' : ''}
              </span>
            )}
          </div>
        </div>

        <div className="msc-output-grid" style={{ padding: "14px", gridTemplateColumns: "1fr", gap: "14px" }}>
          <div className="msc-panel">
            <div className="msc-panel-bar">
              <span className="msc-panel-title">
                <span className={`msc-panel-dot ${live ? "live" : ""}`} />
                <Ico.Terminal /> Scan Progress
              </span>
            </div>
            <div className="msc-result-body" style={{ maxHeight: "clamp(180px, 26vh, 230px)", padding: "10px" }}>
              <div style={{ marginBottom: "12px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px", fontSize: "11px", color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
                  <span>Status</span>
                  <span>{progressValue}%</span>
                </div>
                <div style={{ width: "100%", height: "10px", background: "rgba(15,31,61,0.08)", borderRadius: "999px", overflow: "hidden" }}>
                  <div style={{ width: `${progressValue}%`, height: "100%", background: "linear-gradient(90deg, var(--sky), var(--red))", transition: "width 220ms ease" }} />
                </div>
              </div>

              <div style={{ border: "1px solid var(--border)", borderRadius: "8px", background: "#fff", minHeight: "clamp(110px, 16vh, 145px)", maxHeight: "clamp(110px, 16vh, 145px)", overflowY: "auto" }}>
                {messages.length === 0 ? (
                  <div className="msc-panel-empty" style={{ color: "var(--text-faint)", minHeight: "clamp(110px, 16vh, 145px)" }}>
                    <Ico.Terminal /><span>Start scan to see progress lines…</span>
                  </div>
                ) : (
                  <div style={{ padding: "10px" }}>
                    {messages.map((line, index) => (
                      <div key={index} style={{ fontFamily: "var(--font-mono)", fontSize: "11px", color: "var(--text-secondary)", padding: "6px 0", borderBottom: index === messages.length - 1 ? "none" : "1px solid var(--border)" }}>
                        • {line}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="msc-panel">
            <div className="msc-panel-bar">
              <span className="msc-panel-title">
                <span className="msc-panel-dot" style={{ background: scanResult ? "#4ade80" : undefined }} />
                <Ico.Results /> Scan Results
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {scanResult && <span className="msc-panel-count">{scanResult.results?.length || 0} rows</span>}
                {scanResult && scanResult.results && scanResult.results.length > 0 && (
                  <button
                    className="msc-btn msc-btn-gold"
                    style={{ padding: '6px 12px', fontSize: '11px' }}
                    onClick={handleReIngest}
                    disabled={reingesting || queueing}
                  >
                    <Ico.Play />
                    {reingesting ? 'Re-ingesting...' : 'Re-ingest'}
                  </button>
                )}
                {scanResult && scanResult.results && scanResult.results.length > 0 && (
                  <button
                    className="msc-btn msc-btn-sky"
                    style={{ padding: '6px 12px', fontSize: '11px' }}
                    onClick={handleQueueFetchScan}
                    disabled={queueing || reingesting}
                  >
                    <Ico.Play />
                    {queueing ? 'Queuing...' : 'Queue Fetch Scan'}
                  </button>
                )}
              </div>
            </div>
            {queueStatus && (
              <div style={{ padding: '8px 12px', background: queueStatus.includes('✅') ? 'var(--gold-muted)' : queueStatus.includes('💡') ? 'var(--sky-muted)' : 'var(--red-muted)', color: 'var(--navy)', fontSize: '11px', borderBottom: '1px solid var(--sky-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span>{queueStatus}</span>
                {queueStatus.includes('💡') && (
                  <button
                    className="msc-btn msc-btn-gold"
                    style={{ padding: '4px 10px', fontSize: '10px' }}
                    onClick={handleStartScan}
                  >
                    <Ico.Play /> Re-scan Now
                  </button>
                )}
              </div>
            )}
            {scanResult && scanResult.results && scanResult.results.length > 0 && (
              <div style={{ padding: '8px 12px', fontSize: '11px', color: 'var(--text-muted)', borderBottom: '1px solid var(--border)', background: 'var(--surface-2)' }}>
                Tip: Use <strong>Queue Fetch Scan</strong> for missing files. Use <strong>Re-ingest</strong> only when files already exist but processing failed/wrong.
              </div>
            )}
            <div className="msc-result-body" style={{ maxHeight: "760px", overflowY: "auto" }}>
              {scanResult && scanResult.results && scanResult.results.length > 0 ? (
                <>
                  <div style={{ marginBottom: '12px', display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <input
                      type="text"
                      placeholder="Filter by branch..."
                      value={tableSearch}
                      onChange={e => {
                        setTableSearch(e.target.value);
                        setCurrentPage(1);
                      }}
                      className="msc-input"
                    />
                  </div>

                  {(() => {
                    const filtered = scanResult.results.filter((r: any) =>
                      String(r.branch || "").toLowerCase().includes(tableSearch.toLowerCase())
                    );
                    const totalPages = Math.ceil(filtered.length / itemsPerPage) || 1;
                    const startIdx = (currentPage - 1) * itemsPerPage;
                    const paginated = filtered.slice(startIdx, startIdx + itemsPerPage);

                    return (
                      <>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px', fontFamily: 'monospace' }}>
                          <thead>
                            <tr style={{ borderBottom: '1px solid var(--border)', backgroundColor: 'rgba(15,31,61,0.03)' }}>
                              <th style={{ padding: '8px 6px', textAlign: 'left', fontWeight: 'bold', color: 'var(--text-primary)' }}>Branch</th>
                              <th style={{ padding: '8px 6px', textAlign: 'center', fontWeight: 'bold', color: 'var(--text-primary)' }}>Pos</th>
                              <th style={{ padding: '8px 6px', textAlign: 'center', fontWeight: 'bold', color: 'var(--text-primary)' }}>Missing</th>
                              <th style={{ padding: '8px 6px', textAlign: 'left', fontWeight: 'bold', color: 'var(--text-primary)' }}>Missing Dates</th>
                              <th style={{ padding: '8px 6px', textAlign: 'left', fontWeight: 'bold', color: 'var(--text-primary)' }}>Failure Reason</th>
                              <th style={{ padding: '8px 6px', textAlign: 'left', fontWeight: 'bold', color: 'var(--text-primary)' }}>Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {paginated.length === 0 ? (
                              <tr>
                                <td colSpan={6} style={{ padding: '14px', textAlign: 'center', color: 'var(--text-muted)' }}>No matching rows</td>
                              </tr>
                            ) : paginated.map((r: any, i: number) => {
                              const hasMissingDates = Array.isArray(r.missingDates) && r.missingDates.length > 0;
                              return (
                              <tr key={i} style={{ borderBottom: '1px solid var(--border)', backgroundColor: i % 2 === 0 ? 'transparent' : 'rgba(15,31,61,0.02)' }}>
                                <td style={{ padding: '8px 6px', color: 'var(--text-primary)', fontWeight: 600 }}>{r.branch}</td>
                                <td style={{ padding: '8px 6px', textAlign: 'center', color: 'var(--text-secondary)' }}>{r.pos}</td>
                                <td style={{ padding: '8px 6px', textAlign: 'center', color: 'var(--red)', fontWeight: 700 }}>{r.missingDates?.length || 0}</td>
                                <td style={{ padding: '8px 6px', color: 'var(--text-secondary)', minWidth: '240px' }}>
                                  {r.missingDates && r.missingDates.length > 0 ? (
                                    <details style={{ cursor: 'pointer' }}>
                                      <summary style={{ cursor: 'pointer', color: 'var(--red)', fontSize: '11px' }}>
                                        {r.missingDates.slice(0, 2).join(', ')}{r.missingDates.length > 2 ? ` +${r.missingDates.length - 2} more` : ''}
                                      </summary>
                                      <div style={{ marginTop: '6px', maxHeight: '120px', overflowY: 'auto', border: '1px solid var(--border)', borderRadius: '6px', padding: '6px', background: '#fff' }}>
                                        {r.missingDates.map((date: string, idx: number) => (
                                          <div key={idx} style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', lineHeight: 1.6, color: 'var(--text-secondary)' }}>
                                            {date}
                                          </div>
                                        ))}
                                      </div>
                                    </details>
                                  ) : (
                                    <span style={{ color: 'var(--text-muted)' }}>None</span>
                                  )}
                                </td>
                                <td style={{ padding: '8px 6px', color: 'var(--text-secondary)', minWidth: '220px' }}>
                                  {getFailureReason(r)}
                                </td>
                                <td style={{ padding: '8px 6px', minWidth: '240px' }}>
                                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                    <button
                                      className="msc-btn msc-btn-sky"
                                      style={{ padding: '4px 8px', fontSize: '10px' }}
                                      onClick={() => handleQueueFetchScan(r)}
                                      disabled={queueing || reingesting || !hasMissingDates}
                                    >
                                      Queue Fetch
                                    </button>
                                    <button
                                      className="msc-btn msc-btn-gold"
                                      style={{ padding: '4px 8px', fontSize: '10px' }}
                                      onClick={() => handleReIngest(r)}
                                      disabled={queueing || reingesting || !hasMissingDates || Number(r?.existingCount ?? 0) <= 0}
                                      title={Number(r?.existingCount ?? 0) <= 0 ? 'Re-ingest is available only when files were already ingested. Use Queue Fetch first.' : 'Re-process existing ingested files for this row'}
                                    >
                                      Re-ingest
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            )})}
                          </tbody>
                        </table>

                        <div style={{ marginTop: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '10px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                          <span>{filtered.length === 0 ? 0 : startIdx + 1}–{Math.min(startIdx + itemsPerPage, filtered.length)} of {filtered.length}</span>
                          <div style={{ display: 'flex', gap: '6px' }}>
                            <button className="msc-btn msc-btn-ghost" style={{ padding: '4px 10px', fontSize: '11px' }} onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>Prev</button>
                            <button className="msc-btn msc-btn-ghost" style={{ padding: '4px 10px', fontSize: '11px' }} onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>Next</button>
                          </div>
                        </div>
                      </>
                    );
                  })()}
                </>
              ) : (
                <div className="msc-result-empty"><Ico.Results /><span>No result yet</span></div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}