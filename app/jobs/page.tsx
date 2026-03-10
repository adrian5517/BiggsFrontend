"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { fetchWithAuth } from "@/utils/auth";
import TimezoneBadge from "@/components/timezone-badge";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5000";

type JobItem = {
  jobId: string;
  status: string;
  mode?: string | null;
  filesTotal?: number;
  filesCompleted?: number;
  rowsInserted?: number;
  createdAt?: string | null;
  updatedAt?: string | null;
};

type JobGroup = {
  key: string;
  month?: string;
  mode?: string;
  status?: string;
  count?: number;
  filesTotal?: number;
  filesCompleted?: number;
  rowsInserted?: number;
  items: JobItem[];
};

function statusChip(status: string) {
  const s = String(status || '').toLowerCase();
  if (s.includes('fail') || s.includes('error')) return 'bg-red-100 text-red-700 border-red-200';
  if (s.includes('complete') || s.includes('done') || s.includes('success')) return 'bg-emerald-100 text-emerald-700 border-emerald-200';
  if (s.includes('run')) return 'bg-sky-100 text-sky-700 border-sky-200';
  return 'bg-amber-100 text-amber-700 border-amber-200';
}

export default function JobsLandingPage() {
  const router = useRouter();
  const [jobId, setJobId] = useState("");
  const [lastJobId, setLastJobId] = useState("");
  const [jobs, setJobs] = useState<JobItem[]>([]);
  const [jobGroups, setJobGroups] = useState<JobGroup[]>([]);
  const [loadingJobs, setLoadingJobs] = useState(true);
  const [refreshSeconds, setRefreshSeconds] = useState(15);
  const [timeZone, setTimeZone] = useState('Asia/Manila');

  const formatDate = (value?: string | null) => {
    if (!value) return '—';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return String(value);
    try {
      return new Intl.DateTimeFormat('en-US', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true,
        timeZone,
      }).format(d);
    } catch {
      return d.toLocaleString();
    }
  };

  const loadJobs = async () => {
    try {
      setLoadingJobs(true);
      const res = await fetch(`${API_BASE}/api/fetch/jobs?limit=50&groupBy=month,mode`, { cache: 'no-store' });
      if (!res.ok) return;
      const data = await res.json();
      if (data?.grouped && Array.isArray(data?.groups)) {
        const groups = data.groups
          .map((group: JobGroup) => ({
            ...group,
            items: Array.isArray(group?.items) ? group.items : [],
          }))
          .filter((group: JobGroup) => Array.isArray(group.items));
        setJobGroups(groups);
        setJobs(groups.flatMap((group: JobGroup) => group.items));
      } else {
        const nextJobs = Array.isArray(data?.items) ? data.items : [];
        setJobs(nextJobs);
        setJobGroups([]);
      }
    } catch (_) {
      setJobs([]);
      setJobGroups([]);
    } finally {
      setLoadingJobs(false);
    }
  };

  useEffect(() => {
    try {
      const last = localStorage.getItem('jobs:lastViewedJobId') || '';
      if (last) {
        setLastJobId(last);
        setJobId(last);
      }
    } catch (_) {
      // ignore localStorage errors
    }
  }, []);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const res = await fetchWithAuth(`${API_BASE}/api/admin/settings`);
        if (!res.ok) return;
        const data = await res.json();
        const sec = Number(data?.settings?.jobsMonitoring?.autoRefreshSeconds || 15);
        if (Number.isFinite(sec) && sec >= 5 && sec <= 300) setRefreshSeconds(sec);
        const tz = String(data?.settings?.uiPreferences?.timezone || '').trim();
        if (tz) setTimeZone(tz);
      } catch (_) {
        // ignore when settings is not available for non-admin users
      }
    };
    loadSettings();
  }, []);

  useEffect(() => {
    loadJobs();
  }, []);

  useEffect(() => {
    const ms = Math.max(5, Number(refreshSeconds || 15)) * 1000;
    const id = setInterval(() => {
      loadJobs();
    }, ms);
    return () => clearInterval(id);
  }, [refreshSeconds]);

  const openJob = () => {
    const value = String(jobId || "").trim();
    if (!value) return;
    router.push(`/jobs/${encodeURIComponent(value)}`);
  };

  return (
    <main className="p-4 md:p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Jobs</h1>
        <p className="text-sm text-slate-600 mt-1">
          Track running or completed fetch/combine jobs by Job ID.
        </p>
        <div className="mt-2">
          <TimezoneBadge />
        </div>
      </div>

      <div className="max-w-2xl rounded-lg border bg-white shadow-sm p-4 space-y-3">
        <label htmlFor="jobId" className="block text-sm font-medium text-slate-700">
          Open Job ID
        </label>
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            id="jobId"
            value={jobId}
            onChange={(e) => setJobId(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") openJob();
            }}
            placeholder="e.g. 1740736800000"
            className="h-10 flex-1 border rounded-md px-3 text-sm"
          />
          <button
            type="button"
            onClick={openJob}
            className="h-10 px-4 rounded-md bg-sky-600 text-white text-sm font-medium hover:bg-sky-700"
          >
            Open Job
          </button>
        </div>
        <p className="text-xs text-slate-500">
          Tip: You can get the Job ID from Manual Fetch, Missing Scan Queue, or Combine messages.
        </p>

        {lastJobId && (
          <div className="pt-1 border-t">
            <button
              type="button"
              onClick={() => router.push(`/jobs/${encodeURIComponent(lastJobId)}`)}
              className="text-sm font-medium text-sky-700 hover:text-sky-800"
            >
              Resume last watched job ({lastJobId}) →
            </button>
          </div>
        )}
      </div>

      <div className="max-w-2xl rounded-lg border bg-slate-50 p-4">
        <a
          href="/admin/fetch-logs"
          className="text-sm font-medium text-sky-700 hover:text-sky-800"
        >
          View recent jobs in Fetch Logs →
        </a>
      </div>

      <div className="max-w-5xl rounded-lg border bg-white shadow-sm">
        <div className="px-4 py-3 border-b flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-800">Recent Jobs (Grouped)</h2>
          <div className="flex items-center gap-3">
            <span className="text-[11px] text-slate-500">Auto refresh: {refreshSeconds}s</span>
            <button
              type="button"
              onClick={() => loadJobs()}
              className="text-xs text-sky-700 hover:text-sky-800"
            >
              Refresh now
            </button>
          </div>
        </div>
        <div className="overflow-auto">
          {loadingJobs ? (
            <div className="px-3 py-3 text-slate-500 text-xs">Loading jobs...</div>
          ) : jobs.length === 0 ? (
            <div className="px-3 py-3 text-slate-500 text-xs">No recent jobs found.</div>
          ) : jobGroups.length > 0 ? (
            <div className="p-3 space-y-2">
              {jobGroups.map((group) => (
                <details key={group.key} className="rounded-md border bg-slate-50" open>
                  <summary className="cursor-pointer list-none px-3 py-2 text-xs flex items-center justify-between">
                    <span className="font-medium text-slate-800">
                      {group.month || 'unknown-month'} / {group.mode || 'unknown-mode'}
                    </span>
                    <span className="text-slate-600">
                      jobs: {Number(group.count || group.items.length)} • files: {Number(group.filesCompleted || 0)}/{Number(group.filesTotal || 0)} • rows: {Number(group.rowsInserted || 0).toLocaleString()}
                    </span>
                  </summary>
                  <div className="overflow-auto border-t bg-white">
                    <table className="w-full text-xs">
                      <thead className="bg-slate-50">
                        <tr>
                          <th className="px-3 py-2 text-left">Job ID</th>
                          <th className="px-3 py-2 text-left">Status</th>
                          <th className="px-3 py-2 text-right">Files</th>
                          <th className="px-3 py-2 text-right">Rows</th>
                          <th className="px-3 py-2 text-left">Updated</th>
                          <th className="px-3 py-2 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {group.items.map((job) => (
                          <tr key={job.jobId} className="border-t">
                            <td className="px-3 py-2 font-mono text-[11px]">{job.jobId}</td>
                            <td className="px-3 py-2">
                              <span className={`px-2 py-0.5 rounded border ${statusChip(job.status)}`}>
                                {job.status}
                              </span>
                            </td>
                            <td className="px-3 py-2 text-right">{Number(job.filesCompleted || 0)}/{Number(job.filesTotal || 0)}</td>
                            <td className="px-3 py-2 text-right">{Number(job.rowsInserted || 0).toLocaleString()}</td>
                            <td className="px-3 py-2">{formatDate(job.updatedAt || job.createdAt)}</td>
                            <td className="px-3 py-2 text-right">
                              <button
                                type="button"
                                onClick={() => router.push(`/jobs/${encodeURIComponent(job.jobId)}`)}
                                className="text-sky-700 hover:text-sky-800 font-medium"
                              >
                                Open
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </details>
              ))}
            </div>
          ) : (
            <table className="w-full text-xs">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-3 py-2 text-left">Job ID</th>
                  <th className="px-3 py-2 text-left">Status</th>
                  <th className="px-3 py-2 text-left">Mode</th>
                  <th className="px-3 py-2 text-right">Files</th>
                  <th className="px-3 py-2 text-right">Rows</th>
                  <th className="px-3 py-2 text-left">Updated</th>
                  <th className="px-3 py-2 text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {jobs.map((job) => (
                  <tr key={job.jobId} className="border-t">
                    <td className="px-3 py-2 font-mono text-[11px]">{job.jobId}</td>
                    <td className="px-3 py-2">
                      <span className={`px-2 py-0.5 rounded border ${statusChip(job.status)}`}>
                        {job.status}
                      </span>
                    </td>
                    <td className="px-3 py-2">{job.mode || '—'}</td>
                    <td className="px-3 py-2 text-right">{Number(job.filesCompleted || 0)}/{Number(job.filesTotal || 0)}</td>
                    <td className="px-3 py-2 text-right">{Number(job.rowsInserted || 0).toLocaleString()}</td>
                    <td className="px-3 py-2">{formatDate(job.updatedAt || job.createdAt)}</td>
                    <td className="px-3 py-2 text-right">
                      <button
                        type="button"
                        onClick={() => router.push(`/jobs/${encodeURIComponent(job.jobId)}`)}
                        className="text-sky-700 hover:text-sky-800 font-medium"
                      >
                        Open
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </main>
  );
}
