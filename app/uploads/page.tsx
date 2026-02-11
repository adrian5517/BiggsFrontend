'use client'

import React, { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { DashboardShell } from '@/components/dashboard-shell'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { fetchWithAuth } from '@/utils/auth'
import {
  Upload,
  FileUp,
  Loader2,
  CheckCircle2,
  AlertCircle,
  X,
} from 'lucide-react'

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000'

export default function UploadsPage() {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [branch, setBranch] = useState('')
  const [pos, setPos] = useState('')
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [files, setFiles] = useState<File[]>([])
  const [uploading, setUploading] = useState(false)
  const [result, setResult] = useState<{ ok: boolean; jobId?: string; error?: string } | null>(null)

  const handleFilesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles(Array.from(e.target.files))
    }
  }

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index))
  }

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault()
    if (files.length === 0) return
    setUploading(true)
    setResult(null)

    const form = new FormData()
    if (branch) form.append('branch', branch)
    if (pos) form.append('pos', pos)
    form.append('date', date)
    files.forEach(file => form.append('files', file))

    try {
      const res = await fetchWithAuth(`${API_BASE}/api/uploads`, {
        method: 'POST',
        body: form,
      })
      const data = await res.json()
      if (res.ok) {
        setResult({ ok: true, jobId: data.jobId })
        setFiles([])
        if (fileInputRef.current) fileInputRef.current.value = ''
      } else {
        setResult({ ok: false, error: data.message || 'Upload failed' })
      }
    } catch {
      setResult({ ok: false, error: 'Network error' })
    } finally {
      setUploading(false)
    }
  }

  return (
    <DashboardShell title="Upload Files">
      <div className="mx-auto max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5 text-primary" />
              Upload POS CSVs
            </CardTitle>
            <CardDescription>
              Upload POS CSV files with metadata to enqueue a processing job
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleUpload} className="flex flex-col gap-5">
              {/* Metadata fields */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="upload-branch">Branch</Label>
                  <Input
                    id="upload-branch"
                    value={branch}
                    onChange={(e) => setBranch(e.target.value)}
                    placeholder="e.g. BETA"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="upload-pos">POS</Label>
                  <Input
                    id="upload-pos"
                    value={pos}
                    onChange={(e) => setPos(e.target.value)}
                    placeholder="1"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="upload-date">Date</Label>
                  <Input
                    id="upload-date"
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                  />
                </div>
              </div>

              {/* File drop zone */}
              <div className="flex flex-col gap-2">
                <Label>Files</Label>
                <label
                  htmlFor="file-input"
                  className="flex cursor-pointer flex-col items-center gap-2 rounded-lg border-2 border-dashed border-border p-8 text-center transition-colors hover:border-primary hover:bg-muted/50"
                >
                  <FileUp className="h-8 w-8 text-muted-foreground" />
                  <p className="text-sm font-medium text-foreground">Click to select files</p>
                  <p className="text-xs text-muted-foreground">CSV files accepted (up to 7 POS files)</p>
                </label>
                <input
                  ref={fileInputRef}
                  id="file-input"
                  type="file"
                  multiple
                  accept=".csv"
                  onChange={handleFilesChange}
                  className="sr-only"
                />
              </div>

              {/* Selected files */}
              {files.length > 0 && (
                <div className="flex flex-col gap-1.5">
                  <p className="text-xs font-medium text-muted-foreground">{files.length} file(s) selected</p>
                  {files.map((file, i) => (
                    <div key={i} className="flex items-center gap-2 rounded-md border border-border bg-muted/30 px-3 py-1.5">
                      <FileUp className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="flex-1 truncate text-sm text-foreground">{file.name}</span>
                      <span className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(1)}KB</span>
                      <button type="button" onClick={() => removeFile(i)} className="text-muted-foreground hover:text-destructive">
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Result message */}
              {result && (
                <div className={`flex items-center gap-2 rounded-md border px-3 py-2 text-sm ${
                  result.ok
                    ? 'border-green-500/30 bg-green-500/10 text-green-600 dark:text-green-400'
                    : 'border-destructive/30 bg-destructive/10 text-destructive'
                }`}>
                  {result.ok ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : <AlertCircle className="h-4 w-4 shrink-0" />}
                  {result.ok ? (
                    <span>
                      {'Upload successful! Job ID: '}
                      <button
                        type="button"
                        className="font-mono underline"
                        onClick={() => router.push(`/jobs/${result.jobId}`)}
                      >
                        {result.jobId}
                      </button>
                    </span>
                  ) : (
                    result.error
                  )}
                </div>
              )}

              <Button type="submit" disabled={uploading || files.length === 0}>
                {uploading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4" />
                    Upload & Create Job
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </DashboardShell>
  )
}
