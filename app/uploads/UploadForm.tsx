"use client";
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { fetchWithAuth, getUser } from '@/utils/auth';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/Card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000';
const DEFAULT_BRANCHES = ["AYALA-FRN", "BETA", "B-CPOL", "B-SMS", "BIA", "BMC", "BRLN", "BPAG", "BGRAN", "BTAB", "CAMALIG", "CNTRO", "DAET", "DAR", "EME", "GOA", "IRIGA", "MAGS", "MAS", "OLA", "PACML", "ROB-FRN", "SANPILI", "SIPOCOT", "SMLGZ-FRN", "SMLIP", "SMNAG", "ROXAS"];

export default function UploadForm() {
  const router = useRouter();
  const [branch, setBranch] = useState('');
  const [pos, setPos] = useState('1');
  const [date, setDate] = useState('');
  const [files, setFiles] = useState<FileList | null>(null);
  const [loading, setLoading] = useState(false);
  const [branches, setBranches] = useState<string[]>([]);
  const [message, setMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null);
  const [isManager, setIsManager] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const currentUser = getUser();
        const role = String(currentUser?.role || '').toLowerCase();
        const managerBranchesRaw = currentUser?.managedBranches || currentUser?.managed_branches || currentUser?.branches;
        const managerBranches = Array.isArray(managerBranchesRaw)
          ? managerBranchesRaw.map((value: any) => String(value || '').trim()).filter(Boolean)
          : [];

        if (role === 'manager') {
          setIsManager(true);
          const userId = String(currentUser?.id || currentUser?._id || '').trim();

          let managerScopeFromApi: string[] = [];
          if (userId) {
            const apiBases = Array.from(new Set([
              process.env.NEXT_PUBLIC_API_BASE_URL,
              API_BASE,
              'http://localhost:5000',
              'http://127.0.0.1:5000',
            ].filter((value): value is string => Boolean(String(value || '').trim()))));

            for (const base of apiBases) {
              const response = await fetchWithAuth(`${base}/api/auth/users/${encodeURIComponent(userId)}`, { method: 'GET' });
              if (response.status === 599) continue;
              if (!response.ok) continue;
              const json = await response.json().catch(() => ({}));
              const raw = json?.user?.managedBranches || json?.user?.managed_branches || json?.user?.branches;
              const parsed = Array.isArray(raw)
                ? raw.map((value: any) => String(value || '').trim()).filter(Boolean)
                : (typeof raw === 'string' ? raw.split(',').map((value: string) => String(value || '').trim()).filter(Boolean) : []);
              if (parsed.length > 0) {
                managerScopeFromApi = parsed;
                break;
              }
            }
          }

          const uniqueManagerBranches = Array.from(new Set((managerScopeFromApi.length ? managerScopeFromApi : managerBranches)));
          setBranches(uniqueManagerBranches);
          setBranch(uniqueManagerBranches[0] || '');
          if (!uniqueManagerBranches.length) {
            setMessage({ type: 'error', text: 'No branch scope assigned to your manager account. Contact admin.' });
          }
          return;
        }

        const res = await fetchWithAuth(`${API_BASE}/api/fetch/branches`, { method: 'GET' });
        if (!res.ok) {
          setBranches(DEFAULT_BRANCHES);
          return;
        }
        const data = await res.json().catch(() => null);
        const values = Array.isArray(data) ? data : (Array.isArray(data?.branches) ? data.branches : []);
        const normalized = values.map((v: any) => String(v).trim()).filter(Boolean);
        setBranches(normalized.length ? normalized : DEFAULT_BRANCHES);
      } catch (e) {
        setBranches(DEFAULT_BRANCHES);
      }
    })();
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!files || files.length === 0) {
      setMessage({ type: 'error', text: 'Please select at least one CSV file.' });
      return;
    }
    setLoading(true);
    setMessage(null);
    const form = new FormData();
    form.append('branch', branch);
    form.append('pos', String(pos));
    form.append('date', date);
    Array.from(files).forEach((f) => form.append('files', f));
    if (files.length === 1) form.append('file', files[0]);

    try {
      const res = await fetchWithAuth(`${API_BASE}/api/upload`, { method: 'POST', body: form });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.message || 'Upload failed');

      const firstJobId = json?.jobId || (Array.isArray(json?.jobIds) && json.jobIds.length ? json.jobIds[0] : null);
      if (Array.isArray(json?.jobIds) && json.jobIds.length > 1) {
        setMessage({ type: 'success', text: `Queued ${json.jobIds.length} upload jobs.` });
      }
      if (firstJobId) router.push(`/jobs/${firstJobId}`);
    } catch (err: any) {
      console.error(err);
      setMessage({ type: 'error', text: err?.message || String(err) });
    } finally {
      setLoading(false);
    }
  }

  const fileNames = files ? Array.from(files).map((f) => f.name) : [];

  return (
    <Card className="border-border/80 shadow-sm">
      <CardHeader className="space-y-2">
        <CardTitle className="text-xl">POS Upload Intake</CardTitle>
        <CardDescription>
          Use this for manual CSV intake when files are provided locally instead of remote fetch.
        </CardDescription>
      </CardHeader>

      <CardContent>
        <form onSubmit={submit} className="space-y-5">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="upload-branch">Branch</Label>
              <Select
                value={isManager ? (branch || branches[0] || '') : (branch || 'all-branches')}
                onValueChange={(v) => {
                  if (isManager) return;
                  setBranch(v === 'all-branches' ? '' : v);
                }}
                disabled={isManager}
              >
                <SelectTrigger id="upload-branch" disabled={isManager}>
                  <SelectValue placeholder="Select branch" />
                </SelectTrigger>
                <SelectContent side="bottom" avoidCollisions={false}>
                  {!isManager && <SelectItem value="all-branches">Select branch</SelectItem>}
                  {branches.map((b) => (
                    <SelectItem key={b} value={b}>{b}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {isManager
                  ? `Your branch scope: ${branches.length || 0}`
                  : `${branches.length || DEFAULT_BRANCHES.length} branches available.`}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="upload-pos">POS</Label>
              <Input
                id="upload-pos"
                placeholder="1"
                value={pos}
                onChange={(e) => setPos(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="upload-date">Work Date</Label>
              <Input
                id="upload-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="upload-files">CSV Files</Label>
            <Input
              id="upload-files"
              type="file"
              multiple
              accept=".csv"
              onChange={(e) => setFiles(e.target.files)}
              className="cursor-pointer border-dashed"
            />
            <p className="text-xs text-muted-foreground">Expected: up to 7 POS CSV files per batch.</p>
            {fileNames.length > 0 && (
              <div className="rounded-md border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
                {fileNames.length} file(s) selected: {fileNames.slice(0, 4).join(', ')}{fileNames.length > 4 ? ' ...' : ''}
              </div>
            )}
          </div>

          {message && (
            <div className={`rounded-md border px-3 py-2 text-sm ${message.type === 'error' ? 'border-destructive/30 bg-destructive/10 text-destructive' : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'}`}>
              {message.text}
            </div>
          )}

          <CardFooter className="px-0 pb-0 pt-2">
            <div className="flex flex-wrap gap-2">
              <Button type="submit" disabled={loading}>
                {loading ? 'Uploading…' : 'Upload & Enqueue'}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setFiles(null);
                  setBranch(isManager ? (branches[0] || '') : '');
                  setPos('1');
                  setDate('');
                  setMessage(null);
                }}
              >
                Reset
              </Button>
            </div>
          </CardFooter>
        </form>
      </CardContent>
    </Card>
  );
}
