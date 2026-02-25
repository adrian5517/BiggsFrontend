'use client'

import React, { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import Sidebar from './sidebar'
import ProfileMenu from './profile-menu'
import { getAccessToken } from '@/utils/auth'

export default function ClientShell({ children }: { children: React.ReactNode }) {
  const [authed, setAuthed] = useState<boolean>(false)
  const [showSidebar, setShowSidebar] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

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

  // listen for external requests to set sidebar collapsed state (e.g., preview modal)
  useEffect(() => {
    const handler = (e: Event) => {
      try {
        const ev = e as CustomEvent;
        if (ev && ev.detail) {
          if (typeof ev.detail.collapsed !== 'undefined') setSidebarCollapsed(!!ev.detail.collapsed)
          // allow callers to request the mobile sidebar be closed (hide overlay)
          if (ev.detail.hideMobile) setShowSidebar(false)
        }
      } catch (err) {
        // ignore
      }
    }
    window.addEventListener('sidebar:set', handler as EventListener)
    return () => window.removeEventListener('sidebar:set', handler as EventListener)
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
    return <div className="min-h-screen bg-slate-50">{children}</div>
  }

  return (
    <div className="min-h-screen flex relative bg-slate-50">
      {showSidebar && (
        <div className="fixed inset-0 z-30 bg-black/40 md:hidden" onClick={() => setShowSidebar(false)} />
      )}

      <Sidebar
        mobileOpen={showSidebar ? showSidebar : undefined}
        onClose={() => setShowSidebar(false)}
        collapsed={sidebarCollapsed}
        onCollapseChange={setSidebarCollapsed}
      />

      <div className={`flex-1 relative z-10 ${sidebarCollapsed ? 'md:ml-20' : 'md:ml-80'}`}>
       <header className="sticky top-0 z-20">
  <div className="relative flex items-center px-4 md:px-8 py-2 md:py-3 border-b border-white/5 shadow-sm bg-gradient-to-r from-sky-50 via-sky-400 to-sky-500 text-[hsl(var(--primary-foreground))]">

    {/* LEFT SIDE */}
    <div className="flex items-center gap-3">
      <div className='grid grid-col-2 absolute inset-0'>
        <div className="bg-gradient-to-r from-red-600 via-red-400 to-red-300 w-20 "></div>
        <div className="bg-gradient-to-r from-yellow-600 via-yellow-400 to-yellow-300 w-20 "></div> 
        <div className="bg-gradient-to-r from-sky-600 via-sky-400 to-sky-300 w-20"></div>
      </div>
      {/* <button
        aria-label="Open menu"
        onClick={() => setShowSidebar(s => !s)}
        className="p-2 rounded hover:bg-white/5 md:hidden"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M4 6h16M4 12h16M4 18h16" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button> */}
    </div>

    {/* CENTER TITLE */}
    <div className="absolute left-1/2 -translate-x-1/2">
      <HeaderTitle />
    </div>

    {/* RIGHT SIDE */}
    <div className="ml-auto flex items-center gap-3">
      <ProfileMenu />
    </div>

  </div>
</header>

        <main className="">
          <div className="">{children}</div>
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
      '/combine': 'Combine & Merge',
    }
    if (map[pathname]) return map[pathname]

    // fallback: use last path segment
    const seg = pathname.split('/').filter(Boolean).pop()
    if (!seg) return 'Dashboard'
    return seg.replace(/[-_]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
  }, [pathname])

  return <div className="hidden md:flex items-center text-sm text-primary-foreground font-bold">{mapTitle}</div>
}
