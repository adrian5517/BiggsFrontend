const BASE_API = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000';

export async function getFileRecords(params?: { branch?: string; pos?: number; limit?: number; page?: number; startDate?: string; endDate?: string }, cookie?: string) {
  const qs = new URLSearchParams();
  if (params?.branch) qs.set('branch', params.branch);
  if (params?.pos != null) qs.set('pos', String(params.pos));
  if (params?.limit != null) qs.set('limit', String(params.limit));
  if (params?.page != null) qs.set('page', String(params.page));
  if (params?.startDate) qs.set('startDate', params.startDate);
  if (params?.endDate) qs.set('endDate', params.endDate);

  const res = await fetch(`${BASE_API}/api/fetch/files?${qs.toString()}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
  });

  if (!res.ok) throw new Error(`Failed to fetch files: ${res.status}`);
  return res.json();
}

export async function getBranches() {
  const res = await fetch(`${BASE_API}/api/fetch/branches`, { credentials: 'include' });
  if (!res.ok) throw new Error(`Failed to fetch branches: ${res.status}`);
  return res.json();
}

export async function getReports(params?: { branch?: string; pos?: number; date?: string; page?: number; limit?: number }) {
  const qs = new URLSearchParams();
  if (params?.branch) qs.set('branch', params.branch);
  if (params?.pos != null) qs.set('pos', String(params.pos));
  if (params?.date) qs.set('date', params.date);
  if (params?.page != null) qs.set('page', String(params.page));
  if (params?.limit != null) qs.set('limit', String(params.limit));

  const res = await fetch(`${BASE_API}/api/fetch/reports?${qs.toString()}`, { credentials: 'include' });
  if (!res.ok) throw new Error(`Failed to fetch reports: ${res.status}`);
  return res.json();
}

export default { getFileRecords };
