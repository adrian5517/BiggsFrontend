"use client";

// ─────────────────────────────────────────────────────────────────────────────
// ManagerBookingsPage — refactored for clarity, type-safety, and maintainability
//
// Structure:
//   1. Types & Constants
//   2. Pure Utility Functions
//   3. API Layer (all fetch logic isolated here)
//   4. Small UI Components
//   5. Custom Hooks (state + side-effects)
//   6. Modal Sub-components
//   7. Page Component (pure composition)
// ─────────────────────────────────────────────────────────────────────────────

import React, { useCallback, useEffect, useReducer, useState } from "react";
import { getUser } from "@/utils/auth";

// ─── 1. Types & Constants ─────────────────────────────────────────────────────

export type BookingStatus =
  | "pending"
  | "approved"
  | "confirmed"
  | "rejected"
  | "cancelled"
  | "declined"
  | "rescheduled";

export type FilterTab = "all" | "pending" | "approved" | "rejected";

export interface Booking {
  id: number;
  user_name: string;
  user_phone?: string;
  note?: string;
  status: BookingStatus;
  branch_title?: string;
  branch_image_url?: string;
  promo_title?: string;
  promo_description?: string;
  promo_min_size?: number;
  promo_max_size?: number;
  promo_price?: number;
  /** Plain YYYY-MM-DD — never passed through new Date() to avoid UTC shift */
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

/** Status display config — single source of truth for labels + Tailwind classes */
const STATUS_CONFIG: Record<
  string,
  { label: string; dot: string; text: string; bg: string; border: string }
> = {
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
};

const FILTER_TABS: FilterTab[] = ["all", "pending", "approved", "rejected"];
const AUTO_REFRESH_MS = 60_000;

// ─── 2. Pure Utility Functions ────────────────────────────────────────────────

/**
 * Safely extract YYYY-MM-DD from whatever the API sends.
 * Never pass the result through `new Date()` for display — it causes a UTC→local
 * 1-day shift (e.g. Feb 22 → Feb 21) in UTC+8 and similar timezones.
 */
function extractDateString(raw: unknown): string {
  if (!raw) return "—";
  const match = String(raw).match(/^(\d{4}-\d{2}-\d{2})/);
  return match ? match[1] : String(raw);
}

/** "08:30:00" → "08:30" */
function trimTime(raw: unknown): string {
  if (!raw) return "—";
  return String(raw).slice(0, 5);
}

/** Format a Date for the "last refreshed" clock display */
function formatClock(d: Date): string {
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

/** Status group predicates — centralised so filter logic is never duplicated */
const statusIs = {
  pending: (s: string) => s === "pending",
  approved: (s: string) => s === "approved" || s === "confirmed",
  rejected: (s: string) =>
    s === "rejected" || s === "cancelled" || s === "declined",
};

function getAuthToken(): string {
  return typeof window !== "undefined"
    ? (localStorage.getItem("accessToken") ?? "")
    : "";
}

// ─── 3. API Layer ─────────────────────────────────────────────────────────────

async function fetchBranches(): Promise<Branch[]> {
  const res = await fetch("/api/booking/public/branches");
  const data = await res.json();
  return Array.isArray(data) ? data : (data.branches ?? []);
}

async function fetchBookingsForBranch(branchId: number): Promise<Booking[]> {
  const token = getAuthToken();
  const res = await fetch(`/api/booking/bookings?branch_id=${branchId}`, {
    credentials: "include",
    headers: { Authorization: token ? `Bearer ${token}` : "" },
  });
  const data = await res.json().catch(() => ({}));
  const arr: Record<string, unknown>[] = Array.isArray(data)
    ? data
    : (data.bookings ?? []);

  return arr.map((b) => ({
    ...(b as Omit<Booking, "slot_date_raw" | "time_start_raw" | "time_end_raw">),
    slot_date_raw: extractDateString(b.slot_date),
    time_start_raw: String(b.time_start ?? ""),
    time_end_raw: String(b.time_end ?? ""),
  })) as Booking[];
}

/** Load all bookings for the currently-signed-in manager */
async function fetchManagerBookings(): Promise<Booking[]> {
  const allBranches = await fetchBranches();
  const user = getUser();
  const managedAliases: string[] = Array.isArray(user?.managedBranches)
    ? user.managedBranches
    : [];

  const managerBranches = allBranches.filter((b) =>
    managedAliases.includes(b.alias)
  );

  const results = await Promise.allSettled(
    managerBranches.map((b) => fetchBookingsForBranch(b.id))
  );

  return results.flatMap((r) => (r.status === "fulfilled" ? r.value : []));
}

type StatusUpdatePayload =
  | { status: "approved" }
  | { status: "declined"; reason: string }
  | { status: "rescheduled"; reason: string; suggested_date: string; suggested_time: string };

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

// ─── 4. Small UI Components ───────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? {
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

function StatPill({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div
      className={`flex flex-col items-center px-5 py-3 rounded-2xl border ${color}`}
    >
      <span className="text-xl font-bold tabular-nums leading-none">{value}</span>
      <span className="text-xs font-medium mt-1 opacity-70 uppercase tracking-wider">
        {label}
      </span>
    </div>
  );
}

function SpinnerIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg
      className={`animate-spin ${className}`}
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8v8H4z"
      />
    </svg>
  );
}

// ─── 5. Custom Hooks ──────────────────────────────────────────────────────────

interface BookingsState {
  bookings: Booking[];
  loading: boolean;
  lastRefreshed: Date | null;
}

function useManagerBookings() {
  const [state, setState] = useReducer(
    (prev: BookingsState, next: Partial<BookingsState>) => ({
      ...prev,
      ...next,
    }),
    { bookings: [], loading: false, lastRefreshed: null }
  );

  const load = useCallback(async () => {
    setState({ loading: true });
    try {
      const bookings = await fetchManagerBookings();
      setState({ bookings, lastRefreshed: new Date() });
    } finally {
      setState({ loading: false });
    }
  }, []);

  // Initial load
  useEffect(() => {
    void load();
  }, [load]);

  // Auto-refresh
  useEffect(() => {
    const id = setInterval(() => void load(), AUTO_REFRESH_MS);
    return () => clearInterval(id);
  }, [load]);

  const optimisticStatusUpdate = useCallback(
    (bookingId: number, newStatus: BookingStatus) => {
      setState({
        bookings: state.bookings.map((b) =>
          b.id === bookingId ? { ...b, status: newStatus } : b
        ),
      });
    },
    [state.bookings]
  );

  return { ...state, refresh: load, optimisticStatusUpdate };
}

// ─── 6. Modal Sub-components ─────────────────────────────────────────────────

interface ModalHeroProps {
  booking: Booking;
  onClose: () => void;
}

function ModalHero({ booking, onClose }: ModalHeroProps) {
  const CloseBtn = () => (
    <button
      onClick={onClose}
      className="absolute top-4 right-4 w-8 h-8 rounded-full bg-black/35 hover:bg-black/55 flex items-center justify-center text-white transition-colors backdrop-blur-sm"
      aria-label="Close"
    >
      <svg
        className="w-4 h-4"
        fill="none"
        stroke="currentColor"
        strokeWidth={2.5}
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M6 18L18 6M6 6l12 12"
        />
      </svg>
    </button>
  );

  if (booking.branch_image_url) {
    return (
      <div className="relative w-full h-52 overflow-hidden">
        <img
          src={booking.branch_image_url}
          alt={booking.branch_title}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/25 to-transparent" />
        <CloseBtn />
        <div className="absolute bottom-4 left-5 right-16">
          <p className="text-white/60 text-[10px] font-bold uppercase tracking-widest mb-0.5">
            Branch
          </p>
          <p className="text-white font-extrabold text-lg leading-tight drop-shadow-sm truncate">
            {booking.branch_title}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-32 bg-gradient-to-br from-blue-600 to-blue-800 overflow-hidden">
      <div
        className="absolute inset-0 opacity-10"
        style={{
          backgroundImage:
            "radial-gradient(circle at 20% 50%, white 1px, transparent 1px), radial-gradient(circle at 80% 20%, white 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />
      <CloseBtn />
      <div className="absolute bottom-5 left-6">
        <p className="text-blue-200 text-[10px] font-bold uppercase tracking-widest mb-0.5">
          Branch
        </p>
        <p className="text-white font-extrabold text-lg leading-tight">
          {booking.branch_title}
        </p>
      </div>
    </div>
  );
}

interface DetailGridProps {
  booking: Booking;
}

function DetailGrid({ booking }: DetailGridProps) {
  const items = [
    {
      label: "Phone",
      value: booking.user_phone || "—",
      mono: true,
      icon: (
        <svg
          className="w-3.5 h-3.5"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
          />
        </svg>
      ),
    },
    {
      label: "Branch",
      value: booking.branch_title ?? "—",
      mono: false,
      icon: (
        <svg
          className="w-3.5 h-3.5"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16M3 21h18M9 21V9h6v12"
          />
        </svg>
      ),
    },
    {
      label: "Date",
      value: booking.slot_date_raw,
      mono: true,
      icon: (
        <svg
          className="w-3.5 h-3.5"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M8 7V3m8 4V3M3 11h18M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
          />
        </svg>
      ),
    },
    {
      label: "Time",
      value: `${trimTime(booking.time_start_raw)} – ${trimTime(booking.time_end_raw)}`,
      mono: true,
      icon: (
        <svg
          className="w-3.5 h-3.5"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      ),
    },
  ] as const;

  return (
    <div className="grid grid-cols-2 gap-2.5">
      {items.map(({ label, value, mono, icon }) => (
        <div
          key={label}
          className="bg-gray-50 rounded-2xl p-3.5 border border-gray-100"
        >
          <div className="flex items-center gap-1.5 text-gray-400 mb-1.5">
            {icon}
            <span className="text-[10px] font-bold uppercase tracking-wider">
              {label}
            </span>
          </div>
          <p
            className={`text-gray-800 font-semibold text-sm truncate ${mono ? "font-mono" : ""}`}
          >
            {value}
          </p>
        </div>
      ))}
    </div>
  );
}

interface PromoCardProps {
  booking: Booking;
}

function PromoCard({ booking }: PromoCardProps) {
  if (!booking.promo_title) return null;
  return (
    <div className="rounded-2xl border border-blue-100 bg-blue-50/60 p-4">
      <div className="flex items-center gap-2 mb-2">
        <svg
          className="w-4 h-4 text-blue-500 shrink-0"
          fill="none"
          stroke="currentColor"
          strokeWidth={2.5}
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A2 2 0 013 12V7a4 4 0 014-4z"
          />
        </svg>
        <span className="text-blue-700 font-bold text-sm">
          {booking.promo_title}
          {booking.promo_min_size && booking.promo_max_size
            ? ` · ${booking.promo_min_size}–${booking.promo_max_size} pax`
            : ""}
        </span>
      </div>
      {booking.promo_description && (
        <p className="text-gray-600 text-xs leading-relaxed mb-3">
          {booking.promo_description}
        </p>
      )}
      <div className="flex gap-4 text-xs text-gray-500">
        {booking.promo_min_size && (
          <span>
            Min <b className="text-gray-700">{booking.promo_min_size}</b>
          </span>
        )}
        {booking.promo_max_size && (
          <span>
            Max <b className="text-gray-700">{booking.promo_max_size}</b>
          </span>
        )}
        {booking.promo_price && (
          <span className="ml-auto font-bold text-blue-700 text-sm">
            ₱{booking.promo_price.toLocaleString()}
          </span>
        )}
      </div>
    </div>
  );
}

// Isolated form state for pending-action inputs
interface PendingActionsProps {
  booking: Booking;
  loading: boolean;
  error: string | null;
  onApprove: () => void;
  onDecline: (reason: string) => void;
  onReschedule: (payload: ReschedulePayload) => void;
  onClose: () => void;
}

function PendingActions({
  booking,
  loading,
  error,
  onApprove,
  onDecline,
  onReschedule,
  onClose,
}: PendingActionsProps) {
  const [declineReason, setDeclineReason] = useState("");
  const [reschedReason, setReschedReason] = useState("");
  const [reschedDate, setReschedDate] = useState("");
  const [reschedTime, setReschedTime] = useState("");

  const canDecline = declineReason.trim().length > 0;
  const canReschedule =
    reschedDate.length > 0 &&
    reschedTime.length > 0 &&
    reschedReason.trim().length > 0;

  if (!statusIs.pending(booking.status)) {
    return (
      <button
        onClick={onClose}
        className="w-full inline-flex items-center justify-center bg-gray-100 hover:bg-gray-200 active:scale-95 text-gray-600 text-sm font-bold px-4 py-2.5 rounded-2xl transition-all"
      >
        Close
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-2 pt-1">
      {error && (
        <div className="flex gap-2 bg-red-50 border border-red-200 rounded-2xl px-4 py-3 text-xs text-red-700 font-medium">
          <svg
            className="w-4 h-4 shrink-0 mt-0.5"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          {error}
        </div>
      )}

      {/* Approve / Decline row */}
      <div className="flex gap-2">
        <button
          disabled={loading}
          onClick={onApprove}
          className="flex-1 inline-flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 active:scale-95 disabled:opacity-50 text-white text-sm font-bold px-4 py-2.5 rounded-2xl transition-all shadow-sm shadow-emerald-200"
        >
          {loading ? (
            <SpinnerIcon />
          ) : (
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              strokeWidth={2.5}
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M5 13l4 4L19 7"
              />
            </svg>
          )}
          Approve
        </button>

        <button
          disabled={loading || !canDecline}
          onClick={() => onDecline(declineReason)}
          className="flex-1 inline-flex items-center justify-center gap-2 bg-red-500 hover:bg-red-600 active:scale-95 disabled:opacity-50 text-white text-sm font-bold px-4 py-2.5 rounded-2xl transition-all shadow-sm shadow-red-200"
        >
          {loading ? (
            <SpinnerIcon />
          ) : (
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              strokeWidth={2.5}
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          )}
          Decline
        </button>
      </div>

      {/* Decline reason */}
      <input
        type="text"
        className="w-full border border-red-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-300"
        placeholder="Reason for decline (required to enable)"
        value={declineReason}
        onChange={(e) => setDeclineReason(e.target.value)}
        maxLength={120}
      />

      {/* Reschedule section */}
      <div className="border-t border-gray-100 pt-3 space-y-1.5">
        <p className="font-bold text-xs text-blue-700">Reschedule</p>
        <input
          type="date"
          className="w-full border border-blue-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
          value={reschedDate}
          onChange={(e) => setReschedDate(e.target.value)}
        />
        <input
          type="time"
          className="w-full border border-blue-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
          value={reschedTime}
          onChange={(e) => setReschedTime(e.target.value)}
        />
        <input
          type="text"
          className="w-full border border-blue-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
          placeholder="Reason for reschedule (required)"
          value={reschedReason}
          onChange={(e) => setReschedReason(e.target.value)}
          maxLength={120}
        />
        <button
          disabled={loading || !canReschedule}
          onClick={() =>
            onReschedule({
              reason: reschedReason,
              suggested_date: reschedDate,
              suggested_time: reschedTime,
            })
          }
          className="w-full inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 active:scale-95 disabled:opacity-50 text-white text-sm font-bold px-4 py-2.5 rounded-2xl transition-all shadow-sm shadow-blue-200"
        >
          {loading ? (
            <SpinnerIcon />
          ) : (
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              strokeWidth={2.5}
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 8v4l3 3"
              />
            </svg>
          )}
          Reschedule
        </button>
      </div>

      <button
        onClick={onClose}
        className="w-full inline-flex items-center justify-center bg-gray-100 hover:bg-gray-200 active:scale-95 text-gray-600 text-sm font-bold px-4 py-2.5 rounded-2xl transition-all"
      >
        Close
      </button>
    </div>
  );
}

// ─── Booking Detail Modal ──────────────────────────────────────────────────────

interface BookingModalProps {
  booking: Booking;
  onClose: () => void;
  onStatusUpdate: (
    id: number,
    payload: StatusUpdatePayload
  ) => Promise<void>;
  actionLoading: boolean;
  actionError: string | null;
}

function BookingModal({
  booking,
  onClose,
  onStatusUpdate,
  actionLoading,
  actionError,
}: BookingModalProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{
        backgroundColor: "rgba(15,23,42,0.55)",
        backdropFilter: "blur(8px)",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-y-auto"
        style={{
          animation: "modalIn 0.25s cubic-bezier(0.34,1.56,0.64,1)",
          maxHeight: "90vh",
        }}
      >
        <ModalHero booking={booking} onClose={onClose} />

        <div className="px-6 pt-5 pb-6 space-y-5">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-xl font-extrabold text-gray-900 leading-tight">
                {booking.user_name}
              </h2>
              <p className="text-xs text-gray-400 mt-0.5 font-medium">
                Booking ID #{booking.id}
              </p>
            </div>
            <StatusBadge status={booking.status} />
          </div>

          <PromoCard booking={booking} />
          <DetailGrid booking={booking} />

          {/* Note */}
          {booking.note && (
            <div className="flex gap-2.5 bg-amber-50 border border-amber-100 rounded-2xl p-4 text-sm text-amber-800">
              <svg
                className="w-4 h-4 mt-0.5 shrink-0 text-amber-400"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                />
              </svg>
              <span className="italic leading-relaxed text-xs">{booking.note}</span>
            </div>
          )}

          <PendingActions
            booking={booking}
            loading={actionLoading}
            error={actionError}
            onApprove={() =>
              onStatusUpdate(booking.id, { status: "approved" })
            }
            onDecline={(reason) =>
              onStatusUpdate(booking.id, { status: "declined", reason })
            }
            onReschedule={(p) =>
              onStatusUpdate(booking.id, { status: "rescheduled", ...p })
            }
            onClose={onClose}
          />
        </div>
      </div>
    </div>
  );
}

// ─── 7. Page Component ────────────────────────────────────────────────────────

const ManagerBookingsPage = () => {
  const { bookings, loading, lastRefreshed, refresh, optimisticStatusUpdate } =
    useManagerBookings();

  const [filterStatus, setFilterStatus] = useState<FilterTab>("all");
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  // ── Derived data ────────────────────────────────────────────────────────────
  const counts = {
    all: bookings.length,
    pending: bookings.filter((b) => statusIs.pending(b.status)).length,
    approved: bookings.filter((b) => statusIs.approved(b.status)).length,
    rejected: bookings.filter((b) => statusIs.rejected(b.status)).length,
  };

  const filtered =
    filterStatus === "all"
      ? bookings
      : bookings.filter((b) => statusIs[filterStatus](b.status));

  // ── Handlers ────────────────────────────────────────────────────────────────
  function openModal(booking: Booking) {
    setSelectedBooking(booking);
    setActionError(null);
  }

  function closeModal() {
    setSelectedBooking(null);
    setActionError(null);
  }

  async function handleStatusUpdate(
    bookingId: number,
    payload: StatusUpdatePayload
  ) {
    setActionLoading(true);
    setActionError(null);
    try {
      const data = await updateBookingStatus(bookingId, payload);
      if (!data.success) {
        setActionError(data.message ?? "Failed to update booking status.");
        return;
      }
      optimisticStatusUpdate(bookingId, payload.status as BookingStatus);
      closeModal();
    } catch {
      setActionError("Network error. Please try again.");
    } finally {
      setActionLoading(false);
    }
  }

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <>
      <style>{`
        @keyframes modalIn {
          from { opacity: 0; transform: scale(0.94) translateY(16px); }
          to   { opacity: 1; transform: scale(1)    translateY(0);    }
        }
        @keyframes rowIn {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0);   }
        }
        .row-anim { animation: rowIn 0.2s ease both; }
      `}</style>

      <div className="min-h-screen" style={{ backgroundColor: "#f8faff" }}>
        <div className="max-w-7xl mx-auto px-6 py-10">

          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
            <div>
              <div className="inline-flex items-center gap-2 text-blue-600 mb-2">
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2.5}
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16M3 21h18M9 21V9h6v12"
                  />
                </svg>
                <span className="text-xs font-bold uppercase tracking-widest">
                  Branch Management
                </span>
              </div>
              <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight leading-none">
                Bookings Overview
              </h1>
              <p className="text-gray-500 mt-2 text-sm">
                All reservations across your assigned branches, updated in
                real-time.
              </p>
            </div>

            <div className="flex flex-col items-end gap-1.5 shrink-0">
              <button
                onClick={() => void refresh()}
                disabled={loading}
                className="inline-flex items-center gap-2 bg-white border border-gray-200 hover:border-blue-400 hover:bg-blue-50 hover:text-blue-700 text-gray-600 text-sm font-semibold px-5 py-2.5 rounded-2xl shadow-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <svg
                  className={`w-4 h-4 ${loading ? "animate-spin" : ""}`}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M4 4v5h.582M20 20v-5h-.581M4.582 9A8 8 0 0120 15M19.418 15A8 8 0 014 9"
                  />
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

          {/* Stat Pills */}
          {bookings.length > 0 && (
            <div className="flex flex-wrap gap-3 mb-8">
              <StatPill
                label="Total"
                value={counts.all}
                color="bg-blue-50 border-blue-200 text-blue-700"
              />
              <StatPill
                label="Pending"
                value={counts.pending}
                color="bg-amber-50 border-amber-200 text-amber-700"
              />
              <StatPill
                label="Approved"
                value={counts.approved}
                color="bg-emerald-50 border-emerald-200 text-emerald-700"
              />
              <StatPill
                label="Rejected"
                value={counts.rejected}
                color="bg-red-50 border-red-200 text-red-600"
              />
            </div>
          )}

          {/* Filter Tabs */}
          {bookings.length > 0 && (
            <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-2xl mb-6 w-fit">
              {FILTER_TABS.map((tab) => (
                <button
                  key={tab}
                  onClick={() => setFilterStatus(tab)}
                  className={`px-4 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${
                    filterStatus === tab
                      ? "bg-white text-blue-700 shadow-sm"
                      : "text-gray-500 hover:text-gray-800"
                  }`}
                >
                  {tab}
                </button>
              ))}
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
                No{" "}
                <span className="font-semibold">{filterStatus}</span> bookings.
              </p>
            </div>
          ) : (
            <BookingsTable
              bookings={filtered}
              loading={loading}
              filterStatus={filterStatus}
              onView={openModal}
            />
          )}
        </div>
      </div>

      {selectedBooking && (
        <BookingModal
          booking={selectedBooking}
          onClose={closeModal}
          onStatusUpdate={handleStatusUpdate}
          actionLoading={actionLoading}
          actionError={actionError}
        />
      )}
    </>
  );
};

// ─── Table & Empty State (extracted for readability) ──────────────────────────

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-40 gap-4 text-gray-400">
      <div className="w-20 h-20 rounded-3xl bg-sky-100 flex items-center justify-center">
        <svg
          className="w-10 h-10 text-gray-400"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.5}
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M8 7V3m8 4V3M3 11h18M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
          />
        </svg>
      </div>
      <div className="text-center">
        <p className="font-semibold text-gray-500 mb-1">No bookings yet</p>
        <p className="text-xs text-gray-400">
          Reservations from your branches will appear here.
        </p>
      </div>
    </div>
  );
}

interface BookingsTableProps {
  bookings: Booking[];
  loading: boolean;
  filterStatus: FilterTab;
  onView: (booking: Booking) => void;
}

const TABLE_HEADERS = [
  "Branch",
  "Guest",
  "Phone",
  "Promo",
  "Status",
  "Date",
  "Time",
  "",
] as const;

function BookingsTable({
  bookings,
  loading,
  filterStatus,
  onView,
}: BookingsTableProps) {
  return (
    <div className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-7 py-4 border-b border-gray-100">
        <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">
          {bookings.length}{" "}
          {filterStatus === "all" ? "total" : filterStatus} booking
          {bookings.length !== 1 ? "s" : ""}
        </span>
        {loading && (
          <div className="flex items-center gap-1.5 text-xs text-blue-500 font-medium">
            <SpinnerIcon className="w-3.5 h-3.5" />
            Syncing…
          </div>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full">
          <thead>
            <tr className="border-b border-gray-100">
              {TABLE_HEADERS.map((h) => (
                <th
                  key={h}
                  className="px-6 py-3.5 text-left text-[11px] font-bold text-gray-400 uppercase tracking-widest whitespace-nowrap"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {bookings.map((booking, i) => (
              <BookingRow
                key={booking.id}
                booking={booking}
                index={i}
                onView={onView}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

interface BookingRowProps {
  booking: Booking;
  index: number;
  onView: (booking: Booking) => void;
}

function BookingRow({ booking, index, onView }: BookingRowProps) {
  return (
    <tr
      className="row-anim border-b border-gray-50 hover:bg-blue-50/30 transition-colors group"
      style={{ animationDelay: `${Math.min(index * 30, 300)}ms` }}
    >
      <td className="px-6 py-4">
        <span className="font-semibold text-blue-700 text-sm whitespace-nowrap max-w-[140px] truncate block">
          {booking.branch_title}
        </span>
      </td>
      <td className="px-6 py-4">
        <span className="text-gray-800 font-semibold text-sm whitespace-nowrap">
          {booking.user_name}
        </span>
      </td>
      <td className="px-6 py-4">
        <span className="text-gray-500 font-mono text-xs tracking-tight">
          {booking.user_phone || "—"}
        </span>
      </td>
      <td className="px-6 py-4">
        {booking.promo_title ? (
          <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 border border-blue-100 text-xs font-semibold px-2.5 py-1 rounded-lg whitespace-nowrap">
            <svg
              className="w-3 h-3 shrink-0"
              fill="none"
              stroke="currentColor"
              strokeWidth={2.5}
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A2 2 0 013 12V7a4 4 0 014-4z"
              />
            </svg>
            {booking.promo_title}
            {booking.promo_min_size && booking.promo_max_size
              ? ` ${booking.promo_min_size}–${booking.promo_max_size}`
              : ""}
          </span>
        ) : (
          <span className="text-gray-300 text-xs">—</span>
        )}
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <StatusBadge status={booking.status} />
      </td>
      <td className="px-6 py-4">
        <span className="text-gray-600 text-xs font-mono bg-gray-50 px-2.5 py-1 rounded-lg border border-gray-100 whitespace-nowrap">
          {booking.slot_date_raw}
        </span>
      </td>
      <td className="px-6 py-4">
        <span className="text-gray-600 text-xs font-mono whitespace-nowrap">
          {trimTime(booking.time_start_raw)} – {trimTime(booking.time_end_raw)}
        </span>
      </td>
      <td className="px-6 py-4 text-right">
        <button
          onClick={() => onView(booking)}
          className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-white hover:bg-blue-600 border border-blue-200 hover:border-blue-600 px-3 py-1.5 rounded-xl transition-all duration-150"
        >
          View
          <svg
            className="w-3 h-3"
            fill="none"
            stroke="currentColor"
            strokeWidth={2.5}
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9 5l7 7-7 7"
            />
          </svg>
        </button>
      </td>
    </tr>
  );
}

export default ManagerBookingsPage;