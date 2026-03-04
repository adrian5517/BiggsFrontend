'use client'

import React, { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import Sidebar from './sidebar'
import ProfileMenu from './profile-menu'
import { getAccessToken } from '@/utils/auth'
import { Toaster } from '@/components/ui/sonner'

export default function ClientShell({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname() || '/'
  const [authed, setAuthed] = useState<boolean>(false)
  const [authChecked, setAuthChecked] = useState<boolean>(false)
  const [showSidebar, setShowSidebar] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [isMobileViewport, setIsMobileViewport] = useState(false)

  const isPublicRoute = pathname === '/login'

  useEffect(() => {
    const check = () => {
      setAuthed(!!getAccessToken())
      setAuthChecked(true)
    }
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

  useEffect(() => {
    if (typeof window === 'undefined') return
    const media = window.matchMedia('(max-width: 767px)')
    const sync = () => setIsMobileViewport(media.matches)
    sync()
    media.addEventListener('change', sync)
    return () => media.removeEventListener('change', sync)
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      const saved = window.localStorage.getItem('sidebar:collapsed')
      if (saved === '1') setSidebarCollapsed(true)
      if (saved === '0') setSidebarCollapsed(false)
    } catch {
      // ignore storage read errors
    }
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      window.localStorage.setItem('sidebar:collapsed', sidebarCollapsed ? '1' : '0')
    } catch {
      // ignore storage write errors
    }
  }, [sidebarCollapsed])

  useEffect(() => {
    if (!isMobileViewport) setShowSidebar(false)
  }, [isMobileViewport])

  useEffect(() => {
    if (!authChecked) return

    if (!authed && !isPublicRoute) {
      router.replace('/login')
      return
    }

    if (authed && isPublicRoute) {
      router.replace('/dashboard')
    }
  }, [authChecked, authed, isPublicRoute, router])

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

  if (!authChecked) {
    return null
  }

  if (!authed) {
    if (!isPublicRoute) return null
    return (
      <div className="min-h-screen bg-slate-50">
        {children}
        <Toaster position="top-center" offset={{ top: 12, left: '50%' }} />
      </div>
    )
  }

  const toasterLeftOffset = isMobileViewport
    ? 'calc(50vw - 175px)'
    : sidebarCollapsed
      ? 'calc((100vw + 80px) / 2 - 175px)'
      : 'calc((100vw + 320px) / 2 - 175px)'

  return (
    <div className="min-h-screen flex relative bg-slate-50">
      <Toaster position="top-left" offset={{ top: 12, left: toasterLeftOffset }} />
      {showSidebar && (
        <div className="fixed inset-0 z-30 bg-black/40 md:hidden" onClick={() => setShowSidebar(false)} />
      )}

      <Sidebar
        mobile={isMobileViewport}
        mobileOpen={showSidebar}
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
      <button
        aria-label={isMobileViewport ? (showSidebar ? 'Close menu' : 'Open menu') : (sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar')}
        onClick={() => {
          if (isMobileViewport) {
            setShowSidebar((s) => !s)
            return
          }
          setSidebarCollapsed((s) => !s)
        }}
        className="relative z-10 p-2.5 rounded-lg border border-white/30 bg-white/20 hover:bg-white/30 text-slate-900 transition-colors"
      >
        {isMobileViewport ? (
          <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M4 6h16M4 12h16M4 18h16" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" className={`w-5 h-5 transition-transform ${sidebarCollapsed ? '' : 'rotate-180'}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        )}
      </button>
    </div>

    {/* CENTER TITLE */}
    <div className="flex-1 flex justify-center px-2">
      <HeaderTitle />
    </div>

    {/* RIGHT SIDE */}
    <div className="flex items-center gap-3">
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

  return (
    <div className="flex flex-col items-center justify-center min-w-0">
      
      <div className="text-[11px] md:text-xs lg:text-sm font-semibold text-primary-foreground/95 whitespace-nowrap truncate max-w-[44vw] md:max-w-[38vw]">
        {mapTitle}
      </div>
    </div>
  )
}
