"use client";

import React, { useEffect, useState } from "react";
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
};

/* ─────────────────────────── Types ─────────────────────────── */
type TopSellingPeriod = "daily" | "weekly" | "monthly";

interface TopSellingItem {
  name: string;
  amount: number;
  quantity: number;
}

interface TopSellingTrendPoint {
  key: string;
  label: string;
  amount: number;
}

interface SalesRow {
  name: string;
  itemCode: string;
  amount: number;
  quantity: number;
  ms: number;
  dailyKey: string;
  dailyLabel: string;
  weekKey: string;
  weekLabel: string;
}

/* ─────────────────────────── Helpers ─────────────────────────── */
function getApiBases(): string[] {
  const candidates = [
    process.env.NEXT_PUBLIC_API_BASE_URL,
    API_BASE,
    "http://localhost:5000",
    "http://127.0.0.1:5000",
  ].filter((v): v is string => Boolean(String(v || "").trim()));
  return Array.from(new Set(candidates));
}

function normalizeBranchScope(user: Record<string, unknown> | null | undefined): string[] {
  const raw = user?.managedBranches ?? user?.managed_branches ?? user?.branches;
  if (Array.isArray(raw)) {
    return Array.from(new Set((raw as unknown[]).map((item) => String(item || "").trim()).filter(Boolean)));
  }
  if (typeof raw === "string") {
    return Array.from(new Set(raw.split(",").map((item) => item.trim()).filter(Boolean)));
  }
  return [];
}

function formatSimpleDate(value?: string): string {
  if (!value) return "—";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "—";
  return parsed.toISOString().slice(0, 10);
}

function toNumber(value: unknown): number {
  const raw = String(value == null ? "" : value).replace(/,/g, "").trim();
  if (!raw) return 0;
  const numeric = Number(raw);
  return Number.isFinite(numeric) ? numeric : 0;
}

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
  const fallback = new Date(Number(slash[3]), Number(slash[1]) - 1, Number(slash[2]));
  return Number.isNaN(fallback.getTime()) ? null : fallback;
}

function toDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function toWeekStartKey(date: Date): string {
  const copy = new Date(date.getTime());
  const day = copy.getDay();
  copy.setDate(copy.getDate() + (day === 0 ? -6 : 1 - day));
  return toDateKey(copy);
}

function formatShortDate(date: Date): string {
  return `${String(date.getMonth() + 1).padStart(2, "0")}/${String(date.getDate()).padStart(2, "0")}`;
}

function formatFormalDate(dateStr: string): string {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

/* ─────────────────────────── StatCard ─────────────────────────── */
interface StatCardProps {
  label: string;
  value: number | null | undefined;
  sub: string;
  icon: React.ReactNode;
  accentClass: string;
  iconClass: string;
  trend?: "up" | "flat";
  trendLabel?: string;
  loading: boolean;
  onClick?: () => void;
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
interface DebugPanelProps {
  salesRows: SalesRow[];
  managerTopSalesDate: string;
}

function DebugPanel({ salesRows, managerTopSalesDate }: DebugPanelProps) {
  const [showDebug, setShowDebug] = useState(false);

  return (
    <div style={{ marginBottom: 12 }}>
      <button
        type="button"
        className="px-3 py-1 rounded bg-gray-200 text-gray-800 hover:bg-gray-300"
        onClick={() => setShowDebug((v) => !v)}
      >
        {showDebug ? "Hide" : "Show"} Debug Parsed Data
      </button>

      {showDebug && (
        <div className={styles.debugPanel}>
          <div style={{ fontWeight: 600, marginBottom: 6 }}>
            Parsed SalesRows (Latest Date: {managerTopSalesDate})
          </div>
          <table className={styles.debugTable}>
            <thead>
              <tr>
                <th>Item Code</th>
                <th>Product Name</th>
                <th>Quantity</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>
              {salesRows
                .filter((row) => row.dailyKey === managerTopSalesDate)
                .map((row, idx) => (
                  <tr key={`${row.name}-${row.dailyKey}-${idx}`}>
                    <td>{row.itemCode || ""}</td>
                    <td>{row.name}</td>
                    <td>{row.quantity}</td>
                    <td>₱{row.amount.toLocaleString()}</td>
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

  const [role, setRole] = useState<string>(() => {
    try { return String(getUser()?.role || "user").toLowerCase(); }
    catch { return "user"; }
  });

  useEffect(() => {
    const readRole = () => {
      try { setRole(String(getUser()?.role || "user").toLowerCase()); }
      catch { setRole("user"); }
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

  const isAdmin = role === "admin";
  const isManager = role === "manager";
  const { stats, loading, lastError } = useDashboardStats(10000, isAdmin);

  const [managerBranches, setManagerBranches] = useState<string[]>([]);
  const [managerLoading, setManagerLoading] = useState(false);
  const [managerMissingCount, setManagerMissingCount] = useState<number | null>(null);
  const [managerMissingDates, setManagerMissingDates] = useState<Record<string, string[]>>({});
  const [managerSentCount, setManagerSentCount] = useState<number | null>(null);
  const [managerLatestWorkDate, setManagerLatestWorkDate] = useState<string>("");
  const [managerTopSalesDate, setManagerTopSalesDate] = useState<string>("");
  const [salesRows, setSalesRows] = useState<SalesRow[]>([]);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [managerTopProductsByPeriod, setManagerTopProductsByPeriod] = useState<Record<TopSellingPeriod, TopSellingItem[]>>({
    daily: [], weekly: [], monthly: [],
  });
  const [managerTopTrendByPeriod, setManagerTopTrendByPeriod] = useState<Record<TopSellingPeriod, TopSellingTrendPoint[]>>({
    daily: [], weekly: [], monthly: [],
  });

  /* ── Load assigned branches ── */
  useEffect(() => {
    if (!isManager) { setManagerBranches([]); return; }

    const load = async () => {
      try {
        const user = getUser();
        const localBranches = normalizeBranchScope(user);
        const userId = String(user?.id || user?._id || "").trim();
        if (!userId) { setManagerBranches(localBranches); return; }

        const apiBases = getApiBases();
        for (const base of apiBases) {
          const res = await fetchWithAuth(`${base}/api/auth/users/${encodeURIComponent(userId)}`, { method: "GET" });
          if (!res.ok) continue;
          const json = await res.json().catch(() => ({}));
          setManagerBranches(normalizeBranchScope(json?.user));
          return;
        }

        // Fallback: search all users
        for (const base of apiBases) {
          const res = await fetchWithAuth(`${base}/api/auth/users`, { method: "GET" });
          if (!res.ok) continue;
          const json = await res.json().catch(() => ({}));
          const users: Record<string, unknown>[] = Array.isArray(json?.users) ? json.users : [];
          const match = users.find((u) => (
            String(u?.id || u?._id || "") === userId ||
            String(u?.email || "").toLowerCase() === String(user?.email || "").toLowerCase() ||
            String(u?.username || "").toLowerCase() === String(user?.username || "").toLowerCase()
          ));
          if (match) { setManagerBranches(normalizeBranchScope(match)); return; }
        }

        setManagerBranches(localBranches);
      } catch {
        try { setManagerBranches(normalizeBranchScope(getUser())); }
        catch { setManagerBranches([]); }
      }
    };

    void load();
  }, [isManager]);

  /* ── Load manager insights ── */
  useEffect(() => {
    if (!isManager) {
      setManagerMissingCount(null);
      setManagerSentCount(null);
      setManagerLatestWorkDate("");
      setManagerTopSalesDate("");
      setSalesRows([]);
      setManagerTopProductsByPeriod({ daily: [], weekly: [], monthly: [] });
      setManagerTopTrendByPeriod({ daily: [], weekly: [], monthly: [] });
      return;
    }

    const load = async () => {
      setManagerLoading(true);
      try {
        const branches = managerBranches;
        if (branches.length === 0) {
          setManagerMissingCount(0);
          setManagerSentCount(0);
          return;
        }

        const apiBases = getApiBases();

        /* ── Collect files ── */
        let collectedFiles: Record<string, unknown>[] = [];
        for (let page = 1; page <= 4; page++) {
          const params = new URLSearchParams({ page: String(page), limit: "250" });
          let payload: Record<string, unknown> = {};
          for (const base of apiBases) {
            const res = await fetchWithAuth(`${base}/api/fetch/files?${params}`, { method: "GET" });
            if (!res.ok) continue;
            payload = await res.json().catch(() => ({}));
            break;
          }
          const items: Record<string, unknown>[] = Array.isArray(payload?.items) ? payload.items as Record<string, unknown>[] : [];
          if (items.length === 0) break;
          collectedFiles = collectedFiles.concat(items);
          if (items.length < 250) break;
        }
        setManagerSentCount(collectedFiles.length);

        const latestDateMs = collectedFiles.reduce((acc, item) => {
          const ms = new Date(String(item?.workDate || item?.work_date || "")).getTime();
          return Number.isNaN(ms) ? acc : Math.max(acc, ms);
        }, 0);
        const latestWorkDateIso = latestDateMs > 0 ? new Date(latestDateMs).toISOString() : "";
        const latestWorkDateKey = latestDateMs > 0 ? toDateKey(new Date(latestDateMs)) : "";
        setManagerLatestWorkDate(latestWorkDateIso);

        /* ── Missing scan ── */
        let missingCount = 0;
        let missingDatesByBranch: Record<string, string[]> = {};
        for (const base of apiBases) {
          const res = await fetchWithAuth(`${base}/api/fetch/missing/scan`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ source: "report_pos_sended", positions: "1,2", branches }),
          });
          if (!res.ok) continue;
          const payload = await res.json().catch(() => ({}));
          const rows: Record<string, unknown>[] = Array.isArray(payload?.results) ? payload.results as Record<string, unknown>[] : [];
          missingCount = rows.reduce((sum, row) => sum + (Array.isArray(row?.missingDates) ? (row.missingDates as unknown[]).length : 0), 0);
          rows.forEach((row) => {
            const branch = String(row?.branch || row?.branchName || row?.branch_name || "Unknown");
            missingDatesByBranch[branch] = Array.isArray(row?.missingDates) ? row.missingDates as string[] : [];
          });
          break;
        }
        setManagerMissingCount(missingCount);
        setManagerMissingDates(missingDatesByBranch);

        /* ── Sales aggregation ── */
        const periodMaps: Record<TopSellingPeriod, Map<string, TopSellingItem>> = {
          daily: new Map(), weekly: new Map(), monthly: new Map(),
        };
        const periodTrends: Record<TopSellingPeriod, Map<string, TopSellingTrendPoint>> = {
          daily: new Map(), weekly: new Map(), monthly: new Map(),
        };

        const addToPeriod = (period: TopSellingPeriod, name: string, amount: number, quantity: number) => {
          const prev = periodMaps[period].get(name);
          if (prev) { prev.amount += amount; prev.quantity += quantity; }
          else periodMaps[period].set(name, { name, amount, quantity });
        };
        const addTrend = (period: TopSellingPeriod, key: string, label: string, amount: number) => {
          const existing = periodTrends[period].get(key);
          if (existing) existing.amount += amount;
          else periodTrends[period].set(key, { key, label, amount });
        };

        const allSalesRows: SalesRow[] = [];

        for (const branch of branches) {
          for (let page = 1; page <= 2; page++) {
            const params = new URLSearchParams({ page: String(page), limit: "500", branch, sortBy: "DATE", sortDir: "desc" });
            let pageRows: Record<string, unknown>[] = [];
            let pageLoaded = false;
            for (const base of apiBases) {
              const res = await fetchWithAuth(`${base}/api/master/preview?${params}`, { method: "GET" });
              if (!res.ok) continue;
              const payload = await res.json().catch(() => ({}));
              pageRows = Array.isArray(payload?.rows) ? payload.rows as Record<string, unknown>[] : [];
              pageLoaded = true;
              break;
            }
            if (!pageLoaded || pageRows.length === 0) break;

            const productMap = new Map<string, SalesRow>();
            // Expanded keywords for exclusion
            const excludeKeywords = [
              "iced tea", "free", "promo", "representation", "bulk order", "loyalty", "party", "marketing", "on the house", "beverages",
              "guest count", "snr ctzn", "upgrade", "discount", "food panda", "paymaya", "cash", "take-out", "dine-in", "phone number", "transaction type",
              "upgrades upselling", "classic meals", "beef bundles", "salad delights", "shakes", "soup", "burgers and sandwiches", "pasta dishes"
            ];

            for (const row of pageRows) {
              const itemCode = String(row?.["ITEM CODE"] || row?.["ITE_CODE"] || row?.["INCODE"] || "UNKNOWN").trim();
              const name = String(row?.["PRODUCT NAME"] || row?.["ITE_DESC"] || row?.["ITEM CODE"] || row?.["INCODE"] || "UNKNOWN").trim();
              const depName = String(row?.["DEPARTMENT NAME"] || row?.["DEP_DESC"] || "").trim().toLowerCase();
              const amount = toNumber(row?.AMOUNT ?? row?.UNT_PRIC);
              const quantity = row?.QUANTITY !== undefined ? toNumber(row?.QUANTITY) : 1;
              const dateParsed = parseRowDateValue(row?.DATE ?? row?.TRANSDATE);
              if (!dateParsed) continue;

              const ms = dateParsed.getTime();
              const dailyKey = toDateKey(dateParsed);
              const dailyLabel = formatShortDate(dateParsed);
              const weekKey = toWeekStartKey(dateParsed);
              const weekDate = parseRowDateValue(weekKey);
              const weekLabel = weekDate ? `Wk ${formatShortDate(weekDate)}` : weekKey;
              const lowerName = name.toLowerCase();
              const lowerDep = depName.toLowerCase();

              // Exclude if amount is zero or negative, or quantity is zero or negative
              if (amount <= 0 || quantity <= 0) continue;
              // Exclude if product or department name matches any keyword
              if (excludeKeywords.some((kw) => lowerName.includes(kw) || lowerDep.includes(kw))) continue;
              // Exclude if product name is empty or generic
              if (lowerName === "unknown" || lowerName === "guest count" || lowerName === "representation") continue;

              if (quantity < 1 || quantity > 50) {
                console.warn(`Suspicious qty — item: ${itemCode}, product: ${name}, qty: ${quantity}, date: ${dailyKey}`);
              }

              const key = `${itemCode}|${dailyKey}`;
              if (!productMap.has(key)) {
                productMap.set(key, { name, itemCode, amount, quantity, ms, dailyKey, dailyLabel, weekKey, weekLabel });
              } else {
                const prod = productMap.get(key)!;
                prod.amount += amount;
                prod.quantity += quantity;
              }
            }
            allSalesRows.push(...Array.from(productMap.values()));
            if (pageRows.length < 500) break;
          }
        }

        setSalesRows(allSalesRows);

        /* ── Determine anchor date ── */
        let baseDayKey = latestWorkDateKey;
        const hasSalesForBaseDay = allSalesRows.some((r) => r.dailyKey === baseDayKey);
        if (!hasSalesForBaseDay && allSalesRows.length > 0) {
          baseDayKey = allSalesRows.slice().sort((a, b) => b.ms - a.ms)[0].dailyKey;
        }
        setManagerTopSalesDate(baseDayKey);

        const dayMs = 24 * 60 * 60 * 1000;
        const baseDayDate = parseRowDateValue(baseDayKey);
        const baseDayMs = baseDayDate ? baseDayDate.getTime() : 0;
        const trendStartMs = baseDayMs > 0 ? baseDayMs - 6 * dayMs : 0;

        for (const row of allSalesRows) {
          if (baseDayKey && row.dailyKey === baseDayKey) addToPeriod("monthly", row.name, row.amount, row.quantity);
          if (baseDayMs > 0 && row.ms >= trendStartMs && row.ms <= baseDayMs) addTrend("monthly", row.dailyKey, row.dailyLabel, row.amount);
        }

        const toTopList = (map: Map<string, TopSellingItem>) =>
          Array.from(map.values()).sort((a, b) => b.amount - a.amount).slice(0, 5);
        const toTrendList = (map: Map<string, TopSellingTrendPoint>, max: number) =>
          Array.from(map.values()).sort((a, b) => a.key.localeCompare(b.key)).slice(-max);

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
        setSalesRows([]);
        setManagerTopProductsByPeriod({ daily: [], weekly: [], monthly: [] });
        setManagerTopTrendByPeriod({ daily: [], weekly: [], monthly: [] });
      } finally {
        setManagerLoading(false);
      }
    };

    void load();
  }, [isManager, managerBranches]);

  /* ── Error toast ── */
  useEffect(() => {
    if (lastError) {
      toast({ title: "Dashboard Error", description: String(lastError), variant: "destructive", duration: 8000 });
    }
  }, [lastError]);

  /* ── Missing dates toast (once per session) ── */
  useEffect(() => {
    if (!isManager || typeof managerMissingCount !== "number" || managerMissingCount <= 0) return;
    if (sessionStorage.getItem("branchMissingDatesToast")) return;

    let text = `Attention.\n${managerMissingCount} days of reports are missing for your assigned branches.\n`;
    text += `The latest report received was on ${formatFormalDate(managerLatestWorkDate)}.\n`;
    Object.entries(managerMissingDates).forEach(([branch, dates]) => {
      text += `\nBranch: ${branch}.\n`;
      if (dates.length > 0) {
        text += "Missing report dates are:\n";
        dates.forEach((d, idx) => {
          text += idx === dates.length - 1 && dates.length > 1
            ? `and ${formatFormalDate(d)}.`
            : `${formatFormalDate(d)},\n`;
        });
      } else {
        text += "No missing dates.";
      }
    });
    text += "\n\nPlease upload the missing daily reports.\nGo to Send Daily Report to upload them now.";

    toast({
      title: "Branch Missing Dates",
      description: (
        <div>
          <div style={{ whiteSpace: "pre-line", marginBottom: 8 }}>{text}</div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <button
              type="button"
              style={{ padding: "4px 10px", borderRadius: 6, background: "#e2f539", color: "#fff", border: "none", cursor: "pointer" }}
              onClick={() => {
                if (window.speechSynthesis) {
                  window.speechSynthesis.cancel();
                  const utt = new SpeechSynthesisUtterance(text.replace(/\n/g, " "));
                  utt.lang = "en-US";
                  window.speechSynthesis.speak(utt);
                }
              }}
            >
              Speak Notification
            </button>
            <button
              type="button"
              style={{ padding: "4px 10px", borderRadius: 6, background: soundEnabled ? "#4db6e8" : "#eee", color: soundEnabled ? "#fff" : "#333", border: "none", cursor: "pointer" }}
              onClick={() => setSoundEnabled((v) => {
                if (v && window.speechSynthesis) window.speechSynthesis.cancel();
                return !v;
              })}
            >
              {soundEnabled ? "Disable Sound" : "Enable Sound"}
            </button>
          </div>
        </div>
      ),
      variant: "destructive",
      duration: Infinity,
    });

    sessionStorage.setItem("branchMissingDatesToast", "1");
  }, [isManager, managerMissingCount, managerLatestWorkDate, managerMissingDates, soundEnabled]);

  /* ── Derived values ── */
  const today = new Date().toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" });
  const managerTopProducts = managerTopProductsByPeriod.monthly;
  const topAmountMax = managerTopProducts.reduce((max, item) => Math.max(max, item.amount), 0);
  const managerTopTrend = managerTopTrendByPeriod.monthly;
  const periodTotalSales = managerTopProducts.reduce((sum, item) => sum + item.amount, 0);
  const periodTopProduct = managerTopProducts.length > 0 ? managerTopProducts[0].name : "—";
  const trendLastAmount = managerTopTrend.at(-1)?.amount ?? 0;
  const trendPrevAmount = managerTopTrend.length > 1 ? managerTopTrend[managerTopTrend.length - 2].amount : trendLastAmount;
  const trendDelta = trendLastAmount - trendPrevAmount;
  const trendDeltaPct = trendPrevAmount > 0 ? (trendDelta / trendPrevAmount) * 100 : 0;
  const trendTone = trendDelta > 0 ? "up" : trendDelta < 0 ? "down" : "flat";
  const trendSummaryText = trendDelta > 0 ? "Higher than previous day" : trendDelta < 0 ? "Lower than previous day" : "Same as previous day";

  return (
    <div className={styles.dashRoot}>
      <div className={styles.dashShell}>
        <div className={styles.dashInner}>

          {/* Top bar */}
          <div className={styles.dashTopbar}>
            <div className={styles.dashBrand}>
              <div className={styles.dashHeadingGroup}>
                <h1 className={styles.dashTitle}>Manager Dashboard</h1>
                <p className={styles.dashDesc}>
                  {isManager
                    ? "View your branch assignments, report status, and performance analytics."
                    : "System operations, fetch control & status monitoring"}
                </p>
              </div>
            </div>
            <div className={styles.dashDatePill}>
              <div className={styles.dashDateDot} />
              <span className={styles.dashDateText}>{today}</span>
            </div>
          </div>

          {/* ── Admin stat cards ── */}
          {isAdmin && (
            <div className={styles.dashStats}>
              <StatCard
                label="Active Jobs"
                value={stats?.activeJobs}
                sub="Queued and running fetch jobs"
                icon={<Ico.Activity />}
                accentClass="statCardAccentSky"
                iconClass="statIconSky"
                trend="up"
                trendLabel="Queue"
                loading={loading}
                onClick={() => router.push("/admin/fetch-logs?status=queued,running")}
              />
              <StatCard
                label="Uploads"
                value={stats?.uploads}
                sub="CSV uploads processed"
                icon={<Ico.Upload />}
                accentClass="statCardAccentGold"
                iconClass="statIconGold"
                trend="flat"
                trendLabel="Today"
                loading={loading}
                onClick={() => router.push("/uploads")}
              />
              <StatCard
                label="Files"
                value={stats?.files}
                sub="Files ingested & indexed"
                icon={<Ico.Files />}
                accentClass="statCardAccentRed"
                iconClass="statIconRed"
                loading={loading}
                onClick={() => router.push("/files")}
              />
            </div>
          )}

          {/* ── Manager view ── */}
          {isManager && (
            <>
              {/* Action buttons */}
              <div className={styles.managerActions}>
                <button type="button" className={`${styles.managerActionBtn} bg-red-500`} onClick={() => router.push("/uploads")}>
                  <div>
                    <div className={styles.managerActionTitle}>Send Daily Report</div>
                    <div className={styles.managerActionValue}>Upload</div>
                  </div>
                  <div className={`${styles.statIcon} ${styles.statIconSky}`}><Ico.Upload /></div>
                </button>
                <button type="button" className={`${styles.managerActionBtn} bg-yellow-500`} onClick={() => router.push("/my-reports")}>
                  <div>
                    <div className={styles.managerActionTitle}>View My Reports</div>
                    <div className={styles.managerActionValue}>View</div>
                  </div>
                  <div className={`${styles.statIcon} ${styles.statIconRed}`}><Ico.Files /></div>
                </button>
                <button type="button" className={`${styles.managerActionBtn} bg-sky-500`} onClick={() => router.push("/users")}>
                  <div>
                    <div className={styles.managerActionTitle}>My Profile</div>
                    <div className={styles.managerActionValue}>Open</div>
                  </div>
                  <div className={`${styles.statIcon} ${styles.statIconGold}`}><Ico.Activity /></div>
                </button>
              </div>

              {/* KPI cards */}
              <div className={styles.managerKpiGrid}>
                <div className={styles.managerKpiCard}>
                  <div className={styles.managerKpiLabel}>Missing Dates</div>
                  <div className={`${styles.managerKpiValue} text-red-500`}>{managerLoading ? "…" : (managerMissingCount ?? "—")}</div>
                  <div className={styles.managerKpiSub}>Days with missing reports (POS 1 &amp; 2)</div>
                </div>
                <div className={styles.managerKpiCard}>
                  <div className={styles.managerKpiLabel}>Reports Sent</div>
                  <div className={`${styles.managerKpiValue} text-yellow-500`}>{managerLoading ? "…" : (managerSentCount ?? "—")}</div>
                  <div className={styles.managerKpiSub}>Total files you have submitted</div>
                </div>
                <div className={styles.managerKpiCard}>
                  <div className={styles.managerKpiLabel}>Latest Report Date</div>
                  <div className={`${styles.managerKpiValue} text-sky-500`} style={{ fontSize: "24px", lineHeight: 1.2 }}>
                    {managerLoading ? "…" : formatSimpleDate(managerLatestWorkDate)}
                  </div>
                  <div className={styles.managerKpiSub}>Most recent date with submitted report</div>
                </div>
                <div className={styles.managerKpiCard}>
                  <div className={styles.managerKpiLabel}>Your Branch</div>
                  <div className={`${styles.managerKpiValue} text-blue-900`} style={{ fontSize: "24px", lineHeight: 1.25, whiteSpace: "normal", wordBreak: "break-word" }}>
                    {managerBranches.length > 0 ? managerBranches.join(", ") : "—"}
                  </div>
                  <div className={styles.managerKpiSub}>Branch assigned to your account</div>
                </div>
              </div>

              {/* Best-selling products */}
              <div className={styles.managerBlock}>
                <div className={styles.topsellHead}>
                  <div>
                    <div className={styles.statLabel} style={{ marginBottom: 0 }}>Best-Selling Products (Latest Report Date)</div>
                    <div className={styles.topsellSub} style={{ marginTop: "4px" }}>
                      Based on your branch reports • date used: {managerTopSalesDate || "—"}
                    </div>
                    <div className={styles.topsellSub} style={{ marginTop: "2px" }}>
                      How to read this: higher sales amount means better-selling product.
                    </div>
                  </div>
                  <div className={styles.topsellRight}>
                    <div className={styles.topsellKpis}>
                      <div className={styles.topsellKpi} title="Total sales amount for latest work date">
                        <div className={styles.topsellKpiLabel}>Total Sales (Day)</div>
                        <div className={styles.topsellKpiValue}>₱{periodTotalSales.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
                      </div>
                      <div className={styles.topsellKpi} title={periodTopProduct}>
                        <div className={styles.topsellKpiLabel}>#1 Product (Day)</div>
                        <div className={styles.topsellKpiValue}>{periodTopProduct}</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Debug panel (dev only) */}
                {process.env.NODE_ENV === "development" && (
                  <DebugPanel salesRows={salesRows} managerTopSalesDate={managerTopSalesDate} />
                )}

                {managerLoading ? (
                  <div className={styles.statSub} style={{ marginTop: "8px" }}>Loading top products...</div>
                ) : managerTopProducts.length === 0 ? (
                  <>
                    {managerTopSalesDate && periodTotalSales === 0 && (
                      <div className="inline-block px-2 py-1 mb-2 text-xs font-semibold text-red-600 bg-red-100 rounded">
                        No sales on latest date
                      </div>
                    )}
                    <div className={styles.statSub} style={{ marginTop: "8px" }}>
                      No sales data found for <span style={{ fontWeight: 600 }}>{managerTopSalesDate}</span>.<br />
                      Please check if the uploaded CSV contains sales for this date.
                    </div>
                  </>
                ) : (
                  <div className={styles.topsellChart}>
                    {managerTopTrend.length > 0 && (
                      <div className={styles.topsellTrend}>
                        <div className={styles.topsellTrendHead}>
                          <div className={styles.topsellSub}>Sales trend (recent 7 days)</div>
                          <div className={`${styles.topsellTrendChange} ${styles[`topsellTrendChange${trendTone.charAt(0).toUpperCase() + trendTone.slice(1)}`]}`}>
                            {trendDelta > 0 ? "▲" : trendDelta < 0 ? "▼" : "■"} {Math.abs(trendDeltaPct).toFixed(1)}% • {trendSummaryText}
                          </div>
                        </div>
                        <div className={styles.topsellTrendList}>
                          {managerTopTrend.map((point, idx) => {
                            const prev = idx > 0 ? managerTopTrend[idx - 1].amount : point.amount;
                            const delta = point.amount - prev;
                            const sign = delta > 0 ? "+" : delta < 0 ? "-" : "±";
                            return (
                              <div key={point.key} className={styles.topsellTrendItem}>
                                <div className={styles.topsellTrendItemLabel}>{point.label}</div>
                                <div className={styles.topsellTrendItemAmount}>₱{point.amount.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
                                <div className={styles.topsellTrendItemDelta}>{sign} ₱{Math.abs(delta).toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {managerTopProducts.map((item, index) => {
                      const pct = topAmountMax > 0 ? Math.max(8, Math.round((item.amount / topAmountMax) * 100)) : 0;
                      return (
                        <div key={`${item.name}-${index}`} className={styles.topsellRow}>
                          <div style={{ minWidth: 0 }}>
                            <div className={styles.topsellName}>{index + 1}. {item.name}</div>
                            <div className={styles.topsellSub}>Qty {item.quantity.toLocaleString()}</div>
                          </div>
                          <div className={styles.topsellBarWrap} aria-hidden="true">
                            <div className={styles.topsellBar} style={{ width: `${pct}%` }} />
                          </div>
                          <div className={styles.topsellAmount}>₱{item.amount.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
                        </div>
                      );
                    })}

                    <div className={styles.topsellSub} style={{ marginTop: "2px" }}>
                      Ranking window: Latest report date only
                    </div>
                  </div>
                )}
              </div>

              {/* Assigned branches */}
              <div className={styles.managerBlock} style={{ marginBottom: "8px" }}>
                <div className={styles.statLabel}>Assigned Branches</div>
                <div style={{ marginTop: "8px", display: "flex", flexWrap: "wrap", gap: "8px" }}>
                  {managerBranches.length > 0 ? (
                    managerBranches.map((branch) => (
                      <span key={branch} style={{ padding: "4px 10px", borderRadius: "999px", border: "1px solid var(--border-md)", background: "var(--surface-2)", fontSize: "12px", color: "var(--text-secondary)" }}>
                        {branch}
                      </span>
                    ))
                  ) : (
                    <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>No branch scope assigned.</span>
                  )}
                </div>
                <div className={styles.statSub} style={{ marginTop: "8px" }}>
                  Tip: use Upload for daily sending, then My Sent Reports to review status and missing dates.
                </div>
              </div>
            </>
          )}

          {/* ── Admin tools ── */}
          {isAdmin && (
            <>
              <div className={styles.dashSectionLabel}>
                <span>Fetch Tools</span>
                <div className={styles.dashSectionRule} />
              </div>
              <div className={styles.dashMainGrid}>
                <ManualFetchClient />
                <MissingScanClient />
              </div>

              <div className={styles.dashSectionLabel} style={{ marginTop: "28px" }}>
                <span>Merge &amp; Combine</span>
                <div className={styles.dashSectionRule} />
              </div>
              <div style={{ marginBottom: "22px" }}>
                <CombineClient />
              </div>

              <div className={styles.dashSectionLabel}>
                <span>Retention</span>
                <div className={styles.dashSectionRule} />
              </div>
              <div className={styles.dashRetention}>
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

  if (!authChecked || !isAuthorized) return null;

  return (
    <LoginLayout>
      <DashboardContent />
      <Toaster />
    </LoginLayout>
  );
}