"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import auth from "@/utils/auth";
import ToastProvider, { useToast } from "@/components/ToastProvider";
import LoginLayout from "@/components/login-layout";
import ManualFetchClient from "@/components/manual-fetch-client";
import MissingScanClient from "@/components/missing-scan-client";
import AdminRetentionPanel from "@/components/AdminRetentionPanel";
import useDashboardStats from "@/hooks/useDashboardStats";

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

  --font-display: 'Playfair Display', Georgia, serif;
  --font-ui:      'DM Sans', sans-serif;
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
  padding: 32px 24px 56px;
}

// @media (max-width: 640px) {
//   .dash-shell { padding: 20px 16px 40px; }
// }

.dash-inner {
  max-width: 1100px;
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
  font-family: 'Poppins', sans-serif;
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
  label, value, sub, icon, accentClass, iconClass, trend, trendLabel, loading,
}: {
  label: string; value: number | null | undefined; sub: string;
  icon: React.ReactNode; accentClass: string; iconClass: string;
  trend?: "up" | "flat"; trendLabel?: string; loading: boolean;
}) {
  const renderValue = () => {
    if (loading && value === undefined) return <div className="stat-spinner" />;
    if (value === null || value === undefined) return "—";
    return value.toLocaleString();
  };

  return (
    <div className="stat-card">
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

/* ─────────────────────────── Dashboard Content ─────────────────────────── */
function DashboardContent() {
  const { stats, loading, lastError } = useDashboardStats();
  const toast = useToast();

  React.useEffect(() => {
    if (lastError) toast.addToast(`Dashboard: ${lastError}`, "error");
  }, [lastError]);

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "short", month: "short", day: "numeric", year: "numeric",
  });

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
                <span className="dash-eyebrow">Biggs 1983 · Operations</span>
                <h1 className="dash-title">Ops Dashboard</h1>
                <p className="dash-desc">System operations, fetch control & status monitoring</p>
              </div>
            </div>
            <div className="dash-date-pill">
              <div className="dash-date-dot" />
              <span className="dash-date-text">{today}</span>
            </div>
          </div>

          {/* Stat cards */}
          <div className="dash-stats">
            <StatCard
              label="Live Events"
              value={stats?.liveEvents}
              sub="Active queue activity"
              icon={<Ico.Activity />}
              accentClass="sky"
              iconClass="stat-icon-sky"
              trend="up"
              trendLabel="↑ Live"
              loading={loading}
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
            />
            <StatCard
              label="Files"
              value={stats?.files}
              sub="Files ingested & indexed"
              icon={<Ico.Files />}
              accentClass="red"
              iconClass="stat-icon-red"
              loading={loading}
            />
          </div>

          {/* Fetch tools */}
          <div className="dash-section-label">
            <span>Fetch Tools</span>
            <div className="dash-section-rule" />
          </div>

          <div className="dash-main-grid">
            <ManualFetchClient />
            <MissingScanClient />
          </div>

          {/* Retention */}
          <div className="dash-section-label">
            <span>Retention</span>
            <div className="dash-section-rule" />
          </div>

          <div className="dash-retention">
            <AdminRetentionPanel />
          </div>

        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────── Page ─────────────────────────── */
export default function DashboardPage() {
  const router = useRouter();

  useEffect(() => {
    const token = auth.getAccessToken();
    if (!token) router.push("/login");
  }, [router]);

  return (
    <LoginLayout>
      <ToastProvider>
        <DashboardContent />
      </ToastProvider>
    </LoginLayout>
  );
}