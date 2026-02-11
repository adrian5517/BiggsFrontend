'use client'

import React from 'react'
import Link from 'next/link'
import { DashboardShell } from '@/components/dashboard-shell'
import { DashboardQuickFetch } from '@/components/dashboard-quick-fetch'
import { LiveEventsPanel } from '@/components/live-events-panel'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Upload,
  FolderOpen,
  FileSpreadsheet,
  ArrowRight,
  Activity,
  Database,
  Zap,
} from 'lucide-react'

const quickActions = [
  { href: '/uploads', label: 'Upload CSVs', description: 'Upload POS files and enqueue jobs', icon: Upload },
  { href: '/files', label: 'Browse Files', description: 'View stored uploads and status', icon: FolderOpen },
  { href: '/master', label: 'Masterfile', description: 'Preview and download exports', icon: FileSpreadsheet },
]

const stats = [
  { label: 'Pipeline', value: 'Active', icon: Activity, color: 'text-green-500' },
  { label: 'Queue', value: 'Ready', icon: Zap, color: 'text-primary' },
  { label: 'Database', value: 'Connected', icon: Database, color: 'text-primary' },
]

export default function DashboardPage() {
  return (
    <DashboardShell title="Dashboard">
      {/* Status row */}
      <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
        {stats.map(({ label, value, icon: Icon, color }) => (
          <Card key={label}>
            <CardContent className="flex items-center gap-3 py-3 px-4">
              <div className={`flex h-8 w-8 items-center justify-center rounded-md bg-muted ${color}`}>
                <Icon className="h-4 w-4" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className="text-sm font-medium text-foreground">{value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Main content */}
        <div className="flex flex-col gap-6 lg:col-span-2">
          <DashboardQuickFetch />
          <LiveEventsPanel />
        </div>

        {/* Sidebar quick actions */}
        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              {quickActions.map(({ href, label, description, icon: Icon }) => (
                <Link key={href} href={href}>
                  <div className="group flex items-center gap-3 rounded-lg border border-border p-3 transition-colors hover:bg-muted">
                    <div className="flex h-9 w-9 items-center justify-center rounded-md bg-muted text-muted-foreground group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground">{label}</p>
                      <p className="truncate text-xs text-muted-foreground">{description}</p>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                  </div>
                </Link>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Keyboard Shortcuts</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Start Fetch</span>
                  <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">Ctrl+Enter</kbd>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Upload Files</span>
                  <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">Ctrl+U</kbd>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">View Master</span>
                  <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">Ctrl+M</kbd>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardShell>
  )
}
