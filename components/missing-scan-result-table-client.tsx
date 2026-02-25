"use client";

import { useEffect, useMemo, useState } from "react";
import { fetchWithAuth } from "@/utils/auth";

const MISSING_SCAN_RESULT_KEY = "missingScan:lastResult";
const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5000";
const MOCK_BRANCHES = ["AYALA-FRN", "BETA", "B-CPOL", "B-SMS", "BIA", "BMC", "BRLN", "BPAG", "BGRAN", "BTAB", "CAMALIG", "CNTRO", "DAET", "DAR", "EME", "GOA", "IRIGA", "MAGS", "MAS", "OLA", "PACML", "ROB-FRN", "SANPILI", "SIPOCOT", "SMLGZ-FRN", "SMLIP", "SMNAG", "ROXAS"];

type ScanRow = {
  branch: string;
  pos: string | number;
  totalDates?: number;
  missingDates?: string[];
  existingCount?: number;
};

function formatShortDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" });
}

const css = `
.msr-card {
  border: 1px solid rgba(15,31,61,0.1);
  border-radius: 12px;
  overflow: hidden;
  background: #fff;
}

.msr-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 10px 14px;
  color: white;
}

.msr-title {
  font-family: "DM Mono", monospace;
  font-size: 15px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.2;
}

.msr-count {
  font-family: "DM Mono", monospace;
  font-size: 10px;
  color: rgba(255,255,255,0.6);
  background: rgba(255,255,255,0.08);
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 999px;
  padding: 2px 9px;
}

.msr-head-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.msr-queue {
  height: 30px;
  border: 1px solid #00c4cc;
  border-radius: 8px;
  padding: 0 11px;
  font-size: 11px;
  font-weight: 700;
  color: #fff;
  background: rgba(77,182,232,0.22);
  cursor: pointer;
}

.msr-queue:hover { background: rgba(77,182,232,0.32); }

.msr-queue:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.msr-body {
  padding: 12px;
  background: #f9fafb;
}

.msr-toolbar {
  display: flex;
  gap: 8px;
  margin-bottom: 10px;
}

.msr-branch-filter {
  border: 1px solid rgba(15,31,61,0.12);
  border-radius: 10px;
  background: #fff;
  margin-bottom: 10px;
  padding: 10px;
}

.msr-branch-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.msr-branch-label {
  font-size: 11px;
  font-weight: 700;
  color: #374a6b;
  text-transform: uppercase;
  letter-spacing: .06em;
}

.msr-branch-list {
  max-height: 140px;
  overflow-y: auto;
  border: 1px solid rgba(15,31,61,0.08);
  border-radius: 8px;
}

.msr-branch-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 7px 9px;
  border-bottom: 1px solid rgba(15,31,61,0.06);
  font-family: "DM Mono", monospace;
  font-size: 11px;
  color: #0f1f3d;
}

.msr-branch-item:last-child { border-bottom: none; }

.msr-branch-all {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  color: #374a6b;
  cursor: pointer;
}

.msr-input {
  flex: 1;
  height: 36px;
  border: 1px solid rgba(15,31,61,0.15);
  border-radius: 8px;
  padding: 0 11px;
  font-size: 12px;
  font-family: "DM Mono", monospace;
  color: #0f1f3d;
  background: #fff;
  outline: none;
}

.msr-input:focus {
  border-color: #4db6e8;
  box-shadow: 0 0 0 3px rgba(77,182,232,0.14);
}

.msr-clear {
  height: 36px;
  border: 1px solid rgba(15,31,61,0.12);
  border-radius: 8px;
  padding: 0 12px;
  font-size: 12px;
  font-weight: 600;
  color: #374a6b;
  background: #fff;
  cursor: pointer;
}

.msr-clear:hover { background: #f2f4f7; }

.msr-table-wrap {
  border: 1px solid rgba(15,31,61,0.1);
  border-radius: 10px;
  overflow: auto;
  background: #fff;
}

.msr-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 12px;
  color: #374a6b;
}

.msr-table thead tr {
  background: #e8ba37;
  border-bottom: 1px solid rgba(15,31,61,0.12);
}

.msr-table th {
  text-align: left;
  padding: 10px 8px;
  font-weight: 700;
  color: #0f1f3d;
  white-space: nowrap;
}

.msr-table td {
  padding: 9px 8px;
  border-bottom: 1px solid rgba(15,31,61,0.07);
  vertical-align: top;
}

.msr-table tbody tr:nth-child(even) { background: rgba(15,31,61,0.015); }
.msr-branch { font-weight: 700; color: #0f1f3d; }
.msr-miss { font-weight: 700; color: #c0272d; }
.msr-none { color: #6d7f9e; }

.msr-pagination {
  margin-top: 10px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  color: #6d7f9e;
  font-size: 11px;
  font-family: "DM Mono", monospace;
}

.msr-pager {
  display: flex;
  gap: 6px;
}

.msr-btn {
  height: 30px;
  border: 1px solid rgba(15,31,61,0.12);
  border-radius: 8px;
  padding: 0 10px;
  background: #fff;
  color: #0f1f3d;
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
}

.msr-btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.msr-empty {
  min-height: 180px;
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  color: #6d7f9e;
  font-family: "DM Mono", monospace;
  font-size: 12px;
  border: 1px dashed rgba(15,31,61,0.15);
  border-radius: 10px;
  background: #fff;
}
`;

export default function MissingScanResultTableClient() {
  const [scanResult, setScanResult] = useState<any>(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [queueing, setQueueing] = useState(false);
  const [reingesting, setReingesting] = useState(false);
  const [queueStatus, setQueueStatus] = useState("");
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});
  const [branchOptions, setBranchOptions] = useState<string[]>([]);
  const [selectedBranches, setSelectedBranches] = useState<string[]>([]);
  const pageSize = 10;

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

  useEffect(() => {
    (async () => {
      try {
        const res = await fetchWithAuth(`${API_BASE}/api/fetch/branches`, { method: "GET" });
        if (!res.ok) { setBranchOptions(MOCK_BRANCHES); setSelectedBranches(MOCK_BRANCHES); return; }
        const data = await res.json().catch(() => null);
        const fetched = Array.isArray(data)
          ? data.map(String)
          : (Array.isArray(data?.branches) ? data.branches.map(String) : []);
        const list = fetched.length ? fetched : MOCK_BRANCHES;
        setBranchOptions(list);
        setSelectedBranches(list);
      } catch {
        setBranchOptions(MOCK_BRANCHES);
        setSelectedBranches(MOCK_BRANCHES);
      }
    })();
  }, []);

  const allBranchesSelected = branchOptions.length > 0 && selectedBranches.length === branchOptions.length;
  const toggleBranch = (branch: string) => {
    setSelectedBranches((prev) => prev.includes(branch) ? prev.filter((b) => b !== branch) : [...prev, branch]);
  };

  const refreshFromStorage = () => {
    if (typeof window === "undefined") return;
    const raw = window.localStorage.getItem(MISSING_SCAN_RESULT_KEY);
    if (!raw) {
      setQueueStatus("No cached scan result found.");
      return;
    }
    try {
      const parsed = JSON.parse(raw);
      setScanResult(parsed);
      setQueueStatus("Results refreshed.");
    } catch {
      setQueueStatus("Failed to parse cached results.");
    }
  };

  const handleQueueFetchScan = async (targetRow?: any) => {
    if (!scanResult?.snapshotId) {
      setQueueStatus("Snapshot not found. Run scan again before queueing.");
      return;
    }

    setQueueing(true);
    const scopeText = targetRow ? `${targetRow.branch} POS${targetRow.pos}` : 'selected scope';
    setQueueStatus(`Queuing scan (${scanResult?.start || 'auto'} to ${scanResult?.end || 'auto'}) • ${scopeText}...`);

    try {
      const body: any = {
        autoQueue: true,
        snapshotId: scanResult.snapshotId,
        positions: "1,2",
      };

      // Use selected branches or all branches from scan result
      if (targetRow) {
        body.branches = [String(targetRow.branch)];
        body.positions = [String(targetRow.pos)];
      } else {
        if (selectedBranches.length) {
          body.branches = selectedBranches;
        } else if (scanResult?.results && scanResult.results.length) {
          const uniqueBranches = [...new Set(scanResult.results.map((r: any) => r.branch))];
          body.branches = uniqueBranches;
        }
      }
      
      const resp = await fetchWithAuth(`${API_BASE}/api/fetch/missing/scan`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const json = await resp.json();
      if (!resp.ok) {
        setQueueStatus(json?.message ?? "Queue failed");
        return;
      }

      setScanResult(json);
      if (typeof window !== "undefined") {
        window.localStorage.setItem(MISSING_SCAN_RESULT_KEY, JSON.stringify(json));
        window.dispatchEvent(new CustomEvent("missing-scan-result", { detail: json }));
      }
      setQueueStatus(json?.queued ? `✅ Queued! Job ID: ${json.jobId}. Tip: Re-run scan after fetch completes.` : "Scan completed");
    } catch (error) {
      setQueueStatus(`Queue failed: ${String(error)}`);
    } finally {
      setQueueing(false);
    }
  };

  const handleReIngest = async (targetRow?: any) => {
    if (!scanResult?.start || !scanResult?.end) {
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
        mode: "re-ingest-missing-scan",
      };

      if (targetRow) {
        body.branches = [String(targetRow.branch)];
        body.positions = [String(targetRow.pos)];
      } else {
        if (selectedBranches.length) {
          body.branches = selectedBranches;
        } else if (scanResult?.results && scanResult.results.length) {
          body.branches = [...new Set(scanResult.results.map((r: any) => r.branch))];
        }

        if (scanResult?.results && scanResult.results.length) {
          const branchSet = new Set(body.branches || []);
          const scopedRows = branchSet.size
            ? scanResult.results.filter((r: any) => branchSet.has(r.branch))
            : scanResult.results;
          body.positions = [...new Set(scopedRows.map((r: any) => String(r.pos)))];
        }
      }

      const resp = await fetchWithAuth(`${API_BASE}/api/fetch/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const json = await resp.json();
      if (!resp.ok) {
        setQueueStatus(`Re-ingest failed: ${json?.message ?? "Request failed"}`);
        return;
      }

      setQueueStatus(`✅ Re-ingest queued! Job ID: ${json?.jobId || "N/A"}. Check Fetch Logs for progress.`);
    } catch (error) {
      setQueueStatus(`Re-ingest failed: ${String(error)}`);
    } finally {
      setReingesting(false);
    }
  };

  useEffect(() => {
    if (typeof window === "undefined") return;

    const onResult = (event: Event) => {
      const custom = event as CustomEvent<any>;
      if (!custom.detail) return;
      setScanResult(custom.detail);
    };

    refreshFromStorage();
    window.addEventListener("missing-scan-result", onResult as EventListener);

    return () => {
      window.removeEventListener("missing-scan-result", onResult as EventListener);
    };
  }, []);

  const rows: ScanRow[] = useMemo(() => {
    if (!scanResult?.results || !Array.isArray(scanResult.results)) return [];
    return scanResult.results;
  }, [scanResult]);

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    const selectedSet = new Set(selectedBranches);
    return rows.filter((row) => {
      const branch = row.branch || "";
      const matchBranchSelect = selectedSet.size === 0 || selectedSet.has(branch);
      const matchSearch = !needle || branch.toLowerCase().includes(needle);
      return matchBranchSelect && matchSearch;
    });
  }, [rows, search, selectedBranches]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const startIndex = (currentPage - 1) * pageSize;
  const pageRows = filtered.slice(startIndex, startIndex + pageSize);

  useEffect(() => {
    setPage(1);
  }, [search]);

  return (
    <div className="msr-card">
      <style>{css}</style>
      <div className="msr-head bg-gradient-to-r from-sky-500 via-sky-400 to-sky-300">
        <span className="msr-title ">Missing Scan Result Table</span>
        <div className="msr-head-right">
          <span className="msr-count">{rows.length} rows</span>
          <button className="bg-red-500 hover:bg-red-600 text-white px-4 py-1 rounded-lg" onClick={refreshFromStorage}>Refresh Results</button>
          <button className="bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-1 rounded-lg" onClick={handleReIngest} disabled={reingesting || queueing}>
            {reingesting ? "Re-ingesting..." : "Re-ingest"}
          </button>
          <button className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-1 rounded-lg border border-white" onClick={handleQueueFetchScan} disabled={queueing || reingesting}>
            {queueing ? "Queuing..." : "Queue Fetch Scan"}
          </button>
        </div>
      </div>

      <div className="msr-body">
        {queueStatus ? (
          <div style={{ marginBottom: 10, fontSize: 11, color: "#374a6b", fontFamily: "DM Mono, monospace" }}>
            {queueStatus}
          </div>
        ) : null}

        <div style={{ marginBottom: 10, fontSize: 11, color: "#6d7f9e", fontFamily: "DM Mono, monospace" }}>
          Tip: Use <strong>Queue Fetch Scan</strong> for missing files. Use <strong>Re-ingest</strong> only when files already exist but processing failed/wrong.
        </div>

        <div className="msr-branch-filter">
          <div className="msr-branch-head">
            <span className="msr-branch-label">Search Branches</span>
            <label className="msr-branch-all">
              <input
                type="checkbox"
                checked={allBranchesSelected}
                onChange={(e) => setSelectedBranches(e.target.checked ? branchOptions.slice() : [])}
              />
              Select all
            </label>
          </div>
          <div className="msr-branch-list">
            {branchOptions.map((branch) => (
              <label key={branch} className="msr-branch-item">
                <input
                  type="checkbox"
                  checked={selectedBranches.includes(branch)}
                  onChange={() => toggleBranch(branch)}
                />
                <span>{branch}</span>
              </label>
            ))}
          </div>
          <div style={{ marginTop: 6, fontSize: 11, color: "#6d7f9e", fontFamily: "DM Mono, monospace" }}>
            {selectedBranches.length} of {branchOptions.length} selected
          </div>
        </div>

        {rows.length === 0 ? (
          <div className="msr-empty">No scan result yet. Run Queue Missing Fetches first.</div>
        ) : (
          <>
            <div className="msr-toolbar">
              <input
                className="msr-input"
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search branch..."
              />
              <button className="msr-clear" onClick={() => setSearch("")}>Clear</button>
            </div>

            <div className="msr-table-wrap">
              <table className="msr-table">
                <thead>
                  <tr>
                    <th>Branch</th>
                    <th>Pos</th>
                    <th>Total Dates</th>
                    <th>Missing Count</th>
                    <th>Missing Dates</th>
                    <th>Failure Reason</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pageRows.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="msr-none">No rows match your branch filter.</td>
                    </tr>
                  ) : (
                    pageRows.map((row, index) => {
                      const rowKey = `${row.branch}-${row.pos}-${index}`;
                      const isOpen = Boolean(expandedRows[rowKey]);
                      const hasMissingDates = Array.isArray(row.missingDates) && row.missingDates.length > 0;
                      return (
                        <tr key={rowKey}>
                          <td className="msr-branch">{row.branch}</td>
                          <td>{row.pos}</td>
                          <td>{row.totalDates ?? 0}</td>
                          <td className="msr-miss">{row.missingDates?.length ?? 0}</td>
                          <td>
                            {row.missingDates && row.missingDates.length > 0 ? (
                              <div>
                                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                                  <span style={{ fontFamily: "DM Mono, monospace", fontSize: 11, color: "#374a6b" }}>
                                    {formatShortDate(row.missingDates[0])} – {formatShortDate(row.missingDates[row.missingDates.length - 1])} ({row.missingDates.length})
                                  </span>
                                  <button
                                    type="button"
                                    className="bg-sky-500 hover:bg-sky-600 text-white text-xs font-semibold px-2 py-1 rounded"
                                    onClick={() => setExpandedRows((prev) => ({ ...prev, [rowKey]: !isOpen }))}
                                  >
                                    {isOpen ? "Hide Missing Dates" : "Show Missing Dates"}
                                  </button>
                                </div>
                                {isOpen && (
                                  <div style={{ marginTop: 6, maxHeight: 140, overflowY: "auto", border: "1px solid rgba(15,31,61,0.12)", borderRadius: 6, padding: "6px 8px", background: "#fff" }}>
                                    {row.missingDates.map((date, i) => (
                                      <div key={`${date}-${i}`}>{formatShortDate(date)}</div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            ) : (
                              <span className="msr-none">None</span>
                            )}
                          </td>
                          <td>{getFailureReason(row)}</td>
                          <td>
                            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                              <button
                                className="bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-1 rounded-lg"
                                onClick={() => handleQueueFetchScan(row)}
                                disabled={queueing || reingesting || !hasMissingDates}
                              >
                                Queue Fetch
                              </button>
                              <button
                                className="bg-red-500 hover:bg-red-600 text-white px-4 py-1 rounded-lg"
                                onClick={() => handleReIngest(row)}
                                disabled={queueing || reingesting || !hasMissingDates || Number(row?.existingCount ?? 0) <= 0}
                                title={Number(row?.existingCount ?? 0) <= 0 ? 'Re-ingest is available only when files were already ingested. Use Queue Fetch first.' : 'Re-process existing ingested files for this row'}
                              >
                                Re-ingest
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            <div className="msr-pagination">
              <span>
                {filtered.length === 0 ? 0 : startIndex + 1}-{Math.min(startIndex + pageSize, filtered.length)} of {filtered.length}
              </span>
              <div className="msr-pager">
                <button className="msr-btn" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={currentPage <= 1}>Prev</button>
                <button className="msr-btn" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={currentPage >= totalPages}>Next</button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
