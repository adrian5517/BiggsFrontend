"use client";

// ─────────────────────────────────────────────────────────────────────────────
// ManagerBookingsPage — Production-ready
//
// Sections:
//   1. Imports & Bootstrap
//   2. Types & Constants
//   3. Pure Utility Functions
//   4. API Layer
//   5. Shared UI Components
//   6. SweetAlert2 Dialog Helpers
//   7. Custom Hook — useManagerBookings
//   8. Modal Sub-components
//   9. Table Components
//  10. Page Component
// ─────────────────────────────────────────────────────────────────────────────

// ─── 1. Imports & Bootstrap ───────────────────────────────────────────────────

import React, { useCallback, useEffect, useReducer, useState } from "react";
import { getUser } from "@/utils/auth";
import { toast } from "sonner";
import Swal from "sweetalert2";
import withReactContent from "sweetalert2-react-content";

const MySwal = withReactContent(Swal);

// ─── 2. Types & Constants ─────────────────────────────────────────────────────

export type BookingStatus =
  | "pending"
  | "approved"
  | "confirmed"
  | "rejected"
  | "cancelled"
  | "declined"
  | "rescheduled"
  | "completed"
  | "no_show";

export type FilterTab =
  | "all"
  | "pending"
  | "approved"
  | "rejected"
  | "rescheduled"
  | "completed"
  | "no_show";

export interface Booking {
  id: number;
  user_name: string;
  user_email?: string;
  user_phone?: string;
  note?: string;
  status: BookingStatus;
  reason?: string;
  suggested_date?: string;
  suggested_time?: string;
  branch_id?: number;
  branch_title?: string;
  branch_image_url?: string;
  promo_title?: string;
  promo_description?: string;
  promo_min_size?: number;
  promo_max_size?: number;
  promo_price?: number;
  /** Plain YYYY-MM-DD — never pass through new Date() to avoid UTC±offset shift */
  slot_date_raw: string;
  time_start_raw: string;
  time_end_raw: string;
}

interface Branch {
  id: number;
  title: string;
  alias: string;
}

export interface ReschedulePayload {
  reason: string;
  suggested_date: string;
  suggested_time: string;
}

export type StatusUpdatePayload =
  | { status: "approved" }
  | { status: "declined";    reason: string }
  | { status: "cancelled";   reason: string }
  | { status: "completed" }
  | { status: "no_show" }
  | { status: "rescheduled"; reason: string; suggested_date: string; suggested_time: string };

interface StatusDisplayConfig {
  label: string;
  dot: string;
  text: string;
  bg: string;
  border: string;
}

const STATUS_CONFIG: Record<string, StatusDisplayConfig> = {
  pending:     { label: "Pending",     dot: "bg-amber-400",   text: "text-amber-700",   bg: "bg-amber-50",   border: "border-amber-200"   },
  approved:    { label: "Approved",    dot: "bg-emerald-500", text: "text-emerald-700", bg: "bg-emerald-50", border: "border-emerald-200" },
  confirmed:   { label: "Approved",    dot: "bg-emerald-500", text: "text-emerald-700", bg: "bg-emerald-50", border: "border-emerald-200" },
  rejected:    { label: "Rejected",    dot: "bg-red-500",     text: "text-red-700",     bg: "bg-red-50",     border: "border-red-200"     },
  cancelled:   { label: "Cancelled",   dot: "bg-red-400",     text: "text-red-600",     bg: "bg-red-50",     border: "border-red-100"     },
  declined:    { label: "Declined",    dot: "bg-red-500",     text: "text-red-700",     bg: "bg-red-50",     border: "border-red-200"     },
  rescheduled: { label: "Rescheduled", dot: "bg-blue-400",    text: "text-blue-700",    bg: "bg-blue-50",    border: "border-blue-200"    },
  completed:   { label: "Completed",   dot: "bg-violet-500",  text: "text-violet-700",  bg: "bg-violet-50",  border: "border-violet-200"  },
  no_show:     { label: "No-show",     dot: "bg-gray-400",    text: "text-gray-600",    bg: "bg-gray-50",    border: "border-gray-200"    },
};

const FILTER_TABS: FilterTab[] = [
  "all", "pending", "approved", "rejected", "rescheduled", "completed", "no_show",
];

const TABLE_HEADERS = ["Branch", "Guest", "Phone", "Promo", "Status", "Requested Date", "Requested Time", ""] as const;

const AUTO_REFRESH_MS = 60_000;

// ─── 3. Pure Utility Functions ────────────────────────────────────────────────

function extractDateString(raw: unknown): string {
  if (!raw) return "—";
  const match = String(raw).match(/^(\d{4}-\d{2}-\d{2})/);
  return match ? match[1] : String(raw);
}

function trimTime(raw: unknown): string {
  if (!raw) return "—";
  return String(raw).slice(0, 5);
}

function formatClock(d: Date): string {
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function manilaToday(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Manila" });
}

const statusIs = {
  pending:     (s: string) => s === "pending",
  approved:    (s: string) => s === "approved" || s === "confirmed",
  rejected:    (s: string) => s === "rejected" || s === "cancelled" || s === "declined",
  rescheduled: (s: string) => s === "rescheduled",
  completed:   (s: string) => s === "completed",
  no_show:     (s: string) => s === "no_show",
};

function getAuthToken(): string {
  return typeof window !== "undefined" ? (localStorage.getItem("accessToken") ?? "") : "";
}

// ─── 4. API Layer ─────────────────────────────────────────────────────────────

async function fetchBranches(): Promise<Branch[]> {
  const res = await fetch("/api/booking/public/branches");
  if (!res.ok) throw new Error(`Failed to fetch branches (${res.status})`);
  const data: unknown = await res.json();
  if (Array.isArray(data)) return data as Branch[];
  if (data && typeof data === "object" && "branches" in data)
    return (data as { branches: Branch[] }).branches ?? [];
  return [];
}

async function fetchBookingsForBranch(branchId: number): Promise<Booking[]> {
  const token = getAuthToken();
  const res = await fetch(`/api/booking/bookings?branch_id=${branchId}`, {
    credentials: "include",
    headers: { Authorization: token ? `Bearer ${token}` : "" },
  });
  if (!res.ok) throw new Error(`Failed to fetch bookings (${res.status})`);
  const data: unknown = await res.json().catch(() => ({}));
  const arr: Record<string, unknown>[] = Array.isArray(data)
    ? (data as Record<string, unknown>[])
    : ((data as Record<string, unknown>)?.bookings as Record<string, unknown>[]) ?? [];
  return arr.map((b) => ({
    ...(b as Omit<Booking, "slot_date_raw" | "time_start_raw" | "time_end_raw">),
    slot_date_raw:  extractDateString(b.slot_date),
    time_start_raw: String(b.time_start ?? ""),
    time_end_raw:   String(b.time_end   ?? ""),
  })) as Booking[];
}

async function fetchManagerBranchIds(): Promise<number[]> {
  const allBranches = await fetchBranches();
  const user = getUser();
  const aliases: string[] = Array.isArray(user?.managedBranches) ? (user.managedBranches as string[]) : [];
  return allBranches.filter((b) => aliases.includes(b.alias)).map((b) => b.id);
}

async function fetchManagerBookings(): Promise<Booking[]> {
  const allBranches = await fetchBranches();
  const user = getUser();
  const aliases: string[] = Array.isArray(user?.managedBranches) ? (user.managedBranches as string[]) : [];
  const mine = allBranches.filter((b) => aliases.includes(b.alias));
  const results = await Promise.allSettled(mine.map((b) => fetchBookingsForBranch(b.id)));
  return results.flatMap((r) => (r.status === "fulfilled" ? r.value : []));
}

async function updateBookingStatus(
  bookingId: number,
  payload: StatusUpdatePayload,
): Promise<{ success: boolean; message?: string }> {
  const token = getAuthToken();
  const res = await fetch(`/api/booking/bookings/${bookingId}/status`, {
    method: "PATCH",
    credentials: "include",
    headers: { "Content-Type": "application/json", Authorization: token ? `Bearer ${token}` : "" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as { message?: string };
    return { success: false, message: err.message ?? `Server error (${res.status})` };
  }
  return res.json().catch(() => ({ success: false, message: "Parse error" }));
}

// ─── 5. Shared UI Components ──────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const cfg: StatusDisplayConfig = STATUS_CONFIG[status] ?? {
    label: status, dot: "bg-gray-400", text: "text-gray-600", bg: "bg-gray-50", border: "border-gray-200",
  };
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${cfg.text} ${cfg.bg} ${cfg.border}`}>
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}

function StatPill({ label, value, color, active, onClick }: {
  label: string; value: number; color: string; active?: boolean; onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center px-5 py-3 rounded-2xl border transition-all ${color} ${
        active ? "ring-2 ring-offset-1 ring-current scale-105 shadow-sm" : "hover:scale-105"
      }`}
    >
      <span className="text-xl font-bold tabular-nums leading-none">{value}</span>
      <span className="text-xs font-medium mt-1 opacity-70 uppercase tracking-wider">{label}</span>
    </button>
  );
}

function SpinnerIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={`animate-spin ${className}`} fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
    </svg>
  );
}

// ─── 6. SweetAlert2 Dialog Helpers ───────────────────────────────────────────

const swalBase = {
  customClass: {
    popup:         "!rounded-3xl !shadow-2xl !border !border-gray-100 !p-0 !overflow-hidden",
    title:         "!font-extrabold !text-gray-900 !text-lg !pt-6 !px-6 !pb-1",
    htmlContainer: "!text-gray-500 !text-sm !px-6 !pb-2 !m-0",
    confirmButton: "!rounded-xl !font-bold !text-sm !px-5 !py-2.5 !transition-all !shadow-none",
    cancelButton:  "!rounded-xl !font-bold !text-sm !px-5 !py-2.5 !bg-gray-100 !text-gray-600 hover:!bg-gray-200 !shadow-none",
    actions:       "!px-6 !pb-6 !gap-2 !mt-2",
    icon:          "!border-0 !my-4",
  },
  buttonsStyling: false,
  showCancelButton: true,
  cancelButtonText: "Go back",
  reverseButtons: true,
};

const IS  = "width:100%;padding:10px 12px;border:1.5px solid #e5e7eb;border-radius:10px;font-size:13px;color:#111827;background:#f9fafb;box-sizing:border-box;outline:none;font-family:inherit";
const BIS = "width:100%;padding:10px 12px;border:1.5px solid #bfdbfe;border-radius:10px;font-size:13px;color:#111827;background:#f0f9ff;box-sizing:border-box;outline:none;font-family:inherit";
const LS  = "display:block;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:#374151;margin-bottom:6px;margin-top:12px";

const bookingSummaryHtml = (b: Booking) =>
  `<p style="margin:0 0 4px"><strong style="color:#111827">${b.user_name}</strong></p>
   <p style="margin:0;font-size:12px;color:#6b7280">${b.slot_date_raw} &nbsp;·&nbsp; ${trimTime(b.time_start_raw)}–${trimTime(b.time_end_raw)}</p>
   <p style="margin:2px 0 0;font-size:12px;color:#9ca3af">${b.branch_title ?? ""}</p>`;

const DECLINE_PRESETS = [
  "Fully booked",
  "Manager unavailable",
  "Invalid booking details",
  "Outside business hours",
  "Other",
];

async function swalApprove(booking: Booking): Promise<boolean> {
  const { isConfirmed } = await MySwal.fire({
    ...swalBase,
    icon: "question",
    title: "Approve this booking?",
    html: `<div style="text-align:left;padding:4px 0 8px">${bookingSummaryHtml(booking)}</div>`,
    confirmButtonText: "✓ Yes, approve",
    customClass: { ...swalBase.customClass, confirmButton: `${swalBase.customClass.confirmButton} !bg-emerald-600 !text-white hover:!bg-emerald-700` },
  });
  return isConfirmed;
}

async function swalDecline(booking: Booking): Promise<string | null> {
  const { value } = await MySwal.fire({
    ...swalBase,
    icon: "warning",
    title: "Decline booking",
    html: `
      <div style="text-align:left">
        <div style="margin-bottom:14px">${bookingSummaryHtml(booking)}</div>
        <label style="${LS}">Reason <span style="color:#ef4444">*</span></label>
        <select id="swal-decline-select" style="${IS}">
          <option value="">— Select a reason —</option>
          ${DECLINE_PRESETS.map((r) => `<option value="${r}">${r}</option>`).join("")}
        </select>
        <div id="swal-custom-wrap" style="display:none;margin-top:10px">
          <label style="${LS}">Custom reason</label>
          <input id="swal-custom-input" type="text" maxlength="120" placeholder="Describe the reason…" style="${IS}" />
        </div>
      </div>`,
    confirmButtonText: "Decline booking",
    customClass: { ...swalBase.customClass, confirmButton: `${swalBase.customClass.confirmButton} !bg-red-500 !text-white hover:!bg-red-600` },
    didOpen: () => {
      const sel  = document.getElementById("swal-decline-select") as HTMLSelectElement;
      const wrap = document.getElementById("swal-custom-wrap")    as HTMLDivElement;
      sel?.addEventListener("change", () => { wrap.style.display = sel.value === "Other" ? "block" : "none"; });
    },
    preConfirm: () => {
      const sel    = document.getElementById("swal-decline-select") as HTMLSelectElement;
      const custom = (document.getElementById("swal-custom-input") as HTMLInputElement)?.value?.trim();
      const reason = sel?.value === "Other" ? custom : sel?.value;
      if (!reason) { Swal.showValidationMessage("Please select or enter a reason."); return false; }
      return reason;
    },
  });
  return (value as string | undefined) ?? null;
}

async function swalReschedule(booking: Booking): Promise<ReschedulePayload | null> {
  const today = manilaToday();
  const { value } = await MySwal.fire({
    ...swalBase,
    icon: "info",
    title: "Reschedule booking",
    html: `
      <div style="text-align:left">
        <div style="margin-bottom:14px">${bookingSummaryHtml(booking)}</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
          <div>
            <label style="${LS}">New date <span style="color:#ef4444">*</span></label>
            <input id="swal-resch-date" type="date" min="${today}" style="${BIS}" />
          </div>
          <div>
            <label style="${LS}">New time <span style="color:#ef4444">*</span></label>
            <input id="swal-resch-time" type="time" style="${BIS}" />
          </div>
        </div>
        <label style="${LS}">Reason <span style="color:#ef4444">*</span></label>
        <input id="swal-resch-reason" type="text" maxlength="120" placeholder="e.g. Slot conflict, branch maintenance…" style="${BIS}" />
      </div>`,
    confirmButtonText: "📅 Reschedule",
    customClass: { ...swalBase.customClass, confirmButton: `${swalBase.customClass.confirmButton} !bg-blue-600 !text-white hover:!bg-blue-700` },
    preConfirm: () => {
      const date   = (document.getElementById("swal-resch-date")   as HTMLInputElement)?.value?.trim();
      const time   = (document.getElementById("swal-resch-time")   as HTMLInputElement)?.value?.trim();
      const reason = (document.getElementById("swal-resch-reason") as HTMLInputElement)?.value?.trim();
      if (!date)   { Swal.showValidationMessage("New date is required.");  return false; }
      if (!time)   { Swal.showValidationMessage("New time is required.");  return false; }
      if (!reason) { Swal.showValidationMessage("A reason is required.");  return false; }
      return { suggested_date: date, suggested_time: time, reason };
    },
  });
  return (value as ReschedulePayload | undefined) ?? null;
}

async function swalComplete(booking: Booking): Promise<boolean> {
  const { isConfirmed } = await MySwal.fire({
    ...swalBase,
    icon: "success",
    title: "Mark as completed?",
    html: `<div style="text-align:left;padding:4px 0 8px">${bookingSummaryHtml(booking)}</div>`,
    confirmButtonText: "Mark completed",
    customClass: { ...swalBase.customClass, confirmButton: `${swalBase.customClass.confirmButton} !bg-violet-600 !text-white hover:!bg-violet-700` },
  });
  return isConfirmed;
}

async function swalNoShow(booking: Booking): Promise<boolean> {
  const { isConfirmed } = await MySwal.fire({
    ...swalBase,
    icon: "warning",
    title: "Mark as no-show?",
    html: `
      <div style="text-align:left">
        ${bookingSummaryHtml(booking)}
        <p style="margin:10px 0 0;font-size:12px;color:#6b7280">The customer will be notified they were marked as a no-show.</p>
      </div>`,
    confirmButtonText: "Mark no-show",
    customClass: { ...swalBase.customClass, confirmButton: `${swalBase.customClass.confirmButton} !bg-gray-600 !text-white hover:!bg-gray-700` },
  });
  return isConfirmed;
}

async function swalCancel(booking: Booking): Promise<string | null> {
  const { value } = await MySwal.fire({
    ...swalBase,
    icon: "warning",
    title: "Cancel this booking?",
    html: `
      <div style="text-align:left">
        <div style="margin-bottom:14px">${bookingSummaryHtml(booking)}</div>
        <label style="${LS}">Reason for cancellation <span style="color:#ef4444">*</span></label>
        <textarea id="swal-cancel-reason" rows="3" maxlength="200"
          placeholder="Describe the reason…"
          style="${IS};resize:none;border-color:#fca5a5;background:#fff7f7"></textarea>
      </div>`,
    confirmButtonText: "Cancel booking",
    customClass: { ...swalBase.customClass, confirmButton: `${swalBase.customClass.confirmButton} !bg-rose-500 !text-white hover:!bg-rose-600` },
    preConfirm: () => {
      const reason = (document.getElementById("swal-cancel-reason") as HTMLTextAreaElement)?.value?.trim();
      if (!reason) { Swal.showValidationMessage("A reason is required."); return false; }
      return reason;
    },
  });
  return (value as string | undefined) ?? null;
}

// ─── 7. Custom Hook — useManagerBookings ─────────────────────────────────────

interface BookingsState {
  bookings: Booking[];
  loading: boolean;
  error: string | null;
  lastRefreshed: Date | null;
}

function useManagerBookings() {
  const [state, dispatch] = useReducer(
    (prev: BookingsState, next: Partial<BookingsState>): BookingsState => ({ ...prev, ...next }),
    { bookings: [], loading: false, error: null, lastRefreshed: null },
  );

  const load = useCallback(async (silent = false) => {
    if (!silent) dispatch({ loading: true, error: null });
    try {
      const bookings = await fetchManagerBookings();
      dispatch({ bookings, lastRefreshed: new Date(), loading: false });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to load bookings.";
      dispatch({ error: msg, loading: false });
    }
  }, []);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    const id = setInterval(() => void load(true), AUTO_REFRESH_MS);
    return () => clearInterval(id);
  }, [load]);

  const optimisticStatusUpdate = useCallback(
    (bookingId: number, newStatus: BookingStatus) => {
      dispatch({
        bookings: state.bookings.map((b) =>
          b.id === bookingId ? { ...b, status: newStatus } : b
        ),
      });
    },
    [state.bookings],
  );

  return { ...state, refresh: () => void load(), optimisticStatusUpdate };
}

// ─── 8. Modal Sub-components ─────────────────────────────────────────────────

function ModalCloseButton({ onClose }: { onClose: () => void }) {
  return (
    <button onClick={onClose} aria-label="Close"
      className="absolute top-4 right-4 w-8 h-8 rounded-full bg-black/35 hover:bg-black/55 flex items-center justify-center text-white transition-colors backdrop-blur-sm">
      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
      </svg>
    </button>
  );
}

function ModalHero({ booking, onClose }: { booking: Booking; onClose: () => void }) {
  if (booking.branch_image_url) {
    return (
      <div className="relative w-full h-48 overflow-hidden shrink-0">
        <img src={booking.branch_image_url} alt={booking.branch_title} className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
        <ModalCloseButton onClose={onClose} />
        <div className="absolute bottom-4 left-5 right-16">
          <p className="text-white/60 text-[10px] font-bold uppercase tracking-widest mb-0.5">Branch</p>
          <p className="text-white font-extrabold text-lg leading-tight drop-shadow-sm truncate">{booking.branch_title}</p>
        </div>
      </div>
    );
  }
  return (
    <div className="relative h-28 bg-gradient-to-br from-blue-600 to-blue-800 shrink-0">
      <ModalCloseButton onClose={onClose} />
      <div className="absolute bottom-4 left-5">
        <p className="text-blue-200 text-[10px] font-bold uppercase tracking-widest mb-0.5">Branch</p>
        <p className="text-white font-extrabold text-base leading-tight">{booking.branch_title}</p>
      </div>
    </div>
  );
}

function PromoCard({ booking }: { booking: Booking }) {
  if (!booking.promo_title) return null;
  return (
    <div className="rounded-2xl border border-blue-100 bg-blue-50/60 p-4">
      <div className="flex items-center gap-2 mb-1.5">
        <svg className="w-4 h-4 text-blue-500 shrink-0" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A2 2 0 013 12V7a4 4 0 014-4z" />
        </svg>
        <span className="text-blue-700 font-bold text-sm">
          {booking.promo_title}
          {booking.promo_min_size && booking.promo_max_size ? ` · ${booking.promo_min_size}–${booking.promo_max_size} pax` : ""}
        </span>
      </div>
      {booking.promo_description && <p className="text-gray-600 text-xs leading-relaxed mb-2">{booking.promo_description}</p>}
      {booking.promo_price && <p className="font-bold text-blue-700 text-sm text-right">₱{booking.promo_price.toLocaleString()}</p>}
    </div>
  );
}

function DetailGrid({ booking }: { booking: Booking }) {
  const items = [
    { label: "Phone",  value: booking.user_phone || "—", mono: true  },
    { label: "Branch", value: booking.branch_title ?? "—", mono: false },
    { label: "Date",   value: booking.slot_date_raw, mono: true  },
    { label: "Time",   value: `${trimTime(booking.time_start_raw)} – ${trimTime(booking.time_end_raw)}`, mono: true },
  ];
  return (
    <div className="grid grid-cols-2 gap-2.5">
      {items.map(({ label, value, mono }) => (
        <div key={label} className="bg-gray-50 rounded-2xl p-3.5 border border-gray-100">
          <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1.5">{label}</p>
          <p className={`text-gray-800 font-semibold text-sm truncate ${mono ? "font-mono" : ""}`}>{value}</p>
        </div>
      ))}
    </div>
  );
}

function RescheduleInfoCard({ booking }: { booking: Booking }) {
  if (booking.status !== "rescheduled" || (!booking.suggested_date && !booking.suggested_time)) return null;
  return (
    <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 space-y-1">
      <p className="text-[10px] font-bold uppercase tracking-widest text-blue-500 mb-2">Suggested reschedule</p>
      {booking.suggested_date && <p className="text-sm font-semibold text-blue-900 font-mono">{booking.suggested_date}</p>}
      {booking.suggested_time && <p className="text-sm font-semibold text-blue-900 font-mono">{trimTime(booking.suggested_time)}</p>}
      {booking.reason && <p className="text-xs text-blue-700 italic pt-2 border-t border-blue-100 mt-1">{booking.reason}</p>}
    </div>
  );
}

function DeclineReasonCard({ booking }: { booking: Booking }) {
  if (!statusIs.rejected(booking.status) || !booking.reason) return null;
  return (
    <div className="rounded-2xl border border-red-100 bg-red-50 p-4">
      <p className="text-[10px] font-bold uppercase tracking-widest text-red-400 mb-1.5">Decline / cancel reason</p>
      <p className="text-xs text-red-800 leading-relaxed">{booking.reason}</p>
    </div>
  );
}

function ActionButtons({
  booking, loading, onAction, onClose,
}: {
  booking: Booking; loading: boolean; onAction: (p: StatusUpdatePayload) => Promise<void>; onClose: () => void;
}) {
  const isPending  = statusIs.pending(booking.status);
  const isApproved = statusIs.approved(booking.status);

  if (!isPending && !isApproved) {
    return (
      <button onClick={onClose}
        className="w-full inline-flex items-center justify-center bg-gray-100 hover:bg-gray-200 active:scale-95 text-gray-600 text-sm font-bold px-4 py-2.5 rounded-2xl transition-all">
        Close
      </button>
    );
  }

  type BtnProps = { label: string; icon: React.ReactNode; cls: string; handler: () => Promise<void> };
  const Btn = ({ label, icon, cls, handler }: BtnProps) => (
    <button disabled={loading} onClick={handler}
      className={`flex-1 inline-flex items-center justify-center gap-2 text-white text-sm font-bold px-4 py-2.5 rounded-2xl transition-all active:scale-95 disabled:opacity-40 shadow-sm ${cls}`}>
      {loading ? <SpinnerIcon /> : icon}
      {label}
    </button>
  );

  const icons = {
    check: <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>,
    x:     <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>,
    cal:   <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3M3 11h18M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>,
    ok:    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
    ban:   <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" /></svg>,
  };

  return (
    <div className="flex flex-col gap-2 pt-1">
      {isPending && (
        <div className="flex gap-2">
          <Btn label="Approve" icon={icons.check} cls="bg-emerald-600 hover:bg-emerald-700 shadow-emerald-100"
            handler={async () => { if (await swalApprove(booking)) await onAction({ status: "approved" }); }} />
          <Btn label="Decline" icon={icons.x} cls="bg-red-500 hover:bg-red-600 shadow-red-100"
            handler={async () => { const r = await swalDecline(booking); if (r) await onAction({ status: "declined", reason: r }); }} />
        </div>
      )}

      <Btn label="Reschedule" icon={icons.cal} cls="bg-blue-600 hover:bg-blue-700 shadow-blue-100 w-full"
        handler={async () => { const p = await swalReschedule(booking); if (p) await onAction({ status: "rescheduled", ...p }); }} />

      {isApproved && (
        <div className="flex gap-2">
          <Btn label="Completed" icon={icons.ok} cls="bg-violet-600 hover:bg-violet-700 shadow-violet-100"
            handler={async () => { if (await swalComplete(booking)) await onAction({ status: "completed" }); }} />
          <Btn label="No-show" icon={icons.ban} cls="bg-gray-500 hover:bg-gray-600 shadow-gray-100"
            handler={async () => { if (await swalNoShow(booking)) await onAction({ status: "no_show" }); }} />
        </div>
      )}

      <Btn label="Cancel booking" icon={icons.x} cls="bg-rose-400 hover:bg-rose-500 w-full"
        handler={async () => { const r = await swalCancel(booking); if (r) await onAction({ status: "cancelled", reason: r }); }} />

      <button onClick={onClose}
        className="w-full inline-flex items-center justify-center bg-gray-100 hover:bg-gray-200 active:scale-95 text-gray-600 text-sm font-bold px-4 py-2.5 rounded-2xl transition-all">
        Close
      </button>
    </div>
  );
}

function BookingModal({ booking, onClose, onStatusUpdate, actionLoading }: {
  booking: Booking; onClose: () => void;
  onStatusUpdate: (id: number, payload: StatusUpdatePayload) => Promise<void>;
  actionLoading: boolean;
}) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <div role="dialog" aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(15,23,42,0.55)", backdropFilter: "blur(8px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md flex flex-col"
        style={{ animation: "modalIn 0.25s cubic-bezier(0.34,1.56,0.64,1)", maxHeight: "92dvh" }}>
        <ModalHero booking={booking} onClose={onClose} />
        <div className="px-6 pt-5 pb-6 space-y-4 overflow-y-auto">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-xl font-extrabold text-gray-900 leading-tight">{booking.user_name}</h2>
              <p className="text-xs text-gray-400 mt-0.5 font-medium">Booking #{booking.id}</p>
              {booking.user_email && <p className="text-xs text-gray-400 mt-0.5">{booking.user_email}</p>}
            </div>
            <StatusBadge status={booking.status} />
          </div>
          <PromoCard booking={booking} />
          <DetailGrid booking={booking} />
          <RescheduleInfoCard booking={booking} />
          <DeclineReasonCard booking={booking} />
          {booking.note && (
            <div className="flex gap-2.5 bg-amber-50 border border-amber-100 rounded-2xl p-4">
              <svg className="w-4 h-4 mt-0.5 shrink-0 text-amber-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              <span className="italic leading-relaxed text-xs text-amber-800">{booking.note}</span>
            </div>
          )}
          <ActionButtons booking={booking} loading={actionLoading}
            onAction={(payload) => onStatusUpdate(booking.id, payload)} onClose={onClose} />
        </div>
      </div>
    </div>
  );
}

// ─── 9. Table Components ──────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-40 gap-4 text-gray-400">
      <div className="w-20 h-20 rounded-3xl bg-sky-50 border border-sky-100 flex items-center justify-center">
        <svg className="w-10 h-10 text-sky-300" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3M3 11h18M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      </div>
      <div className="text-center">
        <p className="font-semibold text-gray-500 mb-1">No bookings found</p>
        <p className="text-xs text-gray-400">Reservations from your branches will appear here.</p>
      </div>
    </div>
  );
}

function BookingRow({ booking, index, onView }: {
  booking: Booking; index: number; onView: (b: Booking) => void;
}) {
  return (
    <tr className="row-anim border-b border-gray-50 hover:bg-blue-50/30 transition-colors"
      style={{ animationDelay: `${Math.min(index * 25, 250)}ms` }}>
      <td className="px-4 py-4">
        <span className="font-semibold text-blue-700 text-sm whitespace-nowrap max-w-[140px] truncate block">{booking.branch_title}</span>
      </td>
      <td className="px-4 py-4">
        <p className="text-gray-800 font-semibold text-sm whitespace-nowrap">{booking.user_name}</p>
        {booking.user_email && <p className="text-gray-400 text-xs truncate max-w-[160px]">{booking.user_email}</p>}
      </td>
      <td className="px-3 py-4"><span className="text-gray-500 font-poppins text-sm ">{booking.user_phone || "—"}</span></td>
      <td className="px-3 py-4">
        {booking.promo_title ? (
          <span className="inline-flex items-center bg-blue-50 text-blue-700 border border-blue-100 text-xs font-semibold px-2.5 py-1 rounded-lg whitespace-nowrap">
            {booking.promo_title}{booking.promo_min_size && booking.promo_max_size ? ` ${booking.promo_min_size}–${booking.promo_max_size}` : ""}
          </span>
        ) : <span className="text-gray-300 text-xs">—</span>}
      </td>
      <td className="px-3 py-4 whitespace-nowrap"><StatusBadge status={booking.status} /></td>
      <td className="px-3 py-4 text-center">
        <span className="text-gray-600 text-xs font-poppins bg-yellow-200 px-2.5 py-1 rounded-lg border border-gray-100  whitespace-nowrap">{booking.slot_date_raw}</span>
      </td>
      <td className="px-3 py-4 text-center">
        <span className="text-gray-600 text-sm font-poppins whitespace-nowrap">{trimTime(booking.time_start_raw)} – {trimTime(booking.time_end_raw)}</span>
      </td>
      <td className="px-3 py-4 text-right">
        <button onClick={() => onView(booking)}
          className="inline-flex items-center gap-1 text-xs font-bold text-white bg-sky-500 hover:text-white hover:bg-blue-600 border border-blue-200 hover:border-blue-600 px-3 py-1.5 rounded-xl transition-all duration-150">
          View
          <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
        </button>
      </td>
    </tr>
  );
}

function BookingsTable({ bookings, loading, filterStatus, onView }: {
  bookings: Booking[]; loading: boolean; filterStatus: FilterTab; onView: (b: Booking) => void;
}) {
  return (
    <div className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-7 py-4 border-b border-gray-100 bg-sky-500">
        <span className="text-xs font-bold text-white uppercase tracking-widest">
          {bookings.length} {filterStatus === "all" ? "total" : filterStatus.replace("_", "-")} booking{bookings.length !== 1 ? "s" : ""}
        </span>
        {loading && <div className="flex items-center gap-1 text-xs text-blue-500 font-medium "><SpinnerIcon className="w-3.5 h-3.5" />Syncing…</div>}
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full">
          <thead>
            <tr className="border-b border-gray-100">
              {TABLE_HEADERS.map((h) => (
                <th key={h} className="px-6 py-3.5 text-left text-[11px] font-bold text-gray-400 uppercase tracking-widest whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {bookings.map((b, i) => <BookingRow key={b.id} booking={b} index={i} onView={onView} />)}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── 10. Page Component ───────────────────────────────────────────────────────

const ManagerBookingsPage = () => {
  const { bookings, loading, error, lastRefreshed, refresh, optimisticStatusUpdate } = useManagerBookings();

  const [filterStatus,     setFilterStatus]     = useState<FilterTab>("all");
  const [selectedBooking,  setSelectedBooking]  = useState<Booking | null>(null);
  const [actionLoading,    setActionLoading]    = useState(false);
  const [managerBranchIds, setManagerBranchIds] = useState<number[]>([]);
  const [search,           setSearch]           = useState("");

  useEffect(() => {
    fetchManagerBranchIds().then(setManagerBranchIds).catch(() => setManagerBranchIds([]));
  }, []);

  const counts = {
    all:         bookings.length,
    pending:     bookings.filter((b) => statusIs.pending(b.status)).length,
    approved:    bookings.filter((b) => statusIs.approved(b.status)).length,
    rejected:    bookings.filter((b) => statusIs.rejected(b.status)).length,
    rescheduled: bookings.filter((b) => statusIs.rescheduled(b.status)).length,
    completed:   bookings.filter((b) => statusIs.completed(b.status)).length,
    no_show:     bookings.filter((b) => statusIs.no_show(b.status)).length,
  };

  const byStatus =
    filterStatus === "pending"     ? bookings.filter((b) => statusIs.pending(b.status))     :
    filterStatus === "approved"    ? bookings.filter((b) => statusIs.approved(b.status))    :
    filterStatus === "rejected"    ? bookings.filter((b) => statusIs.rejected(b.status))    :
    filterStatus === "rescheduled" ? bookings.filter((b) => statusIs.rescheduled(b.status)) :
    filterStatus === "completed"   ? bookings.filter((b) => statusIs.completed(b.status))   :
    filterStatus === "no_show"     ? bookings.filter((b) => statusIs.no_show(b.status))     :
    bookings;

  const q = search.trim().toLowerCase();
  const filtered = q
    ? byStatus.filter((b) =>
        b.user_name.toLowerCase().includes(q)  ||
        (b.user_email  ?? "").toLowerCase().includes(q) ||
        (b.user_phone  ?? "").includes(q)       ||
        (b.branch_title ?? "").toLowerCase().includes(q)
      )
    : byStatus;

  function openModal(booking: Booking) {
    if (typeof booking.branch_id === "number" && managerBranchIds.length > 0 && !managerBranchIds.includes(booking.branch_id)) {
      toast.error("You are not authorised to action bookings from this branch.", { position: "bottom-right" });
      return;
    }
    setSelectedBooking(booking);
  }

  async function handleStatusUpdate(bookingId: number, payload: StatusUpdatePayload) {
    setActionLoading(true);
    try {
      const data = await updateBookingStatus(bookingId, payload);
      if (!data.success) {
        toast.error(data.message ?? "Failed to update booking.", { position: "bottom-right" });
        return;
      }
      optimisticStatusUpdate(bookingId, payload.status as BookingStatus);
      setSelectedBooking(null);
      const label =
        payload.status === "approved"    ? "Booking approved ✅"    :
        payload.status === "declined"    ? "Booking declined."       :
        payload.status === "rescheduled" ? "Booking rescheduled 📅" :
        payload.status === "completed"   ? "Marked as completed ✔"  :
        payload.status === "no_show"     ? "Marked as no-show."     :
        payload.status === "cancelled"   ? "Booking cancelled."     :
        "Booking updated.";
      toast.success(label, { position: "bottom-right" });
    } catch {
      toast.error("Network error. Please try again.", { position: "bottom-right" });
    } finally {
      setActionLoading(false);
    }
  }

  return (
    <>
      <style>{`
        @keyframes modalIn { from{opacity:0;transform:scale(.94) translateY(16px)} to{opacity:1;transform:scale(1) translateY(0)} }
        @keyframes rowIn   { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:translateY(0)} }
        .row-anim { animation: rowIn 0.2s ease both; }
      `}</style>

      <div className="min-h-screen" style={{ backgroundColor: "#f8faff" }}>
        <div className="max-w-7xl mx-auto px-6 py-10">

          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 mb-10">
            <div>
              <div className="inline-flex items-center gap-2 text-blue-600 mb-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16M3 21h18M9 21V9h6v12" />
                </svg>
                <span className="text-xs font-bold uppercase tracking-widest">Branch Management</span>
              </div>
              <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight leading-none">Bookings Overview</h1>
              <p className="text-gray-500 mt-2 text-sm">All reservations across your assigned branches, updated in real-time.</p>
            </div>
            <div className="flex flex-col items-end gap-2 shrink-0">
              <button onClick={refresh} disabled={loading}
                className="inline-flex items-center gap-2 bg-white border border-gray-200 hover:border-blue-400 hover:bg-blue-50 hover:text-blue-700 text-gray-600 text-sm font-semibold px-5 py-2.5 rounded-2xl shadow-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed">
                <svg className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582M20 20v-5h-.581M4.582 9A8 8 0 0120 15M19.418 15A8 8 0 014 9" />
                </svg>
                {loading ? "Refreshing…" : "Refresh"}
              </button>
              {lastRefreshed && (
                <p className="text-xs text-gray-400 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
                  Updated {formatClock(lastRefreshed)} · auto every 60s
                </p>
              )}
            </div>
          </div>

          {/* Load error banner */}
          {error && (
            <div className="mb-6 flex gap-2 bg-red-50 border border-red-200 rounded-2xl px-4 py-3 text-sm text-red-700 font-medium">
              <svg className="w-4 h-4 shrink-0 mt-0.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {error}
            </div>
          )}

          {/* Stat pills — clickable to filter */}
          {bookings.length > 0 && (
            <div className="flex flex-wrap gap-3 mb-8">
              {(
                [
                  { tab: "all",         label: "Total",       value: counts.all,         color: "bg-blue-50 border-blue-200 text-blue-700"        },
                  { tab: "pending",     label: "Pending",     value: counts.pending,     color: "bg-amber-50 border-amber-200 text-amber-700"      },
                  { tab: "approved",    label: "Approved",    value: counts.approved,    color: "bg-emerald-50 border-emerald-200 text-emerald-700" },
                  { tab: "rejected",    label: "Rejected",    value: counts.rejected,    color: "bg-red-50 border-red-200 text-red-600"            },
                  { tab: "rescheduled", label: "Rescheduled", value: counts.rescheduled, color: "bg-blue-50 border-blue-200 text-blue-600"         },
                  { tab: "completed",   label: "Completed",   value: counts.completed,   color: "bg-violet-50 border-violet-200 text-violet-600"   },
                  { tab: "no_show",     label: "No-show",     value: counts.no_show,     color: "bg-gray-100 border-gray-200 text-gray-600"        },
                ] as const
              ).map(({ tab, label, value, color }) => (
                <StatPill key={tab} label={label} value={value} color={color}
                  active={filterStatus === tab} onClick={() => setFilterStatus(tab)} />
              ))}
            </div>
          )}

          {/* Search + filter tabs */}
          {bookings.length > 0 && (
            <div className="flex flex-col sm:flex-row gap-3 mb-6">
              <div className="relative flex-1 max-w-sm">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35m0 0A7.5 7.5 0 104.5 4.5a7.5 7.5 0 0012.15 12.15z" />
                </svg>
                <input type="text" placeholder="Search by name, email, phone…" value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-9 pr-8 py-2.5 text-sm bg-white border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-300 transition-all" />
                {search && (
                  <button onClick={() => setSearch("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
              <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-2xl flex-wrap border border-blue-300">
                {FILTER_TABS.map((tab) => (
                  <button key={tab} onClick={() => setFilterStatus(tab)}
                    className={`px-4 py-1.5 rounded-xl text-xs  font-bold uppercase tracking-wider transition-all ${
                      filterStatus === tab ? "bg-white text-blue-700 shadow-md" : "text-gray-500 hover:text-gray-800"
                    }`}>
                    {tab.replace("_", "-")}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Content */}
          {loading && bookings.length === 0 ? (
            <div className="flex items-center justify-center py-40 gap-3 text-gray-400">
              <SpinnerIcon className="w-5 h-5 text-blue-500" />
              <span className="text-sm font-medium">Loading bookings…</span>
            </div>
          ) : bookings.length === 0 ? (
            <EmptyState />
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 gap-3 text-gray-400">
              <p className="text-sm">
                No <span className="font-semibold">{filterStatus.replace("_", "-")}</span> bookings
                {q ? ` matching "${search}"` : ""}.
              </p>
              {q && <button onClick={() => setSearch("")} className="text-xs text-blue-500 underline">Clear search</button>}
            </div>
          ) : (
            <BookingsTable bookings={filtered} loading={loading} filterStatus={filterStatus} onView={openModal} />
          )}

        </div>
      </div>

      {selectedBooking && (
        <BookingModal
          booking={selectedBooking}
          onClose={() => setSelectedBooking(null)}
          onStatusUpdate={handleStatusUpdate}
          actionLoading={actionLoading}
        />
      )}
    </>
  );
};

export default ManagerBookingsPage;