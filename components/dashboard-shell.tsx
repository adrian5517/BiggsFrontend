'use client'

import React, { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { DashboardNavbar } from '@/components/dashboard-navbar'
import { DashboardDecorations } from '@/components/dashboard-decorations'
import { getAccessToken } from '@/utils/auth'

interface DashboardShellProps {
  children: React.ReactNode
  title: string
}

export function DashboardShell({ children, title }: DashboardShellProps) {
  const router = useRouter()

  useEffect(() => {
    const token = getAccessToken()
    if (!token) router.push('/')
  }, [router])

  return (
    <div className="relative flex min-h-screen flex-col bg-background">
      <DashboardDecorations />
      <DashboardNavbar />

      {/* Page header */}
      <div className="border-b border-border bg-card/50">
        <div className="mx-auto max-w-7xl px-4 py-4 lg:px-6">
          <h1 className="text-xl font-bold text-foreground">{title}</h1>
        </div>
      </div>

      {/* Main content */}
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 lg:px-6">
        {children}
      </main>

      {/* Footer accent */}
      <footer className="mt-auto">
        <div className="flex h-1">
          <div className="flex-1 bg-[hsl(var(--biggs-blue))]" />
          <div className="flex-1 bg-[hsl(var(--biggs-gold))]" />
        </div>
        <div className="border-t border-border bg-card/50 px-4 py-3">
          <p className="text-center text-xs text-muted-foreground">
            BIGGS Data Operations Pipeline
          </p>
        </div>
      </footer>
    </div>
  )
}
