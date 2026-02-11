'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { DashboardShell } from '@/components/dashboard-shell'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { FolderOpen, Search, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react'
import { fetchWithAuth } from '@/utils/auth'

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000'

type FileRecord = {
  id: string
  branch: string
  pos: string | number
  date: string
  filename: string
  status: string
  createdAt: string
  jobId?: string
}

export default function FilesPage() {
  const [files, setFiles] = useState<FileRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [branch, setBranch] = useState('')
  const [pos, setPos] = useState('')
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)
  const limit = 20

  const fetchFiles = useCallback(async () => {
    setLoading(true)
    const qs = new URLSearchParams()
    if (branch) qs.set('branch', branch)
    if (pos) qs.set('pos', pos)
    qs.set('page', String(page))
    qs.set('limit', String(limit))

    try {
      const res = await fetchWithAuth(`${API_BASE}/api/fetch/files?${qs.toString()}`)
      if (res.ok) {
        const data = await res.json()
        const records = Array.isArray(data) ? data : data.files || data.records || []
        setFiles(records)
        setHasMore(records.length === limit)
      }
    } catch {
      // network error
    } finally {
      setLoading(false)
    }
  }, [branch, pos, page])

  useEffect(() => {
    fetchFiles()
  }, [fetchFiles])

  const statusVariant = (status: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (status?.toLowerCase()) {
      case 'completed':
      case 'done':
        return 'default'
      case 'processing':
      case 'running':
        return 'secondary'
      case 'error':
      case 'failed':
        return 'destructive'
      default:
        return 'outline'
    }
  }

  return (
    <DashboardShell title="Files">
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2">
            <FolderOpen className="h-5 w-5 text-primary" />
            Uploaded Files
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="mb-4 flex flex-wrap items-end gap-3">
            <div className="flex flex-col gap-1">
              <Label className="text-xs text-muted-foreground">Branch</Label>
              <Input
                value={branch}
                onChange={(e) => { setBranch(e.target.value); setPage(1) }}
                placeholder="Filter by branch"
                className="h-8 w-40"
              />
            </div>
            <div className="flex flex-col gap-1">
              <Label className="text-xs text-muted-foreground">POS</Label>
              <Input
                value={pos}
                onChange={(e) => { setPos(e.target.value); setPage(1) }}
                placeholder="POS #"
                className="h-8 w-24"
              />
            </div>
            <Button variant="outline" size="sm" onClick={fetchFiles} className="h-8">
              <Search className="h-3.5 w-3.5" />
              Search
            </Button>
          </div>

          {/* Table */}
          <div className="rounded-md border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Filename</TableHead>
                  <TableHead>Branch</TableHead>
                  <TableHead>POS</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center">
                      <Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" />
                    </TableCell>
                  </TableRow>
                ) : files.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center text-sm text-muted-foreground">
                      No files found
                    </TableCell>
                  </TableRow>
                ) : (
                  files.map((file) => (
                    <TableRow key={file.id}>
                      <TableCell className="font-mono text-xs">{file.filename || '-'}</TableCell>
                      <TableCell className="text-sm">{file.branch || '-'}</TableCell>
                      <TableCell className="text-sm">{file.pos ?? '-'}</TableCell>
                      <TableCell className="text-sm">{file.date || '-'}</TableCell>
                      <TableCell>
                        <Badge variant={statusVariant(file.status)} className="text-[10px]">
                          {file.status || 'unknown'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {file.createdAt ? new Date(file.createdAt).toLocaleDateString() : '-'}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          <div className="mt-3 flex items-center justify-between">
            <p className="text-xs text-muted-foreground">Page {page}</p>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage(p => Math.max(1, p - 1))}
                className="h-7"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={!hasMore}
                onClick={() => setPage(p => p + 1)}
                className="h-7"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </DashboardShell>
  )
}
