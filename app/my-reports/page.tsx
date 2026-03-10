"use client";

import { useEffect, useMemo, useState } from "react";
import { fetchWithAuth, getUser } from "@/utils/auth";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5000";
const MISSING_SCAN_COOLDOWN_MS = 2 * 60 * 1000;

type ReportItem = {
  id?: string | number;
  _id?: string;
  branch?: string;
  pos?: number | string;
  workDate?: string;
  sourceFile?: string;
  ingestedAt?: string;
};

type MissingScanRow = {
  branch?: string;
  pos?: string | number;
  missingDates?: string[];
  existingCount?: number;
  totalDates?: number;
  statusByDate?: Record<string, string>;
  failureByDate?: Record<string, string>;
};

const POS_OPTIONS = ["1", "2"];

function formatDate(value?: string) {
  if (!value) return "—";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "—";
  return parsed.toLocaleString();
}

function formatSourceFileName(value?: string) {
  const raw = String(value || "").trim();
  if (!raw) return "—";
  const normalized = raw.replace(/\\/g, "/");
  const parts = normalized.split("/").filter(Boolean);
  return parts.length > 0 ? parts[parts.length - 1] : raw;
}

function getDateKey(value?: string) {
  if (!value) return "";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";
  const year = parsed.getFullYear();
  const month = String(parsed.getMonth() + 1).padStart(2, "0");
  const day = String(parsed.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatMissingDateLabel(value?: string) {
  const raw = String(value || "").trim();
  if (!raw) return "—";
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return raw;
  return parsed.toISOString().slice(0, 10);
}

function buildDateRange(start?: string, end?: string, maxDays = 45) {
  const startRaw = String(start || "").trim();
  const endRaw = String(end || "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(startRaw) || !/^\d{4}-\d{2}-\d{2}$/.test(endRaw)) return [];

  const startDate = new Date(`${startRaw}T00:00:00`);
  const endDate = new Date(`${endRaw}T00:00:00`);
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime()) || endDate < startDate) return [];

  const result: string[] = [];
  const cursor = new Date(startDate);
  while (cursor <= endDate && result.length < maxDays) {
    result.push(cursor.toISOString().slice(0, 10));
    cursor.setDate(cursor.getDate() + 1);
  }
  return result;
}

function normalizeStatusLabel(value?: string) {
  const label = String(value || "").trim();
  if (!label) return "N/A";
  const lowered = label.toLowerCase();
  if (lowered.includes("sent")) return "SENT";
  if (lowered.includes("missing")) return "MISSING";
  if (lowered.includes("file not found")) return "FILE NOT FOUND";
  if (lowered.includes("error")) return "ERROR";
  return label.toUpperCase();
}

function statusToneClass(label?: string) {
  const normalized = normalizeStatusLabel(label);
  if (normalized === "SENT") return "bg-emerald-600 text-white";
  if (normalized === "MISSING") return "bg-rose-600 text-white";
  if (normalized === "FILE NOT FOUND") return "bg-sky-700 text-white";
  if (normalized === "ERROR") return "bg-amber-600 text-white";
  return "bg-slate-200 text-slate-700";
}

function dedupeReports(items: ReportItem[]) {
  const byKey = new Map<string, ReportItem>();

  for (const item of items || []) {
    const branch = String(item.branch || "").trim().toLowerCase();
    const pos = item.pos != null ? String(item.pos).trim().toLowerCase() : "";
    const workDate = getDateKey(item.workDate);
    const sourceFile = String(item.sourceFile || "").trim().toLowerCase();
    const key = `${branch}|${pos}|${workDate}|${sourceFile}`;

    const existing = byKey.get(key);
    if (!existing) {
      byKey.set(key, item);
      continue;
    }

    const existingIngested = new Date(existing.ingestedAt || 0).getTime() || 0;
    const currentIngested = new Date(item.ingestedAt || 0).getTime() || 0;
    if (currentIngested >= existingIngested) {
      byKey.set(key, item);
    }
  }

  return Array.from(byKey.values());
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

function normalizeFileRecord(item: any): ReportItem {
  return {
    id: item?.id,
    _id: item?._id,
    branch: item?.branch,
    pos: item?.pos,
    workDate: item?.workDate || item?.work_date,
    sourceFile: item?.sourceFile || item?.source_file || item?.filename,
    ingestedAt: item?.ingestedAt || item?.ingested_at || item?.createdAt || item?.created_at,
  };
}

export default function MyReportsPage() {
  const [items, setItems] = useState<ReportItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [fetchLimit] = useState(500);
  const [maxFetchPages] = useState(10);
  const [search, setSearch] = useState("");
  const [selectedDate, setSelectedDate] = useState("");
  const [posFilter, setPosFilter] = useState("all");
  const [sortBy, setSortBy] = useState("ingested_desc");
  const [assignedBranches, setAssignedBranches] = useState<string[]>([]);
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({});
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState("");
  const [previewTitle, setPreviewTitle] = useState("");
  const [previewColumns, setPreviewColumns] = useState<string[]>([]);
  const [previewRows, setPreviewRows] = useState<Record<string, any>[]>([]);
  const [missingRows, setMissingRows] = useState<MissingScanRow[]>([]);
  const [missingLoading, setMissingLoading] = useState(false);
  const [missingError, setMissingError] = useState("");
  const [showMissingTable, setShowMissingTable] = useState(false);
  const [showMissingMatrix, setShowMissingMatrix] = useState(false);
  const [missingRangeStart, setMissingRangeStart] = useState("");
  const [missingRangeEnd, setMissingRangeEnd] = useState("");
  const [missingLastLoadedAt, setMissingLastLoadedAt] = useState(0);
  const [missingLoadedScope, setMissingLoadedScope] = useState("");

  const role = useMemo(() => {
    try {
      return String(getUser()?.role || "").toLowerCase();
    } catch {
      return "";
    }
  }, []);

  useEffect(() => {
    const loadAssignedBranches = async () => {
      try {
        const user = getUser();
        const localBranches = normalizeBranchScope(user);
        const isManager = String(role).toLowerCase() === "manager";
        if (!isManager) {
          if (localBranches.length > 0) setAssignedBranches(localBranches);
          else setAssignedBranches([]);
          return;
        }

        const userId = String(user?.id || user?._id || "").trim();
        if (!userId) {
          setAssignedBranches(localBranches);
          return;
        }

        const apiBases = getApiBases();
        for (const base of apiBases) {
          const response = await fetchWithAuth(`${base}/api/auth/users/${encodeURIComponent(userId)}`, { method: "GET" });
          if (response.status === 599) continue;
          if (!response.ok) continue;
          const json = await response.json().catch(() => ({}));
          const apiBranches = normalizeBranchScope(json?.user);
          if (apiBranches.length > 0) {
            setAssignedBranches(apiBranches);
            return;
          }
        }

        if (localBranches.length > 0) {
          setAssignedBranches(localBranches);
          return;
        }

        setAssignedBranches([]);
      } catch {
        try {
          const fallbackBranches = normalizeBranchScope(getUser());
          setAssignedBranches(fallbackBranches);
        } catch {
          setAssignedBranches([]);
        }
      }
    };

    void loadAssignedBranches();
  }, [role]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const apiBases = getApiBases();
        const collectedItems: ReportItem[] = [];

        for (let pageIndex = 1; pageIndex <= maxFetchPages; pageIndex += 1) {
          const params = new URLSearchParams({
            page: String(pageIndex),
            limit: String(fetchLimit),
          });

          let resp: Response | null = null;
          let json: any = {};

          for (const base of apiBases) {
            const candidate = await fetchWithAuth(`${base}/api/fetch/files?${params.toString()}`, {
              method: "GET",
            });
            if (candidate.status === 599) continue;
            resp = candidate;
            json = await candidate.json().catch(() => ({}));
            break;
          }

          if (!resp) {
            if (pageIndex === 1) {
              setError("Cannot connect to server. Please check backend connection.");
              setItems([]);
              return;
            }
            break;
          }

          if (!resp.ok) {
            if (pageIndex === 1) {
              setError(json?.message || "Failed to load sent reports.");
              setItems([]);
              return;
            }
            break;
          }

          const pageItems = Array.isArray(json?.items) ? json.items : [];
          collectedItems.push(...pageItems);

          const total = Number(json?.total || 0);
          if (!pageItems.length) break;
          if (pageItems.length < fetchLimit) break;
          if (total > 0 && pageIndex * fetchLimit >= total) break;
        }

        const reportItems = collectedItems.map(normalizeFileRecord);
        const filteredItems = role === "manager" && assignedBranches.length > 0
          ? reportItems.filter((item: any) => assignedBranches.includes(String(item?.branch || "").trim()))
          : reportItems;
        setItems(dedupeReports(filteredItems));
      } catch (e: any) {
        setError(e?.message || "Failed to load sent reports.");
        setItems([]);
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [fetchLimit, maxFetchPages, role, assignedBranches]);

  const filteredSortedItems = useMemo(() => {
    const query = search.trim().toLowerCase();
    const filtered = items.filter((item) => {
      const branch = String(item.branch || "").trim();
      const pos = item.pos != null ? String(item.pos).trim() : "";
      const sourceFile = String(item.sourceFile || "").toLowerCase();
      const workDate = String(item.workDate || "").toLowerCase();

      if (posFilter !== "all" && pos !== posFilter) return false;
      if (selectedDate) {
        const itemDate = getDateKey(item.workDate);
        if (!itemDate || itemDate !== selectedDate) return false;
      }
      if (!query) return true;

      return (
        branch.toLowerCase().includes(query) ||
        pos.toLowerCase().includes(query) ||
        sourceFile.includes(query) ||
        workDate.includes(query)
      );
    });

    const sorted = [...filtered].sort((a, b) => {
      const ingestedA = new Date(a.ingestedAt || 0).getTime() || 0;
      const ingestedB = new Date(b.ingestedAt || 0).getTime() || 0;
      const workA = new Date(a.workDate || 0).getTime() || 0;
      const workB = new Date(b.workDate || 0).getTime() || 0;
      const branchA = String(a.branch || "");
      const branchB = String(b.branch || "");

      switch (sortBy) {
        case "ingested_asc":
          return ingestedA - ingestedB;
        case "work_desc":
          return workB - workA;
        case "work_asc":
          return workA - workB;
        case "branch_asc":
          return branchA.localeCompare(branchB);
        case "branch_desc":
          return branchB.localeCompare(branchA);
        case "ingested_desc":
        default:
          return ingestedB - ingestedA;
      }
    });

    return sorted;
  }, [items, search, selectedDate, posFilter, sortBy]);

  const groupedByDate = useMemo(() => {
    const groups = new Map<string, ReportItem[]>();
    for (const item of filteredSortedItems) {
      const key = getDateKey(item.workDate) || "unknown";
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(item);
    }

    return Array.from(groups.entries())
      .sort(([a], [b]) => {
        if (a === "unknown") return 1;
        if (b === "unknown") return -1;
        return b.localeCompare(a);
      })
      .map(([dateKey, files]) => ({ dateKey, files }));
  }, [filteredSortedItems]);

  useEffect(() => {
    if (!groupedByDate.length) {
      setExpandedFolders({});
      return;
    }
    setExpandedFolders((previous) => {
      const next = { ...previous };
      const keys = groupedByDate.map((group) => group.dateKey);
      for (const key of Object.keys(next)) {
        if (!keys.includes(key)) delete next[key];
      }
      if (Object.keys(next).length === 0) {
        next[groupedByDate[0].dateKey] = true;
      }
      return next;
    });
  }, [groupedByDate]);

  const total = filteredSortedItems.length;

  function formatFolderLabel(dateKey: string) {
    if (dateKey === "unknown") return "Unknown Date";
    const today = getDateKey(new Date().toISOString());
    const yesterdayDate = new Date();
    yesterdayDate.setDate(yesterdayDate.getDate() - 1);
    const yesterday = getDateKey(yesterdayDate.toISOString());

    if (dateKey === today) return "Today";
    if (dateKey === yesterday) return "Yesterday";

    const parsed = new Date(`${dateKey}T00:00:00`);
    if (Number.isNaN(parsed.getTime())) return dateKey;
    return parsed.toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
  }

  function toggleFolder(dateKey: string) {
    setExpandedFolders((previous) => ({
      ...previous,
      [dateKey]: !previous[dateKey],
    }));
  }

  async function openFilePreview(item: ReportItem) {
    const fileId = String(item.id || item._id || "").trim();
    setPreviewOpen(true);
    setPreviewLoading(true);
    setPreviewError("");
    setPreviewRows([]);
    setPreviewColumns([]);
    setPreviewTitle(formatSourceFileName(item.sourceFile));

    if (!fileId) {
      setPreviewError("Preview unavailable for this file.");
      setPreviewLoading(false);
      return;
    }

    try {
      const apiBases = getApiBases();
      let response: Response | null = null;
      let payload: any = {};

      for (const base of apiBases) {
        const candidate = await fetchWithAuth(`${base}/api/fetch/files/${encodeURIComponent(fileId)}/rows?limit=50`, {
          method: "GET",
        });
        if (candidate.status === 599) continue;
        response = candidate;
        payload = await candidate.json().catch(() => ({}));
        break;
      }

      if (!response) {
        setPreviewError("Cannot connect to server for preview.");
        return;
      }

      if (!response.ok) {
        setPreviewError(payload?.message || "Failed to load file preview.");
        return;
      }

      const items = Array.isArray(payload?.items) ? payload.items : [];
      const firstRow = items[0] && typeof items[0] === "object" ? items[0] : null;
      const columns = firstRow ? Object.keys(firstRow) : [];

      setPreviewColumns(columns);
      setPreviewRows(items);
    } catch (error: any) {
      setPreviewError(error?.message || "Failed to load file preview.");
    } finally {
      setPreviewLoading(false);
    }
  }

  const filteredMissingRows = useMemo(() => {
    return (missingRows || [])
      .filter((row) => Array.isArray(row?.missingDates) && row.missingDates.length > 0)
      .sort((a, b) => {
        const missingA = Array.isArray(a?.missingDates) ? a.missingDates.length : 0;
        const missingB = Array.isArray(b?.missingDates) ? b.missingDates.length : 0;
        if (missingA !== missingB) return missingB - missingA;
        const branchA = String(a?.branch || "");
        const branchB = String(b?.branch || "");
        if (branchA !== branchB) return branchA.localeCompare(branchB);
        return String(a?.pos || "").localeCompare(String(b?.pos || ""), undefined, { numeric: true });
      });
  }, [missingRows]);

  const missingSummary = useMemo(() => {
    const totalPairs = filteredMissingRows.length;
    const totalMissingDates = filteredMissingRows.reduce(
      (sum, row) => sum + (Array.isArray(row?.missingDates) ? row.missingDates.length : 0),
      0
    );
    const totalBranches = new Set(filteredMissingRows.map((row) => String(row?.branch || "").trim()).filter(Boolean)).size;
    return { totalPairs, totalMissingDates, totalBranches };
  }, [filteredMissingRows]);

  const groupedMissingRows = useMemo(() => {
    const groups = new Map<string, MissingScanRow[]>();
    for (const row of filteredMissingRows) {
      const branch = String(row?.branch || "Unknown").trim() || "Unknown";
      if (!groups.has(branch)) groups.set(branch, []);
      groups.get(branch)!.push(row);
    }

    return Array.from(groups.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([branch, rows]) => ({
        branch,
        rows: [...rows].sort((a, b) => String(a?.pos || "").localeCompare(String(b?.pos || ""), undefined, { numeric: true })),
      }));
  }, [filteredMissingRows]);

  const missingMatrixDates = useMemo(() => {
    const fromRange = buildDateRange(missingRangeStart, missingRangeEnd, 62);
    if (fromRange.length > 0) return fromRange;

    const keySet = new Set<string>();
    for (const row of filteredMissingRows) {
      const map = row?.statusByDate && typeof row.statusByDate === "object" ? row.statusByDate : {};
      for (const key of Object.keys(map)) keySet.add(String(key));
    }
    return Array.from(keySet).sort((a, b) => a.localeCompare(b));
  }, [filteredMissingRows, missingRangeStart, missingRangeEnd]);

  const missingScopeKey = useMemo(() => {
    const normalizedBranches = [...assignedBranches].map((branch) => String(branch).trim()).filter(Boolean).sort();
    return `${role}|${normalizedBranches.join(",")}`;
  }, [role, assignedBranches]);

  async function loadMissingDates(force = false) {
    if (role === "manager" && assignedBranches.length === 0) {
      setMissingError("No assigned branches found for this account.");
      setMissingRows([]);
      return;
    }

    if (missingLoading) return;

    const now = Date.now();
    const isSameScope = missingLoadedScope === missingScopeKey;
    const isFresh = missingLastLoadedAt > 0 && now - missingLastLoadedAt < MISSING_SCAN_COOLDOWN_MS;
    const hasCachedRows = missingRows.length > 0;
    if (!force && isSameScope && isFresh && hasCachedRows) {
      return;
    }

    setMissingLoading(true);
    setMissingError("");

    try {
      const body: Record<string, any> = {
        source: "report_pos_sended",
        positions: "1,2",
      };
      if (role === "manager" && assignedBranches.length > 0) body.branches = assignedBranches;

      const apiBases = getApiBases();
      let response: Response | null = null;
      let payload: any = {};

      for (const base of apiBases) {
        const candidate = await fetchWithAuth(`${base}/api/fetch/missing/scan`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (candidate.status === 599) continue;
        response = candidate;
        payload = await candidate.json().catch(() => ({}));
        break;
      }

      if (!response) {
        setMissingError("Cannot connect to server for missing dates.");
        setMissingRows([]);
        return;
      }

      if (!response.ok) {
        setMissingError(payload?.message || "Failed to load missing dates.");
        setMissingRows([]);
        return;
      }

      const rows = Array.isArray(payload?.results) ? payload.results : [];
      const scopedRows = role === "manager" && assignedBranches.length > 0
        ? rows.filter((row: any) => assignedBranches.includes(String(row?.branch || "").trim()))
        : rows;
      setMissingRows(scopedRows);
      setMissingRangeStart(String(payload?.start || "").trim());
      setMissingRangeEnd(String(payload?.end || "").trim());
      setMissingLastLoadedAt(Date.now());
      setMissingLoadedScope(missingScopeKey);
    } catch (error: any) {
      setMissingError(error?.message || "Failed to load missing dates.");
      setMissingRows([]);
    } finally {
      setMissingLoading(false);
    }
  }

  useEffect(() => {
    if (!showMissingTable && !showMissingMatrix) return;
    if (role === "manager" && assignedBranches.length === 0) return;
    void loadMissingDates();
  }, [showMissingTable, showMissingMatrix, role, assignedBranches]);

  useEffect(() => {
    if (!showMissingTable && !showMissingMatrix) return;
    if (role === "manager" && assignedBranches.length === 0) return;

    const intervalId = setInterval(() => {
      void loadMissingDates();
    }, MISSING_SCAN_COOLDOWN_MS);

    return () => clearInterval(intervalId);
  }, [showMissingTable, showMissingMatrix, role, assignedBranches]);

  return (
    <main className="mx-auto w-full max-w-6xl p-6 md:p-8 space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h1 className="text-2xl font-semibold tracking-tight">My Sent Reports</h1>
        <p className="text-sm text-slate-600 mt-1">
          {role === "manager"
            ? "History of reports submitted within your assigned branch scope."
            : "Report submission history."}
        </p>
        {role === "manager" ? (
          <p className="text-xs text-slate-500 mt-2">
            Showing assigned branches only: {assignedBranches.length > 0 ? assignedBranches.join(", ") : "(none assigned)"}
          </p>
        ) : null}
      </div>

      {error ? (
        <div className="rounded-lg border border-rose-200 bg-rose-50 text-rose-700 text-sm p-3">{error}</div>
      ) : null}

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
          <input
            type="text"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search branch, POS, file, date..."
            className="h-10 rounded-lg border border-slate-300 px-3 text-sm"
          />

          <input
            type="date"
            value={selectedDate}
            onChange={(event) => setSelectedDate(event.target.value)}
            className="h-10 rounded-lg border border-slate-300 px-3 text-sm"
            aria-label="Filter by date"
          />

          <select
            value={posFilter}
            onChange={(event) => setPosFilter(event.target.value)}
            className="h-10 rounded-lg border border-slate-300 px-3 text-sm bg-white"
          >
            <option value="all">All POS</option>
            {POS_OPTIONS.map((pos) => (
              <option key={pos} value={pos}>{pos}</option>
            ))}
          </select>

          <select
            value={sortBy}
            onChange={(event) => setSortBy(event.target.value)}
            className="h-10 rounded-lg border border-slate-300 px-3 text-sm bg-white"
          >
            <option value="ingested_desc">Sort: Latest ingested</option>
            <option value="ingested_asc">Sort: Oldest ingested</option>
            <option value="work_desc">Sort: Latest work date</option>
            <option value="work_asc">Sort: Oldest work date</option>
            <option value="branch_asc">Sort: Branch A-Z</option>
            <option value="branch_desc">Sort: Branch Z-A</option>
          </select>
        </div>

        <div className="mt-3 flex items-center justify-between gap-3 text-xs text-slate-600">
          <span>Showing {total} reports in {groupedByDate.length} folders</span>
          <button
            type="button"
            className="h-8 px-3 rounded-lg border border-slate-300 text-slate-700"
            onClick={() => {
              setSearch("");
              setSelectedDate("");
              setPosFilter("all");
              setSortBy("ingested_desc");
            }}
            disabled={loading}
          >
            Reset filters
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Missing Dates (Assigned Branches)</h2>
            <p className="text-xs text-slate-600">Same scan logic as admin, limited to your assigned branches.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              className="h-9 px-3 rounded-lg border border-slate-300 text-white text-sm bg-rose-500"
              onClick={() => setShowMissingTable((value) => !value)}
              disabled={missingLoading}
            >
              {showMissingTable ? "Hide Missing Dates" : "View Missing Dates"}
            </button>
            <button
              type="button"
              className="h-9 px-3 rounded-lg border border-slate-300 text-white text-sm bg-yellow-500"
              onClick={() => setShowMissingMatrix((value) => !value)}
              disabled={missingLoading}
            >
              {showMissingMatrix ? "Hide Status" : "View Status"}
            </button>
          </div>
        </div>

        {showMissingTable ? (
          <>
            <div className="flex justify-end">
              <button
                type="button"
                className="h-8 px-3 rounded-lg border border-slate-300 text-slate-700 text-xs"
                onClick={() => void loadMissingDates(true)}
                disabled={missingLoading}
              >
                {missingLoading ? "Scanning..." : "Refresh"}
              </button>
            </div>

            {missingError ? (
              <div className="rounded-lg border border-rose-200 bg-rose-50 text-rose-700 text-sm p-3">{missingError}</div>
            ) : null}

            {missingLoading ? (
              <div className="text-sm text-slate-500">Scanning missing dates...</div>
            ) : filteredMissingRows.length === 0 ? (
              <div className="text-sm text-slate-500">No missing dates found for current scope.</div>
            ) : (
              <div className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                    <p className="text-xs text-slate-500">Branches</p>
                    <p className="text-lg font-semibold text-slate-900">{missingSummary.totalBranches}</p>
                  </div>
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                    <p className="text-xs text-slate-500">Branch/POS Pairs</p>
                    <p className="text-lg font-semibold text-slate-900">{missingSummary.totalPairs}</p>
                  </div>
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                    <p className="text-xs text-slate-500">Total Missing Dates</p>
                    <p className="text-lg font-semibold text-rose-600">{missingSummary.totalMissingDates}</p>
                  </div>
                </div>

                <div className="space-y-3">
                  {groupedMissingRows.map((group) => (
                    <div key={group.branch} className="rounded-lg border border-slate-200 overflow-hidden">
                      <div className="bg-slate-50 border-b border-slate-200 px-3 py-2 flex items-center justify-between">
                        <p className="text-sm font-semibold text-slate-800">{group.branch}</p>
                        <p className="text-xs text-slate-600">{group.rows.length} POS affected</p>
                      </div>

                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead className="bg-white border-b border-slate-200">
                            <tr>
                              <th className="px-3 py-2 text-left font-semibold text-slate-700">POS</th>
                              <th className="px-3 py-2 text-left font-semibold text-slate-700">Missing Count</th>
                              <th className="px-3 py-2 text-left font-semibold text-slate-700">Missing Dates</th>
                            </tr>
                          </thead>
                          <tbody>
                            {group.rows.map((row, index) => {
                              const dates = Array.isArray(row.missingDates) ? [...row.missingDates] : [];
                              dates.sort((a, b) => String(a).localeCompare(String(b)));
                              return (
                                <tr key={`${group.branch}-${row.pos || "unknown"}-${index}`} className="border-b border-slate-100 last:border-b-0">
                                  <td className="px-3 py-2 text-slate-800">{row.pos != null ? String(row.pos) : "—"}</td>
                                  <td className="px-3 py-2 text-slate-700">{dates.length}</td>
                                  <td className="px-3 py-2">
                                    <div className="flex flex-wrap gap-1.5">
                                      {dates.length > 0 ? dates.map((date) => (
                                        <span key={`${group.branch}-${row.pos || "unknown"}-${date}`} className="inline-flex items-center rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs text-slate-700">
                                          {formatMissingDateLabel(date)}
                                        </span>
                                      )) : <span className="text-slate-500">—</span>}
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        ) : null}

        {showMissingMatrix ? (
          <>
            {missingError ? (
              <div className="rounded-lg border border-rose-200 bg-rose-50 text-rose-700 text-sm p-3">{missingError}</div>
            ) : null}

            {missingLoading ? (
              <div className="text-sm text-slate-500">Building status matrix...</div>
            ) : filteredMissingRows.length === 0 || missingMatrixDates.length === 0 ? (
              <div className="text-sm text-slate-500">No matrix data available for current scope.</div>
            ) : (
              <div className="space-y-2">
                <div className="text-xs text-slate-600">
                  Rows: {filteredMissingRows.length} • Dates: {missingMatrixDates.length} • Range: {formatMissingDateLabel(missingRangeStart)} - {formatMissingDateLabel(missingRangeEnd)}
                </div>

                <div className="flex flex-wrap gap-2 text-xs">
                  <span className="inline-flex items-center rounded-md bg-emerald-600 text-white px-2 py-1">SENT</span>
                  <span className="inline-flex items-center rounded-md bg-rose-600 text-white px-2 py-1">MISSING</span>
                  <span className="inline-flex items-center rounded-md bg-sky-700 text-white px-2 py-1">FILE NOT FOUND</span>
                  <span className="inline-flex items-center rounded-md bg-amber-600 text-white px-2 py-1">ERROR</span>
                </div>

                <div className="rounded-lg border border-slate-200 overflow-auto">
                  <table className="w-full text-xs md:text-sm">
                    <thead className="bg-slate-900 border-b border-slate-200">
                      <tr>
                        <th className="sticky left-0 z-20 px-3 py-2 text-left font-semibold text-white whitespace-nowrap bg-slate-900">Branch-POS</th>
                        {missingMatrixDates.map((date) => (
                          <th key={date} className="px-3 py-2 text-center font-semibold text-white whitespace-nowrap">{date}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredMissingRows.map((row, rowIndex) => {
                        const statusMap = row?.statusByDate && typeof row.statusByDate === "object" ? row.statusByDate : {};
                        return (
                          <tr key={`${row.branch || "unknown"}-${row.pos || "unknown"}-${rowIndex}`} className="border-b border-slate-100 last:border-b-0">
                            <td className="sticky left-0 z-10 px-3 py-2 font-medium text-slate-800 whitespace-nowrap bg-white">{String(row.branch || "—")} {row.pos != null ? String(row.pos) : "—"}</td>
                            {missingMatrixDates.map((date) => {
                              const label = normalizeStatusLabel(statusMap[date]);
                              return (
                                <td key={`${rowIndex}-${date}`} className={`px-2 py-2 text-center text-[11px] font-semibold whitespace-nowrap ${statusToneClass(label)}`}>
                                  {label}
                                </td>
                              );
                            })}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        ) : null}
      </div>

      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        {loading ? (
          <div className="px-4 py-8 text-center text-slate-500">Loading reports...</div>
        ) : groupedByDate.length === 0 ? (
          <div className="px-4 py-8 text-center text-slate-500">No reports found.</div>
        ) : (
          <div className="divide-y divide-slate-100">
            {groupedByDate.map((group) => {
              const isOpen = Boolean(expandedFolders[group.dateKey]);
              return (
                <div key={group.dateKey} className="p-3 md:p-4">
                  <button
                    type="button"
                    className="w-full flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-left"
                    onClick={() => toggleFolder(group.dateKey)}
                  >
                    <div>
                      <p className="text-sm font-semibold text-slate-800">📁 Report {formatFolderLabel(group.dateKey)}</p>
                      <p className="text-xs text-slate-600 mt-0.5">{group.files.length} file{group.files.length > 1 ? "s" : ""}</p>
                    </div>
                    <span className="text-sm text-white px-2 py-1 bg-red-400 rounded-md">{isOpen ? "Hide" : "Open"}</span>
                  </button>

                  {isOpen ? (
                    <div className="mt-3 rounded-lg border border-slate-200 overflow-hidden">
                      <table className="w-full text-sm">
                        <thead className="bg-sky-500 border-b border-slate-200 ">
                          <tr>
                            <th className="px-3 py-2 text-left font-semibold text-gray-700">Source File</th>
                            <th className="px-3 py-2 text-left font-semibold text-gray-700">Branch</th>
                            <th className="px-3 py-2 text-left font-semibold text-gray-700">POS</th>
                            <th className="px-3 py-2 text-left font-semibold text-gray-700">Ingested At</th>
                            <th className="px-3 py-2 text-left font-semibold text-gray-700">Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {group.files.map((item, index) => (
                            <tr key={String(item.id || item._id || `${group.dateKey}-${index}`)} className="border-b border-slate-100 last:border-b-0">
                              <td className="px-3 py-2 text-slate-800 break-all">{formatSourceFileName(item.sourceFile)}</td>
                              <td className="px-3 py-2 text-slate-700">{String(item.branch || "—")}</td>
                              <td className="px-3 py-2 text-slate-700">{item.pos != null ? String(item.pos) : "—"}</td>
                              <td className="px-3 py-2 text-slate-700">{formatDate(item.ingestedAt)}</td>
                              <td className="px-3 py-2">
                                <button
                                  type="button"
                                  className="h-8 px-3 rounded-lg border border-slate-300 text-slate-700 text-sm bg-yellow-500"
                                  onClick={() => void openFilePreview(item)}
                                >
                                  View
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {previewOpen ? (
        <div className="fixed inset-0 z-50 bg-black/30 p-4 md:p-8">
          <div className="mx-auto h-full w-full max-w-6xl rounded-xl border border-slate-200 bg-white shadow-lg flex flex-col">
            <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
              <div>
                <h2 className="text-base font-semibold text-slate-900">File Preview</h2>
                <p className="text-xs text-slate-600 mt-0.5 break-all">{previewTitle || "—"}</p>
              </div>
              <button
                type="button"
                className="h-8 px-3 rounded-lg border border-slate-300 text-white text-sm bg-red-500"
                onClick={() => setPreviewOpen(false)}
              >
                Close
              </button>
            </div>

            <div className="flex-1 overflow-auto p-4">
              {previewLoading ? (
                <div className="text-sm text-slate-500">Loading preview...</div>
              ) : previewError ? (
                <div className="rounded-lg border border-rose-200 bg-rose-50 text-rose-700 text-sm p-3">{previewError}</div>
              ) : previewRows.length === 0 ? (
                <div className="text-sm text-slate-500">No rows available for preview.</div>
              ) : (
                <div className="rounded-lg border border-slate-200 overflow-auto">
                  <table className="w-full text-xs md:text-sm">
                    <thead className="bg-slate-50 border-b border-slate-200">
                      <tr>
                        {previewColumns.map((column) => (
                          <th key={column} className="px-3 py-2 text-left font-semibold text-slate-700 whitespace-nowrap">{column}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {previewRows.map((row, rowIndex) => (
                        <tr key={rowIndex} className="border-b border-slate-100 last:border-b-0">
                          {previewColumns.map((column) => (
                            <td key={`${rowIndex}-${column}`} className="px-3 py-2 text-slate-700 align-top whitespace-nowrap">
                              {row && row[column] != null ? String(row[column]) : ""}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
