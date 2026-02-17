'use client'

import React, { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
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

  // Disable Three.js shader error checking when Three is available (silence warnings)
  useEffect(() => {
    const disableOnce = () => {
      try {
        // @ts-ignore window global
        const THREE = (window as any).THREE
        if (THREE && THREE.WebGLRenderer && THREE.WebGLRenderer.prototype) {
          THREE.WebGLRenderer.prototype.debug = THREE.WebGLRenderer.prototype.debug || {}
          THREE.WebGLRenderer.prototype.debug.checkShaderErrors = false
          return true
        }
      } catch (e) {
        // ignore
      }
      return false
    }

    if (!disableOnce()) {
      const id = setInterval(() => {
        if (disableOnce()) clearInterval(id)
      }, 500)
      return () => clearInterval(id)
    }
  }, [])

  // Suppress noisy WebGL shader warnings (from Spline/Three) shown in console
  useEffect(() => {
    try {
      const origWarn = console.warn.bind(console)
      console.warn = (...args: any[]) => {
        try {
          const msg = args.map(a => (typeof a === 'string' ? a : JSON.stringify(a))).join(' ')
          if (msg.includes('THREE.WebGLProgram: Program Info Log') || msg.includes('loop only executes for 1 iteration')) {
            return
          }
        } catch (e) {
          // fallthrough to original warn
        }
        return origWarn(...args)
      }
      return () => { console.warn = origWarn }
    } catch (e) {
      // ignore
    }
  }, [])

    if (!authed) {
    // public view: just render children centered
    return <div className="min-h-screen bg-slate-50 py-12">{children}</div>
  }

  return (
    <div className="min-h-screen flex relative bg-slate-50">
      {showSidebar && (
        <div className="fixed inset-0 z-30 bg-black/40 md:hidden" onClick={() => setShowSidebar(false)} />
      )}

      <Sidebar mobileOpen={showSidebar ? showSidebar : undefined} onClose={() => setShowSidebar(false)} />

      <div className="flex-1 relative z-10 md:ml-80">
        <header className="sticky top-0 z-20">
          <div className="flex items-center justify-between px-4 md:px-8 py-2 md:py-3 border-b border-white/5 shadow-sm bg-[hsl(var(--sidebar-background))] text-[hsl(var(--sidebar-foreground))]">
            <div className="flex items-center gap-3">
              <button aria-label="Open menu" onClick={() => setShowSidebar(s => !s)} className="p-2 rounded hover:bg-white/5 md:hidden">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 6h16M4 12h16M4 18h16" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </button>
              <HeaderTitle />
            </div>

            <div className="flex items-center gap-3">
              <a href="/jobs" className="flex items-center gap-2 px-3 py-1 rounded-md hover:bg-white/5 transition">Jobs</a>
              <a href="/admin/fetch-logs" className="flex items-center gap-2 px-3 py-1 rounded-md hover:bg-white/5 transition">Fetch Logs</a>
              <a href="/upload" className="hidden md:inline-flex items-center gap-2 px-3 py-1 rounded-md bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] hover:opacity-95 transition">Upload</a>
              <ProfileMenu />
            </div>
          </div>
        </header>

        <main className="p-6 md:p-8">
          <div className="max-w-6xl mx-auto">{children}</div>
        </main>
      </div>
    </div>
  )
}

function HeaderTitle() {
  const pathname = usePathname() || '/'

  const mapTitle = React.useMemo(() => {
    const map: Record<string, string> = {
      '/': 'Dashboard',
      '/dashboard': 'Operations Dashboard',
      '/jobs': 'Jobs',
      '/upload': 'Upload',
      '/reports': 'Reports',
      '/settings': 'Settings',
    }
    if (map[pathname]) return map[pathname]

    // fallback: use last path segment
    const seg = pathname.split('/').filter(Boolean).pop()
    if (!seg) return 'Dashboard'
    return seg.replace(/[-_]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
  }, [pathname])

  return <div className="hidden md:flex items-center text-sm text-muted-foreground font-medium">{mapTitle}</div>
}
