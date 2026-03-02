"use client"

import { useEffect, useState } from 'react'
import Link from 'next/link'
import LoginLayout from '@/components/login-layout'
import { fetchWithAuth } from '@/utils/auth'

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000'

type AdminSettings = {
  dataRetention: {
    retentionDays: number
    cleanupFrequency: 'daily' | 'weekly' | 'monthly' | 'custom'
    intervalHours: number
    autoEnabled: boolean
  }
  fetchCombine: {
    defaultRangeDays: number
    defaultForceRecombine: boolean
    defaultSkipDbInserts: boolean
    listRetries: number
  }
  masterSync: {
    autoSyncAfterCombine: boolean
    batchSize: number
  }
  jobsMonitoring: {
    autoRefreshSeconds: number
    sseReconnect: boolean
    maxRecentJobs: number
    failureAlertThreshold: number
  }
  security: {
    retentionApplyRole: string
    requireDeleteConfirm: boolean
    allowForceRecombine: boolean
  }
  uiPreferences: {
    backupViewMode: 'file' | 'row'
    tableDensity: 'compact' | 'comfortable'
    timezone: string
  }
  notifications: {
    emailEnabled: boolean
    webhookEnabled: boolean
    webhookUrl: string
    notifyOnJobFailure: boolean
    notifyOnRetentionRun: boolean
  }
}

type MlPredictInput = {
  item_code: string
  branch: string
  day_of_week: number
  hour: number
  discount_ratio: number
  is_weekend: number
  daypart_code: number
}

type MlOptimizeInput = {
  item_code: string
  branch: string
  day_of_week: number
  hour: number
  is_weekend: number
  daypart_code: number
  min_discount: number
  max_discount: number
  steps: number
}

type ItemOption = {
  item_code: string
  product_name?: string
}

const defaultSettings: AdminSettings = {
  dataRetention: { retentionDays: 90, cleanupFrequency: 'daily', intervalHours: 24, autoEnabled: true },
  fetchCombine: { defaultRangeDays: 15, defaultForceRecombine: false, defaultSkipDbInserts: false, listRetries: 2 },
  masterSync: { autoSyncAfterCombine: false, batchSize: 1000 },
  jobsMonitoring: { autoRefreshSeconds: 15, sseReconnect: true, maxRecentJobs: 25, failureAlertThreshold: 3 },
  security: { retentionApplyRole: 'admin', requireDeleteConfirm: true, allowForceRecombine: true },
  uiPreferences: { backupViewMode: 'file', tableDensity: 'comfortable', timezone: 'Asia/Manila' },
  notifications: { emailEnabled: false, webhookEnabled: false, webhookUrl: '', notifyOnJobFailure: true, notifyOnRetentionRun: false },
}

function Section({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <section className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
      <h2 className="text-base font-semibold text-slate-900">{title}</h2>
      <p className="text-xs text-slate-500 mt-1 mb-4">{description}</p>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">{children}</div>
    </section>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="text-sm text-slate-700 flex flex-col gap-1">
      <span className="font-medium">{label}</span>
      {children}
    </label>
  )
}

function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`h-10 rounded-lg border border-slate-300 px-3 text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 ${props.className || ''}`} />
}

function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={`h-10 rounded-lg border border-slate-300 px-3 text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 ${props.className || ''}`} />
}

const DAY_OPTIONS = [
  { value: 0, label: 'Monday' },
  { value: 1, label: 'Tuesday' },
  { value: 2, label: 'Wednesday' },
  { value: 3, label: 'Thursday' },
  { value: 4, label: 'Friday' },
  { value: 5, label: 'Saturday' },
  { value: 6, label: 'Sunday' },
]

const DAYPART_OPTIONS = [
  { value: 0, label: 'Night (10PM–5:59AM)' },
  { value: 1, label: 'Morning (6AM–11:59AM)' },
  { value: 2, label: 'Afternoon (12PM–5:59PM)' },
  { value: 3, label: 'Evening (6PM–9:59PM)' },
]

const getDaypartFromHour = (hour: number) => {
  if (hour >= 6 && hour < 12) return 1
  if (hour >= 12 && hour < 18) return 2
  if (hour >= 18 && hour < 22) return 3
  return 0
}

const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n))
const toPct = (ratio: number) => Number((ratio * 100).toFixed(1))
const toRatio = (pct: number) => Number((clamp(pct, 0, 100) / 100).toFixed(4))
const formatChange = (lift: number) => {
  const change = (lift - 1) * 100
  const sign = change >= 0 ? '+' : ''
  return `${sign}${change.toFixed(1)}%`
}
const impactLabel = (lift: number) => {
  if (lift >= 1.05) return 'Strong Positive'
  if (lift >= 1.0) return 'Slight Positive'
  if (lift >= 0.95) return 'Near Neutral'
  return 'Negative Impact'
}
const impactClass = (lift: number) => {
  if (lift >= 1.0) return 'bg-emerald-50 border-emerald-200 text-emerald-800'
  if (lift >= 0.95) return 'bg-amber-50 border-amber-200 text-amber-800'
  return 'bg-rose-50 border-rose-200 text-rose-800'
}
const actionLabel = (lift: number) => {
  if (lift >= 1.02) return 'Safe to Promote'
  if (lift >= 0.98) return 'Use with Caution'
  return 'Avoid for now'
}
const actionClass = (lift: number) => {
  if (lift >= 1.02) return 'bg-emerald-600 text-white'
  if (lift >= 0.98) return 'bg-amber-500 text-white'
  return 'bg-rose-600 text-white'
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<AdminSettings>(defaultSettings)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [statusMsg, setStatusMsg] = useState('')
  const [mlLoading, setMlLoading] = useState(false)
  const [mlStatus, setMlStatus] = useState('')
  const [mlHealth, setMlHealth] = useState<any>(null)
  const [mlModel, setMlModel] = useState<any>(null)
  const [mlPredictResult, setMlPredictResult] = useState<any>(null)
  const [mlOptimizeResult, setMlOptimizeResult] = useState<any>(null)
  const [mlDiagnostics, setMlDiagnostics] = useState<any>(null)
  const [branchOptions, setBranchOptions] = useState<string[]>([])
  const [itemCodeOptions, setItemCodeOptions] = useState<ItemOption[]>([])
  const [predictInput, setPredictInput] = useState<MlPredictInput>({
    item_code: 'BEF1',
    branch: 'AYALA-FRN',
    day_of_week: 0,
    hour: 12,
    discount_ratio: 0.2,
    is_weekend: 0,
    daypart_code: 1,
  })
  const [optimizeInput, setOptimizeInput] = useState<MlOptimizeInput>({
    item_code: 'BEF1',
    branch: 'AYALA-FRN',
    day_of_week: 0,
    hour: 12,
    is_weekend: 0,
    daypart_code: 1,
    min_discount: 0,
    max_discount: 0.5,
    steps: 20,
  })

  useEffect(() => {
    const weekend = predictInput.day_of_week >= 5 ? 1 : 0
    if (predictInput.is_weekend !== weekend) {
      setPredictInput((prev) => ({ ...prev, is_weekend: weekend }))
    }
  }, [predictInput.day_of_week, predictInput.is_weekend])

  useEffect(() => {
    const mappedDaypart = getDaypartFromHour(Number(predictInput.hour || 0))
    if (predictInput.daypart_code !== mappedDaypart) {
      setPredictInput((prev) => ({ ...prev, daypart_code: mappedDaypart }))
    }
  }, [predictInput.hour, predictInput.daypart_code])

  useEffect(() => {
    const weekend = optimizeInput.day_of_week >= 5 ? 1 : 0
    if (optimizeInput.is_weekend !== weekend) {
      setOptimizeInput((prev) => ({ ...prev, is_weekend: weekend }))
    }
  }, [optimizeInput.day_of_week, optimizeInput.is_weekend])

  useEffect(() => {
    const mappedDaypart = getDaypartFromHour(Number(optimizeInput.hour || 0))
    if (optimizeInput.daypart_code !== mappedDaypart) {
      setOptimizeInput((prev) => ({ ...prev, daypart_code: mappedDaypart }))
    }
  }, [optimizeInput.hour, optimizeInput.daypart_code])

  useEffect(() => {
    ;(async () => {
      setLoading(true)
      try {
        const res = await fetchWithAuth(`${API_BASE}/api/admin/settings`)
        const data = await res.json().catch(() => null)
        if (!res.ok) throw new Error(data?.message || 'Failed to load settings')
        if (data?.settings) {
          setSettings((prev) => ({ ...prev, ...data.settings }))
        }
      } catch (err: any) {
        setStatusMsg(err?.message || 'Failed to load settings')
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  useEffect(() => {
    ;(async () => {
      try {
        const res = await fetchWithAuth(`${API_BASE}/api/admin/ml/items`, { method: 'GET' })
        if (!res.ok) return
        const data = await res.json().catch(() => null)
        const fetched: ItemOption[] = Array.isArray(data?.itemOptions)
          ? data.itemOptions
            .map((o: any) => ({
              item_code: String(o?.item_code || '').trim(),
              product_name: String(o?.product_name || '').trim(),
            }))
            .filter((o: ItemOption) => !!o.item_code)
          : (Array.isArray(data?.itemCodes)
            ? data.itemCodes.map((code: any) => ({ item_code: String(code || '').trim(), product_name: '' })).filter((o: ItemOption) => !!o.item_code)
            : [])
        if (!fetched.length) return
        setItemCodeOptions(fetched)

        const fetchedCodes = fetched.map((o) => o.item_code)

        setPredictInput((prev) => {
          if (fetchedCodes.includes(prev.item_code)) return prev
          return { ...prev, item_code: fetched[0].item_code }
        })

        setOptimizeInput((prev) => {
          if (fetchedCodes.includes(prev.item_code)) return prev
          return { ...prev, item_code: fetched[0].item_code }
        })
      } catch {
      }
    })()
  }, [])

  useEffect(() => {
    ;(async () => {
      try {
        const res = await fetchWithAuth(`${API_BASE}/api/fetch/branches`, { method: 'GET' })
        if (!res.ok) return
        const data = await res.json().catch(() => null)
        const fetched = Array.isArray(data)
          ? data.map(String)
          : (Array.isArray(data?.branches) ? data.branches.map(String) : [])
        const list = fetched.filter(Boolean)
        if (!list.length) return
        setBranchOptions(list)

        setPredictInput((prev) => {
          if (list.includes(prev.branch)) return prev
          return { ...prev, branch: list[0] }
        })

        setOptimizeInput((prev) => {
          if (list.includes(prev.branch)) return prev
          return { ...prev, branch: list[0] }
        })
      } catch {
      }
    })()
  }, [])

  const saveSettings = async () => {
    setSaving(true)
    setStatusMsg('')
    try {
      const res = await fetchWithAuth(`${API_BASE}/api/admin/settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings }),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok) throw new Error(data?.message || 'Failed to save settings')
      if (data?.settings) setSettings(data.settings)
      setStatusMsg('✅ Settings saved successfully.')
    } catch (err: any) {
      setStatusMsg(`❌ ${err?.message || 'Failed to save settings'}`)
    } finally {
      setSaving(false)
    }
  }

  useEffect(() => {
    if (settings.dataRetention.cleanupFrequency === 'daily') {
      setSettings((prev) => ({ ...prev, dataRetention: { ...prev.dataRetention, intervalHours: 24 } }))
    } else if (settings.dataRetention.cleanupFrequency === 'weekly') {
      setSettings((prev) => ({ ...prev, dataRetention: { ...prev.dataRetention, intervalHours: 24 * 7 } }))
    } else if (settings.dataRetention.cleanupFrequency === 'monthly') {
      setSettings((prev) => ({ ...prev, dataRetention: { ...prev.dataRetention, intervalHours: 24 * 30 } }))
    }
  }, [settings.dataRetention.cleanupFrequency])

  const checkMlHealth = async () => {
    setMlLoading(true)
    setMlStatus('')
    try {
      const res = await fetchWithAuth(`${API_BASE}/api/admin/ml/health`)
      const data = await res.json().catch(() => null)
      if (!res.ok || !data?.ok) throw new Error(data?.message || 'ML health check failed')
      setMlHealth(data.health || null)
      setMlStatus('✅ ML service is healthy.')
    } catch (err: any) {
      setMlStatus(`❌ ${err?.message || 'ML health check failed'}`)
    } finally {
      setMlLoading(false)
    }
  }

  const loadMlModelInfo = async () => {
    setMlLoading(true)
    setMlStatus('')
    try {
      const res = await fetchWithAuth(`${API_BASE}/api/admin/ml/model-info`)
      const data = await res.json().catch(() => null)
      if (!res.ok || !data?.ok) throw new Error(data?.message || 'Failed to load model info')
      setMlModel(data.model || null)
      setMlStatus('✅ Model info loaded.')
    } catch (err: any) {
      setMlStatus(`❌ ${err?.message || 'Failed to load model info'}`)
    } finally {
      setMlLoading(false)
    }
  }

  const runMlPredict = async () => {
    setMlLoading(true)
    setMlStatus('')
    try {
      const res = await fetchWithAuth(`${API_BASE}/api/admin/ml/predict`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(predictInput),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok || !data?.ok) throw new Error(data?.message || 'Prediction failed')
      setMlPredictResult(data.result || null)
      setMlStatus('✅ Prediction complete.')
    } catch (err: any) {
      setMlStatus(`❌ ${err?.message || 'Prediction failed'}`)
    } finally {
      setMlLoading(false)
    }
  }

  const runMlOptimize = async () => {
    setMlLoading(true)
    setMlStatus('')
    try {
      const res = await fetchWithAuth(`${API_BASE}/api/admin/ml/optimize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(optimizeInput),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok || !data?.ok) throw new Error(data?.message || 'Optimization failed')
      setMlOptimizeResult(data.result || null)
      setMlStatus('✅ Optimization complete.')
    } catch (err: any) {
      setMlStatus(`❌ ${err?.message || 'Optimization failed'}`)
    } finally {
      setMlLoading(false)
    }
  }

  const runMlDiagnostics = async () => {
    setMlLoading(true)
    setMlStatus('')
    try {
      const params = new URLSearchParams({
        item_code: String(predictInput.item_code || ''),
        branch: String(predictInput.branch || ''),
      })
      const res = await fetchWithAuth(`${API_BASE}/api/admin/ml/diagnostics?${params.toString()}`, {
        method: 'GET',
      })
      const data = await res.json().catch(() => null)
      if (!res.ok || !data?.ok) throw new Error(data?.message || 'Diagnostics failed')
      setMlDiagnostics(data)
      setMlStatus('✅ Diagnostics loaded.')
    } catch (err: any) {
      setMlStatus(`❌ ${err?.message || 'Diagnostics failed'}`)
    } finally {
      setMlLoading(false)
    }
  }

  return (
    <LoginLayout>
      <div className="max-w-7xl mx-auto py-8 px-4 space-y-4">
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-700 text-white rounded-xl p-6 shadow-lg">
          <h1 className="text-2xl font-bold">Settings</h1>
          <p className="text-sm text-slate-200 mt-1">Centralized operations, retention, jobs, sync, security, and UI preferences.</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link href="/admin/fetch-logs" className="px-3 py-2 bg-white/15 hover:bg-white/25 rounded-lg text-sm">Fetch Reports</Link>
            <Link href="/jobs" className="px-3 py-2 bg-white/15 hover:bg-white/25 rounded-lg text-sm">Jobs</Link>
            <Link href="/master" className="px-3 py-2 bg-white/15 hover:bg-white/25 rounded-lg text-sm">Master</Link>
            <Link href="/combine" className="px-3 py-2 bg-white/15 hover:bg-white/25 rounded-lg text-sm">Combine</Link>
          </div>
        </div>

        {statusMsg ? <div className="text-sm rounded-lg border border-slate-200 bg-white p-3 text-slate-700">{statusMsg}</div> : null}

        {loading ? (
          <div className="bg-white border border-slate-200 rounded-xl p-6 text-sm text-slate-600">Loading settings...</div>
        ) : (
          <div className="space-y-4">
            <Section title="Data Retention" description="Controls how backups are cleaned and how often retention runs.">
              <Field label="Retention Days">
                <Input type="number" min={1} value={settings.dataRetention.retentionDays} onChange={(e) => setSettings({ ...settings, dataRetention: { ...settings.dataRetention, retentionDays: Number(e.target.value || 1) } })} />
              </Field>
              <Field label="Cleanup Frequency">
                <Select value={settings.dataRetention.cleanupFrequency} onChange={(e) => setSettings({ ...settings, dataRetention: { ...settings.dataRetention, cleanupFrequency: e.target.value as any } })}>
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                  <option value="custom">Custom</option>
                </Select>
              </Field>
              <Field label="Interval Hours">
                <Input type="number" min={1} disabled={settings.dataRetention.cleanupFrequency !== 'custom'} value={settings.dataRetention.intervalHours} onChange={(e) => setSettings({ ...settings, dataRetention: { ...settings.dataRetention, intervalHours: Number(e.target.value || 1) } })} />
              </Field>
              <Field label="Retention Auto Enabled">
                <Select value={settings.dataRetention.autoEnabled ? 'true' : 'false'} onChange={(e) => setSettings({ ...settings, dataRetention: { ...settings.dataRetention, autoEnabled: e.target.value === 'true' } })}>
                  <option value="true">Enabled</option>
                  <option value="false">Disabled</option>
                </Select>
              </Field>
            </Section>

            <Section title="Fetch & Combine Defaults" description="Default behavior for scan, fetch, and combine operations.">
              <Field label="Default Date Range (days)">
                <Input type="number" min={1} value={settings.fetchCombine.defaultRangeDays} onChange={(e) => setSettings({ ...settings, fetchCombine: { ...settings.fetchCombine, defaultRangeDays: Number(e.target.value || 1) } })} />
              </Field>
              <Field label="List Retries">
                <Input type="number" min={1} max={5} value={settings.fetchCombine.listRetries} onChange={(e) => setSettings({ ...settings, fetchCombine: { ...settings.fetchCombine, listRetries: Number(e.target.value || 1) } })} />
              </Field>
              <Field label="Default Force Recombine">
                <Select value={settings.fetchCombine.defaultForceRecombine ? 'true' : 'false'} onChange={(e) => setSettings({ ...settings, fetchCombine: { ...settings.fetchCombine, defaultForceRecombine: e.target.value === 'true' } })}>
                  <option value="false">Off</option>
                  <option value="true">On</option>
                </Select>
              </Field>
              <Field label="Default Skip DB Inserts">
                <Select value={settings.fetchCombine.defaultSkipDbInserts ? 'true' : 'false'} onChange={(e) => setSettings({ ...settings, fetchCombine: { ...settings.fetchCombine, defaultSkipDbInserts: e.target.value === 'true' } })}>
                  <option value="false">Off</option>
                  <option value="true">On</option>
                </Select>
              </Field>
            </Section>

            <Section title="Master Sync" description="Master table synchronization behavior after combine jobs.">
              <Field label="Auto Sync After Combine">
                <Select value={settings.masterSync.autoSyncAfterCombine ? 'true' : 'false'} onChange={(e) => setSettings({ ...settings, masterSync: { ...settings.masterSync, autoSyncAfterCombine: e.target.value === 'true' } })}>
                  <option value="false">Disabled</option>
                  <option value="true">Enabled</option>
                </Select>
              </Field>
              <Field label="Batch Size">
                <Input type="number" min={100} value={settings.masterSync.batchSize} onChange={(e) => setSettings({ ...settings, masterSync: { ...settings.masterSync, batchSize: Number(e.target.value || 1000) } })} />
              </Field>
            </Section>

            <Section title="Jobs & Monitoring" description="SSE behavior, polling cadence, and dashboard job visibility.">
              <Field label="Auto Refresh Seconds">
                <Input type="number" min={5} value={settings.jobsMonitoring.autoRefreshSeconds} onChange={(e) => setSettings({ ...settings, jobsMonitoring: { ...settings.jobsMonitoring, autoRefreshSeconds: Number(e.target.value || 5) } })} />
              </Field>
              <Field label="SSE Reconnect">
                <Select value={settings.jobsMonitoring.sseReconnect ? 'true' : 'false'} onChange={(e) => setSettings({ ...settings, jobsMonitoring: { ...settings.jobsMonitoring, sseReconnect: e.target.value === 'true' } })}>
                  <option value="true">Enabled</option>
                  <option value="false">Disabled</option>
                </Select>
              </Field>
              <Field label="Max Recent Jobs">
                <Input type="number" min={5} value={settings.jobsMonitoring.maxRecentJobs} onChange={(e) => setSettings({ ...settings, jobsMonitoring: { ...settings.jobsMonitoring, maxRecentJobs: Number(e.target.value || 5) } })} />
              </Field>
              <Field label="Failure Alert Threshold">
                <Input type="number" min={1} value={settings.jobsMonitoring.failureAlertThreshold} onChange={(e) => setSettings({ ...settings, jobsMonitoring: { ...settings.jobsMonitoring, failureAlertThreshold: Number(e.target.value || 1) } })} />
              </Field>
            </Section>

            <Section title="Security" description="Guardrails for destructive operations and admin actions.">
              <Field label="Retention Apply Role">
                <Select value={settings.security.retentionApplyRole} onChange={(e) => setSettings({ ...settings, security: { ...settings.security, retentionApplyRole: e.target.value } })}>
                  <option value="admin">Admin</option>
                  <option value="superadmin">Superadmin</option>
                </Select>
              </Field>
              <Field label="Require Delete Confirmation">
                <Select value={settings.security.requireDeleteConfirm ? 'true' : 'false'} onChange={(e) => setSettings({ ...settings, security: { ...settings.security, requireDeleteConfirm: e.target.value === 'true' } })}>
                  <option value="true">Enabled</option>
                  <option value="false">Disabled</option>
                </Select>
              </Field>
              <Field label="Allow Force Recombine">
                <Select value={settings.security.allowForceRecombine ? 'true' : 'false'} onChange={(e) => setSettings({ ...settings, security: { ...settings.security, allowForceRecombine: e.target.value === 'true' } })}>
                  <option value="true">Enabled</option>
                  <option value="false">Disabled</option>
                </Select>
              </Field>
            </Section>

            <Section title="UI Preferences" description="Default visual behavior across operational pages.">
              <Field label="Backup Table View">
                <Select value={settings.uiPreferences.backupViewMode} onChange={(e) => setSettings({ ...settings, uiPreferences: { ...settings.uiPreferences, backupViewMode: e.target.value as any } })}>
                  <option value="file">Grouped by File</option>
                  <option value="row">Raw Row</option>
                </Select>
              </Field>
              <Field label="Table Density">
                <Select value={settings.uiPreferences.tableDensity} onChange={(e) => setSettings({ ...settings, uiPreferences: { ...settings.uiPreferences, tableDensity: e.target.value as any } })}>
                  <option value="comfortable">Comfortable</option>
                  <option value="compact">Compact</option>
                </Select>
              </Field>
              <Field label="Timezone">
                <Input value={settings.uiPreferences.timezone} onChange={(e) => setSettings({ ...settings, uiPreferences: { ...settings.uiPreferences, timezone: e.target.value } })} />
              </Field>
            </Section>

            <Section title="Notifications" description="Operational notifications for failures and retention runs.">
              <Field label="Email Notifications">
                <Select value={settings.notifications.emailEnabled ? 'true' : 'false'} onChange={(e) => setSettings({ ...settings, notifications: { ...settings.notifications, emailEnabled: e.target.value === 'true' } })}>
                  <option value="false">Disabled</option>
                  <option value="true">Enabled</option>
                </Select>
              </Field>
              <Field label="Webhook Notifications">
                <Select value={settings.notifications.webhookEnabled ? 'true' : 'false'} onChange={(e) => setSettings({ ...settings, notifications: { ...settings.notifications, webhookEnabled: e.target.value === 'true' } })}>
                  <option value="false">Disabled</option>
                  <option value="true">Enabled</option>
                </Select>
              </Field>
              <Field label="Webhook URL">
                <Input value={settings.notifications.webhookUrl} onChange={(e) => setSettings({ ...settings, notifications: { ...settings.notifications, webhookUrl: e.target.value } })} placeholder="https://..." />
              </Field>
              <Field label="Notify On Job Failure">
                <Select value={settings.notifications.notifyOnJobFailure ? 'true' : 'false'} onChange={(e) => setSettings({ ...settings, notifications: { ...settings.notifications, notifyOnJobFailure: e.target.value === 'true' } })}>
                  <option value="true">Enabled</option>
                  <option value="false">Disabled</option>
                </Select>
              </Field>
            </Section>

            <Section title="Discount Optimization (ML)" description="One-click access to model health, prediction, and optimal discount suggestion.">
              <div className="lg:col-span-2 rounded-lg border border-sky-200 bg-sky-50 p-3 text-sm text-sky-900">
                <div className="font-semibold">Quick Guide (Non-Technical)</div>
                <ul className="list-disc ml-5 mt-1 space-y-1 text-xs">
                  <li>Set product, branch, day, and discount percent.</li>
                  <li>Click <b>Predict Revenue Lift</b> to estimate if sales go up or down.</li>
                  <li>Click <b>Find Optimal Discount</b> to see the best discount range to try.</li>
                </ul>
              </div>

              <Field label="ML Service Status">
                <div className="h-10 rounded-lg border border-slate-300 px-3 text-sm text-slate-700 bg-slate-50 flex items-center">
                  {mlHealth?.status ? `Status: ${String(mlHealth.status).toUpperCase()}` : 'Not checked yet'}
                </div>
              </Field>
              <Field label="Actions">
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={checkMlHealth} disabled={mlLoading} className="h-10 rounded-lg bg-slate-800 hover:bg-slate-900 text-white text-sm disabled:opacity-60">Check Health</button>
                  <button onClick={loadMlModelInfo} disabled={mlLoading} className="h-10 rounded-lg bg-slate-700 hover:bg-slate-800 text-white text-sm disabled:opacity-60">Load Model Info</button>
                </div>
              </Field>
              <Field label="Explain Why Results Are Negative">
                <button onClick={runMlDiagnostics} disabled={mlLoading} className="h-10 rounded-lg bg-violet-600 hover:bg-violet-700 text-white text-sm disabled:opacity-60 w-full">
                  Run Diagnostics for Selected Item + Branch
                </button>
              </Field>

              <Field label="Predict Item Code">
                <Select value={predictInput.item_code} onChange={(e) => setPredictInput({ ...predictInput, item_code: e.target.value })}>
                  {itemCodeOptions.length ? (
                    itemCodeOptions.map((item) => (
                      <option key={item.item_code} value={item.item_code}>
                        {item.product_name ? `${item.product_name} (${item.item_code})` : item.item_code}
                      </option>
                    ))
                  ) : (
                    <option value={predictInput.item_code}>{predictInput.item_code || 'Select item code'}</option>
                  )}
                </Select>
              </Field>
              <Field label="Predict Branch">
                <Select value={predictInput.branch} onChange={(e) => setPredictInput({ ...predictInput, branch: e.target.value })}>
                  {branchOptions.length ? (
                    branchOptions.map((branch) => <option key={branch} value={branch}>{branch}</option>)
                  ) : (
                    <option value={predictInput.branch}>{predictInput.branch || 'Select branch'}</option>
                  )}
                </Select>
              </Field>
              <Field label="Discount (%)">
                <Input
                  type="number"
                  step="0.1"
                  min={0}
                  max={100}
                  value={toPct(predictInput.discount_ratio)}
                  onChange={(e) => setPredictInput({ ...predictInput, discount_ratio: toRatio(Number(e.target.value || 0)) })}
                />
              </Field>
              <Field label="Hour (0-23)">
                <Input type="number" min={0} max={23} value={predictInput.hour} onChange={(e) => setPredictInput({ ...predictInput, hour: Number(e.target.value || 0) })} />
              </Field>
              <Field label="Day">
                <Select value={String(predictInput.day_of_week)} onChange={(e) => setPredictInput({ ...predictInput, day_of_week: Number(e.target.value) })}>
                  {DAY_OPTIONS.map((d) => (<option key={d.value} value={String(d.value)}>{d.label}</option>))}
                </Select>
              </Field>
              <Field label="Weekend (Auto)">
                <div className="h-10 rounded-lg border border-slate-300 px-3 text-sm text-slate-700 bg-slate-50 flex items-center">
                  {predictInput.is_weekend ? 'Yes' : 'No'}
                </div>
              </Field>
              <Field label="Time of Day (Auto from Hour)">
                <Select value={String(predictInput.daypart_code)} onChange={(e) => setPredictInput({ ...predictInput, daypart_code: Number(e.target.value || 0) })}>
                  {DAYPART_OPTIONS.map((d) => (<option key={d.value} value={String(d.value)}>{d.label}</option>))}
                </Select>
              </Field>
              <Field label="Run Prediction">
                <button onClick={runMlPredict} disabled={mlLoading} className="h-10 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm disabled:opacity-60 w-full">Predict Revenue Lift</button>
              </Field>

              <Field label="Optimize Min Discount">
                <Input type="number" step="0.1" min={0} max={100} value={toPct(optimizeInput.min_discount)} onChange={(e) => setOptimizeInput({ ...optimizeInput, min_discount: toRatio(Number(e.target.value || 0)) })} />
                <span className="text-xs text-slate-500">Lowest promo percent na gusto mong i-consider (hal. 0% kung puwedeng walang discount).</span>
              </Field>
              <Field label="Optimize Max Discount">
                <Input type="number" step="0.1" min={0} max={100} value={toPct(optimizeInput.max_discount)} onChange={(e) => setOptimizeInput({ ...optimizeInput, max_discount: toRatio(Number(e.target.value || 0)) })} />
                <span className="text-xs text-slate-500">Highest promo percent na puwede mong ibigay.</span>
              </Field>
              <Field label="Optimize Day">
                <Select value={String(optimizeInput.day_of_week)} onChange={(e) => setOptimizeInput({ ...optimizeInput, day_of_week: Number(e.target.value) })}>
                  {DAY_OPTIONS.map((d) => (<option key={d.value} value={String(d.value)}>{d.label}</option>))}
                </Select>
              </Field>
              <Field label="Optimize Branch">
                <Select value={optimizeInput.branch} onChange={(e) => setOptimizeInput({ ...optimizeInput, branch: e.target.value })}>
                  {branchOptions.length ? (
                    branchOptions.map((branch) => <option key={branch} value={branch}>{branch}</option>)
                  ) : (
                    <option value={optimizeInput.branch}>{optimizeInput.branch || 'Select branch'}</option>
                  )}
                </Select>
              </Field>
              <Field label="Optimize Item Code">
                <Select value={optimizeInput.item_code} onChange={(e) => setOptimizeInput({ ...optimizeInput, item_code: e.target.value })}>
                  {itemCodeOptions.length ? (
                    itemCodeOptions.map((item) => (
                      <option key={item.item_code} value={item.item_code}>
                        {item.product_name ? `${item.product_name} (${item.item_code})` : item.item_code}
                      </option>
                    ))
                  ) : (
                    <option value={optimizeInput.item_code}>{optimizeInput.item_code || 'Select item code'}</option>
                  )}
                </Select>
              </Field>
              <Field label="Optimize Steps">
                <Input type="number" min={5} max={100} value={optimizeInput.steps} onChange={(e) => setOptimizeInput({ ...optimizeInput, steps: Number(e.target.value || 5) })} />
              </Field>
              <Field label="Optimize Time of Day (Auto from Hour)">
                <Select value={String(optimizeInput.daypart_code)} onChange={(e) => setOptimizeInput({ ...optimizeInput, daypart_code: Number(e.target.value || 0) })}>
                  {DAYPART_OPTIONS.map((d) => (<option key={d.value} value={String(d.value)}>{d.label}</option>))}
                </Select>
              </Field>
              <Field label="Run Optimization">
                <button
                  onClick={() => runMlOptimize()}
                  disabled={mlLoading}
                  className="h-10 rounded-lg bg-green-600 hover:bg-green-700 text-white text-sm disabled:opacity-60 w-full"
                >
                  Find Optimal Discount
                </button>
              </Field>
            </Section>

            {mlStatus ? <div className="text-sm rounded-lg border border-slate-200 bg-white p-3 text-slate-700">{mlStatus}</div> : null}
            {mlModel ? (
              <div className="text-xs rounded-lg border border-slate-200 bg-white p-3 text-slate-700 overflow-auto">
                <div className="font-semibold text-slate-900 mb-1">Model Info</div>
                <pre>{JSON.stringify(mlModel, null, 2)}</pre>
              </div>
            ) : null}
            {mlPredictResult ? (
              <div className="rounded-lg border border-slate-200 bg-white p-4">
                <div className="font-semibold text-slate-900 mb-2">Prediction Summary</div>
                <div className="mb-3">
                  <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${actionClass(Number(mlPredictResult.predicted_revenue_lift || 1))}`}>
                    {actionLabel(Number(mlPredictResult.predicted_revenue_lift || 1))}
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                  <div className="rounded-lg border border-slate-200 p-3 bg-slate-50">
                    <div className="text-slate-500 text-xs">Expected Sales Change</div>
                    <div className="font-semibold text-slate-900 text-lg">{formatChange(Number(mlPredictResult.predicted_revenue_lift || 1))}</div>
                  </div>
                  <div className={`rounded-lg border p-3 ${impactClass(Number(mlPredictResult.predicted_revenue_lift || 1))}`}>
                    <div className="text-xs">Impact Level</div>
                    <div className="font-semibold">{impactLabel(Number(mlPredictResult.predicted_revenue_lift || 1))}</div>
                  </div>
                  <div className="rounded-lg border border-slate-200 p-3 bg-slate-50">
                    <div className="text-slate-500 text-xs">Recommendation</div>
                    <div className="font-semibold text-slate-900">{String(mlPredictResult.recommendation || 'No recommendation')}</div>
                  </div>
                </div>
                <details className="mt-3 text-xs">
                  <summary className="cursor-pointer text-slate-600">Show technical JSON</summary>
                  <pre className="mt-2 rounded border border-slate-200 bg-slate-50 p-2 overflow-auto text-slate-700">{JSON.stringify(mlPredictResult, null, 2)}</pre>
                </details>
              </div>
            ) : null}
            {mlOptimizeResult ? (
              <div className="rounded-lg border border-slate-200 bg-white p-4">
                <div className="font-semibold text-slate-900 mb-2">Optimization Summary</div>
                <div className="mb-3">
                  <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${actionClass(Number(mlOptimizeResult.predicted_revenue_lift || 1))}`}>
                    {actionLabel(Number(mlOptimizeResult.predicted_revenue_lift || 1))}
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                  <div className="rounded-lg border border-slate-200 p-3 bg-slate-50">
                    <div className="text-slate-500 text-xs">Best Discount to Try</div>
                    <div className="font-semibold text-slate-900 text-lg">{String(mlOptimizeResult.optimal_discount_pct || 'N/A')}</div>
                  </div>
                  <div className="rounded-lg border border-slate-200 p-3 bg-slate-50">
                    <div className="text-slate-500 text-xs">Expected Sales Change</div>
                    <div className="font-semibold text-slate-900 text-lg">{formatChange(Number(mlOptimizeResult.predicted_revenue_lift || 1))}</div>
                  </div>
                  <div className={`rounded-lg border p-3 ${impactClass(Number(mlOptimizeResult.predicted_revenue_lift || 1))}`}>
                    <div className="text-xs">Impact Level</div>
                    <div className="font-semibold">{impactLabel(Number(mlOptimizeResult.predicted_revenue_lift || 1))}</div>
                  </div>
                </div>

                {Array.isArray(mlOptimizeResult.all_predictions) && mlOptimizeResult.all_predictions.length > 0 ? (
                  <div className="mt-3">
                    <div className="text-xs font-medium text-slate-700 mb-1">Top 3 Discount Options</div>
                    <div className="rounded border border-slate-200 overflow-hidden">
                      <table className="w-full text-xs">
                        <thead className="bg-slate-50 text-slate-600">
                          <tr>
                            <th className="text-left px-3 py-2">Discount</th>
                            <th className="text-left px-3 py-2">Expected Change</th>
                            <th className="text-left px-3 py-2">Impact</th>
                          </tr>
                        </thead>
                        <tbody>
                          {[...mlOptimizeResult.all_predictions]
                            .sort((a: any, b: any) => Number(b.predicted_revenue_lift || 0) - Number(a.predicted_revenue_lift || 0))
                            .slice(0, 3)
                            .map((p: any, idx: number) => {
                              const lift = Number(p.predicted_revenue_lift || 1)
                              return (
                                <tr key={`${p.discount_ratio}-${idx}`} className="border-t border-slate-100">
                                  <td className="px-3 py-2 text-slate-800">{toPct(Number(p.discount_ratio || 0)).toFixed(1)}%</td>
                                  <td className="px-3 py-2 text-slate-800">{formatChange(lift)}</td>
                                  <td className="px-3 py-2 text-slate-800">{impactLabel(lift)}</td>
                                </tr>
                              )
                            })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : null}

                <details className="mt-3 text-xs">
                  <summary className="cursor-pointer text-slate-600">Show technical JSON</summary>
                  <pre className="mt-2 rounded border border-slate-200 bg-slate-50 p-2 overflow-auto text-slate-700">{JSON.stringify(mlOptimizeResult, null, 2)}</pre>
                </details>
              </div>
            ) : null}

            {mlDiagnostics?.ok ? (
              <div className="rounded-lg border border-slate-200 bg-white p-4">
                <div className="font-semibold text-slate-900 mb-2">Diagnostics Summary</div>
                <div className="text-sm text-slate-700 mb-3">{String(mlDiagnostics?.insight || '')}</div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                  <div className="rounded-lg border border-slate-200 p-3 bg-slate-50">
                    <div className="text-slate-500 text-xs">Historical Rows Found</div>
                    <div className="font-semibold text-slate-900 text-lg">{Number(mlDiagnostics?.historical?.totalRows || 0)}</div>
                  </div>
                  <div className="rounded-lg border border-slate-200 p-3 bg-slate-50">
                    <div className="text-slate-500 text-xs">Discounted History Share</div>
                    <div className="font-semibold text-slate-900 text-lg">{Number(mlDiagnostics?.historical?.discountedSharePct || 0).toFixed(2)}%</div>
                  </div>
                  <div className="rounded-lg border border-slate-200 p-3 bg-slate-50">
                    <div className="text-slate-500 text-xs">Positive Scenarios in Grid</div>
                    <div className="font-semibold text-slate-900 text-lg">{Number(mlDiagnostics?.modelGrid?.positiveRatePct || 0).toFixed(2)}%</div>
                  </div>
                </div>

                {Array.isArray(mlDiagnostics?.modelGrid?.topScenarios) && mlDiagnostics.modelGrid.topScenarios.length > 0 ? (
                  <div className="mt-3">
                    <div className="text-xs font-medium text-slate-700 mb-1">Top Scenarios from Model Grid</div>
                    <div className="rounded border border-slate-200 overflow-hidden">
                      <table className="w-full text-xs">
                        <thead className="bg-slate-50 text-slate-600">
                          <tr>
                            <th className="text-left px-3 py-2">Day</th>
                            <th className="text-left px-3 py-2">Hour</th>
                            <th className="text-left px-3 py-2">Discount</th>
                            <th className="text-left px-3 py-2">Expected Change</th>
                          </tr>
                        </thead>
                        <tbody>
                          {mlDiagnostics.modelGrid.topScenarios.slice(0, 6).map((s: any, idx: number) => (
                            <tr key={`${idx}-${s.dayOfWeek}-${s.hour}-${s.discountRatio}`} className="border-t border-slate-100">
                              <td className="px-3 py-2 text-slate-800">{Number(s.dayOfWeek) >= 5 ? 'Weekend' : 'Weekday'}</td>
                              <td className="px-3 py-2 text-slate-800">{Number(s.hour)}:00</td>
                              <td className="px-3 py-2 text-slate-800">{toPct(Number(s.discountRatio || 0)).toFixed(1)}%</td>
                              <td className="px-3 py-2 text-slate-800">{Number(s.expectedChangePct || 0).toFixed(2)}%</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : null}

                <details className="mt-3 text-xs">
                  <summary className="cursor-pointer text-slate-600">Show diagnostics JSON</summary>
                  <pre className="mt-2 rounded border border-slate-200 bg-slate-50 p-2 overflow-auto text-slate-700">{JSON.stringify(mlDiagnostics, null, 2)}</pre>
                </details>
              </div>
            ) : null}

            <div className="flex justify-end">
              <button onClick={saveSettings} disabled={saving} className="px-5 h-11 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold disabled:opacity-60">
                {saving ? 'Saving...' : 'Save Settings'}
              </button>
            </div>
          </div>
        )}
      </div>
    </LoginLayout>
  )
}
