 
"use client";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import auth from "@/utils/auth";
import { fetchWithAuth, getUser } from "@/utils/auth";
import ToastProvider, { useToast } from "@/components/ToastProvider";
import LoginLayout from "@/components/login-layout";
import ManualFetchClient from "@/components/manual-fetch-client";
import MissingScanClient from "@/components/missing-scan-client";
import CombineClient from "@/components/combine-client";
import AdminRetentionPanel from "@/components/AdminRetentionPanel";
import useDashboardStats from "@/hooks/useDashboardStats";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5000";

/* ─────────────────────────── CSS ─────────────────────────── */
const css = `
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700;800&family=DM+Sans:wght@300;400;500;600;700&family=DM+Mono:wght@400;500&display=swap');

.dash-root *,
.dash-root *::before,
.dash-root *::after { box-sizing: border-box; margin: 0; padding: 0; }

.dash-root {
  --navy:       #0f1f3d;
  --navy-mid:   #162848;
  --navy-light: #1e3560;
  --red:        #c0272d;
  --gold:       #e8a820;
  --gold-light: #f0bc44;
  --sky:        #4db6e8;
  --sky-light:  #72caee;

  --bg:         #f0f2f6;
  --surface:    #ffffff;
  --surface-2:  #f9fafb;
  --surface-3:  #f2f4f7;
  --border:     rgba(15,31,61,0.07);
  --border-md:  rgba(15,31,61,0.12);

  --text-primary:   #0f1f3d;
  --text-secondary: #374a6b;
  --text-muted:     #6d7f9e;
  --text-faint:     #a3adc0;

  --shadow-sm:  0 2px 6px rgba(15,31,61,0.06), 0 1px 2px rgba(15,31,61,0.04);
  --shadow-md:  0 4px 16px rgba(15,31,61,0.08), 0 1px 4px rgba(15,31,61,0.05);

  --font-display: 'Kanit', -apple-system, BlinkMacSystemFont, sans-serif;
  --font-ui:      'Kanit', -apple-system, BlinkMacSystemFont, sans-serif;
  --font-mono:    'DM Mono', monospace;
  --t:            220ms cubic-bezier(0.4,0,0.2,1);
  --radius:       12px;
  --radius-lg:    16px;
  --radius-xl:    20px;

  font-family: var(--font-ui);
  color: var(--text-primary);
  background: var(--bg);
  min-height: 100vh;
  -webkit-font-smoothing: antialiased;
}

/* ── Page shell ── */
.dash-shell {
  min-height: 100vh;
  background: var(--bg);
  background-image:
    radial-gradient(ellipse 70% 40% at 5% 0%, rgba(77,182,232,0.07) 0%, transparent 55%),
    radial-gradient(ellipse 50% 30% at 95% 100%, rgba(232,168,32,0.05) 0%, transparent 50%);
  padding: 32px 24px 20px;
}

@media (max-width: 640px) {
  .dash-shell { padding: 18px 14px 18px; }
}

.dash-inner {
  max-width: 1500px;
  margin: 0 auto;
}

/* ── Top bar ── */
.dash-topbar {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 20px;
  margin-bottom: 36px;
  flex-wrap: wrap;
}

.dash-brand {
  display: flex;
  align-items: center;
  gap: 16px;
}

.dash-logo {
  width: 48px; height: 48px;
  border-radius: 13px;
  background: var(--navy);
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
  box-shadow: var(--shadow-md);
  position: relative;
  overflow: hidden;
}

.dash-logo::after {
  content: '';
  position: absolute;
  bottom: 0; left: 0; right: 0;
  height: 3px;
  background: linear-gradient(90deg, var(--gold), var(--red));
}

.dash-logo-text {
  font-family: var(--font-display);
  font-size: 20px; font-weight: 800;
  color: var(--gold);
  letter-spacing: -0.02em;
  line-height: 1;
}

.dash-heading-group { display: flex; flex-direction: column; gap: 3px; }

.dash-eyebrow {
  font-family: var(--font-mono);
  font-size: 10px; letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--text-faint);
}

.dash-title {
  font-family: 'Kanit', sans-serif;
  font-size: 24px; font-weight: 700;
  color: var(--text-primary);
  letter-spacing: -0.02em;
  line-height: 1.1;
}

.dash-desc {
  font-size: 13px;
  color: var(--text-muted);
  margin-top: 2px;
}

/* ── Date pill ── */
.dash-date-pill {
  display: flex; align-items: center; gap: 8px;
  padding: 8px 16px;
  background: var(--surface);
  border: 1px solid var(--border-md);
  border-radius: 30px;
  box-shadow: var(--shadow-sm);
  align-self: center;
}

.dash-date-dot {
  width: 7px; height: 7px; border-radius: 50%;
  background: var(--gold);
  flex-shrink: 0;
}

.dash-date-text {
  font-family: var(--font-mono);
  font-size: 11.5px; font-weight: 500;
  color: var(--text-secondary);
  letter-spacing: 0.02em;
  white-space: nowrap;
}

/* ── Stat cards ── */
.dash-stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 14px;
  margin-bottom: 28px;
}

@media (max-width: 760px) { .dash-stats { grid-template-columns: 1fr 1fr; } }
@media (max-width: 480px) { .dash-stats { grid-template-columns: 1fr; } }

.stat-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: 20px 22px;
  box-shadow: var(--shadow-sm);
  position: relative;
  overflow: hidden;
  transition: box-shadow var(--t), transform var(--t);
  animation: dash-fade 0.4s ease both;
}
.stat-card-clickable { cursor: pointer; }
.stat-card:hover { box-shadow: var(--shadow-md); transform: translateY(-2px); }
.stat-card:nth-child(1) { animation-delay: 0.05s; }
.stat-card:nth-child(2) { animation-delay: 0.1s; }
.stat-card:nth-child(3) { animation-delay: 0.15s; }

@keyframes dash-fade {
  from { opacity: 0; transform: translateY(10px); }
  to   { opacity: 1; transform: translateY(0); }
}

.stat-card-accent {
  position: absolute;
  top: 0; left: 0; right: 0;
  height: 3px;
}
.stat-card-accent.gold  { background: linear-gradient(90deg, var(--gold), var(--gold-light)); }
.stat-card-accent.sky   { background: linear-gradient(90deg, var(--sky), var(--sky-light)); }
.stat-card-accent.red   { background: linear-gradient(90deg, var(--red), #e84040); }

.stat-card-top {
  display: flex; align-items: flex-start; justify-content: space-between;
  margin-bottom: 16px;
}

.stat-icon {
  width: 36px; height: 36px; border-radius: 10px;
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
}
.stat-icon-gold { background: rgba(232,168,32,0.1); color: var(--gold); border: 1px solid rgba(232,168,32,0.2); }
.stat-icon-sky  { background: rgba(77,182,232,0.1);  color: var(--sky);  border: 1px solid rgba(77,182,232,0.22); }
.stat-icon-red  { background: rgba(192,39,45,0.08);  color: var(--red);  border: 1px solid rgba(192,39,45,0.18); }

.stat-trend {
  font-family: var(--font-mono);
  font-size: 10.5px; font-weight: 500;
  padding: 3px 8px; border-radius: 10px;
}
.stat-trend-up   { background: rgba(34,197,94,0.08); color: #22c55e; }
.stat-trend-flat { background: rgba(107,127,158,0.08); color: var(--text-muted); }

.stat-label {
  font-size: 11px; font-weight: 600;
  letter-spacing: 0.08em; text-transform: uppercase;
  color: var(--text-muted);
  margin-bottom: 4px;
}

.stat-value {
  font-family: var(--font-display);
  font-size: 28px; font-weight: 700;
  color: var(--text-primary);
  line-height: 1;
  letter-spacing: -0.02em;
  display: flex; align-items: center; gap: 8px;
  min-height: 34px;
}

.stat-sub {
  font-size: 12px; color: var(--text-muted);
  margin-top: 6px;
}

/* Spinner */
.stat-spinner {
  width: 20px; height: 20px;
  border: 2px solid var(--border-md);
  border-top-color: var(--gold);
  border-radius: 50%;
  animation: dash-spin 0.8s linear infinite;
}
@keyframes dash-spin { to { transform: rotate(360deg); } }

/* ── Section label ── */
.dash-section-label {
  display: flex; align-items: center; gap: 10px;
  margin-bottom: 14px;
}
.dash-section-label span {
  font-size: 11px; font-weight: 700;
  letter-spacing: 0.1em; text-transform: uppercase;
  color: var(--text-muted);
}
.dash-section-rule {
  flex: 1; height: 1px;
  background: var(--border);
}

/* ── Main two-col grid ── */
.dash-main-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 18px;
  margin-bottom: 22px;
}
@media (max-width: 820px) { .dash-main-grid { grid-template-columns: 1fr; } }

/* ── Retention section ── */
.dash-retention { margin-top: 6px; }

/* Animate children */
.dash-main-grid > *:nth-child(1) { animation: dash-fade 0.4s 0.2s ease both; }
.dash-main-grid > *:nth-child(2) { animation: dash-fade 0.4s 0.28s ease both; }
.dash-retention { animation: dash-fade 0.4s 0.36s ease both; }

/* ── Manager compact layout ── */
.manager-actions {
  display: grid;
  grid-template-columns: 1fr;
  gap: 10px;
  margin-bottom: 14px;
}
@media (min-width: 700px) {
  .manager-actions { grid-template-columns: 1fr 1fr; }
}
@media (min-width: 1120px) {
  .manager-actions { grid-template-columns: repeat(3, minmax(0, 1fr)); }
}

.manager-action-btn {
  border: 1px solid var(--border-md);
  border-radius: 12px;
  padding: 11px 12px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  color: var(--text-primary);
  box-shadow: var(--shadow-sm);
  cursor: pointer;
  transition: transform var(--t), box-shadow var(--t);
}
.manager-action-btn:hover { transform: translateY(-1px); box-shadow: var(--shadow-md); }
.manager-action-title {
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: white;
}
.manager-action-value {
  font-size: 18px;
  font-weight: 700;
  line-height: 1.1;
  color: #374151;
}

.manager-kpi-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 10px;
  margin-bottom: 12px;
}
@media (min-width: 700px) {
  .manager-kpi-grid { grid-template-columns: 1fr 1fr; }
}
@media (min-width: 1200px) {
  .manager-kpi-grid { grid-template-columns: repeat(4, minmax(0, 1fr)); }
}

.manager-kpi-card {
  background: rgba(255, 255, 255, 0.15);
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
  border-radius: 20px;
  border: 1px solid rgba(255, 255, 255, 0.3);
  box-shadow: 
    0 8px 32px rgba(0, 0, 0, 0.1),
    inset 0 1px 0 rgba(255, 255, 255, 0.5),
    inset 0 -1px 0 rgba(255, 255, 255, 0.1),
    inset 0 0 26px 13px rgba(255, 255, 255, 1.3);
  position: relative;
  overflow: hidden;
  padding: 12px;
}

.manager-kpi-card::before {
 content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 1px;
  background: linear-gradient(
    90deg,
    transparent,
    rgba(9, 0, 0, 0.8),
    transparent
  );
}
.manager-kpi-label {
  font-size: 10.5px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--text-muted);
}
.manager-kpi-value {
  margin-top: 6px;
  font-size: 22px;
  font-weight: 700;
  line-height: 1;
  min-height: 22px;
}
.manager-kpi-sub {
  margin-top: 5px;
  font-size: 11px;
  color: var(--text-muted);
}

.manager-block {
  border: 1px solid var(--border);
  background: var(--surface);
  border-radius: 12px;
  box-shadow: var(--shadow-sm);
  padding: 12px;
  margin-bottom: 10px;
}

.topsell-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  flex-wrap: wrap;
}
.topsell-tabs {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px;
  border: 1px solid var(--border);
  border-radius: 999px;
  background: var(--surface-2);
}
.topsell-tab {
  border: 0;
  background: transparent;
  color: var(--text-secondary);
  border-radius: 999px;
  padding: 5px 10px;
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
}
.topsell-tab.active {
  background: var(--surface);
  color: var(--text-primary);
  box-shadow: var(--shadow-sm);
}
.topsell-right {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  justify-content: flex-end;
}
.topsell-kpis {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
.topsell-kpi {
  border: 1px solid var(--border);
  background: var(--surface-2);
  border-radius: 10px;
  padding: 5px 8px;
  min-width: 94px;
}
.topsell-kpi-label {
  font-size: 10px;
  color: var(--text-muted);
  letter-spacing: 0.04em;
  text-transform: uppercase;
}
.topsell-kpi-value {
  font-size: 12px;
  font-weight: 700;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 180px;
}
.topsell-chart {
  margin-top: 10px;
  display: grid;
  gap: 8px;
}
.topsell-row {
  display: grid;
  grid-template-columns: minmax(110px, 220px) 1fr auto;
  align-items: center;
  gap: 10px;
}
@media (max-width: 700px) {
  .topsell-row {
    grid-template-columns: 1fr;
    gap: 6px;
  }
}
.topsell-name {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.topsell-bar-wrap {
  width: 100%;
  height: 9px;
  border-radius: 999px;
  background: var(--surface-3);
  overflow: hidden;
}
.topsell-bar {
  height: 100%;
  border-radius: 999px;
  background: linear-gradient(90deg, var(--sky), var(--sky-light));
}
.topsell-amount {
  font-size: 12px;
  font-weight: 700;
  color: var(--text-secondary);
  white-space: nowrap;
}
.topsell-sub {
  font-size: 11px;
  color: var(--text-muted);
}

.topsell-trend {
  margin-top: 10px;
  padding: 8px;
  border: 1px solid var(--border);
  border-radius: 10px;
  background: var(--surface-2);
}
.topsell-trend-bars {
  display: flex;
  align-items: flex-end;
  gap: 6px;
  height: 46px;
}
.topsell-trend-col {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: flex-end;
}
.topsell-trend-bar {
  width: 100%;
  border-radius: 7px 7px 3px 3px;
  background: linear-gradient(180deg, var(--gold-light), var(--gold));
  min-height: 4px;
}
.topsell-trend-labels {
  margin-top: 5px;
  display: flex;
  gap: 6px;
}
.topsell-trend-label {
  flex: 1;
  min-width: 0;
  text-align: center;
  font-size: 10px;
  color: var(--text-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.topsell-trend-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 6px;
}
.topsell-trend-change {
  font-size: 11px;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 999px;
}
.topsell-trend-change.up {
  background: rgba(16, 185, 129, 0.14);
  color: #059669;
}
.topsell-trend-change.down {
  background: rgba(239, 68, 68, 0.14);
  color: #dc2626;
}
.topsell-trend-change.flat {
  background: rgba(100, 116, 139, 0.14);
  color: #475569;
}
.topsell-trend-list {
  display: grid;
  gap: 6px;
}
.topsell-trend-item {
  display: grid;
  grid-template-columns: 1fr auto auto;
  gap: 8px;
  align-items: center;
  font-size: 11px;
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 6px 8px;
  background: var(--surface);
}
.topsell-trend-item-label {
  color: var(--text-secondary);
  font-weight: 600;
}
.topsell-trend-item-amount {
  color: var(--text-primary);
  font-weight: 700;
  white-space: nowrap;
}
.topsell-trend-item-delta {
  color: var(--text-muted);
  white-space: nowrap;
}
`;

/* ─────────────────────────── Icons ─────────────────────────── */
const Ico = {
  Activity: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
    </svg>
  ),
  Upload: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
      <polyline points="16 16 12 12 8 16"/>
      <line x1="12" y1="12" x2="12" y2="21"/>
      <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/>
    </svg>
  ),
  Files: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
      <polyline points="14 2 14 8 20 8"/>
    </svg>
  ),
};

/* ─────────────────────────── Stat Card ─────────────────────────── */
function StatCard({
  label, value, sub, icon, accentClass, iconClass, trend, trendLabel, loading, onClick,
}: {
  label: string; value: number | null | undefined; sub: string;
  icon: React.ReactNode; accentClass: string; iconClass: string;
  trend?: "up" | "flat"; trendLabel?: string; loading: boolean;
  onClick?: () => void;
}) {
  const renderValue = () => {
    if (loading && value === undefined) return <div className="stat-spinner" />;
    if (value === null || value === undefined) return "—";
    return value.toLocaleString();
  };

   // Debug state for showing parsed salesRows
  const [showDebug, setShowDebug] = useState(false);
          {/* Debug panel toggle */}
          <div style={{ marginBottom: 12 }}>
            <button
              type="button"
              className="px-3 py-1 rounded bg-gray-200 text-gray-800 hover:bg-gray-300"
              onClick={() => setShowDebug(v => !v)}
            >
              {showDebug ? "Hide" : "Show"} Debug Parsed Data
            </button>
          </div>

          {/* Debug panel for parsed salesRows */}
          {showDebug && (
            <div style={{ maxHeight: 320, overflow: "auto", background: "#f9fafb", border: "1px solid #ddd", borderRadius: 8, padding: 12, marginBottom: 18 }}>
              <div style={{ fontWeight: 600, marginBottom: 6 }}>Parsed SalesRows (Latest Date: {managerTopSalesDate})</div>
              <table style={{ fontSize: 13, width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: "#eee" }}>
                    <th style={{ padding: "4px 8px", border: "1px solid #ccc" }}>Item Code</th>
                    <th style={{ padding: "4px 8px", border: "1px solid #ccc" }}>Product Name</th>
                    <th style={{ padding: "4px 8px", border: "1px solid #ccc" }}>Quantity</th>
                    <th style={{ padding: "4px 8px", border: "1px solid #ccc" }}>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {salesRows.filter(row => row.dailyKey === managerTopSalesDate).map((row, idx) => (
                    <tr key={row.name + row.dailyKey + idx}>
                      <td style={{ padding: "4px 8px", border: "1px solid #ccc" }}>{row.itemCode || ""}</td>
                      <td style={{ padding: "4px 8px", border: "1px solid #ccc" }}>{row.name}</td>
                      <td style={{ padding: "4px 8px", border: "1px solid #ccc" }}>{row.quantity}</td>
                      <td style={{ padding: "4px 8px", border: "1px solid #ccc" }}>₱{row.amount.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}


  return (
    <div
      className={`stat-card ${onClick ? 'stat-card-clickable' : ''}`}
      onClick={onClick}
      onKeyDown={(e) => { if (onClick && (e.key === 'Enter' || e.key === ' ')) onClick(); }}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      <div className={`stat-card-accent ${accentClass}`} />
      <div className="stat-card-top">
        <div className={`stat-icon ${iconClass}`}>{icon}</div>
        {trendLabel && (
          <span className={`stat-trend ${trend === "up" ? "stat-trend-up" : "stat-trend-flat"}`}>
            {trendLabel}
          </span>
        )}
      </div>
      <div className="stat-label">{label}</div>
      <div className="stat-value">{renderValue()}</div>
      <div className="stat-sub">{sub}</div>
    </div>
  );
}

function getApiBases() {
  const candidates = [
    process.env.NEXT_PUBLIC_API_BASE_URL,
    API_BASE,
    "http://localhost:5000",
    "http://127.0.0.1:5000",
  ].filter((value): value is string => Boolean(String(value || "").trim()));
  return Array.from(new Set(candidates));
}

function normalizeBranchScope(user: any) {
  const raw = user?.managedBranches || user?.managed_branches || user?.branches;
  if (Array.isArray(raw)) {
    return Array.from(new Set(raw.map((item: any) => String(item || "").trim()).filter(Boolean)));
  }
  if (typeof raw === "string") {
    return Array.from(new Set(raw.split(",").map((item: string) => item.trim()).filter(Boolean)));
  }
  return [];
}

function formatSimpleDate(value?: string) {
  if (!value) return "—";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "—";
  return parsed.toISOString().slice(0, 10);
}

function toNumber(value: unknown) {
  const raw = String(value == null ? "" : value).replace(/,/g, "").trim();
  if (!raw) return 0;
  const numeric = Number(raw);
  return Number.isFinite(numeric) ? numeric : 0;
}

type TopSellingPeriod = "daily" | "weekly" | "monthly";
type TopSellingItem = { name: string; amount: number; quantity: number };
type TopSellingTrendPoint = { key: string; label: string; amount: number };

function parseRowDateValue(value: unknown): Date | null {
  const rawOriginal = String(value == null ? "" : value).trim();
  const excelWrapped = /^="(.*)"$/.exec(rawOriginal);
  const raw = excelWrapped ? String(excelWrapped[1] || "").trim() : rawOriginal;
  if (!raw) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    const parsed = new Date(`${raw}T00:00:00`);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  const parsed = new Date(raw);
  if (!Number.isNaN(parsed.getTime())) return parsed;

  const slash = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(raw);
  if (!slash) return null;
  const month = Number(slash[1]);
  const day = Number(slash[2]);
  const year = Number(slash[3]);
  const fallback = new Date(year, month - 1, day);
  return Number.isNaN(fallback.getTime()) ? null : fallback;
}

function toDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function toWeekStartKey(date: Date) {
  const copy = new Date(date.getTime());
  const day = copy.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  copy.setDate(copy.getDate() + diff);
  return toDateKey(copy);
}

function formatShortDate(date: Date) {
  return `${String(date.getMonth() + 1).padStart(2, "0")}/${String(date.getDate()).padStart(2, "0")}`;
}

/* ─────────────────────────── Dashboard Content ─────────────────────────── */
function DashboardContent() {
  const toast = useToast();
  const router = useRouter();
  const [role, setRole] = useState<string>(() => {
    try {
      return String(getUser()?.role || 'user').toLowerCase();
    } catch {
      return 'user';
    }
  });

  useEffect(() => {
    const readRole = () => {
      try {
        const user = getUser();
        setRole(String(user?.role || 'user').toLowerCase());
      } catch {
        setRole('user');
      }
    };

    readRole();
    const onStorage = (e: StorageEvent) => {
      if (!e || e.key === 'user' || e.key === 'accessToken') readRole();
    };
    window.addEventListener('storage', onStorage);
    window.addEventListener('auth:token', readRole as EventListener);
    window.addEventListener('auth:logout', readRole as EventListener);

    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('auth:token', readRole as EventListener);
      window.removeEventListener('auth:logout', readRole as EventListener);
    };
  }, []);

  const isAdmin = role === 'admin';
  const isManager = role === 'manager';
  const { stats, loading, lastError } = useDashboardStats(10000, isAdmin);
  const [managerBranches, setManagerBranches] = useState<string[]>([]);
  const [managerLoading, setManagerLoading] = useState(false);
  const [managerMissingCount, setManagerMissingCount] = useState<number | null>(null);
  const [managerSentCount, setManagerSentCount] = useState<number | null>(null);
  const [managerLatestWorkDate, setManagerLatestWorkDate] = useState<string>("");
  const [managerTopSalesDate, setManagerTopSalesDate] = useState<string>("");
  const [managerTopProductsByPeriod, setManagerTopProductsByPeriod] = useState<Record<TopSellingPeriod, TopSellingItem[]>>({
    daily: [],
    weekly: [],
    monthly: [],
  });
  const [managerTopTrendByPeriod, setManagerTopTrendByPeriod] = useState<Record<TopSellingPeriod, TopSellingTrendPoint[]>>({
    daily: [],
    weekly: [],
    monthly: [],
  });

  useEffect(() => {
    if (!isManager) {
      setManagerBranches([]);
      return;
    }

    const loadAssignedBranches = async () => {
      try {
        const user = getUser();
        const localBranches = normalizeBranchScope(user);
        const userId = String(user?.id || user?._id || "").trim();
        const userEmail = String(user?.email || "").trim().toLowerCase();
        const userName = String(user?.username || "").trim().toLowerCase();
        if (!userId) {
          setManagerBranches(localBranches);
          return;
        }

        const apiBases = getApiBases();
        let gotAuthoritativeScope = false;
        for (const base of apiBases) {
          const response = await fetchWithAuth(`${base}/api/auth/users/${encodeURIComponent(userId)}`, { method: "GET" });
          if (response.status === 599) continue;
          if (!response.ok) continue;
          gotAuthoritativeScope = true;
          const json = await response.json().catch(() => ({}));
          const apiBranches = normalizeBranchScope(json?.user);
          setManagerBranches(apiBranches);
          return;
        }

        if (!gotAuthoritativeScope) {
          for (const base of apiBases) {
            const response = await fetchWithAuth(`${base}/api/auth/users`, { method: "GET" });
            if (response.status === 599) continue;
            if (!response.ok) continue;

            const json = await response.json().catch(() => ({}));
            const users = Array.isArray(json?.users) ? json.users : [];
            const matched = users.find((item: any) => {
              const itemId = String(item?.id || item?._id || "").trim();
              const itemEmail = String(item?.email || "").trim().toLowerCase();
              const itemName = String(item?.username || "").trim().toLowerCase();
              if (userId && itemId && itemId === userId) return true;
              if (userEmail && itemEmail && itemEmail === userEmail) return true;
              if (userName && itemName && itemName === userName) return true;
              return false;
            });

            if (matched) {
              setManagerBranches(normalizeBranchScope(matched));
              return;
            }
          }
        }

        setManagerBranches(localBranches);
      } catch {
        try {
          setManagerBranches(normalizeBranchScope(getUser()));
        } catch {
          setManagerBranches([]);
        }
      }
    };

    void loadAssignedBranches();
  }, [isManager]);

  useEffect(() => {
    if (!isManager) {
      setManagerMissingCount(null);
      setManagerSentCount(null);
      setManagerLatestWorkDate("");
      setManagerTopSalesDate("");
      setManagerTopProductsByPeriod({ daily: [], weekly: [], monthly: [] });
      setManagerTopTrendByPeriod({ daily: [], weekly: [], monthly: [] });
      return;
    }

    const loadManagerInsights = async () => {
      setManagerLoading(true);
      try {
        const branches = managerBranches;
        if (branches.length === 0) {
          setManagerMissingCount(0);
          setManagerSentCount(0);
          setManagerLatestWorkDate("");
          setManagerTopSalesDate("");
          setManagerTopProductsByPeriod({ daily: [], weekly: [], monthly: [] });
          setManagerTopTrendByPeriod({ daily: [], weekly: [], monthly: [] });
          return;
        }

        const apiBases = getApiBases();
        let collectedFiles: any[] = [];

        for (let page = 1; page <= 4; page += 1) {
          const params = new URLSearchParams({ page: String(page), limit: "250" });
          let response: Response | null = null;
          let payload: any = {};

          for (const base of apiBases) {
            const candidate = await fetchWithAuth(`${base}/api/fetch/files?${params.toString()}`, { method: "GET" });
            if (candidate.status === 599) continue;
            response = candidate;
            payload = await candidate.json().catch(() => ({}));
            break;
          }

          if (!response || !response.ok) break;
          const pageItems = Array.isArray(payload?.items) ? payload.items : [];
          if (pageItems.length === 0) break;
          collectedFiles = collectedFiles.concat(pageItems);
          if (pageItems.length < 250) break;
        }

        // Use all combined files for latest report date
        setManagerSentCount(collectedFiles.length);

        const allFiles = collectedFiles;
        const latestDateMs = allFiles.reduce((acc: number, item: any) => {
          const raw = String(item?.workDate || item?.work_date || "").trim();
          if (!raw) return acc;
          const ms = new Date(raw).getTime();
          if (Number.isNaN(ms)) return acc;
          return Math.max(acc, ms);
        }, 0);
        const latestWorkDateIso = latestDateMs > 0 ? new Date(latestDateMs).toISOString() : "";
        const latestWorkDateKey = latestDateMs > 0 ? toDateKey(new Date(latestDateMs)) : "";
        setManagerLatestWorkDate(latestWorkDateIso);

        let missingCount = 0;
        for (const base of apiBases) {
          const response = await fetchWithAuth(`${base}/api/fetch/missing/scan`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ source: "report_pos_sended", positions: "1,2", branches }),
          });
          if (response.status === 599) continue;
          if (!response.ok) break;
          const payload = await response.json().catch(() => ({}));
          const rows = Array.isArray(payload?.results) ? payload.results : [];
          missingCount = rows.reduce((sum: number, row: any) => sum + (Array.isArray(row?.missingDates) ? row.missingDates.length : 0), 0);
          break;
        }
        setManagerMissingCount(missingCount);

        const periodMaps: Record<TopSellingPeriod, Map<string, TopSellingItem>> = {
          daily: new Map<string, TopSellingItem>(),
          weekly: new Map<string, TopSellingItem>(),
          monthly: new Map<string, TopSellingItem>(),
        };
        const periodTrends: Record<TopSellingPeriod, Map<string, TopSellingTrendPoint>> = {
          daily: new Map<string, TopSellingTrendPoint>(),
          weekly: new Map<string, TopSellingTrendPoint>(),
          monthly: new Map<string, TopSellingTrendPoint>(),
        };

        const addToPeriod = (period: TopSellingPeriod, name: string, amount: number, quantity: number) => {
          const prev = periodMaps[period].get(name);
          if (prev) {
            prev.amount += amount;
            prev.quantity += quantity;
          } else {
            periodMaps[period].set(name, { name, amount, quantity });
          }
        };
        const addTrend = (period: TopSellingPeriod, key: string, label: string, amount: number) => {
          const existing = periodTrends[period].get(key);
          if (existing) {
            existing.amount += amount;
          } else {
            periodTrends[period].set(key, { key, label, amount });
          }
        };

        const salesRows: Array<{
          name: string;
          amount: number;
          quantity: number;
          ms: number;
          dailyKey: string;
          dailyLabel: string;
          weekKey: string;
          weekLabel: string;
        }> = [];

        for (const branch of branches) {
          for (let page = 1; page <= 2; page += 1) {
            const params = new URLSearchParams({
              page: String(page),
              limit: "500",
              branch,
              sortBy: "DATE",
              sortDir: "desc",
            });

            let pageRows: any[] = [];
            let pageLoaded = false;
            for (const base of apiBases) {
              const response = await fetchWithAuth(`${base}/api/master/preview?${params.toString()}`, { method: "GET" });
              if (response.status === 599) continue;
              if (!response.ok) break;
              const payload = await response.json().catch(() => ({}));
              pageRows = Array.isArray(payload?.rows) ? payload.rows : [];
              pageLoaded = true;
              break;
            }
            if (!pageLoaded || pageRows.length === 0) break;

            // Department lookup for robust filtering
            // Use a local department list variable instead of window.depDescList
            const depCodeMap: Record<string, string> = {};
            const depDescList = [];
            // TODO: Populate depDescList from actual department data source (e.g., API or CSV)
            // Example: depDescList = [{ DEP_CODE: "1", DEP_DESC: "CHICKEN MEALS" }, ...];
            for (const dep of depDescList) {
              depCodeMap[String(dep.DEP_CODE)] = String(dep.DEP_DESC).toLowerCase();
            }

            // Aggregate by ITEM CODE + DATE for maximum accuracy
            const productMap = new Map();
            for (const row of pageRows) {
              const itemCode = String(row?.["ITEM CODE"] || row?.["ITE_CODE"] || row?.["INCODE"] || "UNKNOWN").trim();
              const name = String(row?.["PRODUCT NAME"] || row?.["ITE_DESC"] || row?.["ITEM CODE"] || row?.["INCODE"] || "UNKNOWN").trim();
              const depName = String(row?.["DEPARTMENT NAME"] || row?.["DEP_DESC"] || "").trim().toLowerCase();
              const amount = toNumber(row?.AMOUNT ?? row?.UNT_PRIC);
              // Always use QUANTITY from CSV
              const quantity = row?.QUANTITY !== undefined ? toNumber(row?.QUANTITY) : 1;
              const dateRaw = row?.DATE ?? row?.TRANSDATE;
              const dateParsed = parseRowDateValue(dateRaw);
              if (!dateParsed) continue;
              const ms = dateParsed.getTime();
              const dailyKey = toDateKey(dateParsed);
              const dailyLabel = formatShortDate(dateParsed);
              const weekKey = toWeekStartKey(dateParsed);
              const weekDate = parseRowDateValue(weekKey);
              const weekLabel = weekDate ? `Wk ${formatShortDate(weekDate)}` : weekKey;

              if (amount <= 0) continue;
              const excludeKeywords = ["iced tea", "free", "promo", "representation", "bulk order", "loyalty", "party", "marketing", "on the house", "beverages"];
              const lowerName = name.toLowerCase();
              if (excludeKeywords.some(kw => lowerName.includes(kw))) continue;
              if (excludeKeywords.some(kw => depName.includes(kw))) continue;
              if (quantity <= 0) continue;

              // Log suspicious quantities for review
              if (quantity < 1 || quantity > 50) {
                // eslint-disable-next-line no-console
                console.warn(`Suspicious quantity for item: ${itemCode}, product: ${name}, qty: ${quantity}, date: ${dailyKey}`);
              }

              // Aggregate by ITEM CODE + DATE
              const key = `${itemCode}|${dailyKey}`;
              if (!productMap.has(key)) {
                productMap.set(key, {
                  name,
                  amount,
                  quantity,
                  ms,
                  dailyKey,
                  dailyLabel,
                  weekKey,
                  weekLabel,
                });
              } else {
                const prod = productMap.get(key);
                prod.amount += amount;
                prod.quantity += quantity;
              }
            }
            salesRows.push(...Array.from(productMap.values()));

            if (pageRows.length < 500) break;
          }
        }

        // Hybrid: use latest report date from master data, fallback to most recent sales date if no sales for that date
        let anchorMs = salesRows.reduce((max, row) => Math.max(max, row.ms), 0);
        let latestSalesKey = anchorMs > 0 ? toDateKey(new Date(anchorMs)) : "";
        let baseDayKey = latestWorkDateKey;
        let hasSalesForBaseDay = salesRows.some(row => row.dailyKey === baseDayKey);
        if (!hasSalesForBaseDay && salesRows.length > 0) {
          // Fallback: use most recent sales date
          const sortedRows = salesRows.slice().sort((a, b) => b.ms - a.ms);
          baseDayKey = sortedRows[0].dailyKey;
        }
        setManagerTopSalesDate(baseDayKey);

        const dayMs = 24 * 60 * 60 * 1000;
        const baseDayDate = parseRowDateValue(baseDayKey);
        const baseDayMs = baseDayDate ? baseDayDate.getTime() : anchorMs;
        const trendStartMs = baseDayMs > 0 ? (baseDayMs - (6 * dayMs)) : 0;

        for (const row of salesRows) {
          if (baseDayKey && row.dailyKey === baseDayKey) {
            addToPeriod("monthly", row.name, row.amount, row.quantity);
          }
          if (baseDayMs > 0 && row.ms >= trendStartMs && row.ms <= baseDayMs) {
            addTrend("monthly", row.dailyKey, row.dailyLabel, row.amount);
          }
        }

        const toTopList = (map: Map<string, TopSellingItem>) =>
          Array.from(map.values())
            .sort((a, b) => b.amount - a.amount)
            .slice(0, 5);
        const toTrendList = (map: Map<string, TopSellingTrendPoint>, maxPoints: number) =>
          Array.from(map.values())
            .sort((a, b) => a.key.localeCompare(b.key))
            .slice(-maxPoints);

        setManagerTopProductsByPeriod({
          daily: toTopList(periodMaps.daily),
          weekly: toTopList(periodMaps.weekly),
          monthly: toTopList(periodMaps.monthly),
        });
        setManagerTopTrendByPeriod({
          daily: toTrendList(periodTrends.daily, 7),
          weekly: toTrendList(periodTrends.weekly, 7),
          monthly: toTrendList(periodTrends.monthly, 6),
        });
      } catch {
        setManagerMissingCount(null);
        setManagerSentCount(null);
        setManagerLatestWorkDate("");
        setManagerTopSalesDate("");
        setManagerTopProductsByPeriod({ daily: [], weekly: [], monthly: [] });
        setManagerTopTrendByPeriod({ daily: [], weekly: [], monthly: [] });
      } finally {
        setManagerLoading(false);
      }
    };

    void loadManagerInsights();
  }, [isManager, managerBranches]);

  React.useEffect(() => {
    if (lastError) toast.addToast(`Dashboard: ${lastError}`, "error");
  }, [lastError]);

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "short", month: "short", day: "numeric", year: "numeric",
  });
  const managerTopProducts = managerTopProductsByPeriod.monthly || [];
  const topAmountMax = managerTopProducts.reduce((max, item) => Math.max(max, item.amount), 0);
  const managerTopTrend = managerTopTrendByPeriod.monthly || [];
  const periodTotalSales = managerTopProducts.reduce((sum, item) => sum + item.amount, 0);
  const periodTopProduct = managerTopProducts.length > 0 ? managerTopProducts[0].name : "—";
  const trendLastAmount = managerTopTrend.length > 0 ? managerTopTrend[managerTopTrend.length - 1].amount : 0;
  const trendPrevAmount = managerTopTrend.length > 1 ? managerTopTrend[managerTopTrend.length - 2].amount : trendLastAmount;
  const trendDelta = trendLastAmount - trendPrevAmount;
  const trendDeltaPct = trendPrevAmount > 0 ? (trendDelta / trendPrevAmount) * 100 : 0;
  const trendTone = trendDelta > 0 ? "up" : trendDelta < 0 ? "down" : "flat";
  const trendSummaryText = trendDelta > 0
    ? "Higher than previous day"
    : trendDelta < 0
      ? "Lower than previous day"
      : "Same as previous day";

  return (
    <div className="dash-root">
      <style>{css}</style>
      <div className="dash-shell">
        <div className="dash-inner">

          {/* Top bar */}
          <div className="dash-topbar">
            <div className="dash-brand">
              {/* <div className="dash-logo">
                <span className="dash-logo-text">B</span>
              </div> */}
              <div className="dash-heading-group">
                
                <h1 className="dash-title">Manager Dashboard</h1>
                <p className="dash-desc">
                  {isManager
                    ? 'View your branch assignments, report status, and performance analytics.'
                    : 'System operations, fetch control & status monitoring'}
                </p>
              </div>
            </div>
            <div className="dash-date-pill">
              <div className="dash-date-dot" />
              <span className="dash-date-text">{today}</span>
            </div>
          </div>

          {/* Stat cards */}
          {isAdmin && (
            <div className="dash-stats">
              <StatCard
                label="Active Jobs"
                value={stats?.activeJobs}
                sub="Queued and running fetch jobs"
                icon={<Ico.Activity />}
                accentClass="sky"
                iconClass="stat-icon-sky"
                trend="up"
                trendLabel="Queue"
                loading={loading}
                onClick={() => router.push('/admin/fetch-logs?status=queued,running')}
              />
              <StatCard
                label="Uploads"
                value={stats?.uploads}
                sub="CSV uploads processed"
                icon={<Ico.Upload />}
                accentClass="gold"
                iconClass="stat-icon-gold"
                trend="flat"
                trendLabel="Today"
                loading={loading}
                onClick={() => router.push('/uploads')}
              />
              <StatCard
                label="Files"
                value={stats?.files}
                sub="Files ingested & indexed"
                icon={<Ico.Files />}
                accentClass="red"
                iconClass="stat-icon-red"
                loading={loading}
                onClick={() => router.push('/files')}
              />
            </div>
          )}

          {isManager && (
            <>
              <div className="manager-actions">
                <button type="button" className="manager-action-btn bg-red-500" onClick={() => router.push('/uploads')}>
                  <div>
                    <div className="manager-action-title">Send Daily Report</div>
                    <div className="manager-action-value">Upload</div>
                  </div>
                  <div className="stat-icon stat-icon-sky "><Ico.Upload /></div>
                </button>
                <button type="button" className="manager-action-btn bg-yellow-500" onClick={() => router.push('/my-reports')}>
                  <div>
                    <div className="manager-action-title">View My Reports</div>
                    <div className="manager-action-value">View</div>
                  </div>
                  <div className="stat-icon stat-icon-red"><Ico.Files /></div>
                </button>
                <button type="button" className="manager-action-btn bg-sky-500" onClick={() => router.push('/users')}>
                  <div>
                    <div className="manager-action-title">My Profile</div>
                    <div className="manager-action-value">Open</div>
                  </div>
                  <div className="stat-icon stat-icon-gold"><Ico.Activity /></div>
                </button>
              </div>

              <div className="manager-kpi-grid">
                <div className="manager-kpi-card">
                  <div className="manager-kpi-label">Missing Dates</div>
                  <div className="manager-kpi-value text-red-500">{managerLoading ? '…' : (managerMissingCount ?? '—')}</div>
                  <div className="manager-kpi-sub">Days with missing reports (POS 1 & 2)</div>
                </div>

                <div className="manager-kpi-card">
                  <div className="manager-kpi-label">Reports Sent</div>
                  <div className="manager-kpi-value text-yellow-500">{managerLoading ? '…' : (managerSentCount ?? '—')}</div>
                  <div className="manager-kpi-sub">Total files you have submitted</div>
                </div>

                <div className="manager-kpi-card">
                  <div className="manager-kpi-label">Latest Report Date</div>
                  <div className="manager-kpi-value text-sky-500" style={{ fontSize: '16px', lineHeight: 1.2 }}>{managerLoading ? '…' : formatSimpleDate(managerLatestWorkDate)}</div>
                  <div className="manager-kpi-sub">Most recent date with submitted report</div>
                </div>

                <div className="manager-kpi-card">
                  <div className="manager-kpi-label">Your Branch</div>
                  <div className="manager-kpi-value text-blue-900" style={{ fontSize: '14px', lineHeight: 1.25, whiteSpace: 'normal', wordBreak: 'break-word' }}>
                    {managerBranches.length > 0 ? managerBranches.join(', ') : '—'}
                  </div>
                  <div className="manager-kpi-sub">Branch assigned to your account</div>
                </div>
              </div>

              <div className="manager-block">
                <div className="topsell-head">
                  <div>
                    <div className="stat-label" style={{ marginBottom: 0 }}>Best-Selling Products (Latest Report Date)</div>
                    <div className="topsell-sub" style={{ marginTop: '4px' }}>
                      Based on your branch reports • date used: {managerTopSalesDate || '—'}
                    </div>
                    <div className="topsell-sub" style={{ marginTop: '2px' }}>
                      How to read this: higher sales amount means better-selling product.
                    </div>
                  </div>
                  <div className="topsell-right">
                    <div className="topsell-kpis">
                      <div className="topsell-kpi" title="Total sales amount for latest work date">
                        <div className="topsell-kpi-label">Total Sales (Day)</div>
                        <div className="topsell-kpi-value">₱{periodTotalSales.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
                      </div>
                      <div className="topsell-kpi" title={periodTopProduct}>
                        <div className="topsell-kpi-label">#1 Product (Day)</div>
                        <div className="topsell-kpi-value">{periodTopProduct}</div>
                      </div>
                    </div>
                  </div>
                </div>

                {managerLoading ? (
                  <div className="stat-sub" style={{ marginTop: '8px' }}>Loading top products...</div>
                ) : managerTopProducts.length === 0 ? (
                   <>
                     {/* Badge for no sales on latest date */}
                     {managerTopSalesDate && periodTotalSales === 0 && (
                       <div className="inline-block px-2 py-1 mb-2 text-xs font-semibold text-red-600 bg-red-100 rounded">
                         No sales on latest date
                       </div>
                     )}
                     <div className="stat-sub" style={{ marginTop: '8px' }}>
                       No sales data found for <span className="font-semibold">{managerTopSalesDate}</span>.<br />
                       Please check if the uploaded CSV contains sales for this date.<br />
                       If not, the dashboard will show the most recent available sales data.
                     </div>
                   </>
                ) : (
                  <div className="topsell-chart">
                    {managerTopTrend.length > 0 ? (
                      <div className="topsell-trend">
                        <div className="topsell-trend-head">
                          <div className="topsell-sub">Sales trend (recent 7 days)</div>
                          <div className={`topsell-trend-change ${trendTone}`}>
                            {trendDelta > 0 ? "▲" : trendDelta < 0 ? "▼" : "■"} {Math.abs(trendDeltaPct).toFixed(1)}% • {trendSummaryText}
                          </div>
                        </div>

                        <div className="topsell-trend-list">
                          {managerTopTrend.map((point, idx) => {
                            const prev = idx > 0 ? managerTopTrend[idx - 1].amount : point.amount;
                            const delta = point.amount - prev;
                            const sign = delta > 0 ? "+" : delta < 0 ? "-" : "±";
                            return (
                              <div key={point.key} className="topsell-trend-item">
                                <div className="topsell-trend-item-label">{point.label}</div>
                                <div className="topsell-trend-item-amount">₱{point.amount.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
                                <div className="topsell-trend-item-delta">{sign} ₱{Math.abs(delta).toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ) : null}

                    {managerTopProducts.map((item, index) => {
                      const pct = topAmountMax > 0 ? Math.max(8, Math.round((item.amount / topAmountMax) * 100)) : 0;
                      return (
                        <div key={`${item.name}-${index}`} className="topsell-row">
                          <div style={{ minWidth: 0 }}>
                            <div className="topsell-name">{index + 1}. {item.name}</div>
                            <div className="topsell-sub">Qty {item.quantity.toLocaleString()}</div>
                          </div>
                          <div className="topsell-bar-wrap" aria-hidden="true">
                            <div className="topsell-bar" style={{ width: `${pct}%` }} />
                          </div>
                          <div className="topsell-amount">₱{item.amount.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
                        </div>
                      );
                    })}
                    <div className="topsell-sub" style={{ marginTop: '2px' }}>
                      Ranking window: Latest report date only
                    </div>
                  </div>
                )}
              </div>

              <div className="manager-block" style={{ marginBottom: '8px' }}>
                <div className="stat-label">Assigned Branches</div>
                <div style={{ marginTop: '8px', display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {managerBranches.length > 0 ? managerBranches.map((branch) => (
                    <span key={branch} style={{ padding: '4px 10px', borderRadius: '999px', border: '1px solid var(--border-md)', background: 'var(--surface-2)', fontSize: '12px', color: 'var(--text-secondary)' }}>
                      {branch}
                    </span>
                  )) : (
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>No branch scope assigned.</span>
                  )}
                </div>
                <div className="stat-sub" style={{ marginTop: '8px' }}>
                  Tip: use Upload for daily sending, then My Sent Reports to review status and missing dates.
                </div>
              </div>
            </>
          )}

          {isAdmin && (
            <>
              {/* Fetch tools */}
              <div className="dash-section-label">
                <span>Fetch Tools</span>
                <div className="dash-section-rule" />
              </div>

              <div className="dash-main-grid">
                <ManualFetchClient />
                <MissingScanClient />
              </div>

              {/* Combine tools */}
              <div className="dash-section-label" style={{ marginTop: "28px" }}>
                <span>Merge & Combine</span>
                <div className="dash-section-rule" />
              </div>

              <div style={{ marginBottom: "22px" }}>
                <CombineClient />
              </div>

              {/* Retention */}
              <div className="dash-section-label">
                <span>Retention</span>
                <div className="dash-section-rule" />
              </div>

              <div className="dash-retention">
                <AdminRetentionPanel />
              </div>
            </>
          )}

        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────── Page ─────────────────────────── */
export default function DashboardPage() {
  const router = useRouter();
  const [authChecked, setAuthChecked] = useState(false);
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    const token = auth.getAccessToken();
    if (!token) {
      setIsAuthorized(false);
      setAuthChecked(true);
      router.replace("/login");
      return;
    }

    setIsAuthorized(true);
    setAuthChecked(true);
  }, [router]);

  if (!authChecked || !isAuthorized) {
    return null;
  }

  return (
    <LoginLayout>
      <ToastProvider>
        <DashboardContent />
      </ToastProvider>
    </LoginLayout>
  );
}