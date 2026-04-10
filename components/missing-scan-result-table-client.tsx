"use client";

import { useEffect, useMemo, useState } from "react";
import { fetchWithAuth, getAccessToken } from "@/utils/auth";
import TimezoneBadge from "@/components/timezone-badge";
import Swal from "sweetalert2";

const MISSING_SCAN_RESULT_KEY = "missingScan:lastResult";
const MISSING_SCAN_SOURCE_KEY = "missingScan:sourceMode";
const MISSING_SCAN_LOCAL_OVERRIDE_KEY = "missingScan:localStatusOverrides";
const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5000";
const MOCK_BRANCHES = ["AYALA-FRN", "BETA", "B-CPOL", "B-SMS", "BIA", "BMC", "BRLN", "BPAG", "BGRAN", "BTAB", "CAMALIG", "CNTRO", "DAET", "DAR", "EME", "GOA", "IRIGA", "MAGS", "MAS", "OLA", "PACML", "ROB-FRN", "SANPILI", "SIPOCOT", "SMLGZ-FRN", "SMLIP", "SMNAG", "ROXAS"];

type ScanRow = {
  branch: string;
  pos: string | number;
  totalDates?: number;
  missingDates?: string[];
  existingCount?: number;
  failureByDate?: Record<string, string>;
  statusByDate?: Record<string, string>;
};

type ManagedStatusKey = "sent" | "missing" | "notfound" | "corrupted";

type StatusConfigEntry = {
  title: string;
  color: string;
  remarks: string;
};

type MissingStatusConfig = Record<ManagedStatusKey, StatusConfigEntry>;

type SelectedReportCell = {
  branch: string;
  pos: string | number;
  date: string;
  statusKey: ManagedStatusKey | null;
  raw: string;
};

type CellEditorDraft = {
  statusKey: ManagedStatusKey;
  title: string;
  color: string;
  remarks: string;
};

type LocalStatusOverride = {
  branch: string;
  pos: string;
  date: string;
  label: string;
  statusKey: ManagedStatusKey;
  expiresAt: number;
};

const DEFAULT_STATUS_CONFIG: MissingStatusConfig = {
  sent: {
    title: "SENT",
    color: "#198754",
    remarks: "Successfully sent",
  },
  missing: {
    title: "MISSING",
    color: "#dc3545",
    remarks: "No report for this date",
  },
  notfound: {
    title: "FILE NOT FOUND",
    color: "#1a5276",
    remarks: "Source file not found",
  },
  corrupted: {
    title: "CORRUPTED",
    color: "#8e44ad",
    remarks: "File exists but unreadable/corrupted",
  },
};

function normalizeStatusConfig(raw: any): MissingStatusConfig {
  const next: MissingStatusConfig = { ...DEFAULT_STATUS_CONFIG };
  if (!raw || typeof raw !== "object") return next;

  (Object.keys(DEFAULT_STATUS_CONFIG) as ManagedStatusKey[]).forEach((key) => {
    const item = raw?.[key];
    if (!item || typeof item !== "object") return;
    next[key] = {
      title: String(item?.title || next[key].title).trim() || next[key].title,
      color: String(item?.color || next[key].color).trim() || next[key].color,
      remarks: String(item?.remarks || "").trim(),
    };
  });

  return next;
}

function isManagedStatusKey(value: string): value is ManagedStatusKey {
  return value === "sent" || value === "missing" || value === "notfound" || value === "corrupted";
}

function formatShortDate(value: string, timeZone?: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  try {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "2-digit",
      year: "numeric",
      timeZone: timeZone || "Asia/Manila",
    }).format(date);
  } catch {
    return date.toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" });
  }
}

function normalizeFailureLabel(raw: string) {
  const text = String(raw || "").trim();
  const lowered = text.toLowerCase();
  if (lowered.includes("corrupted")) return "Corrupted File";
  if (lowered.includes("file not found")) return "File Not Found";
  if (lowered.includes("missing")) return "Missing";
  if (lowered.includes("error")) return "Error";
  return text || "Unknown";
}

function getStatusMeta(raw: string) {
  const text = String(raw || "").trim();
  const lowered = text.toLowerCase();
  const timeMatch = /\b(\d{1,2}:\d{2}:\d{2})\b/.exec(text);

  if (!text) return { tone: "none", statusKey: "none", label: "—", time: "" };
  if (lowered.includes("sent")) return { tone: "sent", statusKey: "sent", label: "Sent", time: timeMatch?.[1] || "" };
  if (lowered.includes("file not found")) return { tone: "notfound", statusKey: "notfound", label: "File Not Found", time: timeMatch?.[1] || "" };
  if (lowered.includes("corrupted")) return { tone: "corrupted", statusKey: "corrupted", label: "Corrupted File", time: timeMatch?.[1] || "" };
  if (lowered.includes("missing")) return { tone: "missing", statusKey: "missing", label: "Missing", time: timeMatch?.[1] || "" };
  if (lowered.includes("error")) return { tone: "error", statusKey: "error", label: "Error", time: timeMatch?.[1] || "" };
  return { tone: "unknown", statusKey: "unknown", label: text, time: timeMatch?.[1] || "" };
}

function buildDateRange(start?: string, end?: string) {
  if (!start || !end) return [] as string[];
  const s = new Date(start);
  const e = new Date(end);
  if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime()) || s > e) return [] as string[];

  const oneDay = 24 * 60 * 60 * 1000;
  const days = Math.floor((Date.UTC(e.getUTCFullYear(), e.getUTCMonth(), e.getUTCDate()) - Date.UTC(s.getUTCFullYear(), s.getUTCMonth(), s.getUTCDate())) / oneDay) + 1;
  if (days <= 0 || days > 93) return [] as string[];

  const out: string[] = [];
  const cursor = new Date(Date.UTC(s.getUTCFullYear(), s.getUTCMonth(), s.getUTCDate()));
  for (let i = 0; i < days; i += 1) {
    out.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return out;
}

const css = `
.msr-card {
  border: 1px solid rgba(15,31,61,0.08);
  border-radius: 18px;
  overflow: hidden;
  background: #fff;
  box-shadow: 0 10px 30px rgba(15,31,61,0.06);
}

.msr-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 14px 16px;
  color: white;
  background: linear-gradient(135deg, #102a43 0%, #1f4e78 55%, #2b6b93 100%);
}

.msr-title {
  font-family: "DM Mono", monospace;
  font-size: 15px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.msr-count {
  font-family: "DM Mono", monospace;
  font-size: 10px;
  color: rgba(255,255,255,0.82);
  background: rgba(255,255,255,0.10);
  border: 1px solid rgba(255,255,255,0.14);
  border-radius: 999px;
  padding: 4px 10px;
}

.msr-head-right {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.msr-head-action {
  height: 36px;
  border-radius: 12px;
  padding: 0 14px;
  border: 1px solid transparent;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.02em;
  color: #ffffff;
  cursor: pointer;
  transition: transform 0.15s ease, box-shadow 0.15s ease, filter 0.15s ease;
}

.msr-head-action:hover:not(:disabled) {
  transform: translateY(-1px);
  filter: brightness(1.03);
}

.msr-head-action:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.msr-head-action.refresh {
  background: linear-gradient(180deg, #e94f5a 0%, #cd3340 100%);
  border-color: rgba(255,255,255,0.18);
  box-shadow: 0 8px 16px rgba(185, 28, 45, 0.32);
}

.msr-head-action.queue {
  background: linear-gradient(180deg, #2f7fb2 0%, #235f88 100%);
  border-color: rgba(255,255,255,0.2);
  box-shadow: 0 8px 16px rgba(35, 95, 136, 0.34);
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
  padding: 16px;
  background: linear-gradient(180deg, #f8fafc 0%, #f3f7fb 100%);
}

.msr-toolbar {
  display: flex;
  gap: 8px;
  margin-bottom: 10px;
  flex-wrap: wrap;
}

.msr-branch-filter {
  border: 1px solid rgba(15,31,61,0.08);
  border-radius: 16px;
  background: #fff;
  margin-bottom: 10px;
  padding: 14px;
  box-shadow: 0 8px 22px rgba(15,31,61,0.04);
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
  color: #334155;
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
  padding: 8px 10px;
  border-bottom: 1px solid rgba(15,31,61,0.05);
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
  height: 40px;
  border: 1px solid rgba(15,31,61,0.14);
  border-radius: 12px;
  padding: 0 11px;
  font-size: 12px;
  font-family: Inter, system-ui, sans-serif;
  color: #0f1f3d;
  background: #fff;
  outline: none;
  transition: border-color 0.15s ease, box-shadow 0.15s ease, transform 0.15s ease;
}

.msr-input:focus {
  border-color: #2b6b93;
  box-shadow: 0 0 0 4px rgba(43,107,147,0.12);
}

.msr-clear {
  height: 40px;
  border: 1px solid rgba(15,31,61,0.10);
  border-radius: 12px;
  padding: 0 12px;
  font-size: 12px;
  font-weight: 600;
  color: #334155;
  background: linear-gradient(180deg, #ffffff 0%, #f8fafc 100%);
  cursor: pointer;
  transition: transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease;
}

.msr-clear:hover { background: #fff; border-color: rgba(15,31,61,0.18); box-shadow: 0 6px 16px rgba(15,31,61,0.06); transform: translateY(-1px); }

.msr-table-wrap {
  border: 1px solid rgba(15,31,61,0.08);
  border-radius: 16px;
  overflow: auto;
  background: #fff;
  box-shadow: 0 10px 28px rgba(15,31,61,0.05);
}

.msr-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 12px;
  color: #374a6b;
}

.msr-table thead tr {
  background: linear-gradient(180deg, #223041 0%, #1b2736 100%);
  border-bottom: 1px solid rgba(15,31,61,0.15);
}

.msr-table th {
  text-align: left;
  padding: 12px 10px;
  font-weight: 700;
  color: #eef4fb;
  white-space: nowrap;
}

.msr-table td {
  padding: 10px 10px;
  border-bottom: 1px solid rgba(15,31,61,0.06);
  vertical-align: top;
}

.msr-table tbody tr:nth-child(even) { background: rgba(15,31,61,0.012); }
.msr-table tbody tr:hover { background: rgba(43,107,147,0.04); }
.msr-branch { font-weight: 700; color: #0f1f3d; }
.msr-miss { font-weight: 700; color: #c0272d; }
.msr-none { color: #6d7f9e; }

.msr-pagination {
  margin-top: 12px;
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
  height: 34px;
  border: 1px solid rgba(15,31,61,0.10);
  border-radius: 12px;
  padding: 0 10px;
  background: linear-gradient(180deg, #ffffff 0%, #f8fafc 100%);
  color: #0f1f3d;
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease;
}

.msr-btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.msr-btn:hover:not(:disabled) {
  border-color: rgba(15,31,61,0.18);
  box-shadow: 0 6px 14px rgba(15,31,61,0.06);
  transform: translateY(-1px);
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

.msr-tile-btn {
  height: 40px;
  border: 1px solid rgba(43,107,147,0.28);
  border-radius: 12px;
  padding: 0 12px;
  font-size: 12px;
  font-weight: 700;
  color: #0f1f3d;
  background: linear-gradient(180deg, #e8f3fb 0%, #dbeef8 100%);
  cursor: pointer;
}

.msr-tile-btn:hover { background: linear-gradient(180deg, #dcecf7 0%, #cfe7f4 100%); }

.msr-report-btn {
  height: 40px;
  border: 1px solid rgba(25, 135, 84, 0.18);
  border-radius: 12px;
  padding: 0 12px;
  font-size: 12px;
  font-weight: 700;
  color: #0f1f3d;
  background: linear-gradient(180deg, #eef9f2 0%, #dff3e6 100%);
  cursor: pointer;
}

.msr-report-btn:hover { background: linear-gradient(180deg, #e2f5e8 0%, #d4efdc 100%); }

.msr-modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(2, 12, 27, 0.58);
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}

.msr-modal {
  width: min(1400px, calc(100vw - 48px));
  height: min(86vh, 900px);
  position: relative;
  background: #ffffff;
  border-radius: 20px;
  border: 1px solid rgba(15,31,61,0.10);
  box-shadow: 0 28px 80px rgba(2, 12, 27, 0.28);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.msr-modal-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 14px 18px;
  border-bottom: 1px solid rgba(15,31,61,0.08);
  background: linear-gradient(135deg, #f8fbff 0%, #edf4fb 60%, #f8fafc 100%);
}

.msr-modal-title {
  font-family: "DM Mono", monospace;
  font-size: 14px;
  font-weight: 700;
  color: #10243a;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.msr-modal-close {
  height: 32px;
  border: 1px solid rgba(15,31,61,0.12);
  border-radius: 12px;
  padding: 0 12px;
  background: #fff;
  font-size: 12px;
  font-weight: 700;
  color: #0f1f3d;
  cursor: pointer;
}

.msr-modal-toolbar {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  padding: 12px 16px;
  border-bottom: 1px solid rgba(15,31,61,0.08);
  background: #fff;
}

.msr-modal-summary {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 8px;
  padding: 10px 16px;
  border-bottom: 1px solid rgba(15,31,61,0.08);
  background: #f8fafc;
  position: sticky;
  top: 0;
  z-index: 2;
}

.msr-modal-stat {
  border: 1px solid rgba(15,31,61,0.1);
  border-radius: 8px;
  background: #fff;
  padding: 8px 10px;
}

.msr-modal-stat-label {
  font-family: "DM Mono", monospace;
  font-size: 10px;
  color: #6d7f9e;
  text-transform: uppercase;
}

.msr-modal-stat-value {
  margin-top: 2px;
  font-family: "DM Mono", monospace;
  font-size: 13px;
  font-weight: 700;
  color: #0f1f3d;
}

@media (max-width: 960px) {
  .msr-modal-summary {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

.msr-modal-label {
  font-family: "DM Mono", monospace;
  font-size: 11px;
  color: #374a6b;
}

.msr-modal-select {
  height: 34px;
  border: 1px solid rgba(15,31,61,0.12);
  border-radius: 12px;
  padding: 0 10px;
  font-size: 12px;
  color: #0f1f3d;
  background: #fff;
}

.msr-modal-grid {
  flex: 1;
  overflow: auto;
  padding: 14px 16px 18px;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 12px;
  background: linear-gradient(180deg, #f8fafc 0%, #eef4f9 100%);
}

.msr-tile {
  border: 1px solid rgba(15,31,61,0.08);
  border-radius: 16px;
  background: #fff;
  padding: 12px;
  box-shadow: 0 8px 24px rgba(15,31,61,0.05);
}

.msr-tile-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.msr-tile-branch {
  font-family: "DM Mono", monospace;
  font-size: 13px;
  font-weight: 700;
  color: #0f1f3d;
}

.msr-tile-pos {
  font-family: "DM Mono", monospace;
  font-size: 11px;
  color: #6d7f9e;
}

.msr-tile-badges {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 8px;
}

.msr-tile-badge {
  display: inline-flex;
  align-items: center;
  border-radius: 999px;
  padding: 3px 8px;
  font-family: "DM Mono", monospace;
  font-size: 10px;
  border: 1px solid;
}

.msr-tile-badge.miss {
  color: #b4232b;
  background: rgba(219, 69, 82, 0.12);
  border-color: rgba(219, 69, 82, 0.4);
}

.msr-tile-badge.total {
  color: #1f4e78;
  background: rgba(77,182,232,0.12);
  border-color: rgba(77,182,232,0.45);
}

.msr-tile-reason {
  font-size: 11px;
  color: #374a6b;
  margin-bottom: 8px;
}

.msr-tile-dates {
  max-height: 125px;
  overflow: auto;
  border: 1px solid rgba(15,31,61,0.08);
  border-radius: 12px;
  padding: 6px;
  background: #fbfdff;
}

.msr-tile-date {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  font-size: 11px;
  font-family: "DM Mono", monospace;
  padding: 3px 2px;
  border-bottom: 1px dashed rgba(15,31,61,0.08);
}

.msr-tile-date:last-child { border-bottom: none; }

.msr-tile-actions {
  margin-top: 8px;
  display: flex;
  justify-content: flex-end;
}

.msr-modal-empty {
  border: 1px dashed rgba(15,31,61,0.16);
  border-radius: 14px;
  padding: 22px;
  text-align: center;
  color: #6d7f9e;
  font-family: "DM Mono", monospace;
  font-size: 12px;
  background: #fff;
}

.msr-report-wrap {
  flex: 1;
  overflow: auto;
  background: linear-gradient(180deg, #f8fafc 0%, #eef4f9 100%);
  padding: 14px 16px 16px;
}

.msr-report-grid-shell {
  border: 1px solid rgba(15,31,61,0.08);
  border-radius: 16px;
  overflow: auto;
  background: #ffffff;
  box-shadow: 0 12px 28px rgba(15,31,61,0.06);
}

.msr-report-table {
  border-collapse: collapse;
  min-width: max-content;
  width: 100%;
  background: #fff;
  border: none;
  box-shadow: none;
}

.msr-report-table th,
.msr-report-table td {
  border: 1px solid rgba(255,255,255,0.16);
  text-align: center;
  vertical-align: middle;
  min-width: 112px;
  padding: 9px 6px;
}

.msr-report-table th {
  background: linear-gradient(180deg, #1f2a37 0%, #17202b 100%);
  color: #ffffff;
  font-family: "DM Mono", monospace;
  font-size: 11px;
  font-weight: 700;
  position: sticky;
  top: 0;
  z-index: 3;
  box-shadow: inset 0 -1px 0 rgba(255,255,255,0.08);
}

.msr-report-table th:first-child {
  left: 0;
  z-index: 4;
}

.msr-report-branch {
  min-width: 160px !important;
  max-width: 200px;
  background: linear-gradient(180deg, #f8fafc 0%, #edf2f7 100%);
  color: #0f1f3d;
  font-family: "DM Mono", monospace;
  font-size: 12px;
  font-weight: 700;
  position: sticky;
  left: 0;
  z-index: 2;
  border-right: 1px solid rgba(15,31,61,0.08) !important;
}

.msr-report-cell {
  font-family: "DM Mono", monospace;
  color: #fff;
  font-size: 11px;
  font-weight: 700;
  transition: transform 0.15s ease, box-shadow 0.15s ease, filter 0.15s ease;
}

.msr-report-cell.editable {
  cursor: pointer;
}

.msr-report-cell.editable:hover {
  filter: brightness(1.03);
  transform: translateY(-1px);
}

.msr-report-cell.active {
  box-shadow: inset 0 0 0 2px rgba(255,255,255,0.9), inset 0 0 0 4px rgba(15,31,61,0.95);
}

.msr-report-cell .line1 {
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.msr-report-cell .line2 {
  margin-top: 2px;
  font-size: 9px;
  opacity: 0.88;
}

.msr-report-cell.sent { background: #198754; }
.msr-report-cell.missing { background: #dc3545; }
.msr-report-cell.notfound { background: #1a5276; }
.msr-report-cell.corrupted { background: #8e44ad; }
.msr-report-cell.error { background: #fd7e14; color: #111827; }
.msr-report-cell.unknown { background: #475569; }
.msr-report-cell.none { background: #e5e7eb; color: #475569; }

.msr-report-table tbody tr:nth-child(2n) .msr-report-branch {
  background: linear-gradient(180deg, #f4f7fb 0%, #e9eff6 100%);
}

.msr-report-legend {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding: 10px 16px;
  border-top: 1px solid rgba(15,31,61,0.08);
  background: #fff;
}

.msr-report-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  border-radius: 999px;
  padding: 4px 10px;
  font-family: "DM Mono", monospace;
  font-size: 10px;
  border: 1px solid rgba(15,31,61,0.10);
  background: linear-gradient(180deg, #ffffff 0%, #f8fafc 100%);
}

.msr-report-dot {
  width: 10px;
  height: 10px;
  border-radius: 999px;
}

.msr-cell-editor-backdrop {
  position: absolute;
  inset: 0;
  background: rgba(2, 12, 27, 0.50);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 20;
}

.msr-cell-editor {
  width: min(620px, calc(100% - 36px));
  border-radius: 18px;
  border: 1px solid rgba(15,31,61,0.12);
  background: #fff;
  box-shadow: 0 24px 70px rgba(2, 12, 27, 0.28);
  padding: 18px;
}

.msr-cell-editor-title {
  font-size: 15px;
  font-weight: 800;
  color: #10243a;
  margin-bottom: 14px;
}

.msr-cell-editor-grid {
  display: grid;
  gap: 12px;
}

.msr-cell-editor-layout {
  display: grid;
  grid-template-columns: minmax(0, 1.2fr) minmax(260px, 0.8fr);
  gap: 16px;
  align-items: start;
}

@media (max-width: 860px) {
  .msr-cell-editor-layout {
    grid-template-columns: 1fr;
  }
}

.msr-cell-editor-preview {
  border: 1px solid rgba(15,31,61,0.10);
  border-radius: 16px;
  background: linear-gradient(180deg, #f8fbff 0%, #eef4f9 100%);
  padding: 14px;
}

.msr-cell-editor-preview-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 12px;
}

.msr-cell-editor-preview-title {
  font-size: 12px;
  font-weight: 800;
  color: #10243a;
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

.msr-cell-editor-preview-body {
  display: grid;
  gap: 10px;
}

.msr-cell-editor-preview-card {
  border-radius: 14px;
  padding: 14px;
  background: #fff;
  border: 1px solid rgba(15,31,61,0.08);
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.7);
}

.msr-cell-editor-preview-chip {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  border-radius: 999px;
  padding: 6px 10px;
  font-size: 11px;
  font-weight: 700;
  color: #0f1f3d;
  background: #fff;
  border: 1px solid rgba(15,31,61,0.10);
}

.msr-cell-editor-preview-chip-dot {
  width: 10px;
  height: 10px;
  border-radius: 999px;
  border: 1px solid rgba(15,31,61,0.10);
}

.msr-cell-editor-preview-kv {
  display: grid;
  gap: 4px;
  font-size: 11px;
  color: #475569;
}

.msr-cell-editor-preview-label {
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: #6d7f9e;
}

.msr-cell-editor-preview-value {
  color: #10243a;
  font-weight: 600;
}

.msr-cell-editor-label {
  font-size: 11px;
  font-weight: 700;
  color: #334155;
  margin-bottom: 4px;
}

.msr-cell-editor-textarea {
  width: 100%;
  border: 1px solid rgba(15,31,61,0.15);
  border-radius: 12px;
  min-height: 74px;
  resize: vertical;
  padding: 10px;
  font-size: 12px;
  font-family: Inter, system-ui, sans-serif;
  color: #0f1f3d;
}

.msr-cell-editor-actions {
  margin-top: 16px;
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.msr-status-summary {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 10px;
}

.msr-status-summary-item {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  border: 1px solid rgba(15,31,61,0.10);
  border-radius: 999px;
  padding: 6px 10px;
  background: #fff;
  color: #334155;
  font-size: 11px;
  font-weight: 600;
}

.msr-status-swatch {
  width: 10px;
  height: 10px;
  border-radius: 999px;
  border: 1px solid rgba(15,31,61,0.12);
}
`;

export default function MissingScanResultTableClient() {
  const [scanResult, setScanResult] = useState<any>(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [queueing, setQueueing] = useState(false);
  const [queueStatus, setQueueStatus] = useState("");
  const [queueWatchJobId, setQueueWatchJobId] = useState<string>("");
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});
  const [branchOptions, setBranchOptions] = useState<string[]>([]);
  const [selectedBranches, setSelectedBranches] = useState<string[]>([]);
  const [tileOpen, setTileOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [tileSortBy, setTileSortBy] = useState<'missingCount' | 'branch' | 'pos'>('missingCount');
  const [tileSortDir, setTileSortDir] = useState<'asc' | 'desc'>('desc');
  const [timeZone, setTimeZone] = useState('Asia/Manila');
  const [scanSource, setScanSource] = useState<'report_pos_sended' | 'latest'>('report_pos_sended');
  const [statusConfig, setStatusConfig] = useState<MissingStatusConfig>(DEFAULT_STATUS_CONFIG);
  const [savingStatusConfig, setSavingStatusConfig] = useState(false);
  const [statusConfigMsg, setStatusConfigMsg] = useState("");
  const [selectedReportCell, setSelectedReportCell] = useState<SelectedReportCell | null>(null);
  const [cellEditorOpen, setCellEditorOpen] = useState(false);
  const [cellEditorDraft, setCellEditorDraft] = useState<CellEditorDraft>({ statusKey: "sent", title: "", color: "#198754", remarks: "" });
  const pageSize = 10;

  const buildCellKey = (branch: string, pos: string | number, date: string) =>
    `${String(branch || "").trim()}|${String(pos || "").trim()}|${String(date || "").trim()}`;

  const getLocalOverrides = (): Record<string, LocalStatusOverride> => {
    if (typeof window === "undefined") return {};
    try {
      const raw = window.localStorage.getItem(MISSING_SCAN_LOCAL_OVERRIDE_KEY);
      if (!raw) return {};
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object") return {};

      const now = Date.now();
      const next: Record<string, LocalStatusOverride> = {};
      for (const [key, value] of Object.entries(parsed)) {
        const item = value as LocalStatusOverride;
        if (!item || typeof item !== "object") continue;
        if (!Number.isFinite(item.expiresAt) || item.expiresAt <= now) continue;
        next[key] = item;
      }
      return next;
    } catch {
      return {};
    }
  };

  const setLocalOverrides = (overrides: Record<string, LocalStatusOverride>) => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(MISSING_SCAN_LOCAL_OVERRIDE_KEY, JSON.stringify(overrides));
  };

  const saveLocalOverride = (entry: LocalStatusOverride) => {
    const all = getLocalOverrides();
    all[buildCellKey(entry.branch, entry.pos, entry.date)] = entry;
    setLocalOverrides(all);
  };

  const applyLocalOverridesToScanPayload = (payload: any) => {
    if (!payload || !Array.isArray(payload.results)) return payload;

    const overrides = Object.values(getLocalOverrides());
    if (!overrides.length) return payload;

    const nextResults = payload.results.map((row: any) => {
      const rowBranch = String(row?.branch || "").trim();
      const rowPos = String(row?.pos || "").trim();

      const nextRow = {
        ...row,
        statusByDate: row?.statusByDate && typeof row.statusByDate === "object" ? { ...row.statusByDate } : {},
        failureByDate: row?.failureByDate && typeof row.failureByDate === "object" ? { ...row.failureByDate } : {},
        missingDates: Array.isArray(row?.missingDates) ? [...row.missingDates] : [],
      };

      for (const override of overrides) {
        if (override.branch !== rowBranch || override.pos !== rowPos) continue;
        nextRow.statusByDate[override.date] = override.label;

        if (override.statusKey === "sent") {
          nextRow.missingDates = nextRow.missingDates.filter((d: string) => String(d) !== override.date);
          delete nextRow.failureByDate[override.date];
        } else {
          if (!nextRow.missingDates.includes(override.date)) nextRow.missingDates.push(override.date);
          nextRow.failureByDate[override.date] = override.label;
        }
      }

      nextRow.missingDates.sort();
      return nextRow;
    });

    return { ...payload, results: nextResults };
  };

  const toCloudColor = (value: string) => {
    const raw = String(value || "").trim().toLowerCase();
    if (raw === "#198754" || raw === "green") return "green";
    if (raw === "#dc3545" || raw === "red") return "red";
    if (raw === "#1a5276" || raw === "blue") return "blue";
    if (raw === "#fd7e14" || raw === "yellow" || raw === "orange") return "yellow";
    if (raw === "#8e44ad" || raw === "purple") return "purple";
    return raw || "blue";
  };

  const getStatusDefaults = (statusKey: ManagedStatusKey) => {
    return statusConfig[statusKey] || DEFAULT_STATUS_CONFIG[statusKey];
  };

  const patchScanResultRow = (branch: string, pos: string | number, date: string, nextLabel: string, nextToneKey: ManagedStatusKey) => {
    setScanResult((prev: any) => {
      if (!prev || !Array.isArray(prev.results)) return prev;

      const nextResults = prev.results.map((row: any) => {
        const rowBranch = String(row?.branch || "").trim();
        const rowPos = String(row?.pos || "").trim();
        if (rowBranch !== String(branch || "").trim() || rowPos !== String(pos || "").trim()) {
          return row;
        }

        const nextRow = {
          ...row,
          statusByDate: row?.statusByDate && typeof row.statusByDate === "object" ? { ...row.statusByDate } : {},
          failureByDate: row?.failureByDate && typeof row.failureByDate === "object" ? { ...row.failureByDate } : {},
          missingDates: Array.isArray(row?.missingDates) ? [...row.missingDates] : [],
        };

        nextRow.statusByDate[date] = nextLabel;
        if (nextToneKey === "sent") {
          nextRow.missingDates = nextRow.missingDates.filter((item: string) => String(item) !== String(date));
          delete nextRow.failureByDate[date];
          nextRow.existingCount = Number(nextRow.existingCount || 0) + 1;
        } else {
          if (!nextRow.missingDates.includes(date)) nextRow.missingDates.push(date);
          nextRow.failureByDate[date] = nextLabel;
        }

        nextRow.missingDates.sort();
        return nextRow;
      });

      const nextPayload = { ...prev, results: nextResults };
      if (typeof window !== "undefined") {
        window.localStorage.setItem(MISSING_SCAN_RESULT_KEY, JSON.stringify(nextPayload));
        window.dispatchEvent(new CustomEvent("missing-scan-result", { detail: nextPayload }));
      }
      return nextPayload;
    });
  };

  const saveSelectedCellStatusConfig = async () => {
    if (!selectedReportCell) return;
    setSavingStatusConfig(true);
    setStatusConfigMsg("Updating status...");

    try {
      const formData = new FormData();
      formData.append("date", selectedReportCell.date);
      formData.append("branch", String(selectedReportCell.branch || "").trim());
      formData.append("pos", String(selectedReportCell.pos || "").trim());
      formData.append("title", String(cellEditorDraft.title || "").trim());
      formData.append("color", toCloudColor(cellEditorDraft.color));
      formData.append("remarks", String(cellEditorDraft.remarks || "").trim());

      const now = new Date();
      const pad = (n: number) => String(n).padStart(2, "0");
      const timeString = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
      formData.append("time", timeString);

      const resp = await fetch("https://biggsph.com/biggsinc_loyalty/controller/update_status.php", {
        method: "POST",
        body: formData,
      });

      let json: any = null;
      try {
        json = await resp.json();
      } catch {
        json = null;
      }

      if (!resp.ok) {
        const message = String(json?.message || "Request failed");
        setStatusConfigMsg(`Update failed: ${message}`);
        await Swal.fire({
          icon: "error",
          title: "Update failed",
          text: `${message} (${selectedReportCell.branch} POS ${selectedReportCell.pos} - ${selectedReportCell.date})`,
        });
        return;
      }

      // Keep local label/color config in sync with what admin saved.
      const nextCfg = {
        ...statusConfig,
        [cellEditorDraft.statusKey]: {
          title: String(cellEditorDraft.title || statusConfig[cellEditorDraft.statusKey].title).trim() || statusConfig[cellEditorDraft.statusKey].title,
          color: String(cellEditorDraft.color || statusConfig[cellEditorDraft.statusKey].color).trim() || statusConfig[cellEditorDraft.statusKey].color,
          remarks: String(cellEditorDraft.remarks || "").trim(),
        },
      };
      setStatusConfig(nextCfg);

      patchScanResultRow(
        selectedReportCell.branch,
        selectedReportCell.pos,
        selectedReportCell.date,
        String(cellEditorDraft.title || nextCfg[cellEditorDraft.statusKey].title).trim() || nextCfg[cellEditorDraft.statusKey].title,
        cellEditorDraft.statusKey
      );

      saveLocalOverride({
        branch: String(selectedReportCell.branch || "").trim(),
        pos: String(selectedReportCell.pos || "").trim(),
        date: String(selectedReportCell.date || "").trim(),
        label: String(cellEditorDraft.title || nextCfg[cellEditorDraft.statusKey].title).trim() || nextCfg[cellEditorDraft.statusKey].title,
        statusKey: cellEditorDraft.statusKey,
        expiresAt: Date.now() + 10 * 60 * 1000,
      });

      setStatusConfigMsg("Status saved successfully.");
      await Swal.fire({
        icon: "success",
        title: "Saved",
        text: `Status updated for ${selectedReportCell.branch} POS ${selectedReportCell.pos} - ${selectedReportCell.date}.`,
      });
      setCellEditorOpen(false);
      setStatusConfigMsg("Status saved. Syncing edited branch...");
      setTimeout(() => {
        void refreshEditedBranch(String(selectedReportCell.branch || ""));
      }, 2200);
    } catch (error) {
      const message = String(error);
      setStatusConfigMsg(`Update failed: ${message}`);
      await Swal.fire({
        icon: "error",
        title: "Update failed",
        text: `${message} (${selectedReportCell.branch} POS ${selectedReportCell.pos} - ${selectedReportCell.date})`,
      });
    } finally {
      setSavingStatusConfig(false);
    }
  };

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

  const getFailureBreakdown = (row: any) => {
    const missingDates = Array.isArray(row?.missingDates) ? row.missingDates : [];
    const byDate = row?.failureByDate && typeof row.failureByDate === "object" ? row.failureByDate : {};
    const statusByDate = row?.statusByDate && typeof row.statusByDate === "object" ? row.statusByDate : {};
    const sourceByDate = Object.keys(byDate).length ? byDate : statusByDate;

    const counts: Record<string, number> = {
      "Corrupted File": 0,
      "File Not Found": 0,
      Missing: 0,
      Error: 0,
      Other: 0,
    };

    for (const date of missingDates) {
      const raw = String(sourceByDate?.[date] || "").toLowerCase();
      if (raw.includes("corrupted")) counts["Corrupted File"] += 1;
      else if (raw.includes("file not found")) counts["File Not Found"] += 1;
      else if (raw.includes("missing")) counts.Missing += 1;
      else if (raw.includes("error")) counts.Error += 1;
      else counts.Other += 1;
    }

    return Object.entries(counts).filter(([, value]) => value > 0);
  };

  const getScanAlerts = (result: any): string[] => {
    if (!result || typeof result !== "object") return [];
    const alerts: string[] = [];
    const pushAlert = (value: any) => {
      const text = String(value || "").trim();
      if (text) alerts.push(text);
    };

    pushAlert(result.failureReason);

    if (Array.isArray(result.warnings)) {
      for (const warning of result.warnings) pushAlert(warning);
    }

    if (Array.isArray(result.failures)) {
      for (const failure of result.failures) {
        const source = String(failure?.source || "scan").trim();
        const reason = String(failure?.reason || "").trim();
        if (reason) pushAlert(`${source}: ${reason}`);
      }
    }

    return Array.from(new Set(alerts));
  };

  const scanAlerts = getScanAlerts(scanResult);
  const statusDetailUnavailableReason = scanResult?.failureReason
    ? `Detailed report status unavailable: ${String(scanResult.failureReason)}`
    : "";

  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = window.localStorage.getItem(MISSING_SCAN_SOURCE_KEY);
    if (saved === "report_pos_sended" || saved === "latest") {
      setScanSource(saved);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(MISSING_SCAN_SOURCE_KEY, scanSource);
  }, [scanSource]);

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

      try {
        const settingsRes = await fetchWithAuth(`${API_BASE}/api/admin/settings`, { method: "GET" });
        if (settingsRes.ok) {
          const settingsData = await settingsRes.json().catch(() => null);
          const tz = String(settingsData?.settings?.uiPreferences?.timezone || '').trim();
          if (tz) setTimeZone(tz);
          const savedStatusCfg = settingsData?.settings?.uiPreferences?.missingScanStatusConfig;
          if (savedStatusCfg) setStatusConfig(normalizeStatusConfig(savedStatusCfg));
        }
      } catch {
        // ignore timezone settings load errors
      }
    })();
  }, []);

  const allBranchesSelected = branchOptions.length > 0 && selectedBranches.length === branchOptions.length;
  const toggleBranch = (branch: string) => {
    setSelectedBranches((prev) => prev.includes(branch) ? prev.filter((b) => b !== branch) : [...prev, branch]);
  };

  const refreshFromStorage = async () => {
    const fallbackFromLocal = () => {
      if (typeof window === "undefined") return;
      const raw = window.localStorage.getItem(MISSING_SCAN_RESULT_KEY);
      if (!raw) {
        setQueueStatus("No cached scan result found.");
        return;
      }
      try {
        const parsed = JSON.parse(raw);
        setScanResult(applyLocalOverridesToScanPayload(parsed));
        setQueueStatus("Loaded cached scan results.");
      } catch {
        setQueueStatus("Failed to parse cached results.");
      }
    };

    if (!scanResult?.start || !scanResult?.end) {
      fallbackFromLocal();
      return;
    }

    setQueueStatus("Refreshing from latest folder...");
    try {
      const body: any = {
        start: scanResult.start,
        end: scanResult.end,
        source: scanSource,
      };
      if (selectedBranches.length) body.branches = selectedBranches;

      const resp = await fetchWithAuth(`${API_BASE}/api/fetch/missing/scan`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const json = await resp.json();
      if (!resp.ok) {
        setQueueStatus(`Refresh failed: ${json?.message ?? "Request failed"}`);
        return;
      }

      const patched = applyLocalOverridesToScanPayload(json);
      setScanResult(patched);
      if (typeof window !== "undefined") {
        window.localStorage.setItem(MISSING_SCAN_RESULT_KEY, JSON.stringify(patched));
        window.dispatchEvent(new CustomEvent("missing-scan-result", { detail: patched }));
      }
      const warningText = patched?.failureReason || (Array.isArray(patched?.warnings) && patched.warnings.length ? String(patched.warnings[0]) : "");
      setQueueStatus(warningText ? `⚠ Refreshed with warning: ${warningText}` : "✅ Results refreshed from latest folder.");
    } catch {
      fallbackFromLocal();
    }
  };

  const refreshEditedBranch = async (branch: string) => {
    if (!scanResult?.start || !scanResult?.end) {
      await refreshFromStorage();
      return;
    }

    try {
      const body: any = {
        start: scanResult.start,
        end: scanResult.end,
        source: scanSource,
        branches: [String(branch || "").trim()],
      };

      const resp = await fetchWithAuth(`${API_BASE}/api/fetch/missing/scan`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const json = await resp.json().catch(() => null);
      if (!resp.ok || !json || !Array.isArray(json.results)) return;

      const patchedIncoming = applyLocalOverridesToScanPayload(json);
      setScanResult((prev: any) => {
        if (!prev || !Array.isArray(prev.results)) return patchedIncoming;

        const incoming = new Map<string, any>();
        for (const row of patchedIncoming.results) {
          incoming.set(`${String(row?.branch || "").trim()}|${String(row?.pos || "").trim()}`, row);
        }

        const mergedResults = prev.results.map((row: any) => {
          const key = `${String(row?.branch || "").trim()}|${String(row?.pos || "").trim()}`;
          return incoming.has(key) ? incoming.get(key) : row;
        });

        const knownKeys = new Set(mergedResults.map((row: any) => `${String(row?.branch || "").trim()}|${String(row?.pos || "").trim()}`));
        for (const row of patchedIncoming.results) {
          const key = `${String(row?.branch || "").trim()}|${String(row?.pos || "").trim()}`;
          if (!knownKeys.has(key)) mergedResults.push(row);
        }

        const nextPayload = { ...prev, results: mergedResults };
        if (typeof window !== "undefined") {
          window.localStorage.setItem(MISSING_SCAN_RESULT_KEY, JSON.stringify(nextPayload));
          window.dispatchEvent(new CustomEvent("missing-scan-result", { detail: nextPayload }));
        }
        return nextPayload;
      });
    } catch {
      // best-effort branch refresh only
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

      const patched = applyLocalOverridesToScanPayload(json);
      setScanResult(patched);
      if (typeof window !== "undefined") {
        window.localStorage.setItem(MISSING_SCAN_RESULT_KEY, JSON.stringify(patched));
        window.dispatchEvent(new CustomEvent("missing-scan-result", { detail: patched }));
      }
      if (json?.queued && json?.jobId) {
        setQueueWatchJobId(String(json.jobId));
        const warningText = json?.failureReason || (Array.isArray(json?.warnings) && json.warnings.length ? String(json.warnings[0]) : "");
        setQueueStatus(warningText
          ? `⚠ Queued with warning: ${warningText} (Job ID: ${json.jobId}). Waiting for completion...`
          : `✅ Queued! Job ID: ${json.jobId}. Waiting for completion...`);
      } else {
        const warningText = json?.failureReason || (Array.isArray(json?.warnings) && json.warnings.length ? String(json.warnings[0]) : "");
        setQueueStatus(warningText ? `⚠ Scan completed with warning: ${warningText}` : "Scan completed");
      }
    } catch (error) {
      setQueueStatus(`Queue failed: ${String(error)}`);
    } finally {
      setQueueing(false);
    }
  };

  useEffect(() => {
    if (!queueWatchJobId) return;

    const token = getAccessToken();
    const tq = token ? `&token=${encodeURIComponent(token.replace(/^Bearer\s+/, ""))}` : "";
    const streamUrl = `${API_BASE}/api/fetch/status/stream?jobId=${encodeURIComponent(queueWatchJobId)}${tq}`;
    const es = new EventSource(streamUrl);

    es.onmessage = (ev) => {
      try {
        const data = JSON.parse(ev.data || "{}");
        if (data?.type === "complete") {
          setQueueStatus("✅ Queue fetch completed. Refreshing missing scan...");
          es.close();
          setQueueWatchJobId("");
          void refreshFromStorage();
          return;
        }
        if (data?.type === "error") {
          setQueueStatus(`Queue job failed: ${data?.message || "Unknown error"}`);
          es.close();
          setQueueWatchJobId("");
        }
      } catch {
        // ignore malformed stream messages
      }
    };

    es.onerror = () => {
      setQueueStatus("Queue stream disconnected. Results will refresh on next manual refresh.");
      es.close();
      setQueueWatchJobId("");
    };

    return () => {
      es.close();
    };
  }, [queueWatchJobId]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const onResult = (event: Event) => {
      const custom = event as CustomEvent<any>;
      if (!custom.detail) return;
      setScanResult(applyLocalOverridesToScanPayload(custom.detail));
      if (custom.detail?.sourceUsed === "latest" || custom.detail?.sourceUsed === "report_pos_sended") {
        setScanSource(custom.detail.sourceUsed);
      }
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

  const reportRows = useMemo(
    () => [...filtered].sort((a, b) => String(a.branch || "").localeCompare(String(b.branch || "")) || Number(a.pos || 0) - Number(b.pos || 0)),
    [filtered]
  );

  const reportDates = useMemo(() => {
    const fromRange = buildDateRange(scanResult?.start, scanResult?.end);
    if (fromRange.length) return fromRange;

    const dates = new Set<string>();
    for (const row of reportRows) {
      const statusByDate = row?.statusByDate && typeof row.statusByDate === "object" ? row.statusByDate : {};
      Object.keys(statusByDate).forEach((d) => dates.add(String(d)));
      if (Array.isArray(row?.missingDates)) row.missingDates.forEach((d) => dates.add(String(d)));
    }
    return Array.from(dates).sort();
  }, [reportRows, scanResult?.start, scanResult?.end]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const startIndex = (currentPage - 1) * pageSize;
  const pageRows = filtered.slice(startIndex, startIndex + pageSize);

  const tileRows = useMemo(() => {
    const sorted = [...filtered];
    sorted.sort((a, b) => {
      let av: string | number = '';
      let bv: string | number = '';

      if (tileSortBy === 'missingCount') {
        av = Array.isArray(a.missingDates) ? a.missingDates.length : 0;
        bv = Array.isArray(b.missingDates) ? b.missingDates.length : 0;
      } else if (tileSortBy === 'branch') {
        av = String(a.branch || '').toLowerCase();
        bv = String(b.branch || '').toLowerCase();
      } else {
        av = Number(a.pos || 0);
        bv = Number(b.pos || 0);
      }

      if (av < bv) return tileSortDir === 'asc' ? -1 : 1;
      if (av > bv) return tileSortDir === 'asc' ? 1 : -1;
      return 0;
    });
    return sorted;
  }, [filtered, tileSortBy, tileSortDir]);

  const tileSummary = useMemo(() => {
    const totalRows = tileRows.length;
    const totalMissingDates = tileRows.reduce((sum, row) => sum + (Array.isArray(row.missingDates) ? row.missingDates.length : 0), 0);
    const rowsWithMissing = tileRows.filter((row) => Array.isArray(row.missingDates) && row.missingDates.length > 0).length;

    let topBranch = '—';
    let topMissing = 0;
    for (const row of tileRows) {
      const miss = Array.isArray(row.missingDates) ? row.missingDates.length : 0;
      if (miss > topMissing) {
        topMissing = miss;
        topBranch = `${row.branch} POS ${row.pos}`;
      }
    }

    return { totalRows, totalMissingDates, rowsWithMissing, topBranch, topMissing };
  }, [tileRows]);

  useEffect(() => {
    setPage(1);
  }, [search]);

  useEffect(() => {
    if (!tileOpen && !reportOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setTileOpen(false);
      if (event.key === 'Escape') setReportOpen(false);
    };
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [tileOpen, reportOpen]);

  return (
    <div className="msr-card">
      <style>{css}</style>
      <div className="msr-head bg-gradient-to-r from-sky-500 via-sky-400 to-sky-300">
        <span className="msr-title ">Missing Scan Result Table</span>
        <div className="msr-head-right">
          <span className="msr-count">{rows.length} rows</span>
          <TimezoneBadge />
          <div style={{ display: "inline-flex", alignItems: "center", gap: 4, border: "1px solid rgba(255,255,255,0.55)", borderRadius: 999, padding: 2, background: "rgba(255,255,255,0.14)" }}>
            <button
              type="button"
              style={{ borderRadius: 999, padding: "4px 10px", fontSize: 11, color: "#fff", background: scanSource === "report_pos_sended" ? "rgba(77,182,232,0.5)" : "transparent" }}
              onClick={() => setScanSource("report_pos_sended")}
            >
              Scraper
            </button>
            <button
              type="button"
              style={{ borderRadius: 999, padding: "4px 10px", fontSize: 11, color: "#fff", background: scanSource === "latest" ? "rgba(232,168,32,0.45)" : "transparent" }}
              onClick={() => setScanSource("latest")}
            >
              Local
            </button>
          </div>
          <button className="msr-head-action refresh" onClick={refreshFromStorage}>Refresh Results</button>
          <button className="msr-head-action queue" onClick={handleQueueFetchScan} disabled={queueing}>
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

        {scanAlerts.length > 0 ? (
          <div style={{ marginBottom: 10, fontSize: 11, color: "#374a6b", fontFamily: "DM Mono, monospace", border: "1px solid rgba(232,168,32,0.4)", background: "rgba(232,168,32,0.12)", borderRadius: 8, padding: "8px 10px" }}>
            <div style={{ fontWeight: 700, marginBottom: 4 }}>Scan Warnings</div>
            {scanAlerts.map((alert, idx) => (
              <div key={`${alert}-${idx}`}>• {alert}</div>
            ))}
          </div>
        ) : null}

        <div style={{ marginBottom: 10, fontSize: 11, color: "#6d7f9e", fontFamily: "DM Mono, monospace" }}>
          Tip: Use <strong>Queue Fetch Scan</strong> for missing files. Re-run scan after fetch completes to refresh missing dates.
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
              <button className="msr-tile-btn" onClick={() => setTileOpen(true)}>View as Tile</button>
              <button className="msr-report-btn" onClick={() => setReportOpen(true)}>View as Report</button>
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
                                    {formatShortDate(row.missingDates[0], timeZone)} – {formatShortDate(row.missingDates[row.missingDates.length - 1], timeZone)} ({row.missingDates.length})
                                  </span>
                                  {row?.failureByDate?.[row.missingDates[0]] ? (
                                    <span style={{ fontFamily: "DM Mono, monospace", fontSize: 10, color: "#6d7f9e" }}>
                                      First: {normalizeFailureLabel(String(row.failureByDate[row.missingDates[0]] || ""))}
                                    </span>
                                  ) : null}
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
                                      <div key={`${date}-${i}`} style={{ display: "flex", justifyContent: "space-between", gap: 8, fontFamily: "DM Mono, monospace", fontSize: 11 }}>
                                        <span>{formatShortDate(date, timeZone)}</span>
                                        <span style={{ color: "#6d7f9e" }}>
                                          {normalizeFailureLabel(String(row?.failureByDate?.[date] || "Missing"))}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            ) : (
                              <span className="msr-none">None</span>
                            )}
                          </td>
                          <td>
                            {(() => {
                              const breakdown = getFailureBreakdown(row);
                              if (!breakdown.length) return <span>{statusDetailUnavailableReason || getFailureReason(row)}</span>;
                              return (
                                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                                  {breakdown.map(([label, value]) => (
                                    <span key={`${label}-${value}`} style={{ fontFamily: "DM Mono, monospace", fontSize: 11, color: "#374a6b" }}>
                                      {label}: {value}
                                    </span>
                                  ))}
                                </div>
                              );
                            })()}
                          </td>
                          <td>
                            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                              <button
                                className="bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-1 rounded-lg"
                                onClick={() => handleQueueFetchScan(row)}
                                disabled={queueing || !hasMissingDates}
                              >
                                Queue Fetch
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

      {tileOpen && (
        <div className="msr-modal-backdrop" onClick={() => setTileOpen(false)}>
          <div className="msr-modal" onClick={(e) => e.stopPropagation()}>
            <div className="msr-modal-head">
              <span className="msr-modal-title">Missing Scan Tile View</span>
              <button className="msr-modal-close" onClick={() => setTileOpen(false)}>Close</button>
            </div>

            <div className="msr-modal-toolbar">
              <span className="msr-modal-label">Rows: {tileRows.length}</span>
              <span className="msr-modal-label">Sort by</span>
              <select
                className="msr-modal-select"
                value={tileSortBy}
                onChange={(e) => setTileSortBy(e.target.value as 'missingCount' | 'branch' | 'pos')}
              >
                <option value="missingCount">Missing Count</option>
                <option value="branch">Branch</option>
                <option value="pos">POS</option>
              </select>
              <select
                className="msr-modal-select"
                value={tileSortDir}
                onChange={(e) => setTileSortDir(e.target.value as 'asc' | 'desc')}
              >
                <option value="desc">Desc</option>
                <option value="asc">Asc</option>
              </select>
            </div>

            <div className="msr-modal-summary">
              <div className="msr-modal-stat">
                <div className="msr-modal-stat-label">Total Rows</div>
                <div className="msr-modal-stat-value">{tileSummary.totalRows}</div>
              </div>
              <div className="msr-modal-stat">
                <div className="msr-modal-stat-label">Rows With Missing</div>
                <div className="msr-modal-stat-value">{tileSummary.rowsWithMissing}</div>
              </div>
              <div className="msr-modal-stat">
                <div className="msr-modal-stat-label">Total Missing Dates</div>
                <div className="msr-modal-stat-value">{tileSummary.totalMissingDates}</div>
              </div>
              <div className="msr-modal-stat">
                <div className="msr-modal-stat-label">Top Missing Branch</div>
                <div className="msr-modal-stat-value">
                  {tileSummary.topBranch === '—' ? '—' : `${tileSummary.topBranch} (${tileSummary.topMissing})`}
                </div>
              </div>
            </div>

            <div className="msr-modal-grid">
              {tileRows.length === 0 ? (
                <div className="msr-modal-empty">No rows match current branch/search filters.</div>
              ) : (
                tileRows.map((row, idx) => {
                  const key = `${row.branch}-${row.pos}-${idx}`;
                  const missingDates = Array.isArray(row.missingDates) ? row.missingDates : [];
                  const hasMissingDates = missingDates.length > 0;
                  return (
                    <div key={key} className="msr-tile">
                      <div className="msr-tile-top">
                        <span className="msr-tile-branch">{row.branch}</span>
                        <span className="msr-tile-pos">POS {row.pos}</span>
                      </div>

                      <div className="msr-tile-badges">
                        <span className="msr-tile-badge miss">Missing: {missingDates.length}</span>
                        <span className="msr-tile-badge total">Total: {row.totalDates ?? 0}</span>
                      </div>

                      <div className="msr-tile-reason">{getFailureReason(row)}</div>

                      {hasMissingDates ? (
                        <div className="msr-tile-dates">
                          {missingDates.map((date, di) => (
                            <div key={`${date}-${di}`} className="msr-tile-date">
                              <span>{formatShortDate(date, timeZone)}</span>
                              <span style={{ color: '#6d7f9e' }}>
                                {normalizeFailureLabel(String(row?.failureByDate?.[date] || 'Missing'))}
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="msr-modal-empty" style={{ padding: 10 }}>No missing dates</div>
                      )}

                      <div className="msr-tile-actions">
                        <button
                          className="bg-yellow-500 hover:bg-yellow-600 text-white px-3 py-1 rounded-lg text-xs"
                          onClick={() => handleQueueFetchScan(row)}
                          disabled={queueing || !hasMissingDates}
                        >
                          Queue Fetch
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {reportOpen && (
        <div className="msr-modal-backdrop" onClick={() => setReportOpen(false)}>
          <div className="msr-modal" onClick={(e) => e.stopPropagation()}>
            <div className="msr-modal-head">
              <span className="msr-modal-title">POS Sending Report View</span>
              <button className="msr-modal-close" onClick={() => setReportOpen(false)}>Close</button>
            </div>

            <div className="msr-modal-toolbar">
              <span className="msr-modal-label">Rows: {reportRows.length}</span>
              <span className="msr-modal-label">Dates: {reportDates.length}</span>
              <span className="msr-modal-label">
                Range: {scanResult?.start ? formatShortDate(scanResult.start, timeZone) : "—"} - {scanResult?.end ? formatShortDate(scanResult.end, timeZone) : "—"}
              </span>
              <span className="msr-modal-label">Tip: Click a specific date cell to edit that status</span>
              <span className="msr-modal-label">{statusConfigMsg}</span>
            </div>

            <div className="msr-status-summary">
              <span className="msr-status-summary-item">
                <span className="msr-status-swatch" style={{ background: statusConfig.sent.color }} />
                {statusConfig.sent.title}
              </span>
              <span className="msr-status-summary-item">
                <span className="msr-status-swatch" style={{ background: statusConfig.missing.color }} />
                {statusConfig.missing.title}
              </span>
              <span className="msr-status-summary-item">
                <span className="msr-status-swatch" style={{ background: statusConfig.notfound.color }} />
                {statusConfig.notfound.title}
              </span>
              <span className="msr-status-summary-item">
                <span className="msr-status-swatch" style={{ background: statusConfig.corrupted.color }} />
                {statusConfig.corrupted.title}
              </span>
            </div>

            <div className="msr-report-wrap">
              {reportRows.length === 0 || reportDates.length === 0 ? (
                <div className="msr-modal-empty">No report data available for current filters.</div>
              ) : (
                <div className="msr-report-grid-shell">
                  <table className="msr-report-table">
                    <thead>
                      <tr>
                        <th>Branch-POS</th>
                        {reportDates.map((date) => (
                          <th key={date}>{date}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {reportRows.map((row, rowIdx) => {
                        const key = `${row.branch}-${row.pos}-${rowIdx}`;
                        const missingSet = new Set(Array.isArray(row.missingDates) ? row.missingDates : []);
                        return (
                          <tr key={key}>
                            <td className="msr-report-branch">{row.branch} {row.pos}</td>
                            {reportDates.map((date) => {
                              const raw = row?.statusByDate?.[date]
                                || (missingSet.has(date) ? String(row?.failureByDate?.[date] || "Missing") : "");
                              const meta = getStatusMeta(raw);
                              const resolvedStatusKey = isManagedStatusKey(meta.statusKey) ? meta.statusKey : null;
                              const managed = resolvedStatusKey
                                ? statusConfig[resolvedStatusKey]
                                : null;
                              const isEditable = Boolean(resolvedStatusKey);
                              const isActive = Boolean(
                                selectedReportCell
                                && selectedReportCell.branch === row.branch
                                && String(selectedReportCell.pos) === String(row.pos)
                                && selectedReportCell.date === date
                              );
                              const selectedStatusKey: ManagedStatusKey | null = isEditable ? (resolvedStatusKey as ManagedStatusKey) : null;
                              const cellLabel = String(managed?.title || meta.label);
                              const cellBg = String(managed?.color || "") || undefined;
                              const resolvedRemarks = String(managed?.remarks || "");
                              const cellTitle = resolvedRemarks
                                ? `${cellLabel} - ${resolvedRemarks}${meta.time ? ` (${meta.time})` : ""}`
                                : `${cellLabel}${meta.time ? ` (${meta.time})` : ""}`;
                              return (
                                <td
                                  key={`${key}-${date}`}
                                  className={`msr-report-cell ${meta.tone}${isEditable ? " editable" : ""}${isActive ? " active" : ""}`}
                                  style={cellBg ? { background: cellBg } : undefined}
                                  title={isEditable ? `${cellTitle} • Click to edit` : cellTitle}
                                  onClick={() => {
                                    if (!isEditable) return;
                                    setSelectedReportCell({
                                      branch: String(row.branch || ""),
                                      pos: row.pos,
                                      date,
                                      statusKey: selectedStatusKey,
                                      raw,
                                    });
                                    if (selectedStatusKey) {
                                      const sourceEntry = getStatusDefaults(selectedStatusKey);
                                      setCellEditorDraft({
                                        statusKey: selectedStatusKey,
                                        title: String(sourceEntry?.title || ""),
                                        color: String(sourceEntry?.color || "#198754"),
                                        remarks: String(sourceEntry?.remarks || ""),
                                      });
                                      setCellEditorOpen(true);
                                    }
                                  }}
                                >
                                  <div className="line1">{cellLabel}</div>
                                  <div className="line2">{meta.time || " "}</div>
                                </td>
                              );
                            })}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="msr-report-legend">
              <span className="msr-report-pill" title={statusConfig.sent.remarks || ""}><span className="msr-report-dot" style={{ background: statusConfig.sent.color }} />{statusConfig.sent.title}</span>
              <span className="msr-report-pill" title={statusConfig.missing.remarks || ""}><span className="msr-report-dot" style={{ background: statusConfig.missing.color }} />{statusConfig.missing.title}</span>
              <span className="msr-report-pill" title={statusConfig.notfound.remarks || ""}><span className="msr-report-dot" style={{ background: statusConfig.notfound.color }} />{statusConfig.notfound.title}</span>
              <span className="msr-report-pill" title={statusConfig.corrupted.remarks || ""}><span className="msr-report-dot" style={{ background: statusConfig.corrupted.color }} />{statusConfig.corrupted.title}</span>
              <span className="msr-report-pill"><span className="msr-report-dot" style={{ background: "#fd7e14" }} />Error</span>
            </div>

            {cellEditorOpen && selectedReportCell?.statusKey ? (
              <div className="msr-cell-editor-backdrop" onClick={() => setCellEditorOpen(false)}>
                <div className="msr-cell-editor" onClick={(e) => e.stopPropagation()}>
                  <div className="msr-cell-editor-title">
                    Edit Status for {selectedReportCell.branch} POS {selectedReportCell.pos} - {selectedReportCell.date}
                  </div>
                  <div className="text-xs text-slate-500 mb-3">
                    Select a status, then adjust the title and remarks if needed.
                  </div>

                  <div className="msr-cell-editor-layout">
                    <div className="msr-cell-editor-grid">
                      <div>
                        <div className="msr-cell-editor-label">Status</div>
                        <select
                          className="msr-modal-select"
                          value={cellEditorDraft.statusKey}
                          onChange={(e) => {
                            const nextStatus = e.target.value as ManagedStatusKey;
                            const nextDefaults = getStatusDefaults(nextStatus);
                            setCellEditorDraft((prev) => ({
                              ...prev,
                              statusKey: nextStatus,
                              title: String(nextDefaults.title || ""),
                              color: String(nextDefaults.color || ""),
                              remarks: String(nextDefaults.remarks || ""),
                            }));
                          }}
                        >
                          <option value="sent">SENT</option>
                          <option value="missing">MISSING</option>
                          <option value="notfound">FILE NOT FOUND</option>
                          <option value="corrupted">CORRUPTED</option>
                        </select>
                      </div>

                      <div>
                        <div className="msr-cell-editor-label">Title</div>
                        <input
                          className="msr-input"
                          value={cellEditorDraft.title}
                          onChange={(e) => setCellEditorDraft((prev) => ({ ...prev, title: e.target.value }))}
                          placeholder="Status title"
                        />
                      </div>

                      <div>
                        <div className="msr-cell-editor-label">Remarks</div>
                        <textarea
                          className="msr-cell-editor-textarea"
                          value={cellEditorDraft.remarks}
                          onChange={(e) => setCellEditorDraft((prev) => ({ ...prev, remarks: e.target.value }))}
                          placeholder="Add remarks"
                        />
                      </div>
                    </div>

                    <div className="msr-cell-editor-preview">
                      <div className="msr-cell-editor-preview-head">
                        <div className="msr-cell-editor-preview-title">Live Preview</div>
                      </div>
                      <div className="msr-cell-editor-preview-body">
                        <div className="msr-cell-editor-preview-card">
                          <div className="msr-cell-editor-preview-chip">
                            <span className="msr-cell-editor-preview-chip-dot" style={{ background: cellEditorDraft.color }} />
                            {cellEditorDraft.title || getStatusDefaults(cellEditorDraft.statusKey).title}
                          </div>
                          <div className="mt-3 grid gap-3">
                            <div className="msr-cell-editor-preview-kv">
                              <span className="msr-cell-editor-preview-label">Color</span>
                              <span className="msr-cell-editor-preview-value">{cellEditorDraft.color || "—"}</span>
                            </div>
                            <div className="msr-cell-editor-preview-kv">
                              <span className="msr-cell-editor-preview-label">Remarks</span>
                              <span className="msr-cell-editor-preview-value">
                                {cellEditorDraft.remarks || getStatusDefaults(cellEditorDraft.statusKey).remarks || "—"}
                              </span>
                            </div>
                            <div className="msr-cell-editor-preview-kv">
                              <span className="msr-cell-editor-preview-label">Cell Context</span>
                              <span className="msr-cell-editor-preview-value">
                                {selectedReportCell.branch} POS {selectedReportCell.pos} • {selectedReportCell.date}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="msr-cell-editor-actions">
                    <button className="msr-btn" type="button" onClick={() => setCellEditorOpen(false)} disabled={savingStatusConfig}>Cancel</button>
                    <button className="msr-btn" type="button" onClick={saveSelectedCellStatusConfig} disabled={savingStatusConfig}>
                      {savingStatusConfig ? "Saving..." : "Save"}
                    </button>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
