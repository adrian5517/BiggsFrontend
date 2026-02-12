"use client";
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function UploadForm() {
  const router = useRouter();
  const [branch, setBranch] = useState('');
  const [pos, setPos] = useState('1');
  const [date, setDate] = useState('');
  const [files, setFiles] = useState<FileList | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!files || files.length === 0) return alert('Please select files');
    setLoading(true);
    const form = new FormData();
    form.append('branch', branch);
    form.append('pos', String(pos));
    form.append('date', date);
    Array.from(files).forEach((f) => form.append('files', f));

    try {
      const res = await fetch('/api/uploads', { method: 'POST', body: form });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.message || 'Upload failed');
      // navigate to job detail
      router.push(`/jobs/${json.jobId}`);
    } catch (err: any) {
      console.error(err);
      alert(err.message || String(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="max-w-2xl p-4 bg-white dark:bg-slate-800 rounded-lg shadow">
      <div className="grid gap-3 md:grid-cols-3 mb-3">
        <input className="input" placeholder="Branch" value={branch} onChange={(e) => setBranch(e.target.value)} />
        <input className="input" placeholder="POS" value={pos} onChange={(e) => setPos(e.target.value)} />
        <input className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
      </div>

      <label className="block text-sm mb-2">Select POS CSV files (7 files expected)</label>
      <input type="file" multiple accept=".csv" onChange={(e) => setFiles(e.target.files)} className="mb-4" />

      <div className="flex gap-2">
        <button type="submit" className="px-4 py-2 bg-sky-600 text-white rounded" disabled={loading}>
          {loading ? 'Uploading…' : 'Upload & Enqueue'}
        </button>
        <button type="button" className="px-4 py-2 border rounded" onClick={() => { setFiles(null); setBranch(''); setPos('1'); setDate(''); }}>
          Reset
        </button>
      </div>
    </form>
  );
}
