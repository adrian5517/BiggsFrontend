"use client";
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { fetchWithAuth } from '../../utils/auth';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || '';

function parseCsvLine(line: string) {
  const cells: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];

    if (char === '"') {
      if (inQuotes && line[index + 1] === '"') {
        current += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === ',' && !inQuotes) {
      cells.push(current);
      current = '';
      continue;
    }

    current += char;
  }

  cells.push(current);
  return cells;
}

function parseCsvTable(csvText: string) {
  const lines = String(csvText || '')
    .split(/\r?\n/)
    .filter((line) => line.trim() !== '');

  if (!lines.length) return { headers: [], rows: [] };

  const headers = parseCsvLine(lines[0]);
  const rows = lines.slice(1).map(parseCsvLine);
  return { headers, rows };
}

function PreviewModal({
  file,
  onClose,
  onReingest,
  reingestBusy,
}: {
  file: any;
  onClose: () => void;
  onReingest: (filePath: string) => Promise<void>;
  reingestBusy: boolean;
}) {
  const [content, setContent] = useState('');
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<string[][]>([]);

  useEffect(() => {
    if (!file) return;
    try { window.dispatchEvent(new CustomEvent('sidebar:set', { detail: { collapsed: true, hideMobile: true } })); } catch (e) {}

    fetch(`${API_BASE}/api/files/view?file=${encodeURIComponent(file.path)}`)
      .then((r) => r.text())
      .then((t) => {
        setContent(t);
        const parsed = parseCsvTable(t);
        setHeaders(parsed.headers);
        setRows(parsed.rows);
      })
      .catch(() => {
        setContent('Failed to load preview');
        setHeaders([]);
        setRows([]);
      });

    return () => {
      try { window.dispatchEvent(new CustomEvent('sidebar:set', { detail: { collapsed: false } })); } catch (e) {}
    };
  }, [file]);

  if (!file) return null;

  const kb = file.size ? (file.size / 1024).toFixed(1) + ' KB' : '';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
      <div className="bg-white w-full max-w-6xl rounded shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b bg-gray-50">
          <div className="flex items-center gap-4">
            <div className="text-sm font-semibold">Preview (Table)</div>
            <div className="text-sm text-slate-700 font-medium">{file.filename}</div>
            <div className="text-xs text-slate-500">{file.branch} • {file.date} • {kb}</div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => window.open(`${API_BASE}/api/files/download?file=${encodeURIComponent(file.path)}`)} className="text-sm text-green-700 px-3 py-1.5 h-9 border rounded border-green-700 hover:bg-green-50">Download</button>
            <button
              disabled={reingestBusy}
              onClick={() => onReingest(file.path)}
              className="text-sm text-orange-600 border border-orange-600 rounded px-3 py-1.5 h-9 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {reingestBusy ? 'Queueing...' : 'Re-ingest'}
            </button>
            <button onClick={onClose} className="text-sm text-gray-600 px-3 py-1.5 h-9 border rounded">Close</button>
          </div>
        </div>

        <div className="overflow-auto" style={{ maxHeight: '60vh' }}>
          {!!headers.length ? (
            <table className="min-w-full table-auto text-sm">
              <thead className="bg-gray-100 sticky top-0 z-10">
                <tr>
                  {headers.map((header, index) => (
                    <th key={`${header}-${index}`} className="p-2 text-left text-xs font-semibold text-slate-700 border-b">
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.slice(0, 1000).map((row, rowIndex) => (
                  <tr key={rowIndex} className={rowIndex % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                    {headers.map((_, colIndex) => (
                      <td key={`${rowIndex}-${colIndex}`} className="p-2 text-xs font-mono text-slate-700 border-b align-top">
                        {row[colIndex] ?? ''}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="p-4 text-sm text-slate-600">No table preview available for this file.</div>
          )}

          {rows.length > 1000 && (
            <div className="p-3 text-xs text-slate-500 border-t bg-slate-50">
              Showing first 1000 rows of {rows.length} rows.
            </div>
          )}

          {!headers.length && !!content && (
            <pre className="p-3 font-mono text-xs text-slate-700 border-t">{content}</pre>
          )}
        </div>
      </div>
    </div>
  );
}

export default function CsvViewerClient() {
  const [files, setFiles] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [branch, setBranch] = useState('');
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [selected, setSelected] = useState<any>(null);
  const [branches, setBranches] = useState<string[]>([]);
  const [limit, setLimit] = useState(50);
  const [sortBy, setSortBy] = useState('mtime');
  const [sortDir, setSortDir] = useState('desc');
  const [reingestBusyPath, setReingestBusyPath] = useState<string | null>(null);
  const [reingestStatus, setReingestStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  async function scheduleReingest(filePath: string) {
    if (!filePath || reingestBusyPath === filePath) return;
    setReingestBusyPath(filePath);
    setReingestStatus(null);
    try {
      const res = await fetchWithAuth(`${API_BASE}/api/files/reingest`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ file: filePath }),
      });
      const payload = await res.json().catch(() => null);
      if (!res.ok) {
        const msg = payload && payload.message ? String(payload.message) : 'Failed to schedule re-ingest';
        setReingestStatus({ type: 'error', message: msg });
        return;
      }
      const queuedMsg = payload && payload.duplicate
        ? (payload.message || 'Re-ingest already queued recently for this file.')
        : (payload && payload.jobId ? `Re-ingest queued. Job ID: ${payload.jobId}` : 'Re-ingest queued.');
      setReingestStatus({ type: 'success', message: String(queuedMsg) });
    } catch (e) {
      setReingestStatus({ type: 'error', message: 'Failed to schedule re-ingest' });
    } finally {
      setReingestBusyPath(null);
    }
  }

  async function load(opts: { page?: number } = {}) {
    const q = new URLSearchParams();
    if (search) q.set('search', search);
    if (branch) q.set('branch', branch);
    if (start) q.set('start', start);
    if (end) q.set('end', end);
    const usePage = opts.page != null ? Number(opts.page) : page;
    q.set('page', String(usePage));
    q.set('limit', String(limit));
    const res = await fetch(`${API_BASE}/api/files?${q.toString()}`);
    if (!res.ok) return;
    const data = await res.json();
    let list = Array.isArray(data.items) ? data.items : (Array.isArray(data.files) ? data.files : []);

    list = list.slice().sort((a: any, b: any) => {
      const dir = sortDir === 'asc' ? 1 : -1;
      try {
        if (sortBy === 'mtime' || sortBy === 'date') {
          const va = new Date(a.date || a.mtime || a.workDate || 0).getTime() || 0;
          const vb = new Date(b.date || b.mtime || b.workDate || 0).getTime() || 0;
          return va === vb ? 0 : (va < vb ? -1 * dir : 1 * dir);
        }
        if (sortBy === 'size') {
          const va = Number(a.size || 0);
          const vb = Number(b.size || 0);
          return va === vb ? 0 : (va < vb ? -1 * dir : 1 * dir);
        }
        if (sortBy === 'branch') {
          const va = String(a.branch || '').toLowerCase();
          const vb = String(b.branch || '').toLowerCase();
          if (va < vb) return -1 * dir;
          if (va > vb) return 1 * dir;
          return 0;
        }
        const va = String(a.filename || a.fileName || a.path || '').toLowerCase();
        const vb = String(b.filename || b.fileName || b.path || '').toLowerCase();
        if (va < vb) return -1 * dir;
        if (va > vb) return 1 * dir;
        return 0;
      } catch (e) {
        return 0;
      }
    });

    setFiles(list);
    setTotal(Number(data.total || data.totalCount || 0));
  }

  useEffect(() => { load(); }, [page, limit, sortBy, sortDir]);

  useEffect(() => {
    (async () => {
      try {
        let res = await fetch(`${API_BASE}/api/files/branches`);
        if (!res.ok) res = await fetch(`${API_BASE}/api/fetch/branches`);
        if (!res.ok) return;
        const j = await res.json();
        if (j && j.branches) setBranches(j.branches || []);
      } catch (e) {}
    })();
  }, []);

  const onSearch = (e: React.FormEvent<HTMLFormElement>) => { e.preventDefault(); setPage(1); load({ page: 1 }); };

  return (
    <div className="flex flex-col gap-4">
      <div className='flex justify-start gap-2'>
        <Link href="/combined-files" className="px-4 py-5 h-9 rounded-lg text-white bg-sky-500 border border-sky-600 text-sm font-medium inline-flex items-center hover:bg-sky-600">
            View Combined Files
          </Link>

        <Link href="/admin/fetch-logs" className="px-4 py-5 h-9 rounded-lg text-white bg-red-500 border border-red-600 text-sm font-medium inline-flex items-center hover:bg-red-600">
            View Fetch Logs
          </Link>
      </div>

      <form className="flex flex-col md:flex-row gap-2 items-start md:items-center justify-start" onSubmit={onSearch}>
        <label htmlFor="search" className='block text-sm font-medium text-heading sr-only'></label>
        <input id="search" placeholder="Search filename" value={search} onChange={e => setSearch(e.target.value)} 
        className="border border-yellow-500 bg-white hover:border-blue-700 p-2 rounded flex-1 min-w-0 md:flex-none w-full md:w-60" />
        <select value={branch} onChange={e => setBranch(e.target.value)} className="border p-2 rounded w-full md:w-44">
          <option value="">All branches</option>
          {branches.map(b => <option key={b} value={b}>{b}</option>)}
        </select>
        <input type="date" value={start} onChange={e => setStart(e.target.value)} className="border p-2 rounded w-full md:w-auto" />
        <input type="date" value={end} onChange={e => setEnd(e.target.value)} className="border p-2 rounded w-full md:w-auto" />
        <button className="bg-blue-600 text-white px-4 py-2 rounded h-9 w-full md:w-auto">Search</button>
      </form>

      <div className="flex items-center justify-start flex-col md:flex-row gap-4 md:gap-2">
         
        <div className="text-sm text-gray-600">Showing {files.length} of {total} files</div>
        <div className="flex items-center gap-3">
         
          <label htmlFor="sortBy" className="text-sm ml-2">Sort:</label>
          <select id="sortBy" value={sortBy} onChange={e => setSortBy(e.target.value)} className="border p-1 rounded">
            <option value="mtime">Date</option>
            <option value="filename">Filename</option>
            <option value="size">Size</option>
            <option value="branch">Branch</option>
          </select>
          <select value={sortDir} onChange={e => setSortDir(e.target.value)} className="border p-1 rounded">
            <option value="desc">Desc</option>
            <option value="asc">Asc</option>
          </select>
          <label htmlFor="pageSize" className="text-sm">Page size:</label>
          <select id="pageSize" value={limit} onChange={e => { setLimit(Number(e.target.value)); setPage(1); }} className="border p-1 rounded">
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
            <option value={200}>200</option>
          </select>
        </div>
      </div>

      {reingestStatus && (
        <div className={`text-sm px-3 py-2 rounded border ${reingestStatus.type === 'success' ? 'text-green-700 bg-green-50 border-green-200' : 'text-red-700 bg-red-50 border-red-200'}`}>
          {reingestStatus.message}
        </div>
      )}

      <div className="overflow-x-auto border rounded bg-white">
        <table className="min-w-full table-auto ">
          <thead className="text-left bg-yellow-400 text-white">
            <tr>
              <th className="p-3 text-l text-black">Branch</th>
              <th className="p-3 text-l text-black ">Date</th>
              <th className="p-3 text-l text-black">Filename</th>
              <th className="p-3 text-l text-black">Size</th>
              <th className="p-3 text-l text-black ">Actions</th>
            </tr>
          </thead>
          <tbody>
            {files.map((f, idx) => (
              <tr key={f.path} className={`${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'} odd:bg-blue-100 even:bg-neutral-secondary-soft `}>
                <td className="p-3 align-top text-sm font-medium ">{f.branch}</td>
                <td className="p-3 align-top text-sm text-slate-600">{f.date}</td>
                <td className="p-3 align-top text-sm">
                  <div className="truncate max-w-[36rem]" title={f.filename} style={{ maxWidth: 520 }}>{f.filename}</div>
                </td>
                <td className="p-3 align-top text-sm text-slate-600">{(f.size / 1024).toFixed(1)} KB</td>
                <td className="p-3 align-top text-sm">
                  <button className="mr-3 text-sm text-blue-600 border border-blue-600 rounded px-3 py-1.5 h-9 bg-sky-500 text-white" onClick={() => setSelected(f)}>Preview Table</button>
                  <a className="mr-3 text-sm text-green-600 border border-green-600 rounded px-3 py-1.5 h-9 bg-green-500 text-white inline-flex items-center" href={`${API_BASE}/api/files/download?file=${encodeURIComponent(f.path)}`} target="_blank" rel="noreferrer">Download</a>
                  <button
                    className="text-sm text-orange-600 border border-orange-600 rounded px-3 py-1.5 h-9 bg-red-500 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={reingestBusyPath === f.path}
                    onClick={() => scheduleReingest(f.path)}
                  >
                    {reingestBusyPath === f.path ? 'Queueing...' : 'Re-ingest'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center gap-2">
        <button disabled={page <= 1} onClick={() => setPage(p => Math.max(1, p - 1))} className="px-3 py-1.5 h-9 border rounded disabled:opacity-50 disabled:cursor-not-allowed">Prev</button>
        <div>Page {page}</div>
        <button disabled={files.length === 0} onClick={() => setPage(p => p + 1)} className="px-3 py-1.5 h-9 border rounded disabled:opacity-50 disabled:cursor-not-allowed">Next</button>
      </div>

      <PreviewModal
        file={selected}
        onClose={() => setSelected(null)}
        onReingest={scheduleReingest}
        reingestBusy={Boolean(selected && reingestBusyPath === selected.path)}
      />
    </div>
  );
}
