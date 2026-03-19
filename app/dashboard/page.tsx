"use client";

import React, { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import auth from "@/utils/auth";
import { fetchWithAuth, getUser } from "@/utils/auth";
import LoginLayout from "@/components/login-layout";
import ManualFetchClient from "@/components/manual-fetch-client";
import MissingScanClient from "@/components/missing-scan-client";
import CombineClient from "@/components/combine-client";
import AdminRetentionPanel from "@/components/AdminRetentionPanel";
import useDashboardStats from "@/hooks/useDashboardStats";
import { toast } from "@/hooks/use-toast";
import { Toaster } from "@/components/ui/toaster";
import styles from "./dashboard.module.css";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5000";
const THEME_KEY = "dash-theme";

/* ─────────────────────────── Icons ─────────────────────────── */
const Ico = {
  Activity: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
    </svg>
  ),
  Upload: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
      <polyline points="16 16 12 12 8 16" />
      <line x1="12" y1="12" x2="12" y2="21" />
      <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3" />
    </svg>
  ),
  Files: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
    </svg>
  ),
  Sun: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
      <circle cx="12" cy="12" r="5" />
      <line x1="12" y1="1"  x2="12" y2="3"  />
      <line x1="12" y1="21" x2="12" y2="23" />
      <line x1="4.22" y1="4.22"   x2="5.64" y2="5.64"   />
      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
      <line x1="1"  y1="12" x2="3"  y2="12" />
      <line x1="21" y1="12" x2="23" y2="12" />
      <line x1="4.22"  y1="19.78" x2="5.64"  y2="18.36" />
      <line x1="18.36" y1="5.64"  x2="19.78" y2="4.22"  />
    </svg>
  ),
  Moon: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  ),
};

/* ─────────────────────────── Types ─────────────────────────── */
type Theme = "dark" | "light";
type TopSellingPeriod = "daily" | "weekly" | "monthly";

interface TopSellingItem   { name: string; amount: number; quantity: number; }
interface TopSellingTrendPoint { key: string; label: string; amount: number; }
interface SalesRow {
  name: string; itemCode: string; amount: number; quantity: number;
  ms: number; dailyKey: string; dailyLabel: string; weekKey: string; weekLabel: string;
}

/* ─────────────────────────── Helpers ─────────────────────────── */
function getApiBases(): string[] {
  const candidates = [process.env.NEXT_PUBLIC_API_BASE_URL, API_BASE, "http://localhost:5000", "http://127.0.0.1:5000"]
    .filter((v): v is string => Boolean(String(v || "").trim()));
  return Array.from(new Set(candidates));
}

function normalizeBranchScope(user: Record<string, unknown> | null | undefined): string[] {
  const raw = user?.managedBranches ?? user?.managed_branches ?? user?.branches;
  if (Array.isArray(raw)) return Array.from(new Set((raw as unknown[]).map((i) => String(i || "").trim()).filter(Boolean)));
  if (typeof raw === "string") return Array.from(new Set(raw.split(",").map((i) => i.trim()).filter(Boolean)));
  return [];
}

function formatSimpleDate(value?: string): string {
  if (!value) return "—";
  const p = new Date(value);
  return Number.isNaN(p.getTime()) ? "—" : p.toISOString().slice(0, 10);
}

function toNumber(value: unknown): number {
  const raw = String(value == null ? "" : value).replace(/,/g, "").trim();
  const n = Number(raw);
  return Number.isFinite(n) ? n : 0;
}

function parseRowDateValue(value: unknown): Date | null {
  const rawOriginal = String(value == null ? "" : value).trim();
  const excelWrapped = /^="(.*)"$/.exec(rawOriginal);
  const raw = excelWrapped ? String(excelWrapped[1] || "").trim() : rawOriginal;
  if (!raw) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    const p = new Date(`${raw}T00:00:00`);
    return Number.isNaN(p.getTime()) ? null : p;
  }
  const p = new Date(raw);
  if (!Number.isNaN(p.getTime())) return p;
  const slash = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(raw);
  if (!slash) return null;
  const fb = new Date(Number(slash[3]), Number(slash[1]) - 1, Number(slash[2]));
  return Number.isNaN(fb.getTime()) ? null : fb;
}

function toDateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}

function toWeekStartKey(date: Date): string {
  const c = new Date(date.getTime());
  const day = c.getDay();
  c.setDate(c.getDate() + (day === 0 ? -6 : 1 - day));
  return toDateKey(c);
}

function formatShortDate(d: Date): string {
  return `${String(d.getMonth()+1).padStart(2,"0")}/${String(d.getDate()).padStart(2,"0")}`;
}

function formatFormalDate(dateStr: string): string {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString("en-US",{ month:"long", day:"numeric", year:"numeric" });
}

/* ─────────────────────────── ThemeToggle ─────────────────────────── */
function ThemeToggle({ theme, onToggle }: { theme: Theme; onToggle: () => void }) {
  return (
    <button type="button" className={styles.themeToggle} onClick={onToggle} aria-label="Toggle theme">
      {theme === "dark" ? <Ico.Sun /> : <Ico.Moon />}
      <span className={styles.themeToggleLabel}>{theme === "dark" ? "Light" : "Dark"}</span>
    </button>
  );
}

/* ─────────────────────────── StatCard ─────────────────────────── */
interface StatCardProps {
  label: string; value: number | null | undefined; sub: string;
  icon: React.ReactNode; accentClass: string; iconClass: string;
  trend?: "up" | "flat"; trendLabel?: string; loading: boolean; onClick?: () => void;
}

function StatCard({ label, value, sub, icon, accentClass, iconClass, trend, trendLabel, loading, onClick }: StatCardProps) {
  const renderValue = () => {
    if (loading && value === undefined) return <div className={styles.statSpinner} />;
    if (value === null || value === undefined) return "—";
    return value.toLocaleString();
  };
  return (
    <div
      className={`${styles.statCard} ${onClick ? styles.statCardClickable : ""}`}
      onClick={onClick}
      onKeyDown={(e) => { if (onClick && (e.key === "Enter" || e.key === " ")) onClick(); }}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      <div className={`${styles.statCardAccent} ${styles[accentClass]}`} />
      <div className={styles.statCardTop}>
        <div className={`${styles.statIcon} ${styles[iconClass]}`}>{icon}</div>
        {trendLabel && (
          <span className={`${styles.statTrend} ${trend === "up" ? styles.statTrendUp : styles.statTrendFlat}`}>
            {trendLabel}
          </span>
        )}
      </div>
      <div className={styles.statLabel}>{label}</div>
      <div className={styles.statValue}>{renderValue()}</div>
      <div className={styles.statSub}>{sub}</div>
    </div>
  );
}

/* ─────────────────────────── DebugPanel ─────────────────────────── */
function DebugPanel({ salesRows, managerTopSalesDate }: { salesRows: SalesRow[]; managerTopSalesDate: string }) {
  const [show, setShow] = useState(false);
  return (
    <div style={{ marginBottom: 12 }}>
      <button type="button" onClick={() => setShow(v => !v)}
        style={{ padding:"4px 10px", borderRadius:2, border:"1px solid var(--border-md)", background:"var(--surface-2)", color:"var(--text-secondary)", cursor:"pointer", fontFamily:"var(--font-mono)", fontSize:11 }}>
        {show ? "Hide" : "Show"} Sales Data
      </button>
      {show && (
        <div className={styles.debugPanel}>
          <div style={{ fontWeight:600, marginBottom:6, fontFamily:"var(--font-mono)", fontSize:11, color:"var(--sky)" }}>
            SalesRows · {managerTopSalesDate}
          </div>
          <table className={styles.debugTable}>
            <thead><tr><th>Code</th><th>Product</th><th>Qty</th><th>Amount</th></tr></thead>
            <tbody>
              {salesRows.filter(r => r.dailyKey === managerTopSalesDate).map((row, i) => (
                <tr key={`${row.name}-${i}`}>
                  <td>{row.itemCode}</td><td>{row.name}</td>
                  <td>{row.quantity}</td><td>₱{row.amount.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────── Dashboard Content ─────────────────────────── */
function DashboardContent() {
  const router = useRouter();

  /* ── Theme ── */
  const [theme, setTheme] = useState<Theme>("light");
  useEffect(() => {
    const saved = (localStorage.getItem(THEME_KEY) as Theme | null) ?? "dark";
    setTheme(saved);
  }, []);
  const toggleTheme = () => setTheme(prev => {
    const next: Theme = prev === "dark" ? "light" : "dark";
    localStorage.setItem(THEME_KEY, next);
    return next;
  });

  /* ── Role ── */
  const [role, setRole] = useState<string>(() => {
    try { return String(getUser()?.role || "user").toLowerCase(); } catch { return "user"; }
  });
  useEffect(() => {
    const readRole = () => {
      try { setRole(String(getUser()?.role || "user").toLowerCase()); } catch { setRole("user"); }
    };
    readRole();
    window.addEventListener("storage", readRole);
    window.addEventListener("auth:token", readRole as EventListener);
    window.addEventListener("auth:logout", readRole as EventListener);
    return () => {
      window.removeEventListener("storage", readRole);
      window.removeEventListener("auth:token", readRole as EventListener);
      window.removeEventListener("auth:logout", readRole as EventListener);
    };
  }, []);

  const isAdmin   = role === "admin";
  const isManager = role === "manager";
  const { stats, loading, lastError } = useDashboardStats(10000, isAdmin);

  /* ── State ── */
  const [managerBranches,           setManagerBranches]           = useState<string[]>([]);
  const [branchMap, setBranchMap] = useState<Record<string, string>>({});
  const [managerLoading,            setManagerLoading]            = useState(false);
  const [managerMissingCount,       setManagerMissingCount]       = useState<number | null>(null);
  const [managerMissingDates,       setManagerMissingDates]       = useState<Record<string, string[]>>({});
  const [managerSentCount,          setManagerSentCount]          = useState<number | null>(null);
  const [managerLatestWorkDate,     setManagerLatestWorkDate]     = useState<string>("");
  const [managerTopSalesDate,       setManagerTopSalesDate]       = useState<string>("");
  const [salesRows,                 setSalesRows]                 = useState<SalesRow[]>([]);
  const [soundEnabled,              setSoundEnabled]              = useState(true);
  const [managerTopProductsByPeriod, setManagerTopProductsByPeriod] = useState<Record<TopSellingPeriod, TopSellingItem[]>>({ daily:[], weekly:[], monthly:[] });
  const [managerTopTrendByPeriod,   setManagerTopTrendByPeriod]   = useState<Record<TopSellingPeriod, TopSellingTrendPoint[]>>({ daily:[], weekly:[], monthly:[] });

  /* ── Load branches and branch map ── */
  useEffect(() => {
    if (!isManager) { setManagerBranches([]); setBranchMap({}); return; }
    const load = async () => {
      try {
        // 1. Fetch branch list for mapping
        let branchMapData: Record<string, string> = {};
        const bases = getApiBases();
        for (const base of bases) {
          const res = await fetchWithAuth(`${base}/api/booking/public/branches`, { method: "GET" });
          if (!res.ok) continue;
          const json = await res.json().catch(() => ({}));
          // Try to support both array and object response
          if (Array.isArray(json?.branches)) {
            for (const b of json.branches) {
              if (b && b.alias && b.title) {
                branchMapData[String(b.alias)] = String(b.title);
              }
            }
          } else if (Array.isArray(json)) {
            for (const b of json) {
              if (b && b.alias && b.title) {
                branchMapData[String(b.alias)] = String(b.title);
              }
            }
          }
          break;
        }
        setBranchMap(branchMapData);

        // 2. Fetch manager branches as before
        const user = getUser();
        const local = normalizeBranchScope(user);
        const userId = String(user?.id || user?._id || "").trim();
        if (!userId) { setManagerBranches(local); return; }
        for (const base of bases) {
          const res = await fetchWithAuth(`${base}/api/auth/users/${encodeURIComponent(userId)}`, { method: "GET" });
          if (!res.ok) continue;
          const json = await res.json().catch(() => ({}));
          setManagerBranches(normalizeBranchScope(json?.user)); return;
        }
        for (const base of bases) {
          const res = await fetchWithAuth(`${base}/api/auth/users`, { method: "GET" });
          if (!res.ok) continue;
          const json = await res.json().catch(() => ({}));
          const users: Record<string, unknown>[] = Array.isArray(json?.users) ? json.users : [];
          const match = users.find(u =>
            String(u?.id || u?._id || "") === userId ||
            String(u?.email || "").toLowerCase() === String(user?.email || "").toLowerCase() ||
            String(u?.username || "").toLowerCase() === String(user?.username || "").toLowerCase()
          );
          if (match) { setManagerBranches(normalizeBranchScope(match)); return; }
        }
        setManagerBranches(local);
      } catch {
        try { setManagerBranches(normalizeBranchScope(getUser())); } catch { setManagerBranches([]); }
        setBranchMap({});
      }
    };
    void load();
  }, [isManager]);

  /* ── Load manager insights ── */
  useEffect(() => {
    if (!isManager) {
      setManagerMissingCount(null); setManagerSentCount(null);
      setManagerLatestWorkDate(""); setManagerTopSalesDate("");
      setSalesRows([]);
      setManagerTopProductsByPeriod({ daily:[], weekly:[], monthly:[] });
      setManagerTopTrendByPeriod({ daily:[], weekly:[], monthly:[] });
      return;
    }
    const load = async () => {
      setManagerLoading(true);
      try {
        // Use branch IDs for API calls (managerBranches are IDs)
        const branchIds = managerBranches;
        if (branchIds.length === 0) { setManagerMissingCount(0); setManagerSentCount(0); return; }
        const bases = getApiBases();

        /* files */
        let files: Record<string,unknown>[] = [];
        for (let page=1; page<=4; page++) {
          const params = new URLSearchParams({ page:String(page), limit:"250", branch: branchIds.join(",") });
          let payload: Record<string,unknown> = {};
          for (const base of bases) {
            const res = await fetchWithAuth(`${base}/api/fetch/files?${params}`, { method:"GET" });
            if (!res.ok) continue;
            payload = await res.json().catch(()=>({})); break;
          }
          const items = Array.isArray(payload?.items) ? payload.items as Record<string,unknown>[] : [];
          if (items.length === 0) break;
          files = files.concat(items);
          if (items.length < 250) break;
        }
        setManagerSentCount(files.length);

        const latestMs = files.reduce((acc, item) => {
          const ms = new Date(String(item?.workDate||item?.work_date||"")).getTime();
          return Number.isNaN(ms) ? acc : Math.max(acc, ms);
        }, 0);
        const latestIso = latestMs > 0 ? new Date(latestMs).toISOString() : "";
        const latestKey = latestMs > 0 ? toDateKey(new Date(latestMs)) : "";
        setManagerLatestWorkDate(latestIso);

        /* missing scan */
        let missingCount = 0;
        let missingByBranch: Record<string,string[]> = {};
        for (const base of bases) {
          const res = await fetchWithAuth(`${base}/api/fetch/missing/scan`, {
            method:"POST", headers:{"Content-Type":"application/json"},
            body: JSON.stringify({ source:"report_pos_sended", positions:"1,2", branches: branchIds }),
          });
          if (!res.ok) continue;
          const payload = await res.json().catch(()=>({}));
          const rows = Array.isArray(payload?.results) ? payload.results as Record<string,unknown>[] : [];
          missingCount = rows.reduce((s,r) => s + (Array.isArray(r?.missingDates) ? (r.missingDates as unknown[]).length : 0), 0);
          rows.forEach(r => {
            // Try to map branch ID to code for display
            const branchId = String(r?.branchId || r?.branch_id || r?.branch || r?.branchName || r?.branch_name || "Unknown");
            missingByBranch[branchMap[branchId] || branchId] = Array.isArray(r?.missingDates) ? r.missingDates as string[] : [];
          });
          break;
        }
        setManagerMissingCount(missingCount);
        setManagerMissingDates(missingByBranch);

        /* sales */
        const pMaps: Record<TopSellingPeriod, Map<string,TopSellingItem>> = { daily:new Map(), weekly:new Map(), monthly:new Map() };
        const pTrends: Record<TopSellingPeriod, Map<string,TopSellingTrendPoint>> = { daily:new Map(), weekly:new Map(), monthly:new Map() };
        const addP = (p: TopSellingPeriod, name: string, amt: number, qty: number) => {
          const prev = pMaps[p].get(name);
          if (prev) { prev.amount+=amt; prev.quantity+=qty; } else pMaps[p].set(name,{name,amount:amt,quantity:qty});
        };
        const addT = (p: TopSellingPeriod, key: string, label: string, amt: number) => {
          const ex = pTrends[p].get(key);
          if (ex) ex.amount+=amt; else pTrends[p].set(key,{key,label,amount:amt});
        };

        const allRows: SalesRow[] = [];
        const excludeKw = [
          "iced tea","free","promo","representation","bulk order","loyalty","party","marketing",
          "on the house","beverages","guest count","snr ctzn","upgrade","discount","food panda",
          "paymaya","cash","take-out","dine-in","phone number","transaction type",
          "upgrades upselling","classic meals","beef bundles","salad delights","shakes",
          "soup","burgers and sandwiches","pasta dishes",
        ];

        for (const branchId of branchIds) {
          for (let page=1; page<=2; page++) {
            const params = new URLSearchParams({ page:String(page), limit:"500", branch: branchId, sortBy:"DATE", sortDir:"desc" });
            let pageRows: Record<string,unknown>[] = [];
            let loaded = false;
            for (const base of bases) {
              const res = await fetchWithAuth(`${base}/api/master/preview?${params}`, { method:"GET" });
              if (!res.ok) continue;
              const payload = await res.json().catch(()=>({}));
              pageRows = Array.isArray(payload?.rows) ? payload.rows as Record<string,unknown>[] : [];
              loaded = true; break;
            }
            if (!loaded || pageRows.length===0) break;

            const productMap = new Map<string,SalesRow>();
            for (const row of pageRows) {
              const itemCode = String(row?.["ITEM CODE"]||row?.["ITE_CODE"]||row?.["INCODE"]||"UNKNOWN").trim();
              const name     = String(row?.["PRODUCT NAME"]||row?.["ITE_DESC"]||row?.["ITEM CODE"]||row?.["INCODE"]||"UNKNOWN").trim();
              const depName  = String(row?.["DEPARTMENT NAME"]||row?.["DEP_DESC"]||"").trim().toLowerCase();
              const amount   = toNumber(row?.AMOUNT ?? row?.UNT_PRIC);
              const quantity = row?.QUANTITY !== undefined ? toNumber(row?.QUANTITY) : 1;
              const dp       = parseRowDateValue(row?.DATE ?? row?.TRANSDATE);
              if (!dp) continue;
              const ms=dp.getTime(), dailyKey=toDateKey(dp), dailyLabel=formatShortDate(dp);
              const weekKey=toWeekStartKey(dp), weekDate=parseRowDateValue(weekKey);
              const weekLabel=weekDate?`Wk ${formatShortDate(weekDate)}`:weekKey;
              const ln=name.toLowerCase(), ld=depName;
              if (amount<=0||quantity<=0) continue;
              if (excludeKw.some(kw=>ln.includes(kw)||ld.includes(kw))) continue;
              if (ln==="unknown"||ln==="guest count"||ln==="representation") continue;
              if (quantity<1||quantity>50) console.warn(`Suspicious qty — ${itemCode} qty:${quantity} date:${dailyKey}`);
              const key=`${itemCode}|${dailyKey}`;
              if (!productMap.has(key)) productMap.set(key,{name,itemCode,amount,quantity,ms,dailyKey,dailyLabel,weekKey,weekLabel});
              else { const p=productMap.get(key)!; p.amount+=amount; p.quantity+=quantity; }
            }
            allRows.push(...Array.from(productMap.values()));
            if (pageRows.length<500) break;
          }
        }
        setSalesRows(allRows);

        let baseDayKey = latestKey;
        if (!allRows.some(r=>r.dailyKey===baseDayKey) && allRows.length>0) {
          baseDayKey = allRows.slice().sort((a,b)=>b.ms-a.ms)[0].dailyKey;
        }
        setManagerTopSalesDate(baseDayKey);

        const dayMs=24*60*60*1000, baseDayDate=parseRowDateValue(baseDayKey);
        const baseDayMs=baseDayDate?baseDayDate.getTime():0;
        const trendStartMs=baseDayMs>0?baseDayMs-6*dayMs:0;
        for (const row of allRows) {
          if (baseDayKey && row.dailyKey===baseDayKey) addP("monthly",row.name,row.amount,row.quantity);
          if (baseDayMs>0&&row.ms>=trendStartMs&&row.ms<=baseDayMs) addT("monthly",row.dailyKey,row.dailyLabel,row.amount);
        }

        const topList = (m: Map<string,TopSellingItem>) => Array.from(m.values()).sort((a,b)=>b.amount-a.amount).slice(0,5);
        const trendList = (m: Map<string,TopSellingTrendPoint>, max: number) => Array.from(m.values()).sort((a,b)=>a.key.localeCompare(b.key)).slice(-max);
        setManagerTopProductsByPeriod({ daily:topList(pMaps.daily), weekly:topList(pMaps.weekly), monthly:topList(pMaps.monthly) });
        setManagerTopTrendByPeriod({ daily:trendList(pTrends.daily,7), weekly:trendList(pTrends.weekly,7), monthly:trendList(pTrends.monthly,6) });
      } catch {
        setManagerMissingCount(null); setManagerSentCount(null);
        setManagerLatestWorkDate(""); setManagerTopSalesDate("");
        setSalesRows([]);
        setManagerTopProductsByPeriod({ daily:[], weekly:[], monthly:[] });
        setManagerTopTrendByPeriod({ daily:[], weekly:[], monthly:[] });
      } finally { setManagerLoading(false); }
    };
    void load();
  }, [isManager, managerBranches]);

  /* ── Error toast ── */
  useEffect(() => {
    if (lastError) toast({ title:"Dashboard Error", description:String(lastError), variant:"destructive", duration:8000 });
  }, [lastError]);

  /* ── Missing dates toast ── */
  useEffect(() => {
    if (!isManager||typeof managerMissingCount!=="number"||managerMissingCount<=0) return;
    if (sessionStorage.getItem("branchMissingDatesToast")) return;
    let text = `Attention.\n${managerMissingCount} days of reports are missing for your assigned branches.\n`;
    text += `The latest report received was on ${formatFormalDate(managerLatestWorkDate)}.\n`;
    Object.entries(managerMissingDates).forEach(([branch, dates]) => {
      text += `\nBranch: ${branch}.\n`;
      if (dates.length > 0) {
        text += "Missing report dates are:\n";
        dates.forEach((d,i) => { text += i===dates.length-1&&dates.length>1?`and ${formatFormalDate(d)}.`:`${formatFormalDate(d)},\n`; });
      } else { text += "No missing dates."; }
    });
    text += "\n\nPlease upload the missing daily reports.\nGo to Send Daily Report to upload them now.";
    toast({
      title:"Branch Missing Dates",
      description:(
        <div>
          <div style={{ whiteSpace:"pre-line", marginBottom:8 }}>{text}</div>
          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
            <button type="button"
              style={{ padding:"4px 10px", borderRadius:4, background:"#e2f539", color:"#1a1a1a", border:"none", cursor:"pointer", fontWeight:600 }}
              onClick={() => { if (window.speechSynthesis) { window.speechSynthesis.cancel(); const u=new SpeechSynthesisUtterance(text.replace(/\n/g," ")); u.lang="en-US"; window.speechSynthesis.speak(u); } }}>
              Speak
            </button>
            <button type="button"
              style={{ padding:"4px 10px", borderRadius:4, background:soundEnabled?"#4db6e8":"#555", color:"#fff", border:"none", cursor:"pointer" }}
              onClick={() => setSoundEnabled(v => { if (v&&window.speechSynthesis) window.speechSynthesis.cancel(); return !v; })}>
              {soundEnabled?"Mute":"Unmute"}
            </button>
          </div>
        </div>
      ),
      variant:"destructive", duration:Infinity,
    });
    sessionStorage.setItem("branchMissingDatesToast","1");
  }, [isManager, managerMissingCount, managerLatestWorkDate, managerMissingDates, soundEnabled]);

  /* ── Derived ── */
  const today = new Date().toLocaleDateString("en-US",{ weekday:"short", month:"short", day:"numeric", year:"numeric" });
  const topProducts  = managerTopProductsByPeriod.monthly;
  const topMax       = topProducts.reduce((m,i) => Math.max(m,i.amount), 0);
  const topTrend     = managerTopTrendByPeriod.monthly;
  const totalSales   = topProducts.reduce((s,i) => s+i.amount, 0);
  const topProduct   = topProducts[0]?.name ?? "—";
  const trendLast    = topTrend.at(-1)?.amount ?? 0;
  const trendPrev    = topTrend.length > 1 ? topTrend[topTrend.length-2].amount : trendLast;
  const trendDelta   = trendLast - trendPrev;
  const trendPct     = trendPrev > 0 ? (trendDelta/trendPrev)*100 : 0;
  const trendTone    = trendDelta > 0 ? "Up" : trendDelta < 0 ? "Down" : "Flat";
  const trendSummary = trendDelta > 0 ? "Higher than previous day" : trendDelta < 0 ? "Lower than previous day" : "Same as previous day";

  return (
    <div className={styles.dashRoot} data-theme={theme}>
      <div className={styles.dashShell}>
        <div className={styles.dashInner}>

          {/* ── Top bar ── */}
          <div className={styles.dashTopbar}>
            <div className={styles.dashBrand}>
              
              <div className={styles.dashHeadingGroup}>
                <span className={styles.dashEyebrow}>Operations Center</span>
                <h1 className={styles.dashTitle}>{isManager ? "Manager Dashboard" : "Admin Dashboard"}</h1>
                <p className={styles.dashDesc}>
                  {isManager
                    ? "Branch assignments · Report status · Performance analytics"
                    : "System operations · Fetch control · Status monitoring"}
                </p>
              </div>
            </div>

            {/* Right: date pill + theme toggle */}
            <div className={styles.dashTopbarRight}>
              <div className={styles.dashDatePill}>
                <div className={styles.dashDateDot} />
                <span className={styles.dashDateText}>{today}</span>
              </div>
              <ThemeToggle theme={theme} onToggle={toggleTheme} />
            </div>
          </div>

          {/* ── Admin stat cards ── */}
          {isAdmin && (
            <div className={styles.dashStats}>
              <StatCard label="Active Jobs" value={stats?.activeJobs} sub="Queued and running fetch jobs"
                icon={<Ico.Activity />} accentClass="statCardAccentSky" iconClass="statIconSky"
                trend="up" trendLabel="Live" loading={loading}
                onClick={() => router.push("/admin/fetch-logs?status=queued,running")} />
              <StatCard label="Bookings" value={stats?.uploads} sub="CSV bookings processed"
                icon={<Ico.Upload />} accentClass="statCardAccentGold" iconClass="statIconGold"
                trend="flat" trendLabel="Today" loading={loading}
                onClick={() => router.push("/booking")} />
              <StatCard label="Files" value={stats?.files} sub="Files ingested & indexed"
                icon={<Ico.Files />} accentClass="statCardAccentRed" iconClass="statIconRed"
                loading={loading} onClick={() => router.push("/files")} />
            </div>
          )}

          {/* ── Manager view ── */}
          {isManager && (
            <>
              {/* Action buttons */}
              <div className={styles.managerActions}>
                <button type="button" className={styles.managerActionBtn} style={{ background:"#32a7de" }} onClick={() => router.push("/booking")}>
                  <div><div className={styles.managerActionTitle}>Booking</div><div className={styles.managerActionValue}>Upload Booking CSV</div></div>
                  <div className={`${styles.statIcon} ${styles.statIconSky}`}><Ico.Upload /></div>
                </button>
                <button type="button" className={styles.managerActionBtn} style={{ background:"#e8ba37" }} onClick={() => router.push("/my-reports")}>
                  <div><div className={styles.managerActionTitle}>View My Reports</div><div className={styles.managerActionValue}>Browse files</div></div>
                  <div className={`${styles.statIcon} ${styles.statIconRed}`}><Ico.Files /></div>
                </button>
                <button type="button" className={styles.managerActionBtn} style={{ background:"#bd222f" }} onClick={() => router.push("/users")}>
                  <div><div className={styles.managerActionTitle}>My Profile</div><div className={styles.managerActionValue}>Settings</div></div>
                  <div className={`${styles.statIcon} ${styles.statIconGold}`}><Ico.Activity /></div>
                </button>
              </div>

              {/* KPI cards — use CSS module color classes instead of Tailwind */}
              <div className={styles.managerKpiGrid}>
                <div className={styles.managerKpiCard}>
                  <div className={styles.managerKpiLabel}>Missing Dates</div>
                  <div className={`${styles.managerKpiValue} ${styles.kpiRed}`}>{managerLoading?"…":(managerMissingCount??"—")}</div>
                  <div className={styles.managerKpiSub}>Days with missing reports (POS 1 &amp; 2)</div>
                </div>
                <div className={styles.managerKpiCard}>
                  <div className={styles.managerKpiLabel}>Reports Sent</div>
                  <div className={`${styles.managerKpiValue} ${styles.kpiYellow}`} style={{ color:"#e8ba37" }}>
                    {managerLoading?"…":(managerSentCount??"—")}
                  </div>
                  <div className={styles.managerKpiSub}>Total files submitted</div>
                </div>
                <div className={styles.managerKpiCard}>
                  <div className={styles.managerKpiLabel}>Latest Report Date</div>
                  <div className={`${styles.managerKpiValue} ${styles.kpiSky}`} style={{ fontSize:"22px", lineHeight:1.2 }}>
                    {managerLoading?"…":formatSimpleDate(managerLatestWorkDate)}
                  </div>
                  <div className={styles.managerKpiSub}>Most recent submitted report</div>
                </div>
                <div className={styles.managerKpiCard}>
                  <div className={styles.managerKpiLabel}>Your Branch</div>
                  <div className={`${styles.managerKpiValue} ${styles.kpiBlue}`} style={{ fontSize:"20px", lineHeight:1.3, whiteSpace:"normal", wordBreak:"break-word" }}>
                    {managerBranches.length>0 ? managerBranches.map(b => branchMap[b] || b).join(", ") : "—"}
                  </div>
                  <div className={styles.managerKpiSub}>Branch assigned to your account</div>
                </div>
              </div>

              {/* Best-selling */}
              <div className={styles.managerBlock}>
                <div className={styles.topsellHead}>
                  <div>
                    <div className={styles.statLabel} style={{ marginBottom:0 }}>Best-Selling Products · Latest Report Date</div>
                    <div className={styles.topsellSub} style={{ marginTop:"4px" }}>Branch data · date: {managerTopSalesDate||"—"}</div>
                  </div>
                  <div className={styles.topsellRight}>
                    <div className={styles.topsellKpis}>
                      <div className={styles.topsellKpi}>
                        <div className={styles.topsellKpiLabel}>Total Sales</div>
                        <div className={styles.topsellKpiValue}>₱{totalSales.toLocaleString(undefined,{maximumFractionDigits:0})}</div>
                      </div>
                      <div className={styles.topsellKpi} title={topProduct}>
                        <div className={styles.topsellKpiLabel}>#1 Product</div>
                        <div className={styles.topsellKpiValue}>{topProduct}</div>
                      </div>
                    </div>
                  </div>
                </div>

                {process.env.NODE_ENV==="development" && (
                  <DebugPanel salesRows={salesRows} managerTopSalesDate={managerTopSalesDate} />
                )}

                {managerLoading ? (
                  <div className={styles.statSub} style={{ marginTop:"8px" }}>Fetching top products...</div>
                ) : topProducts.length===0 ? (
                  <div className={styles.statSub} style={{ marginTop:"8px" }}>
                    No sales data for <span style={{ fontWeight:600, color:"var(--sky)" }}>{managerTopSalesDate}</span>.<br/>
                    Check if the uploaded CSV contains sales for this date.
                  </div>
                ) : (
                  <div className={styles.topsellChart}>
                    {topTrend.length > 0 && (
                      <div className={styles.topsellTrend}>
                        <div className={styles.topsellTrendHead}>
                          <div className={styles.topsellSub}>Sales trend · recent 7 days</div>
                          <div className={`${styles.topsellTrendChange} ${styles[`topsellTrendChange${trendTone}`]}`}>
                            {trendDelta>0?"▲":trendDelta<0?"▼":"■"} {Math.abs(trendPct).toFixed(1)}% · {trendSummary}
                          </div>
                        </div>
                        <div className={styles.topsellTrendList}>
                          {topTrend.map((pt,i) => {
                            const prev = i>0 ? topTrend[i-1].amount : pt.amount;
                            const d = pt.amount-prev;
                            const sign = d>0?"+":(d<0?"-":"±");
                            return (
                              <div key={pt.key} className={styles.topsellTrendItem}>
                                <div className={styles.topsellTrendItemLabel}>{pt.label}</div>
                                <div className={styles.topsellTrendItemAmount}>₱{pt.amount.toLocaleString(undefined,{maximumFractionDigits:0})}</div>
                                <div className={styles.topsellTrendItemDelta}>{sign} ₱{Math.abs(d).toLocaleString(undefined,{maximumFractionDigits:0})}</div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {topProducts.map((item,i) => {
                      const pct = topMax>0 ? Math.max(8, Math.round((item.amount/topMax)*100)) : 0;
                      return (
                        <div key={`${item.name}-${i}`} className={styles.topsellRow}>
                          <div style={{ minWidth:0 }}>
                            <div className={styles.topsellName}>{i+1}. {item.name}</div>
                            <div className={styles.topsellSub}>Qty {item.quantity.toLocaleString()}</div>
                          </div>
                          <div className={styles.topsellBarWrap} aria-hidden="true">
                            <div className={styles.topsellBar} style={{ width:`${pct}%` }} />
                          </div>
                          <div className={styles.topsellAmount}>₱{item.amount.toLocaleString(undefined,{maximumFractionDigits:0})}</div>
                        </div>
                      );
                    })}
                    <div className={styles.topsellSub} style={{ marginTop:"2px" }}>Ranking window: latest report date only</div>
                  </div>
                )}
              </div>

              {/* Branches */}
              <div className={styles.managerBlock} style={{ marginBottom:"8px" }}>
                <div className={styles.statLabel}>Assigned Branches</div>
                <div style={{ marginTop:"10px", display:"flex", flexWrap:"wrap", gap:"8px" }}>
                  {managerBranches.length>0 ? managerBranches.map(b => (
                    <span key={b} style={{ padding:"4px 12px", borderRadius:"2px", border:"1px solid var(--border-md)", background:"var(--surface-2)", fontSize:"12px", fontFamily:"var(--font-mono)", color:"var(--sky)", letterSpacing:"0.05em" }}>
                      {branchMap[b] || b}
                    </span>
                  )) : (
                    <span style={{ fontSize:"12px", color:"var(--text-muted)", fontFamily:"var(--font-mono)" }}>No branch scope assigned.</span>
                  )}
                </div>
                <div className={styles.statSub} style={{ marginTop:"10px" }}>
                  Use Booking for daily sending · My Bookings to review status and missing dates
                </div>
              </div>
            </>
          )}

          {/* ── Admin tools ── */}
          {isAdmin && (
            <>
              <div className={styles.dashSectionLabel}><span>Fetch Tools</span><div className={styles.dashSectionRule}/></div>
              <div className={styles.dashMainGrid}><ManualFetchClient /><MissingScanClient /></div>

              <div className={styles.dashSectionLabel} style={{ marginTop:"28px" }}><span>Merge &amp; Combine</span><div className={styles.dashSectionRule}/></div>
              <div style={{ marginBottom:"22px" }}><CombineClient /></div>

              <div className={styles.dashSectionLabel}><span>Retention</span><div className={styles.dashSectionRule}/></div>
              <div className={styles.dashRetention}><AdminRetentionPanel /></div>
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
  const [authChecked,  setAuthChecked]  = useState(false);
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    const token = auth.getAccessToken();
    if (!token) { setIsAuthorized(false); setAuthChecked(true); router.replace("/login"); return; }
    setIsAuthorized(true); setAuthChecked(true);
  }, [router]);

  if (!authChecked || !isAuthorized) return null;

  return (
    <LoginLayout>
      <DashboardContent />
      <Toaster />
    </LoginLayout>
  );
}