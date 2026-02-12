'use client'

import React, { useEffect, useState } from 'react'
import Sidebar from './sidebar'
import ProfileMenu from './profile-menu'
import { getAccessToken } from '@/utils/auth'

export default function ClientShell({ children }: { children: React.ReactNode }) {
  const [authed, setAuthed] = useState<boolean>(false)
  const [showSidebar, setShowSidebar] = useState(false)

  useEffect(() => {
    const check = () => setAuthed(!!getAccessToken())
    check()
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'accessToken' || e.key === 'user') check()
    }
    const onAuthToken = () => check()
    const onAuthLogout = () => check()

    window.addEventListener('storage', onStorage)
    window.addEventListener('auth:token', onAuthToken as EventListener)
    window.addEventListener('auth:logout', onAuthLogout as EventListener)

    return () => {
      window.removeEventListener('storage', onStorage)
      window.removeEventListener('auth:token', onAuthToken as EventListener)
      window.removeEventListener('auth:logout', onAuthLogout as EventListener)
    }
  }, [])

    if (!authed) {
    // public view: just render children centered
    return <div className="min-h-screen bg-slate-50 py-12">{children}</div>
  }

  return (
    <div className="min-h-screen flex relative">
      {/* Mobile overlay when sidebar open */}
      {showSidebar && (
        <div className="fixed inset-0 z-30 bg-black/40 md:hidden" onClick={() => setShowSidebar(false)} />
      )}

      <Sidebar mobileOpen={showSidebar ? showSidebar : undefined} onClose={() => setShowSidebar(false)} />

      <div className="flex-1 relative z-10">
        <header className="flex items-center justify-between px-4 md:px-6 py-3 border-b border-slate-200" style={{ background: 'linear-gradient(90deg, #29a8e0 0%, #ecbc32 50%, #bd202e 100%)' }}>
          <div className="flex items-center gap-4">
            <button onClick={() => setShowSidebar(s => !s)} className="p-2 rounded hover:bg-slate-100 dark:hover:bg-slate-700 md:hidden">☰</button>
            <div className="hidden md:block text-lg font-medium">Operations Dashboard</div>
          </div>
          <div className="flex items-center gap-3">
            <a href="/jobs" className="text-sm text-white/95">Jobs</a>
            <ProfileMenu />
          </div>
        </header>

        <main className="p-6">
          <div className="max-w-7xl mx-auto bg-card text-card-foreground rounded-lg shadow-md p-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
