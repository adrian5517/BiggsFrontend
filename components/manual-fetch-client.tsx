"use client";

import { useState, useRef, useEffect } from "react";
import { fetchWithAuth, getAccessToken } from "@/utils/auth";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5000";
const MOCK_BRANCHES = ["ATL-001", "CHI-002", "DAL-003", "HOU-004", "LAX-005", "NYC-006", "PHX-007", "SEA-008"];

/* ─────────────────────────── CSS ─────────────────────────── */
const css = `
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700;800&family=DM+Sans:wght@300;400;500;600;700&family=DM+Mono:wght@400;500&display=swap');

.mfc-root *,
.mfc-root *::before,
.mfc-root *::after { box-sizing: border-box; margin: 0; padding: 0; }

.mfc-root {
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
  --sky-muted:  rgba(77,182,232,0.1);

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
  --font-ui:    'DM Sans', sans-serif;
  --font-mono:  'DM Mono', monospace;
  --t:          220ms cubic-bezier(0.4,0,0.2,1);

  --shadow-sm:  0 2px 6px rgba(15,31,61,0.07), 0 1px 2px rgba(15,31,61,0.05);
  --shadow-md:  0 4px 16px rgba(15,31,61,0.08), 0 1px 4px rgba(15,31,61,0.06);

  font-family: var(--font-ui);
  color: var(--text-primary);
}

/* ── Card shell ── */
.mfc-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-md);
  overflow: hidden;
  animation: mfc-fade-up 0.35s ease both;
}

@keyframes mfc-fade-up {
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
}

/* ── Card header ── */
.mfc-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 18px 22px;
  background: var(--navy);
  position: relative;
  overflow: hidden;
}

.mfc-header::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, rgba(255,255,255,0.04) 0%, transparent 60%);
  pointer-events: none;
}

.mfc-header-stripe {
  position: absolute;
  bottom: 0; left: 0; right: 0;
  height: 3px;
  background: linear-gradient(90deg, var(--gold) 0%, var(--red) 50%, var(--sky) 100%);
}

.mfc-header-left { display: flex; align-items: center; gap: 14px; position: relative; z-index: 1; }

.mfc-icon-wrap {
  width: 38px; height: 38px;
  border-radius: 10px;
  display: flex; align-items: center; justify-content: center;
  background: rgba(232,168,32,0.15);
  border: 1px solid rgba(232,168,32,0.3);
  font-size: 18px;
  flex-shrink: 0;
}

.mfc-title {
  font-family: 'Playfair Display', Georgia, serif;
  font-size: 17px;
  font-weight: 700;
  color: #fff;
  line-height: 1.2;
  letter-spacing: 0.01em;
}

.mfc-subtitle {
  font-size: 11px;
  color: rgba(255,255,255,0.45);
  font-weight: 400;
  margin-top: 1px;
  letter-spacing: 0.02em;
}

.mfc-badge {
  font-family: var(--font-mono);
  font-size: 9.5px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  padding: 3px 9px;
  border-radius: 20px;
  background: rgba(232,168,32,0.15);
  color: var(--gold-light, #f0bc44);
  border: 1px solid rgba(232,168,32,0.25);
  flex-shrink: 0;
}

.mfc-header-right {
  display: flex; align-items: center; gap: 8px;
  position: relative; z-index: 1;
}

/* ── Body ── */
.mfc-body { padding: 22px; }

/* ── Form grid ── */
.mfc-form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
  margin-bottom: 18px;
}
@media (max-width: 600px) { .mfc-form-row { grid-template-columns: 1fr; } }

/* ── Field ── */
.mfc-field { display: flex; flex-direction: column; gap: 7px; }

.mfc-label {
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.09em;
  text-transform: uppercase;
  color: var(--text-muted);
  display: flex;
  align-items: center;
  gap: 6px;
}

.mfc-label-icon { color: var(--gold); opacity: 0.8; flex-shrink: 0; }

.mfc-input {
  background: var(--surface-2);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  padding: 10px 13px;
  font-family: var(--font-mono);
  font-size: 13px;
  color: var(--text-primary);
  outline: none;
  transition: all var(--t);
  width: 100%;
  color-scheme: light;
}

.mfc-input:focus {
  border-color: var(--gold);
  background: var(--surface);
  box-shadow: 0 0 0 3px var(--gold-muted);
}

.mfc-input::placeholder { color: var(--text-faint); }

/* ── Divider ── */
.mfc-divider {
  border: none;
  border-top: 1px solid var(--border);
  margin: 18px 0;
}

/* ── Branch section ── */
.mfc-branches-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}

.mfc-select-all {
  display: flex; align-items: center; gap: 7px;
  cursor: pointer;
  user-select: none;
  font-size: 12px;
  font-weight: 500;
  color: var(--text-muted);
  padding: 4px 10px;
  border-radius: 20px;
  border: 1px solid var(--border);
  background: var(--surface-2);
  transition: all var(--t);
}
.mfc-select-all:hover { border-color: var(--gold); color: var(--text-secondary); }

.mfc-select-all input[type="checkbox"] {
  appearance: none; -webkit-appearance: none;
  width: 13px; height: 13px;
  border: 1.5px solid var(--border-md);
  border-radius: 3px;
  background: var(--surface);
  cursor: pointer;
  position: relative;
  transition: all var(--t);
  flex-shrink: 0;
}
.mfc-select-all input[type="checkbox"]:checked {
  background: var(--gold);
  border-color: var(--gold);
}
.mfc-select-all input[type="checkbox"]:checked::after {
  content: '✓';
  position: absolute;
  font-size: 8px; font-weight: 700;
  color: var(--navy);
  top: 50%; left: 50%;
  transform: translate(-50%, -50%);
}

.mfc-branch-list {
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  overflow: hidden;
  max-height: 172px;
  overflow-y: auto;
  background: var(--surface);
  scrollbar-width: thin;
  scrollbar-color: var(--border-md) transparent;
}

.mfc-branch-row {
  display: flex; align-items: center;
  gap: 12px;
  padding: 9px 14px;
  cursor: pointer;
  border-bottom: 1px solid var(--border);
  transition: background var(--t);
  user-select: none;
}
.mfc-branch-row:last-child { border-bottom: none; }
.mfc-branch-row:hover { background: var(--surface-3); }
.mfc-branch-row.sel { background: rgba(232,168,32,0.06); }

.mfc-branch-cb {
  width: 16px; height: 16px;
  border-radius: 4px;
  border: 1.5px solid var(--border-md);
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
  transition: all var(--t);
  font-size: 9px; font-weight: 700;
  color: var(--navy);
}
.mfc-branch-row.sel .mfc-branch-cb {
  background: var(--gold);
  border-color: var(--gold);
}

.mfc-branch-dot {
  width: 6px; height: 6px;
  border-radius: 50%;
  background: var(--border-md);
  flex-shrink: 0;
  transition: background var(--t);
}
.mfc-branch-row.sel .mfc-branch-dot { background: var(--gold); }

.mfc-branch-name {
  font-family: var(--font-mono);
  font-size: 12.5px;
  color: var(--text-muted);
  transition: color var(--t);
}
.mfc-branch-row.sel .mfc-branch-name { color: var(--text-primary); font-weight: 500; }

.mfc-branch-empty {
  padding: 28px;
  text-align: center;
  color: var(--text-faint);
  font-size: 12px;
  font-family: var(--font-mono);
}

.mfc-branch-count {
  margin-top: 8px;
  font-size: 11px;
  font-family: var(--font-mono);
  color: var(--text-faint);
}

/* ── Summary chips ── */
.mfc-chips {
  display: flex; flex-wrap: wrap; gap: 7px;
  margin-top: 14px;
  padding: 12px 14px;
  background: linear-gradient(135deg, rgba(232,168,32,0.04), rgba(77,182,232,0.04));
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
}

.mfc-chip {
  display: inline-flex; align-items: center; gap: 5px;
  font-family: var(--font-mono);
  font-size: 11px;
  padding: 4px 10px;
  border-radius: 20px;
  font-weight: 500;
}

.chip-branch { background: var(--sky-muted); color: var(--sky); border: 1px solid rgba(77,182,232,0.2); }
.chip-date   { background: var(--gold-muted); color: var(--gold); border: 1px solid rgba(232,168,32,0.2); }
.chip-pos    { background: var(--red-muted);  color: var(--red);  border: 1px solid rgba(192,39,45,0.2); }

/* ── Action row ── */
.mfc-actions { display: flex; gap: 10px; flex-wrap: wrap; margin-top: 18px; }

.mfc-btn {
  display: inline-flex; align-items: center; gap: 8px;
  padding: 10px 20px;
  border-radius: var(--radius-sm);
  border: none; cursor: pointer;
  font-family: var(--font-ui);
  font-size: 13px; font-weight: 600;
  letter-spacing: 0.02em;
  transition: all var(--t);
  white-space: nowrap;
}

.mfc-btn-primary {
  background: var(--navy);
  color: #fff;
  box-shadow: 0 2px 8px rgba(15,31,61,0.25);
}
.mfc-btn-primary:hover {
  background: var(--navy-light);
  box-shadow: 0 4px 16px rgba(15,31,61,0.3);
  transform: translateY(-1px);
}
.mfc-btn-primary:disabled {
  opacity: 0.6; cursor: not-allowed; transform: none;
  background: var(--navy);
}

.mfc-btn-accent {
  background: var(--gold);
  color: var(--navy);
  box-shadow: 0 2px 8px rgba(232,168,32,0.3);
}
.mfc-btn-accent:hover {
  background: var(--gold-light);
  box-shadow: 0 4px 16px rgba(232,168,32,0.35);
  transform: translateY(-1px);
}

.mfc-btn-ghost {
  background: var(--surface-2);
  color: var(--text-secondary);
  border: 1px solid var(--border-md);
}
.mfc-btn-ghost:hover {
  background: var(--surface-3);
  border-color: var(--border-md);
  color: var(--text-primary);
}

/* ── Live chip ── */
.mfc-live {
  display: inline-flex; align-items: center; gap: 5px;
  font-family: var(--font-mono);
  font-size: 10px; letter-spacing: 0.1em; text-transform: uppercase;
  padding: 4px 10px;
  border-radius: 20px;
  color: #22c55e;
  background: rgba(34,197,94,0.1);
  border: 1px solid rgba(34,197,94,0.25);
}

.mfc-live-dot {
  width: 5px; height: 5px;
  border-radius: 50%;
  background: #22c55e;
  animation: mfc-pulse 1.4s ease-in-out infinite;
}

@keyframes mfc-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}

/* ── Icon button ── */
.mfc-icon-btn {
  width: 32px; height: 32px;
  border-radius: var(--radius-sm);
  border: 1px solid rgba(255,255,255,0.12);
  background: rgba(255,255,255,0.07);
  color: rgba(255,255,255,0.55);
  display: flex; align-items: center; justify-content: center;
  cursor: pointer;
  transition: all var(--t);
}
.mfc-icon-btn:hover {
  background: rgba(255,255,255,0.14);
  color: rgba(255,255,255,0.9);
}

/* ── Console ── */
.mfc-console {
  margin-top: 20px;
  border-radius: var(--radius);
  overflow: hidden;
  border: 1px solid rgba(15,31,61,0.12);
  box-shadow: inset 0 2px 8px rgba(0,0,0,0.04);
}

.mfc-console-bar {
  display: flex; align-items: center; justify-content: space-between;
  padding: 9px 14px;
  background: var(--navy);
}

.mfc-console-title {
  display: flex; align-items: center; gap: 8px;
  font-family: var(--font-mono);
  font-size: 10.5px; letter-spacing: 0.1em; text-transform: uppercase;
  color: rgba(255,255,255,0.45);
}

.mfc-console-dot {
  width: 6px; height: 6px;
  border-radius: 50%;
  background: var(--text-faint);
}
.mfc-console-dot.live {
  background: #22c55e;
  animation: mfc-pulse 1.4s ease-in-out infinite;
}

.mfc-console-count {
  font-family: var(--font-mono);
  font-size: 10px;
  padding: 2px 8px;
  border-radius: 10px;
  background: rgba(255,255,255,0.07);
  color: rgba(255,255,255,0.4);
}

.mfc-console-body {
  background: #0b1628;
  height: 240px;
  overflow-y: auto;
  padding: 14px;
  scrollbar-width: thin;
  scrollbar-color: rgba(255,255,255,0.08) transparent;
}

.mfc-console-empty {
  height: 100%;
  display: flex; flex-direction: column;
  align-items: center; justify-content: center;
  gap: 8px;
  color: rgba(255,255,255,0.2);
  font-family: var(--font-mono);
  font-size: 12px;
}

.mfc-msg { margin-bottom: 12px; }

.mfc-msg-type {
  font-family: var(--font-mono);
  font-size: 10px; letter-spacing: 0.08em; text-transform: uppercase;
  margin-bottom: 5px;
  display: flex; align-items: center; gap: 6px;
}

.mfc-msg-type.t-queued   { color: #60c8ff; }
.mfc-msg-type.t-complete { color: #4ade80; }
.mfc-msg-type.t-error, .mfc-msg-type.t-sse-error { color: #f87171; }
.mfc-msg-type.t-stopped  { color: var(--gold-light, #f0bc44); }
.mfc-msg-type.t-message, .mfc-msg-type.t-progress { color: #a5b4fc; }
.mfc-msg-type.t-default  { color: rgba(255,255,255,0.3); }

.mfc-msg-pre {
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

.mfc-msg-hr {
  border: none;
  border-top: 1px solid rgba(255,255,255,0.04);
  margin: 10px 0;
}
`;

/* ─────────────────────────── Icons ─────────────────────────── */
const Ico = {
  Lightning: () => (
    <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
      <path d="M13 2L4.5 13.5H11L10 22L19.5 10.5H13L13 2Z"/>
    </svg>
  ),
  Calendar: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="12" height="12">
      <rect x="3" y="4" width="18" height="18" rx="2"/>
      <line x1="16" y1="2" x2="16" y2="6"/>
      <line x1="8" y1="2" x2="8" y2="6"/>
      <line x1="3" y1="10" x2="21" y2="10"/>
    </svg>
  ),
  Hash: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="12" height="12">
      <line x1="4" y1="9" x2="20" y2="9"/>
      <line x1="4" y1="15" x2="20" y2="15"/>
      <line x1="10" y1="3" x2="8" y2="21"/>
      <line x1="16" y1="3" x2="14" y2="21"/>
    </svg>
  ),
  Git: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="12" height="12">
      <circle cx="18" cy="18" r="3"/><circle cx="6" cy="6" r="3"/>
      <path d="M13 6h3a2 2 0 0 1 2 2v7"/>
      <line x1="6" y1="9" x2="6" y2="21"/>
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
      <polyline points="4 17 10 11 4 5"/>
      <line x1="12" y1="19" x2="20" y2="19"/>
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
    message: "t-message",
  };
  const cls = typeMap[m?.type ?? ""] ?? "t-default";
  return (
    <div className="mfc-msg">
      <div className={`mfc-msg-type ${cls}`}>
        <span style={{ opacity: 0.4 }}>▶</span> {m.type ?? "raw"}
      </div>
      <pre className="mfc-msg-pre">{JSON.stringify(m, null, 2)}</pre>
      <hr className="mfc-msg-hr" />
    </div>
  );
}

function BranchList({ branches, selected, setSelected }: { branches: string[]; selected: string[]; setSelected: (s: string[]) => void }) {
  const allSel = branches.length > 0 && selected.length === branches.length;
  const toggle = (b: string) => setSelected(selected.includes(b) ? selected.filter(x => x !== b) : [...selected, b]);

  return (
    <div>
      <div className="mfc-branches-header">
        <span className="mfc-label"><span className="mfc-label-icon"><Ico.Git /></span>Branches</span>
        <label className="mfc-select-all">
          <input type="checkbox" checked={allSel} onChange={e => setSelected(e.target.checked ? branches.slice() : [])} />
          Select all
        </label>
      </div>
      <div className="mfc-branch-list">
        {branches.length === 0
          ? <div className="mfc-branch-empty">Loading branches…</div>
          : branches.map(b => {
              const sel = selected.includes(b);
              return (
                <div key={b} className={`mfc-branch-row ${sel ? "sel" : ""}`} onClick={() => toggle(b)}>
                  <div className="mfc-branch-cb">{sel && "✓"}</div>
                  <div className="mfc-branch-dot" />
                  <span className="mfc-branch-name">{b}</span>
                </div>
              );
            })
        }
      </div>
      {selected.length > 0 && (
        <div className="mfc-branch-count">{selected.length} of {branches.length} selected</div>
      )}
    </div>
  );
}

function SummaryChips({ selected, date, positions }: { selected: string[]; date: string; positions: string }) {
  if (!selected.length && !date && !positions) return null;
  return (
    <div className="mfc-chips">
      {selected.length > 0 && (
        <span className="mfc-chip chip-branch">
          <Ico.Git /> {selected.length} branch{selected.length > 1 ? "es" : ""}
        </span>
      )}
      {date && <span className="mfc-chip chip-date"><Ico.Calendar /> {date}</span>}
      {positions && <span className="mfc-chip chip-pos"><Ico.Hash /> {positions}</span>}
    </div>
  );
}

/* ─────────────────────────── Main Component ─────────────────────────── */
export default function ManualFetchClient() {
  const branches = useBranches();
  const [selected, setSelected] = useState<string[]>([]);
  const [date, setDate] = useState("");
  const [positions, setPositions] = useState("1,2");
  const [messages, setMessages] = useState<any[]>([]);
  const [live, setLive] = useState(false);
  const esRef = useRef<EventSource | null>(null);
  const consoleRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (consoleRef.current) consoleRef.current.scrollTop = consoleRef.current.scrollHeight;
  }, [messages]);

  const handleStart = async () => {
    if (!date) { alert("Please select a date before starting."); return; }
    const body: any = { date };
    if (selected.length) body.branches = selected;
    if (positions.trim()) body.positions = positions;

    try {
      const resp = await fetchWithAuth(`${API_BASE}/api/fetch/manual`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await resp.json();
      if (!resp.ok) { alert(json?.message ?? "Failed to start fetch"); return; }

      setMessages(m => [...m, { type: "queued", message: "Job queued", jobId: json.jobId }]);
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
        } catch { setMessages(m => [...m, { type: "message", raw: ev.data }]); }
      };
      es.onerror = () => { setMessages(m => [...m, { type: "sse-error" }]); es.close(); setLive(false); };
    } catch (e) {
      setMessages(m => [...m, { type: "error", message: String(e) }]);
    }
  };

  const handleStop = () => {
    if (esRef.current) { esRef.current.close(); esRef.current = null; }
    setMessages(m => [...m, { type: "stopped", message: "Stopped by user" }]);
    setLive(false);
  };

  return (
    <div className="mfc-root">
      <style>{css}</style>
      <div className="mfc-card">
        {/* Header */}
        <div className="mfc-header">
          <div className="mfc-header-left">
            <div className="mfc-icon-wrap"><Ico.Lightning /></div>
            <div>
              <div className="mfc-title">Manual Fetch</div>
              <div className="mfc-subtitle">Trigger a date-scoped data pull</div>
            </div>
            <span className="mfc-badge">Admin</span>
          </div>
          <div className="mfc-header-right">
            {live && (
              <span className="mfc-live">
                <span className="mfc-live-dot" /> Live
              </span>
            )}
            <button className="mfc-icon-btn" title="Clear output" onClick={() => setMessages([])}>
              <Ico.Trash />
            </button>
          </div>
          <div className="mfc-header-stripe" />
        </div>

        {/* Body */}
        <div className="mfc-body">
          <div className="mfc-form-row">
            <div className="mfc-field">
              <label className="mfc-label">
                <span className="mfc-label-icon"><Ico.Calendar /></span>
                Date
              </label>
              <input
                className="mfc-input"
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
              />
            </div>
            <div className="mfc-field">
              <label className="mfc-label">
                <span className="mfc-label-icon"><Ico.Hash /></span>
                Positions
              </label>
              <input
                className="mfc-input"
                value={positions}
                onChange={e => setPositions(e.target.value)}
                placeholder="1,2"
              />
            </div>
          </div>

          <hr className="mfc-divider" />
          <BranchList branches={branches} selected={selected} setSelected={setSelected} />
          <SummaryChips selected={selected} date={date} positions={positions} />

          <div className="mfc-actions">
            <button className="mfc-btn mfc-btn-primary" onClick={handleStart} disabled={live}>
              <Ico.Play /> {live ? "Running…" : "Start Fetch"}
            </button>
            <button className="mfc-btn mfc-btn-ghost" onClick={handleStop}>
              <Ico.Square /> Stop
            </button>
          </div>

          {/* Console */}
          <div className="mfc-console">
            <div className="mfc-console-bar">
              <span className="mfc-console-title">
                <span className={`mfc-console-dot ${live ? "live" : ""}`} />
                <Ico.Terminal /> Output Stream
              </span>
              <span className="mfc-console-count">{messages.length} events</span>
            </div>
            <div className="mfc-console-body" ref={consoleRef}>
              {messages.length === 0
                ? <div className="mfc-console-empty"><Ico.Terminal /><span>Awaiting output…</span></div>
                : messages.map((m, i) => <ConsoleMessage key={i} m={m} />)
              }
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}