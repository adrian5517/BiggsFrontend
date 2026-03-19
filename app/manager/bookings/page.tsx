"use client";



import React, { useCallback, useEffect, useReducer, useState } from "react";
import { getUser } from "@/utils/auth";
import Swal from "sweetalert2";
import withReactContent from "sweetalert2-react-content";

const MySwal = withReactContent(Swal);

// ─────────────────────────────────────────────────────────────────────────────
// 1. Types & Constants
// ─────────────────────────────────────────────────────────────────────────────

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

export type FilterTab = "all" | "pending" | "approved" | "rejected" | "rescheduled" | "completed" | "no_show";

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
  | { status: "declined"; reason: string }
  | { status: "cancelled"; reason: string }
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
  pending: {
    label: "Pending",
    dot: "bg-amber-400",
    text: "text-amber-700",
    bg: "bg-amber-50",
    border: "border-amber-200",
  },
  approved: {
    label: "Approved",
    dot: "bg-emerald-500",
    text: "text-emerald-700",
    bg: "bg-emerald-50",
    border: "border-emerald-200",
  },
  confirmed: {
    label: "Approved",
    dot: "bg-emerald-500",
    text: "text-emerald-700",
    bg: "bg-emerald-50",
    border: "border-emerald-200",
  },
  rejected: {
    label: "Rejected",
    dot: "bg-red-500",
    text: "text-red-700",
    bg: "bg-red-50",
    border: "border-red-200",
  },
  cancelled: {
    label: "Cancelled",
    dot: "bg-red-500",
    text: "text-red-700",
    bg: "bg-red-50",
    border: "border-red-200",
  },
  declined: {
    label: "Declined",
    dot: "bg-red-500",
    text: "text-red-700",
    bg: "bg-red-50",
    border: "border-red-200",
  },
  rescheduled: {
    label: "Rescheduled",
    dot: "bg-blue-400",
    text: "text-blue-700",
    bg: "bg-blue-50",
    border: "border-blue-200",
  },
  completed: {
    label: "Completed",
    dot: "bg-violet-500",
    text: "text-violet-700",
    bg: "bg-violet-50",
    border: "border-violet-200",
  },
  no_show: {
    label: "No-show",
    dot: "bg-gray-400",
    text: "text-gray-600",
    bg: "bg-gray-50",
    border: "border-gray-200",
  },
};

const FILTER_TABS: FilterTab[] = ["all", "pending", "approved", "rejected", "rescheduled", "completed", "no_show"];

const TABLE_HEADERS = ["Branch", "Guest", "Phone", "Promo", "Status", "Date", "Time", ""] as const;

const AUTO_REFRESH_MS = 60_000;

// ─────────────────────────────────────────────────────────────────────────────
// 2. Pure Utility Functions
// ─────────────────────────────────────────────────────────────────────────────

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

const statusIs = {
  pending:     (s: string) => s === "pending",
  approved:    (s: string) => s === "approved" || s === "confirmed",
  rejected:    (s: string) => s === "rejected" || s === "cancelled" || s === "declined",
  rescheduled: (s: string) => s === "rescheduled",
  completed:   (s: string) => s === "completed",
  no_show:     (s: string) => s === "no_show",
};

function getAuthToken(): string {
  return typeof window !== "undefined"
    ? (localStorage.getItem("accessToken") ?? "")
    : "";
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. API Layer
// ─────────────────────────────────────────────────────────────────────────────

async function fetchBranches(): Promise<Branch[]> {
  const res = await fetch("/api/booking/public/branches");
  const data: unknown = await res.json();
  if (Array.isArray(data)) return data as Branch[];
  if (data && typeof data === "object" && "branches" in data) {
    return (data as { branches: Branch[] }).branches ?? [];
  }
  return [];
}

async function fetchBookingsForBranch(branchId: number): Promise<Booking[]> {
  const token = getAuthToken();
  const res = await fetch(`/api/booking/bookings?branch_id=${branchId}`, {
    credentials: "include",
    headers: { Authorization: token ? `Bearer ${token}` : "" },
  });
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
  const managedAliases: string[] = Array.isArray(user?.managedBranches)
    ? (user.managedBranches as string[])
    : [];
  return allBranches
    .filter((b) => managedAliases.includes(b.alias))
    .map((b) => b.id);
}

async function fetchManagerBookings(): Promise<Booking[]> {
  const allBranches = await fetchBranches();
  const user = getUser();
  const managedAliases: string[] = Array.isArray(user?.managedBranches)
    ? (user.managedBranches as string[])
    : [];
  const managerBranches = allBranches.filter((b) => managedAliases.includes(b.alias));

  const results = await Promise.allSettled(
    managerBranches.map((b) => fetchBookingsForBranch(b.id))
  );
  return results.flatMap((r) => (r.status === "fulfilled" ? r.value : []));
}

async function updateBookingStatus(
  bookingId: number,
  payload: StatusUpdatePayload
): Promise<{ success: boolean; message?: string }> {
  const token = getAuthToken();
  const res = await fetch(`/api/booking/bookings/${bookingId}/status`, {
    method: "PATCH",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      Authorization: token ? `Bearer ${token}` : "",
    },
    body: JSON.stringify(payload),
  });
  return res.json().catch(() => ({ success: false, message: "Parse error" }));
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. Shared UI Components
// ─────────────────────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const cfg: StatusDisplayConfig = STATUS_CONFIG[status] ?? {
    label: status,
    dot: "bg-gray-400",
    text: "text-gray-600",
    bg: "bg-gray-50",
    border: "border-gray-200",
  };
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${cfg.text} ${cfg.bg} ${cfg.border}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}

function StatPill({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className={`flex flex-col items-center px-5 py-3 rounded-2xl border ${color}`}>
      <span className="text-xl font-bold tabular-nums leading-none">{value}</span>
      <span className="text-xs font-medium mt-1 opacity-70 uppercase tracking-wider">{label}</span>
    </div>
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

// ─────────────────────────────────────────────────────────────────────────────
// 5. Custom Hook — useManagerBookings
// ─────────────────────────────────────────────────────────────────────────────

interface BookingsState {
  bookings: Booking[];
  loading: boolean;
  lastRefreshed: Date | null;
}

function useManagerBookings() {
  const [state, dispatch] = useReducer(
    (prev: BookingsState, next: Partial<BookingsState>): BookingsState => ({
      ...prev,
      ...next,
    }),
    { bookings: [], loading: false, lastRefreshed: null }
  );

  const load = useCallback(async () => {
    dispatch({ loading: true });
    try {
      const bookings = await fetchManagerBookings();
      dispatch({ bookings, lastRefreshed: new Date() });
    } finally {
      dispatch({ loading: false });
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    const id = setInterval(() => void load(), AUTO_REFRESH_MS);
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
    [state.bookings]
  );

  return { ...state, refresh: load, optimisticStatusUpdate };
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. SweetAlert Helpers
// All confirmation dialogs live here — zero inline form inputs in the modal.
// ─────────────────────────────────────────────────────────────────────────────

const swalBase = {
  customClass: {
    popup:         "!rounded-3xl !shadow-2xl !border !border-gray-100 !p-0 !overflow-hidden",
    title:         "!font-extrabold !text-gray-900 !text-lg !pt-6 !px-6",
    htmlContainer: "!text-gray-500 !text-sm !px-6 !pb-2 !m-0",
    confirmButton: "!rounded-xl !font-bold !text-sm !px-5 !py-2.5 !transition-all !shadow-none",
    cancelButton:  "!rounded-xl !font-bold !text-sm !px-5 !py-2.5 !bg-gray-100 !text-gray-600 hover:!bg-gray-200 !shadow-none",
    actions:       "!px-6 !pb-6 !gap-2 !mt-2",
    icon:          "!border-0 !my-4",
  },
  buttonsStyling: false,
};

// Shared input style string used inside HTML templates
const inputStyle = "width:100%;padding:10px 12px;border:1.5px solid #e5e7eb;border-radius:10px;font-size:13px;color:#111;background:#f9fafb;box-sizing:border-box;outline:none;margin-bottom:10px";
const labelStyle = "display:block;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:#374151;margin-bottom:6px";

async function swalApprove(booking: Booking): Promise<boolean> {
  const result = await MySwal.fire({
    ...swalBase,
    icon: "question",
    title: "Approve this booking?",
    html: `
      <div style="text-align:left;padding:0 0 4px">
        <p style="margin:0 0 6px"><strong style="color:#111">${booking.user_name}</strong></p>
        <p style="margin:0;font-size:12px;color:#6b7280">${booking.slot_date_raw} · ${trimTime(booking.time_start_raw)}–${trimTime(booking.time_end_raw)}</p>
        <p style="margin:4px 0 0;font-size:12px;color:#6b7280">${booking.branch_title ?? ""}</p>
      </div>
    `,
    showCancelButton: true,
    confirmButtonText: "✓ Yes, approve",
    cancelButtonText: "Cancel",
    customClass: {
      ...swalBase.customClass,
      confirmButton: `${swalBase.customClass.confirmButton} !bg-emerald-600 !text-white hover:!bg-emerald-700`,
    },
  });
  return result.isConfirmed;
}

async function swalDecline(booking: Booking): Promise<string | null> {
  const REASONS = [
    "Fully booked",
    "Manager unavailable",
    "Invalid booking details",
    "Outside business hours",
    "Other",
  ];

  const { value } = await MySwal.fire({
    ...swalBase,
    icon: "warning",
    title: "Decline booking",
    html: `
      <div style="text-align:left">
        <p style="margin:0 0 14px;font-size:13px;color:#6b7280">
          <strong style="color:#111">${booking.user_name}</strong> · ${booking.slot_date_raw}
        </p>
        <label style="${labelStyle}">Reason <span style="color:#ef4444">*</span></label>
        <select id="swal-decline-reason" style="${inputStyle}">
          <option value="">— Select a reason —</option>
          ${REASONS.map((r) => `<option value="${r}">${r}</option>`).join("")}
        </select>
        <div id="swal-custom-wrap" style="display:none">
          <label style="${labelStyle}">Custom reason</label>
          <input id="swal-custom-reason" type="text" maxlength="120"
            placeholder="Describe the reason..."
            style="${inputStyle}" />
        </div>
      </div>
    `,
    showCancelButton: true,
    confirmButtonText: "Decline booking",
    cancelButtonText: "Go back",
    customClass: {
      ...swalBase.customClass,
      confirmButton: `${swalBase.customClass.confirmButton} !bg-red-500 !text-white hover:!bg-red-600`,
    },
    didOpen: () => {
      const select = document.getElementById("swal-decline-reason") as HTMLSelectElement;
      const wrap   = document.getElementById("swal-custom-wrap") as HTMLDivElement;
      select?.addEventListener("change", () => {
        wrap.style.display = select.value === "Other" ? "block" : "none";
      });
    },
    preConfirm: () => {
      const select = document.getElementById("swal-decline-reason") as HTMLSelectElement;
      const custom = (document.getElementById("swal-custom-reason") as HTMLInputElement)?.value?.trim();
      const reason = select?.value === "Other" ? custom : select?.value;
      if (!reason) {
        Swal.showValidationMessage("Please select or enter a reason.");
        return false;
      }
      return reason;
    },
  });

  return value ?? null;
}

async function swalReschedule(booking: Booking): Promise<ReschedulePayload | null> {
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Manila" });

  const blueInput = `width:100%;padding:10px 12px;border:1.5px solid #bfdbfe;border-radius:10px;font-size:13px;color:#111;background:#f0f9ff;box-sizing:border-box;outline:none;margin-bottom:10px`;

  const { value } = await MySwal.fire({
    ...swalBase,
    icon: "info",
    title: "Reschedule booking",
    html: `
      <div style="text-align:left">
        <p style="margin:0 0 14px;font-size:13px;color:#6b7280">
          <strong style="color:#111">${booking.user_name}</strong> · originally ${booking.slot_date_raw}
        </p>
        <label style="${labelStyle}">New date <span style="color:#ef4444">*</span></label>
        <input id="swal-resch-date" type="date" min="${today}" style="${blueInput}" />
        <label style="${labelStyle}">New time <span style="color:#ef4444">*</span></label>
        <input id="swal-resch-time" type="time" style="${blueInput}" />
        <label style="${labelStyle}">Reason <span style="color:#ef4444">*</span></label>
        <input id="swal-resch-reason" type="text" maxlength="120"
          placeholder="e.g. Slot conflict, branch maintenance..."
          style="${blueInput}" />
      </div>
    `,
    showCancelButton: true,
    confirmButtonText: "Reschedule",
    cancelButtonText: "Go back",
    customClass: {
      ...swalBase.customClass,
      confirmButton: `${swalBase.customClass.confirmButton} !bg-blue-600 !text-white hover:!bg-blue-700`,
    },
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

  return value ?? null;
}

async function swalComplete(booking: Booking): Promise<boolean> {
  const result = await MySwal.fire({
    ...swalBase,
    icon: "success",
    title: "Mark as completed?",
    html: `<p style="text-align:left;margin:0;font-size:13px;color:#6b7280">
      Mark <strong style="color:#111">${booking.user_name}</strong>'s booking on
      <strong style="color:#111">${booking.slot_date_raw}</strong> as completed.
    </p>`,
    showCancelButton: true,
    confirmButtonText: "Mark completed",
    cancelButtonText: "Cancel",
    customClass: {
      ...swalBase.customClass,
      confirmButton: `${swalBase.customClass.confirmButton} !bg-violet-600 !text-white hover:!bg-violet-700`,
    },
  });
  return result.isConfirmed;
}

async function swalNoShow(booking: Booking): Promise<boolean> {
  const result = await MySwal.fire({
    ...swalBase,
    icon: "warning",
    title: "Mark as no-show?",
    html: `<p style="text-align:left;margin:0;font-size:13px;color:#6b7280">
      <strong style="color:#111">${booking.user_name}</strong> did not show up for
      <strong style="color:#111">${booking.slot_date_raw}</strong>.
      They will be notified.
    </p>`,
    showCancelButton: true,
    confirmButtonText: "Mark no-show",
    cancelButtonText: "Cancel",
    customClass: {
      ...swalBase.customClass,
      confirmButton: `${swalBase.customClass.confirmButton} !bg-gray-600 !text-white hover:!bg-gray-700`,
    },
  });
  return result.isConfirmed;
}

function toastSuccess(message: string) {
  MySwal.fire({
    toast: true,
    position: "bottom-end",
    icon: "success",
    title: message,
    showConfirmButton: false,
    timer: 3000,
    timerProgressBar: true,
    customClass: { popup: "!rounded-2xl !shadow-lg !text-sm !font-semibold" },
  });
}

function toastError(message: string) {
  MySwal.fire({
    toast: true,
    position: "bottom-end",
    icon: "error",
    title: message,
    showConfirmButton: false,
    timer: 4000,
    timerProgressBar: true,
    customClass: { popup: "!rounded-2xl !shadow-lg !text-sm !font-semibold" },
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// 7. Modal Sub-components
// ─────────────────────────────────────────────────────────────────────────────

function ModalCloseButton({ onClose }: { onClose: () => void }) {
  return (
    <button
      onClick={onClose}
      aria-label="Close"
      className="absolute top-4 right-4 w-8 h-8 rounded-full bg-black/35 hover:bg-black/55 flex items-center justify-center text-white transition-colors backdrop-blur-sm"
    >
      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
      </svg>
    </button>
  );
}

function ModalHero({ booking, onClose }: { booking: Booking; onClose: () => void }) {
  if (booking.branch_image_url) {
    return (
      <div className="relative w-full h-52 overflow-hidden">
        <img src={booking.branch_image_url} alt={booking.branch_title} className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/25 to-transparent" />
        <ModalCloseButton onClose={onClose} />
        <div className="absolute bottom-4 left-5 right-16">
          <p className="text-white/60 text-[10px] font-bold uppercase tracking-widest mb-0.5">Branch</p>
          <p className="text-white font-extrabold text-lg leading-tight drop-shadow-sm truncate">{booking.branch_title}</p>
        </div>
      </div>
    );
  }
  return (
    <div className="relative h-32 bg-gradient-to-br from-blue-600 to-blue-800 overflow-hidden">
      <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "radial-gradient(circle at 20% 50%, white 1px, transparent 1px)", backgroundSize: "40px 40px" }} />
      <ModalCloseButton onClose={onClose} />
      <div className="absolute bottom-5 left-6">
        <p className="text-blue-200 text-[10px] font-bold uppercase tracking-widest mb-0.5">Branch</p>
        <p className="text-white font-extrabold text-lg leading-tight">{booking.branch_title}</p>
      </div>
    </div>
  );
}

function PromoCard({ booking }: { booking: Booking }) {
  if (!booking.promo_title) return null;
  return (
    <div className="rounded-2xl border border-blue-100 bg-blue-50/60 p-4">
      <div className="flex items-center gap-2 mb-2">
        <svg className="w-4 h-4 text-blue-500 shrink-0" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A2 2 0 013 12V7a4 4 0 014-4z" />
        </svg>
        <span className="text-blue-700 font-bold text-sm">
          {booking.promo_title}
          {booking.promo_min_size && booking.promo_max_size ? ` · ${booking.promo_min_size}–${booking.promo_max_size} pax` : ""}
        </span>
      </div>
      {booking.promo_description && <p className="text-gray-600 text-xs leading-relaxed mb-3">{booking.promo_description}</p>}
      <div className="flex gap-4 text-xs text-gray-500">
        {booking.promo_min_size && <span>Min <b className="text-gray-700">{booking.promo_min_size}</b></span>}
        {booking.promo_max_size && <span>Max <b className="text-gray-700">{booking.promo_max_size}</b></span>}
        {booking.promo_price && <span className="ml-auto font-bold text-blue-700 text-sm">₱{booking.promo_price.toLocaleString()}</span>}
      </div>
    </div>
  );
}

function DetailGrid({ booking }: { booking: Booking }) {
  const items = [
    { label: "Phone",  value: booking.user_phone || "—",  mono: true,  icon: <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg> },
    { label: "Branch", value: booking.branch_title ?? "—", mono: false, icon: <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16M3 21h18M9 21V9h6v12" /></svg> },
    { label: "Date",   value: booking.slot_date_raw,       mono: true,  icon: <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3M3 11h18M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg> },
    { label: "Time",   value: `${trimTime(booking.time_start_raw)} – ${trimTime(booking.time_end_raw)}`, mono: true, icon: <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg> },
  ] as const;

  return (
    <div className="grid grid-cols-2 gap-2.5">
      {items.map(({ label, value, mono, icon }) => (
        <div key={label} className="bg-gray-50 rounded-2xl p-3.5 border border-gray-100">
          <div className="flex items-center gap-1.5 text-gray-400 mb-1.5">
            {icon}
            <span className="text-[10px] font-bold uppercase tracking-wider">{label}</span>
          </div>
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
      <p className="text-[10px] font-bold uppercase tracking-widest text-blue-500">Suggested reschedule</p>
      {booking.suggested_date && <p className="text-sm font-semibold text-blue-900 font-mono">{booking.suggested_date}</p>}
      {booking.suggested_time && <p className="text-sm font-semibold text-blue-900 font-mono">{trimTime(booking.suggested_time)}</p>}
      {booking.reason && <p className="text-xs text-blue-700 italic pt-1">{booking.reason}</p>}
    </div>
  );
}

function DeclineReasonCard({ booking }: { booking: Booking }) {
  if (!statusIs.rejected(booking.status) || !booking.reason) return null;
  return (
    <div className="rounded-2xl border border-red-100 bg-red-50 p-4">
      <p className="text-[10px] font-bold uppercase tracking-widest text-red-400 mb-1">Decline reason</p>
      <p className="text-xs text-red-800">{booking.reason}</p>
    </div>
  );
}

/**
 * ActionButtons — all confirmations go through SweetAlert.
 * Pending   → Approve | Decline | Reschedule
 * Confirmed → Complete | No-show | Reschedule
 * Others    → Close only
 */
function ActionButtons({
  booking,
  loading,
  onAction,
  onClose,
}: {
  booking: Booking;
  loading: boolean;
  onAction: (payload: StatusUpdatePayload) => Promise<void>;
  onClose: () => void;
}) {
  const isPending  = statusIs.pending(booking.status);
  const isApproved = statusIs.approved(booking.status);

  async function handleApprove() {
    if (!await swalApprove(booking)) return;
    await onAction({ status: "approved" });
    toastSuccess("Booking approved!");
  }
  async function handleDecline() {
    const reason = await swalDecline(booking);
    if (!reason) return;
    await onAction({ status: "declined", reason });
    toastSuccess("Booking declined.");
  }
  async function handleReschedule() {
    const payload = await swalReschedule(booking);
    if (!payload) return;
    await onAction({ status: "rescheduled", ...payload });
    toastSuccess("Booking rescheduled.");
  }
  async function handleComplete() {
    if (!await swalComplete(booking)) return;
    await onAction({ status: "completed" });
    toastSuccess("Booking marked as completed!");
  }
  async function handleNoShow() {
    if (!await swalNoShow(booking)) return;
    await onAction({ status: "no_show" });
    toastSuccess("Booking marked as no-show.");
  }

  if (!isPending && !isApproved) {
    return (
      <button onClick={onClose} className="w-full inline-flex items-center justify-center bg-gray-100 hover:bg-gray-200 active:scale-95 text-gray-600 text-sm font-bold px-4 py-2.5 rounded-2xl transition-all">
        Close
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-2 pt-1">
      {isPending && (
        <>
          <div className="flex gap-2">
            <button disabled={loading} onClick={handleApprove}
              className="flex-1 inline-flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 active:scale-95 disabled:opacity-50 text-white text-sm font-bold px-4 py-2.5 rounded-2xl transition-all">
              {loading ? <SpinnerIcon /> : <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
              Approve
            </button>
            <button disabled={loading} onClick={handleDecline}
              className="flex-1 inline-flex items-center justify-center gap-2 bg-red-500 hover:bg-red-600 active:scale-95 disabled:opacity-50 text-white text-sm font-bold px-4 py-2.5 rounded-2xl transition-all">
              {loading ? <SpinnerIcon /> : <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>}
              Decline
            </button>
          </div>
          <button disabled={loading} onClick={handleReschedule}
            className="w-full inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 active:scale-95 disabled:opacity-50 text-white text-sm font-bold px-4 py-2.5 rounded-2xl transition-all">
            {loading ? <SpinnerIcon /> : <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3M3 11h18M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>}
            Reschedule
          </button>
        </>
      )}

      {isApproved && (
        <>
          <div className="flex gap-2">
            <button disabled={loading} onClick={handleComplete}
              className="flex-1 inline-flex items-center justify-center gap-2 bg-violet-600 hover:bg-violet-700 active:scale-95 disabled:opacity-50 text-white text-sm font-bold px-4 py-2.5 rounded-2xl transition-all">
              {loading ? <SpinnerIcon /> : <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
              Completed
            </button>
            <button disabled={loading} onClick={handleNoShow}
              className="flex-1 inline-flex items-center justify-center gap-2 bg-gray-500 hover:bg-gray-600 active:scale-95 disabled:opacity-50 text-white text-sm font-bold px-4 py-2.5 rounded-2xl transition-all">
              {loading ? <SpinnerIcon /> : <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" /></svg>}
              No-show
            </button>
          </div>
          <button disabled={loading} onClick={handleReschedule}
            className="w-full inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 active:scale-95 disabled:opacity-50 text-white text-sm font-bold px-4 py-2.5 rounded-2xl transition-all">
            {loading ? <SpinnerIcon /> : <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3M3 11h18M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>}
            Reschedule
          </button>
        </>
      )}

      <button onClick={onClose} className="w-full inline-flex items-center justify-center bg-gray-100 hover:bg-gray-200 active:scale-95 text-gray-600 text-sm font-bold px-4 py-2.5 rounded-2xl transition-all">
        Close
      </button>
    </div>
  );
}

function BookingModal({
  booking,
  onClose,
  onStatusUpdate,
  actionLoading,
}: {
  booking: Booking;
  onClose: () => void;
  onStatusUpdate: (id: number, payload: StatusUpdatePayload) => Promise<void>;
  actionLoading: boolean;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(15,23,42,0.55)", backdropFilter: "blur(8px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-y-auto"
        style={{ animation: "modalIn 0.25s cubic-bezier(0.34,1.56,0.64,1)", maxHeight: "90vh" }}
      >
        <ModalHero booking={booking} onClose={onClose} />
        <div className="px-6 pt-5 pb-6 space-y-4">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-xl font-extrabold text-gray-900 leading-tight">{booking.user_name}</h2>
              <p className="text-xs text-gray-400 mt-0.5 font-medium">Booking ID #{booking.id}</p>
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
          <ActionButtons
            booking={booking}
            loading={actionLoading}
            onAction={(payload) => onStatusUpdate(booking.id, payload)}
            onClose={onClose}
          />
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 8. Table Components
// ─────────────────────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-40 gap-4 text-gray-400">
      <div className="w-20 h-20 rounded-3xl bg-sky-100 flex items-center justify-center">
        <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3M3 11h18M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      </div>
      <div className="text-center">
        <p className="font-semibold text-gray-500 mb-1">No bookings yet</p>
        <p className="text-xs text-gray-400">Reservations from your branches will appear here.</p>
      </div>
    </div>
  );
}

function BookingRow({ booking, index, onView }: { booking: Booking; index: number; onView: (b: Booking) => void }) {
  return (
    <tr className="row-anim border-b border-gray-50 hover:bg-blue-50/30 transition-colors" style={{ animationDelay: `${Math.min(index * 30, 300)}ms` }}>
      <td className="px-6 py-4"><span className="font-semibold text-blue-700 text-sm whitespace-nowrap max-w-[140px] truncate block">{booking.branch_title}</span></td>
      <td className="px-6 py-4"><span className="text-gray-800 font-semibold text-sm whitespace-nowrap">{booking.user_name}</span></td>
      <td className="px-6 py-4"><span className="text-gray-500 font-mono text-xs tracking-tight">{booking.user_phone || "—"}</span></td>
      <td className="px-6 py-4">
        {booking.promo_title ? (
          <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 border border-blue-100 text-xs font-semibold px-2.5 py-1 rounded-lg whitespace-nowrap">
            {booking.promo_title}{booking.promo_min_size && booking.promo_max_size ? ` ${booking.promo_min_size}–${booking.promo_max_size}` : ""}
          </span>
        ) : <span className="text-gray-300 text-xs">—</span>}
      </td>
      <td className="px-6 py-4 whitespace-nowrap"><StatusBadge status={booking.status} /></td>
      <td className="px-6 py-4"><span className="text-gray-600 text-xs font-mono bg-gray-50 px-2.5 py-1 rounded-lg border border-gray-100 whitespace-nowrap">{booking.slot_date_raw}</span></td>
      <td className="px-6 py-4"><span className="text-gray-600 text-xs font-mono whitespace-nowrap">{trimTime(booking.time_start_raw)} – {trimTime(booking.time_end_raw)}</span></td>
      <td className="px-6 py-4 text-right">
        <button onClick={() => onView(booking)} className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-white hover:bg-blue-600 border border-blue-200 hover:border-blue-600 px-3 py-1.5 rounded-xl transition-all duration-150">
          View <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
        </button>
      </td>
    </tr>
  );
}

function BookingsTable({ bookings, loading, filterStatus, onView }: { bookings: Booking[]; loading: boolean; filterStatus: FilterTab; onView: (b: Booking) => void }) {
  return (
    <div className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-7 py-4 border-b border-gray-100">
        <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">
          {bookings.length} {filterStatus === "all" ? "total" : filterStatus.replace("_", "-")} booking{bookings.length !== 1 ? "s" : ""}
        </span>
        {loading && <div className="flex items-center gap-1.5 text-xs text-blue-500 font-medium"><SpinnerIcon className="w-3.5 h-3.5" />Syncing…</div>}
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

// ─────────────────────────────────────────────────────────────────────────────
// 9. Page Component
// ─────────────────────────────────────────────────────────────────────────────

const ManagerBookingsPage = () => {
  const { bookings, loading, lastRefreshed, refresh, optimisticStatusUpdate } = useManagerBookings();
  const [filterStatus,     setFilterStatus]     = useState<FilterTab>("all");
  const [selectedBooking,  setSelectedBooking]  = useState<Booking | null>(null);
  const [actionLoading,    setActionLoading]    = useState(false);
  const [managerBranchIds, setManagerBranchIds] = useState<number[]>([]);

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

  const filtered =
    filterStatus === "pending"     ? bookings.filter((b) => statusIs.pending(b.status))     :
    filterStatus === "approved"    ? bookings.filter((b) => statusIs.approved(b.status))    :
    filterStatus === "rejected"    ? bookings.filter((b) => statusIs.rejected(b.status))    :
    filterStatus === "rescheduled" ? bookings.filter((b) => statusIs.rescheduled(b.status)) :
    filterStatus === "completed"   ? bookings.filter((b) => statusIs.completed(b.status))   :
    filterStatus === "no_show"     ? bookings.filter((b) => statusIs.no_show(b.status))     :
    bookings;

  function openModal(booking: Booking) {
    if (typeof booking.branch_id === "number" && managerBranchIds.length > 0 && !managerBranchIds.includes(booking.branch_id)) {
      toastError("You are not authorised to action bookings from this branch.");
      return;
    }
    setSelectedBooking(booking);
  }

  async function handleStatusUpdate(bookingId: number, payload: StatusUpdatePayload) {
    setActionLoading(true);
    try {
      const data = await updateBookingStatus(bookingId, payload);
      if (!data.success) { toastError(data.message ?? "Failed to update booking status."); return; }
      optimisticStatusUpdate(bookingId, payload.status as BookingStatus);
      setSelectedBooking(null);
    } catch {
      toastError("Network error. Please try again.");
    } finally {
      setActionLoading(false);
    }
  }

  return (
    <>
      <style>{`
        @keyframes modalIn { from { opacity:0; transform:scale(0.94) translateY(16px); } to { opacity:1; transform:scale(1) translateY(0); } }
        @keyframes rowIn   { from { opacity:0; transform:translateY(6px); } to { opacity:1; transform:translateY(0); } }
        .row-anim { animation: rowIn 0.2s ease both; }
      `}</style>

      <div className="min-h-screen" style={{ backgroundColor: "#f8faff" }}>
        <div className="max-w-7xl mx-auto px-6 py-10">

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
            <div>
              <div className="inline-flex items-center gap-2 text-blue-600 mb-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16M3 21h18M9 21V9h6v12" /></svg>
                <span className="text-xs font-bold uppercase tracking-widest">Branch Management</span>
              </div>
              <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight leading-none">Bookings Overview</h1>
              <p className="text-gray-500 mt-2 text-sm">All reservations across your assigned branches, updated in real-time.</p>
            </div>
            <div className="flex flex-col items-end gap-1.5 shrink-0">
              <button onClick={() => void refresh()} disabled={loading}
                className="inline-flex items-center gap-2 bg-white border border-gray-200 hover:border-blue-400 hover:bg-blue-50 hover:text-blue-700 text-gray-600 text-sm font-semibold px-5 py-2.5 rounded-2xl shadow-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed">
                <svg className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582M20 20v-5h-.581M4.582 9A8 8 0 0120 15M19.418 15A8 8 0 014 9" /></svg>
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

          {bookings.length > 0 && (
            <div className="flex flex-wrap gap-3 mb-8">
              <StatPill label="Total"       value={counts.all}         color="bg-blue-50 border-blue-200 text-blue-700" />
              <StatPill label="Pending"     value={counts.pending}     color="bg-amber-50 border-amber-200 text-amber-700" />
              <StatPill label="Approved"    value={counts.approved}    color="bg-emerald-50 border-emerald-200 text-emerald-700" />
              <StatPill label="Rejected"    value={counts.rejected}    color="bg-red-50 border-red-200 text-red-600" />
              <StatPill label="Rescheduled" value={counts.rescheduled} color="bg-blue-50 border-blue-200 text-blue-600" />
              <StatPill label="Completed"   value={counts.completed}   color="bg-violet-50 border-violet-200 text-violet-600" />
              <StatPill label="No-show"     value={counts.no_show}     color="bg-gray-100 border-gray-200 text-gray-600" />
            </div>
          )}

          {bookings.length > 0 && (
            <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-2xl mb-6 w-fit flex-wrap">
              {FILTER_TABS.map((tab) => (
                <button key={tab} onClick={() => setFilterStatus(tab)}
                  className={`px-4 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${filterStatus === tab ? "bg-white text-blue-700 shadow-sm" : "text-gray-500 hover:text-gray-800"}`}>
                  {tab.replace("_", "-")}
                </button>
              ))}
            </div>
          )}

          {loading && bookings.length === 0 ? (
            <div className="flex items-center justify-center py-40 gap-3 text-gray-400">
              <SpinnerIcon className="w-5 h-5 text-blue-500" />
              <span className="text-sm font-medium">Loading bookings…</span>
            </div>
          ) : bookings.length === 0 ? (
            <EmptyState />
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 gap-3 text-gray-400">
              <p className="text-sm">No <span className="font-semibold">{filterStatus.replace("_", "-")}</span> bookings.</p>
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