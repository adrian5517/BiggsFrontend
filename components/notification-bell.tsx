import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useMissingToast } from '../app/context/MissingToastContext';
import { fetchWithAuth } from '@/utils/auth';

// ─── Types ────────────────────────────────────────────────────────────────────

type NotificationType =
  | 'missing_dates'
  | 'booking'
  | 'alert'
  | 'info'
  | 'success'
  | string;

type Notification = {
  id?: string | number;
  type: NotificationType;
  message: string;
  data?: any;
  read?: boolean;
  created_at?: string;
  date?: string;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function timeAgo(dateStr?: string): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return dateStr;
  const diff = Math.floor((Date.now() - date.getTime()) / 1000);
  if (diff < 60) return 'Just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function getTypeConfig(type: NotificationType): {
  icon: React.ReactNode;
  accent: string;
  label: string;
} {
  switch (type) {
    case 'missing_dates':
      return {
        icon: (
          <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
            <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
          </svg>
        ),
        accent: '#ef4444',
        label: 'Warning',
      };
    case 'booking':
      return {
        icon: (
          <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
            <path fillRule="evenodd" d="M5.75 2a.75.75 0 01.75.75V4h7V2.75a.75.75 0 011.5 0V4h.25A2.75 2.75 0 0118 6.75v8.5A2.75 2.75 0 0115.25 18H4.75A2.75 2.75 0 012 15.25v-8.5A2.75 2.75 0 014.75 4H5V2.75A.75.75 0 015.75 2zm-1 5.5c-.69 0-1.25.56-1.25 1.25v6.5c0 .69.56 1.25 1.25 1.25h10.5c.69 0 1.25-.56 1.25-1.25v-6.5c0-.69-.56-1.25-1.25-1.25H4.75z" clipRule="evenodd" />
          </svg>
        ),
        accent: '#3b82f6',
        label: 'Booking',
      };
    case 'success':
      return {
        icon: (
          <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
          </svg>
        ),
        accent: '#10b981',
        label: 'Success',
      };
    case 'alert':
      return {
        icon: (
          <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" />
          </svg>
        ),
        accent: '#f97316',
        label: 'Alert',
      };
    default:
      return {
        icon: (
          <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5h.253a.25.25 0 01.244.304l-.459 2.066A1.75 1.75 0 0010.747 15H11a.75.75 0 000-1.5h-.253a.25.25 0 01-.244-.304l.459-2.066A1.75 1.75 0 009.253 9H9z" clipRule="evenodd" />
          </svg>
        ),
        accent: '#8b5cf6',
        label: 'Info',
      };
  }
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function NotificationItem({
  notification,
  onMissingDatesClick,
}: {
  notification: Notification;
  onMissingDatesClick: (n: Notification) => void;
}) {
  const { icon, accent, label } = getTypeConfig(notification.type);
  const isClickable = notification.type === 'missing_dates';
  const timestamp = timeAgo(notification.created_at || notification.date);

  return (
    <div
      onClick={isClickable ? () => onMissingDatesClick(notification) : undefined}
      title={isClickable ? 'View missing report' : undefined}
      style={{
        borderLeft: `3px solid ${notification.read ? 'transparent' : accent}`,
        cursor: isClickable ? 'pointer' : 'default',
      }}
      className={`
        group relative flex gap-3 px-4 py-3.5 transition-all duration-150
        ${notification.read ? 'bg-white' : 'bg-slate-50/80'}
        ${isClickable ? 'hover:bg-slate-100/80' : ''}
        border-b border-slate-100 last:border-b-0
      `}
    >
      {/* Icon bubble */}
      <div
        className="flex-shrink-0 mt-0.5 w-8 h-8 rounded-full flex items-center justify-center"
        style={{ backgroundColor: `${accent}15`, color: accent }}
      >
        {icon}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p
            className={`text-sm leading-snug text-slate-800 ${
              notification.read ? 'font-normal' : 'font-medium'
            }`}
          >
            {notification.message}
          </p>
          {!notification.read && (
            <span
              className="flex-shrink-0 mt-1 w-2 h-2 rounded-full"
              style={{ backgroundColor: accent }}
            />
          )}
        </div>

        <div className="mt-1 flex items-center gap-2">
          <span
            className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wide"
            style={{ backgroundColor: `${accent}15`, color: accent }}
          >
            {label}
          </span>
          {timestamp && (
            <span className="text-xs text-slate-400">{timestamp}</span>
          )}
        </div>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
      <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center mb-4">
        <svg className="w-7 h-7 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
      </div>
      <p className="text-sm font-medium text-slate-700">You're all caught up</p>
      <p className="text-xs text-slate-400 mt-1">No new notifications right now</p>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const panelRef = useRef<HTMLDivElement>(null);
  const { triggerMissingToast } = useMissingToast();

  // ── Data ──────────────────────────────────────────────────────────────────

  const loadNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchWithAuth('/api/notifications', { method: 'GET' });
      if (res.ok) {
        const data = await res.json().catch(() => []);
        if (Array.isArray(data)) setNotifications(data);
      }
    } catch {
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const markAllRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    // Optionally: fetchWithAuth('/api/notifications/read-all', { method: 'POST' });
  }, []);

  // ── Socket ────────────────────────────────────────────────────────────────

  useEffect(() => {
    let socket: any;
    if (typeof window === 'undefined') return;
    import('socket.io-client').then(({ io }) => {
      const token = localStorage.getItem('accessToken');
      socket = io('http://localhost:5000/', {
        path: '/socket.io',
        auth: token ? { token } : undefined,
        transports: ['websocket'],
      });
      socket.on('notification', (notif: Notification) => {
        setNotifications((prev) => [notif, ...prev]);
      });
    });
    return () => socket?.disconnect();
  }, []);

  // ── Polling ───────────────────────────────────────────────────────────────

  useEffect(() => {
    loadNotifications();
    const interval = setInterval(loadNotifications, 30_000);
    return () => clearInterval(interval);
  }, [loadNotifications]);

  // ── Outside click close ───────────────────────────────────────────────────

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleMissingDatesClick = useCallback(
    (n: Notification) => {
      if (typeof window === 'undefined') return;
      sessionStorage.removeItem('branchMissingDatesToast');
      if (window.location.pathname === '/dashboard') {
        triggerMissingToast();
      } else {
        window.location.href = '/dashboard';
      }
      setOpen(false);
    },
    [triggerMissingToast]
  );

  // ── Derived state ─────────────────────────────────────────────────────────

  const unreadCount = notifications.filter((n) => !n.read).length;
  const displayed =
    filter === 'unread' ? notifications.filter((n) => !n.read) : notifications;

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="relative" ref={panelRef}>
      {/* Bell button */}
      <button
        onClick={() => setOpen((s) => !s)}
        aria-label="Notifications"
        aria-haspopup="true"
        aria-expanded={open}
        className="relative flex items-center justify-center w-9 h-9 rounded-full transition-all duration-150 hover:bg-white/10 text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-5 w-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>

        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-bold text-white bg-red-500 rounded-full ring-2 ring-current leading-none">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Panel */}
      {open && (
        <div
          className="absolute right-0 mt-2 z-50"
          style={{
            width: '22rem',
            animation: 'notifSlideIn 0.15s ease-out',
          }}
        >
          <style>{`
            @keyframes notifSlideIn {
              from { opacity: 0; transform: translateY(-6px) scale(0.98); }
              to   { opacity: 1; transform: translateY(0)   scale(1); }
            }
          `}</style>

          <div className="rounded-xl shadow-2xl border border-slate-200/70 bg-white overflow-hidden">
            {/* Header */}
            <div className="px-4 pt-4 pb-3 bg-white border-b border-slate-100">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold text-slate-900">Notifications</h3>
                  {unreadCount > 0 && (
                    <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-red-50 text-red-600 border border-red-100">
                      {unreadCount} new
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {unreadCount > 0 && (
                    <button
                      onClick={markAllRead}
                      className="text-xs text-slate-500 hover:text-slate-900 transition-colors"
                    >
                      Mark all read
                    </button>
                  )}
                  <button
                    onClick={loadNotifications}
                    className="flex items-center justify-center w-6 h-6 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors"
                    title="Refresh"
                  >
                    <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M15.312 11.424a5.5 5.5 0 01-9.201 2.466l-.312-.311h2.433a.75.75 0 000-1.5H3.989a.75.75 0 00-.75.75v4.242a.75.75 0 001.5 0v-2.43l.31.31a7 7 0 0011.712-3.138.75.75 0 00-1.449-.39zm1.23-3.723a.75.75 0 00.219-.53V2.929a.75.75 0 00-1.5 0V5.36l-.31-.31A7 7 0 003.239 8.188a.75.75 0 101.448.389A5.5 5.5 0 0113.89 6.11l.311.31h-2.432a.75.75 0 000 1.5h4.243a.75.75 0 00.53-.219z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Filter tabs */}
              <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-0.5">
                {(['all', 'unread'] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setFilter(tab)}
                    className={`flex-1 py-1 px-3 rounded-md text-xs font-medium capitalize transition-all ${
                      filter === tab
                        ? 'bg-white text-slate-900 shadow-sm'
                        : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    {tab === 'all' ? `All (${notifications.length})` : `Unread (${unreadCount})`}
                  </button>
                ))}
              </div>
            </div>

            {/* Body */}
            <div className="overflow-y-auto" style={{ maxHeight: '22rem' }}>
              {loading ? (
                <div className="flex items-center justify-center py-12 gap-2 text-sm text-slate-400">
                  <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Loading notifications…
                </div>
              ) : displayed.length === 0 ? (
                <EmptyState />
              ) : (
                displayed.map((n) => (
                  <NotificationItem
                    key={n.id}
                    notification={n}
                    onMissingDatesClick={handleMissingDatesClick}
                  />
                ))
              )}
            </div>

            {/* Footer */}
            {notifications.length > 0 && (
              <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-100">
                <button className="w-full text-xs text-center text-slate-500 hover:text-slate-800 transition-colors font-medium">
                  View all notifications →
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}