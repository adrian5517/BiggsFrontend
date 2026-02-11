'use client'

import React from 'react'
import Link from 'next/link'
import { DashboardShell } from '@/components/dashboard-shell'
import { DashboardQuickFetch } from '@/components/dashboard-quick-fetch'
import { LiveEventsPanel } from '@/components/live-events-panel'
import { Card, CardContent } from '@/components/ui/card'
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
  {
    href: '/uploads',
    label: 'Upload CSVs',
    description: 'Upload POS files and start a job',
    icon: Upload,
    color: 'bg-[hsl(var(--biggs-blue))]/10 text-[hsl(var(--biggs-blue))]',
    iconBg: 'bg-[hsl(var(--biggs-blue))]',
  },
  {
    href: '/files',
    label: 'Browse Files',
    description: 'View stored uploads and status',
    icon: FolderOpen,
    color: 'bg-[hsl(var(--biggs-gold))]/10 text-[hsl(var(--biggs-gold))]',
    iconBg: 'bg-[hsl(var(--biggs-gold))]',
  },
  {
    href: '/master',
    label: 'Masterfile',
    description: 'Preview and download exports',
    icon: FileSpreadsheet,
    color: 'bg-[hsl(var(--biggs-red))]/10 text-[hsl(var(--biggs-red))]',
    iconBg: 'bg-[hsl(var(--biggs-red))]',
  },
]

const stats = [
  { label: 'Pipeline', value: 'Active', icon: Activity, dotColor: 'bg-green-500' },
  { label: 'Queue', value: 'Ready', icon: Zap, dotColor: 'bg-[hsl(var(--biggs-blue))]' },
  { label: 'Database', value: 'Connected', icon: Database, dotColor: 'bg-[hsl(var(--biggs-gold))]' },
]

export default function DashboardPage() {
  return (
    <DashboardShell title="Dashboard">
      {/* Quick action cards */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {quickActions.map(({ href, label, description, icon: Icon, iconBg }) => (
          <Link key={href} href={href}>
            <Card className="group cursor-pointer transition-shadow hover:shadow-md">
              <CardContent className="flex items-center gap-4 py-4 px-5">
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${iconBg} text-white`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground">{label}</p>
                  <p className="truncate text-xs text-muted-foreground">{description}</p>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Status row */}
      <div className="mb-6 flex flex-wrap items-center gap-4 rounded-lg border border-border bg-card px-5 py-3">
        {stats.map(({ label, value, icon: Icon, dotColor }, i) => (
          <React.Fragment key={label}>
            {i > 0 && <div className="hidden h-5 w-px bg-border sm:block" />}
            <div className="flex items-center gap-2">
              <div className={`h-2 w-2 rounded-full ${dotColor}`} />
              <Icon className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">{label}:</span>
              <span className="text-sm font-medium text-foreground">{value}</span>
            </div>
          </React.Fragment>
        ))}
      </div>

      {/* Main content grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <DashboardQuickFetch />
        <LiveEventsPanel />
      </div>
    </DashboardShell>
  )
}
