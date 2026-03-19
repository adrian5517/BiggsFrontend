"use client";
import { getUser } from '@/utils/auth';
import React, { useEffect, useState, useCallback } from 'react';

interface Branch {
  id: number;
  title: string;
  alias: string;
}

interface Booking {
  id: number;
  user_name: string;
  user_phone?: string;
  note?: string;
  status: string;
  branch_title?: string;
  branch_image_url?: string;
  promo_title?: string;
  promo_description?: string;
  promo_min_size?: number;
  promo_max_size?: number;
  promo_price?: number;
  /** Plain YYYY-MM-DD string — never parsed into a Date object. */
  slot_date_raw: string;
  time_start_raw: string;
  time_end_raw: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Safely extract a YYYY-MM-DD string from whatever the API sends.
 *
 * The backend now casts slot_date::text so the API always returns "2025-02-22".
 * This function is kept as a safety net for any edge-case format.
 *
 * NEVER pass the result through new Date() for display — that causes the
 * UTC→local 1-day shift (e.g. Feb 22 → Feb 21 in UTC+8 timezones).
 */
function extractDateString(raw: unknown): string {
  if (!raw) return '—';
  const s = String(raw);
  // Plain YYYY-MM-DD (ideal — what the backend now always returns)
  const bare = s.match(/^(\d{4}-\d{2}-\d{2})/);
  if (bare) return bare[1];
  return s;
}

/** Strip seconds: "08:30:00" → "08:30" */
function trimTime(raw: unknown): string {
  if (!raw) return '—';
  return String(raw).slice(0, 5);
}

function formatClock(d: Date): string {
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// ─── UI ────────────────────────────────────────────────────────────────────────

const statusConfig: Record<string, { label: string; dot: string; text: string; bg: string; border: string }> = {
  // DB stores 'confirmed'/'cancelled' but we also handle 'approved'/'rejected'
  // as aliases for display (the backend normalises on write)
  pending:   { label: 'Pending',   dot: 'bg-amber-400',   text: 'text-amber-700',   bg: 'bg-amber-50',   border: 'border-amber-200'  },
  approved:  { label: 'Approved',  dot: 'bg-emerald-500', text: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200' },
  confirmed: { label: 'Approved',  dot: 'bg-emerald-500', text: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200' },
  rejected:  { label: 'Rejected',  dot: 'bg-red-500',     text: 'text-red-700',     bg: 'bg-red-50',     border: 'border-red-200'    },
  cancelled: { label: 'Cancelled', dot: 'bg-red-500',     text: 'text-red-700',     bg: 'bg-red-50',     border: 'border-red-200'    },
};

const StatusBadge = ({ status }: { status: string }) => {
  const cfg = statusConfig[status] ?? {
    label: status, dot: 'bg-gray-400', text: 'text-gray-600', bg: 'bg-gray-50', border: 'border-gray-200',
  };
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${cfg.text} ${cfg.bg} ${cfg.border}`}>
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
};

const StatPill = ({ label, value, color }: { label: string; value: number; color: string }) => (
  <div className={`flex flex-col items-center px-5 py-3 rounded-2xl border ${color}`}>
    <span className="text-xl font-bold tabular-nums leading-none">{value}</span>
    <span className="text-xs font-medium mt-1 opacity-70 uppercase tracking-wider">{label}</span>
  </div>
);

// ─── Page ──────────────────────────────────────────────────────────────────────

const ManagerBookingsPage = () => {
  const [bookings, setBookings]               = useState<Booking[]>([]);
  const [loading, setLoading]                 = useState(false);
  const [lastRefreshed, setLastRefreshed]     = useState<Date | null>(null);
  const [selectedBooking, setSelectedBooking] = useState<any>(null);
  const [showModal, setShowModal]             = useState(false);
  const [filterStatus, setFilterStatus]       = useState<string>('all');
  const [actionLoading, setActionLoading]     = useState(false);
  const [actionError, setActionError]         = useState<string | null>(null);

  // ── Fetch ────────────────────────────────────────────────────────────────────
  const fetchAllBookings = useCallback(async () => {
    setLoading(true);
    try {
      const branchRes  = await fetch('/api/booking/public/branches');
      const branchData = await branchRes.json();
      const allBranches = Array.isArray(branchData) ? branchData : (branchData.branches ?? []);

      const user    = getUser();
      const aliases = Array.isArray(user?.managedBranches) ? user.managedBranches : [];
      console.log('DEBUG: user.managedBranches:', aliases);
      console.log('DEBUG: branch aliases from API:', allBranches.map(b => b.alias));
      const managerBranches = allBranches.filter((b) => aliases.includes(b.alias));
      console.log('DEBUG: managerBranches:', managerBranches);

      const token   = localStorage.getItem('accessToken');
      const headers = { Authorization: token ? `Bearer ${token}` : '' };

      const results = await Promise.all(
        managerBranches.map((branch) =>
          fetch(`/api/booking/bookings?branch_id=${branch.id}`, { credentials: 'include', headers })
            .then((r) => r.json())
            .then((data) => {
              const arr = Array.isArray(data) ? data : (data.bookings ?? []);
              return arr.map((b) => ({
                ...b,
                // The backend now returns slot_date as a plain "YYYY-MM-DD" string
                // (via ::text cast). extractDateString is a safety net only.
                slot_date_raw:  extractDateString(b.slot_date),
                time_start_raw: b.time_start ?? '',
                time_end_raw:   b.time_end   ?? '',
              }));
            })
            .catch(() => [])
        )
      );

      setBookings(results.flat());
      setLastRefreshed(new Date());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAllBookings(); }, [fetchAllBookings]);
  useEffect(() => {
    const id = setInterval(fetchAllBookings, 60_000);
    return () => clearInterval(id);
  }, [fetchAllBookings]);

  // ── Modal ────────────────────────────────────────────────────────────────────
  const openModal = (b: any) => {
    setSelectedBooking(b);
    setActionError(null);
    setShowModal(true);
  };
  const closeModal = () => {
    setShowModal(false);
    setSelectedBooking(null);
    setActionError(null);
  };

  // ── Approve / Reject ─────────────────────────────────────────────────────────
  // Reason and reschedule state
  const [declineReason, setDeclineReason] = useState('');
  const [reschedReason, setReschedReason] = useState('');
  const [reschedDate, setReschedDate] = useState('');
  const [reschedTime, setReschedTime] = useState('');

  const handleStatusUpdate = async (
    bookingId: number,
    newStatus: 'approved' | 'declined' | 'rescheduled',
    opts?: { reason?: string; suggested_date?: string; suggested_time?: string }
  ) => {
    setActionLoading(true);
    setActionError(null);
    try {
      const token = localStorage.getItem('accessToken');
      const body: any = { status: newStatus };
      if (newStatus === 'declined' && opts?.reason) body.reason = opts.reason;
      if (newStatus === 'rescheduled' && opts) {
        body.reason = opts.reason;
        body.suggested_date = opts.suggested_date;
        body.suggested_time = opts.suggested_time;
      }
      const res = await fetch(`/api/booking/bookings/${bookingId}/status`, {
        method: 'PATCH',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          Authorization: token ? `Bearer ${token}` : '',
        },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setActionError(data.message || 'Failed to update booking status.');
        return;
      }
      setBookings((prev) =>
        prev.map((b) =>
          b.id === bookingId
            ? { ...b, status: newStatus }
            : b
        )
      );
      setSelectedBooking((prev: any) =>
        prev ? { ...prev, status: newStatus } : prev
      );
      setDeclineReason('');
      setReschedReason('');
      setReschedDate('');
      setReschedTime('');
      setShowModal(false);
    } catch (err) {
      setActionError('Network error. Please try again.');
    } finally {
      setActionLoading(false);
    }
  };

  // ── Derived counts ───────────────────────────────────────────────────────────
  const isPending  = (s: string) => s === 'pending';
  const isApproved = (s: string) => s === 'approved' || s === 'confirmed';
  const isRejected = (s: string) => s === 'rejected' || s === 'cancelled';

  const counts = {
    all:      bookings.length,
    pending:  bookings.filter((b) => isPending(b.status)).length,
    approved: bookings.filter((b) => isApproved(b.status)).length,
    rejected: bookings.filter((b) => isRejected(b.status)).length,
  };

  const filtered =
    filterStatus === 'all'      ? bookings :
    filterStatus === 'pending'  ? bookings.filter((b) => isPending(b.status))  :
    filterStatus === 'approved' ? bookings.filter((b) => isApproved(b.status)) :
    filterStatus === 'rejected' ? bookings.filter((b) => isRejected(b.status)) :
    bookings;

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
        .row-anim   { animation: rowIn 0.2s ease both; }
        .filter-tab { transition: all 0.15s ease; }
        .filter-tab.active { box-shadow: 0 1px 3px rgba(37,99,235,0.15); }
      `}</style>

      <div className="min-h-screen" style={{ backgroundColor: '#f8faff' }}>
        <div className="max-w-7xl mx-auto px-6 py-10">

          {/* ── Header ── */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
            <div>
              <div className="inline-flex items-center gap-2 text-blue-600 mb-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16M3 21h18M9 21V9h6v12"/>
                </svg>
                <span className="text-xs font-bold uppercase tracking-widest">Branch Management</span>
              </div>
              <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight leading-none">Bookings Overview</h1>
              <p className="text-gray-500 mt-2 text-sm">All reservations across your assigned branches, updated in real-time.</p>
            </div>

            <div className="flex flex-col items-end gap-1.5 shrink-0">
              <button
                onClick={fetchAllBookings} disabled={loading}
                className="inline-flex items-center gap-2 bg-white border border-gray-200 hover:border-blue-400 hover:bg-blue-50 hover:text-blue-700 text-gray-600 text-sm font-semibold px-5 py-2.5 rounded-2xl shadow-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <svg className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582M20 20v-5h-.581M4.582 9A8 8 0 0120 15M19.418 15A8 8 0 014 9"/>
                </svg>
                {loading ? 'Refreshing…' : 'Refresh'}
              </button>
              {lastRefreshed && (
                <p className="text-xs text-gray-400 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
                  Updated {formatClock(lastRefreshed)} · auto every 60s
                </p>
              )}
            </div>
          </div>

          {/* ── Stat Pills ── */}
          {bookings.length > 0 && (
            <div className="flex flex-wrap gap-3 mb-8">
              <StatPill label="Total"    value={counts.all}      color="bg-blue-50 border-blue-200 text-blue-700" />
              <StatPill label="Pending"  value={counts.pending}  color="bg-amber-50 border-amber-200 text-amber-700" />
              <StatPill label="Approved" value={counts.approved} color="bg-emerald-50 border-emerald-200 text-emerald-700" />
              <StatPill label="Rejected" value={counts.rejected} color="bg-red-50 border-red-200 text-red-600" />
            </div>
          )}

          {/* ── Filter Tabs ── */}
          {bookings.length > 0 && (
            <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-2xl mb-6 w-fit">
              {(['all', 'pending', 'approved', 'rejected'] as const).map((s) => (
                <button
                  key={s} onClick={() => setFilterStatus(s)}
                  className={`filter-tab px-4 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${
                    filterStatus === s ? 'active bg-white text-blue-700 shadow-sm' : 'text-gray-500 hover:text-gray-800'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          )}

          {/* ── Content ── */}
          {loading && bookings.length === 0 ? (
            <div className="flex items-center justify-center py-40 gap-3 text-gray-400">
              <svg className="w-5 h-5 animate-spin text-blue-500" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
              </svg>
              <span className="text-sm font-medium">Loading bookings…</span>
            </div>
          ) : bookings.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-40 gap-4 text-gray-400">
              <div className="w-20 h-20 rounded-3xl bg-sky-100 flex items-center justify-center">
                <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3M3 11h18M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                </svg>
              </div>
              <div className="text-center">
                <p className="font-semibold text-gray-500 mb-1">No bookings yet</p>
                <p className="text-xs text-gray-400">Reservations from your branches will appear here.</p>
              </div>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 gap-3 text-gray-400">
              <p className="text-sm">No <span className="font-semibold">{filterStatus}</span> bookings.</p>
            </div>
          ) : (
            <div className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="flex items-center justify-between px-7 py-4 border-b border-gray-100">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                  {filtered.length} {filterStatus === 'all' ? 'total' : filterStatus} booking{filtered.length !== 1 ? 's' : ''}
                </span>
                {loading && (
                  <div className="flex items-center gap-1.5 text-xs text-blue-500 font-medium">
                    <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                    </svg>
                    Syncing…
                  </div>
                )}
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead>
                    <tr className="border-b border-gray-100">
                      {['Branch','Guest','Phone','Promo','Status','Date','Time',''].map((h) => (
                        <th key={h} className="px-6 py-3.5 text-left text-[11px] font-bold text-gray-400 uppercase tracking-widest whitespace-nowrap">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((booking: any, i) => (
                      <tr
                        key={booking.id}
                        className="row-anim border-b border-gray-50 hover:bg-blue-50/30 transition-colors group"
                        style={{ animationDelay: `${Math.min(i * 30, 300)}ms` }}
                      >
                        <td className="px-6 py-4">
                          <span className="font-semibold text-blue-700 text-sm whitespace-nowrap max-w-[140px] truncate block">
                            {booking.branch_title}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-gray-800 font-semibold text-sm whitespace-nowrap">{booking.user_name}</span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-gray-500 font-mono text-xs tracking-tight">{booking.user_phone || '—'}</span>
                        </td>
                        <td className="px-6 py-4">
                          {booking.promo_title ? (
                            <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 border border-blue-100 text-xs font-semibold px-2.5 py-1 rounded-lg whitespace-nowrap">
                              <svg className="w-3 h-3 shrink-0" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A2 2 0 013 12V7a4 4 0 014-4z"/>
                              </svg>
                              {booking.promo_title}
                              {booking.promo_min_size && booking.promo_max_size ? ` ${booking.promo_min_size}–${booking.promo_max_size}` : ''}
                            </span>
                          ) : <span className="text-gray-300 text-xs">—</span>}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <StatusBadge status={booking.status} />
                        </td>
                        {/* Date: plain string from backend, no Date parsing */}
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
                            onClick={() => openModal(booking)}
                            className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-white hover:bg-blue-600 border border-blue-200 hover:border-blue-600 px-3 py-1.5 rounded-xl transition-all duration-150 group-hover:border-blue-300"
                          >
                            View
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7"/>
                            </svg>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Modal ── */}
      {showModal && selectedBooking && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(15,23,42,0.55)', backdropFilter: 'blur(8px)' }}
          onClick={(e) => { if (e.target === e.currentTarget) closeModal(); }}
        >
          <div
            className="bg-white rounded-3xl shadow-2xl w-full max-w-md"
            style={{
              animation: 'modalIn 0.25s cubic-bezier(0.34,1.56,0.64,1)',
              maxHeight: '90vh',
              overflowY: 'auto',
              boxSizing: 'border-box',
            }}
          >
            {/* Hero banner */}
            {selectedBooking.branch_image_url ? (
              <div className="relative w-full h-52 overflow-hidden">
                <img src={selectedBooking.branch_image_url} alt={selectedBooking.branch_title} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/25 to-transparent" />
                <button onClick={closeModal} className="absolute top-4 right-4 w-8 h-8 rounded-full bg-black/35 hover:bg-black/55 flex items-center justify-center text-white transition-colors backdrop-blur-sm">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
                </button>
                <div className="absolute bottom-4 left-5 right-16">
                  <p className="text-white/60 text-[10px] font-bold uppercase tracking-widest mb-0.5">Branch</p>
                  <p className="text-white font-extrabold text-lg leading-tight drop-shadow-sm truncate">{selectedBooking.branch_title}</p>
                </div>
              </div>
            ) : (
              <div className="relative h-32 bg-gradient-to-br from-blue-600 to-blue-800 overflow-hidden">
                <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 20% 50%, white 1px, transparent 1px), radial-gradient(circle at 80% 20%, white 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
                <button onClick={closeModal} className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white transition-colors">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
                </button>
                <div className="absolute bottom-5 left-6">
                  <p className="text-blue-200 text-[10px] font-bold uppercase tracking-widest mb-0.5">Branch</p>
                  <p className="text-white font-extrabold text-lg leading-tight">{selectedBooking.branch_title}</p>
                </div>
              </div>
            )}

            {/* Body */}
            <div className="px-6 pt-5 pb-6 space-y-5">

              {/* Guest + status */}
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-xl font-extrabold text-gray-900 leading-tight">{selectedBooking.user_name}</h2>
                  <p className="text-xs text-gray-400 mt-0.5 font-medium">Booking ID #{selectedBooking.id}</p>
                </div>
                <StatusBadge status={selectedBooking.status} />
              </div>

              {/* Promo */}
              {selectedBooking.promo_title && (
                <div className="rounded-2xl border border-blue-100 bg-blue-50/60 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <svg className="w-4 h-4 text-blue-500 shrink-0" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A2 2 0 013 12V7a4 4 0 014-4z"/>
                    </svg>
                    <span className="text-blue-700 font-bold text-sm">
                      {selectedBooking.promo_title}
                      {selectedBooking.promo_min_size && selectedBooking.promo_max_size
                        ? ` · ${selectedBooking.promo_min_size}–${selectedBooking.promo_max_size} pax` : ''}
                    </span>
                  </div>
                  {selectedBooking.promo_description && (
                    <p className="text-gray-600 text-xs leading-relaxed mb-3">{selectedBooking.promo_description}</p>
                  )}
                  <div className="flex gap-4 text-xs text-gray-500">
                    {selectedBooking.promo_min_size && <span>Min <b className="text-gray-700">{selectedBooking.promo_min_size}</b></span>}
                    {selectedBooking.promo_max_size && <span>Max <b className="text-gray-700">{selectedBooking.promo_max_size}</b></span>}
                    {selectedBooking.promo_price    && <span className="ml-auto font-bold text-blue-700 text-sm">₱{selectedBooking.promo_price.toLocaleString()}</span>}
                  </div>
                </div>
              )}

              {/* Detail grid */}
              <div className="grid grid-cols-2 gap-2.5">
                {[
                  {
                    icon: <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/></svg>,
                    label: 'Phone', value: selectedBooking.user_phone || '—', mono: true,
                  },
                  {
                    icon: <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 9 9-7 7-2 2m-4 4h18"/>
                    </svg>,
                    label: 'Branch',
                    value: selectedBooking.branch_title,
                    mono: false,
                  },
                  {
                    icon: <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3M3 11h18M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>,
                    label: 'Date',
                    value: selectedBooking.slot_date_raw,  // plain YYYY-MM-DD string
                    mono: true,
                  },
                  {
                    icon: <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>,
                    label: 'Time',
                    value: `${trimTime(selectedBooking.time_start_raw)} – ${trimTime(selectedBooking.time_end_raw)}`,
                    mono: true,
                  },
                ].map(({ icon, label, value, mono }) => (
                  <div key={label} className="bg-gray-50 rounded-2xl p-3.5 border border-gray-100">
                    <div className="flex items-center gap-1.5 text-gray-400 mb-1.5">{icon}
                      <span className="text-[10px] font-bold uppercase tracking-wider">{label}</span>
                    </div>
                    <p className={`text-gray-800 font-semibold text-sm truncate ${mono ? 'font-mono' : ''}`}>{value}</p>
                  </div>
                ))}
              </div>

              {/* Note */}
              {selectedBooking.note && (
                <div className="flex gap-2.5 bg-amber-50 border border-amber-100 rounded-2xl p-4 text-sm text-amber-800">
                  <svg className="w-4 h-4 mt-0.5 shrink-0 text-amber-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                  </svg>
                  <span className="italic leading-relaxed text-xs">{selectedBooking.note}</span>
                </div>
              )}

              {/* Error */}
              {actionError && (
                <div className="flex gap-2 bg-red-50 border border-red-200 rounded-2xl px-4 py-3 text-xs text-red-700 font-medium">
                  <svg className="w-4 h-4 shrink-0 mt-0.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                  </svg>
                  {actionError}
                </div>
              )}

              {/* Actions */}
              <div className="flex flex-col gap-2 pt-1">
                {isPending(selectedBooking.status) && (
                  <>
                    <div className="flex gap-2">
                      <button
                        disabled={actionLoading}
                        onClick={() => handleStatusUpdate(selectedBooking.id, 'approved')}
                        className="flex-1 inline-flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 active:scale-95 disabled:opacity-50 text-white text-sm font-bold px-4 py-2.5 rounded-2xl transition-all shadow-sm shadow-emerald-200"
                      >
                        {actionLoading
                          ? <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/></svg>
                          : <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>
                        }
                        Approve
                      </button>
                      <button
                        disabled={actionLoading || !declineReason}
                        onClick={() => handleStatusUpdate(selectedBooking.id, 'declined', { reason: declineReason })}
                        className="flex-1 inline-flex items-center justify-center gap-2 bg-red-500 hover:bg-red-600 active:scale-95 disabled:opacity-50 text-white text-sm font-bold px-4 py-2.5 rounded-2xl transition-all shadow-sm shadow-red-200"
                      >
                        {actionLoading
                          ? <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/></svg>
                          : <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
                        }
                        Decline
                      </button>
                    </div>
                    {/* Decline reason input */}
                    <input
                      type="text"
                      className="mt-2 w-full border border-red-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-300"
                      placeholder="Reason for decline (required)"
                      value={declineReason}
                      onChange={e => setDeclineReason(e.target.value)}
                      maxLength={120}
                    />
                    {/* Reschedule section */}
                    <div className="mt-3 border-t border-gray-100 pt-3">
                      <div className="font-bold text-xs mb-1 text-blue-700">Reschedule</div>
                      <input
                        type="date"
                        className="mb-1 w-full border border-blue-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                        value={reschedDate}
                        onChange={e => setReschedDate(e.target.value)}
                      />
                      <input
                        type="time"
                        className="mb-1 w-full border border-blue-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                        value={reschedTime}
                        onChange={e => setReschedTime(e.target.value)}
                      />
                      <input
                        type="text"
                        className="mb-2 w-full border border-blue-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                        placeholder="Reason for reschedule (required)"
                        value={reschedReason}
                        onChange={e => setReschedReason(e.target.value)}
                        maxLength={120}
                      />
                      <button
                        disabled={actionLoading || !reschedDate || !reschedTime || !reschedReason}
                        onClick={() => handleStatusUpdate(selectedBooking.id, 'rescheduled', {
                          reason: reschedReason,
                          suggested_date: reschedDate,
                          suggested_time: reschedTime,
                        })}
                        className="w-full inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 active:scale-95 disabled:opacity-50 text-white text-sm font-bold px-4 py-2.5 rounded-2xl transition-all shadow-sm shadow-blue-200"
                      >
                        {actionLoading
                          ? <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/></svg>
                          : <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3"/></svg>
                        }
                        Reschedule
                      </button>
                    </div>
                  </>
                )}
                <button
                  onClick={closeModal}
                  className="flex-1 inline-flex items-center justify-center gap-2 bg-gray-100 hover:bg-gray-200 active:scale-95 text-gray-600 text-sm font-bold px-4 py-2.5 rounded-2xl transition-all"
                >
                  Close
                </button>
              </div>

            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ManagerBookingsPage;