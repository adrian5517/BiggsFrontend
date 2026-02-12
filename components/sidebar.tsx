import Link from 'next/link'
import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

type NavItemProps = {
  href: string
  icon: React.ReactNode
  children: React.ReactNode
  collapsed?: boolean
}

const NavItem = ({ href, icon, children, collapsed }: NavItemProps) => {
  return (
    <Link href={href}>
      <motion.div
        whileHover={{ x: 6 }}
        transition={{ type: 'spring', stiffness: 300, damping: 24 }}
        className={`group flex items-center gap-3 px-4 py-3 rounded-md text-sm font-medium text-slate-800 hover:bg-[rgba(41,168,224,0.06)] transition-colors ${
          collapsed ? 'justify-center' : ''
        }`}
      >
        <motion.span layout className="w-5 h-5 flex items-center justify-center text-slate-500 group-hover:text-[#29a8e0]">
          {icon}
        </motion.span>
        {!collapsed && <span className="grow">{children}</span>}
        {!collapsed && <span className="opacity-0 group-hover:opacity-100 text-xs text-slate-400">›</span>}
      </motion.div>
    </Link>
  )
}

export default function Sidebar({ mobileOpen, onClose }: { mobileOpen?: boolean; onClose?: () => void }) {
  const mobile = typeof mobileOpen !== 'undefined'
  const [collapsed, setCollapsed] = useState(false)
  const [logoFailed, setLogoFailed] = useState(false)
  const baseMobileWidth = 288

  return (
    <>
      {mobile && (
        <AnimatePresence>
          {mobileOpen && (
            <motion.div
              key="overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              onClick={onClose}
              className="fixed inset-0 z-30 bg-black/30 md:hidden"
            />
          )}
        </AnimatePresence>
      )}

      <motion.aside
        initial={false}
        animate={mobile ? { x: mobileOpen ? 0 : -baseMobileWidth } : { width: collapsed ? 80 : 288 }}
        transition={{ type: 'spring', stiffness: 300, damping: 32 }}
        className={`fixed inset-y-0 left-0 z-40 md:relative md:static bg-white border-r border-slate-200 p-4 shadow-sm overflow-hidden ${mobile ? 'w-72' : (collapsed ? 'w-20' : 'w-72')}`}
        style={{ boxSizing: 'border-box' }}
        aria-hidden={mobile ? !mobileOpen : undefined}
      >
        {mobile ? (
          <div className="flex items-center justify-between mb-4 md:hidden">
            <div className="flex items-center gap-3">
              {!logoFailed ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src="/images/logo.png" alt="BIGGS" className="h-8 w-auto" onError={() => setLogoFailed(true)} />
              ) : (
                <span className="inline-flex items-center justify-center h-8 w-8 rounded-full bg-[#29a8e0] text-white font-semibold">B</span>
              )}
              <div className="text-base font-semibold text-slate-900">BIGGS</div>
            </div>
            <button onClick={onClose} aria-label="Close menu" className="p-2 rounded hover:bg-slate-100">✕</button>
          </div>
        ) : (
          <div className="mb-6 flex items-center justify-between gap-3 px-3">
            <Link href="/" className="flex items-center gap-3">
              {!logoFailed ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src="/images/logo.png" alt="BIGGS" className="h-10 w-auto" onError={() => setLogoFailed(true)} />
              ) : (
                <svg className="h-10 w-10" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg" role="img" aria-hidden="false">
                  <title>BIGGS</title>
                  <rect width="48" height="48" rx="8" fill="#29a8e0" />
                  <path d="M14 34v-20h6a6 6 0 016 6v8h-6v-8h-6v14h-6z" fill="#fff" />
                </svg>
              )}
              {!collapsed && (
                <div>
                  <div className="text-base font-semibold text-slate-900">BIGGS</div>
                  <div className="text-xs text-slate-500">Operations</div>
                </div>
              )}
            </Link>

            <div className="flex items-center gap-2">
              <motion.button whileTap={{ scale: 0.96 }} onClick={() => setCollapsed(s => !s)} aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'} aria-expanded={!collapsed} className="p-2 rounded hover:bg-slate-100 focus:outline-none">
                <svg className="w-5 h-5 text-slate-600" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M4 6H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  <path d="M4 12H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  <path d="M4 18H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </motion.button>
            </div>
          </div>
        )}

        <nav className="space-y-1">
          <NavItem href="/dashboard" collapsed={collapsed} icon={<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor"><path d="M3 13h8V3H3v10zm0 8h8v-6H3v6zM13 21h8V11h-8v10zM13 3v6h8V3h-8z"/></svg>}>
            Dashboard
          </NavItem>

          <NavItem href="/uploads" collapsed={collapsed} icon={<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor"><path d="M12 2v10m0 0l-3-3m3 3l3-3M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" strokeWidth="0"/></svg>}>
            Uploads
          </NavItem>

          <NavItem href="/files" collapsed={collapsed} icon={<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor"><path d="M3 7h18v13H3V7zm5-4h8l2 2H6l2-2z"/></svg>}>
            Files
          </NavItem>

          <NavItem href="/master" collapsed={collapsed} icon={<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor"><path d="M12 2l3 7h7l-5.5 4 2 7L12 16l-6.5 4 2-7L2 9h7z"/></svg>}>
            Master
          </NavItem>

          <NavItem href="/jobs" collapsed={collapsed} icon={<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor"><path d="M3 6h18v2H3V6zm0 5h12v2H3v-2zm0 5h18v2H3v-2z"/></svg>}>
            Jobs
          </NavItem>

          <div className="mt-6 border-t border-slate-100 pt-4">
            <NavItem href="/users" collapsed={collapsed} icon={<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor"><path d="M12 12a5 5 0 100-10 5 5 0 000 10zm-9 9a9 9 0 1118 0H3z"/></svg>}>
              Users
            </NavItem>

            <NavItem href="/settings" collapsed={collapsed} icon={<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor"><path d="M12 8a4 4 0 100 8 4 4 0 000-8zm9.4 4a7.5 7.5 0 01-.11 1.16l1.83 1.42-2 3.46-2.15-.8a7.6 7.6 0 01-1.1.64L15 21h-6l-.67-2.12a7.6 7.6 0 01-1.1-.64l-2.15.8-2-3.46 1.83-1.42A7.5 7.5 0 012.6 12c0-.4.03-.8.11-1.16L1 9.42l2-3.46 2.15.8c.34-.26.71-.48 1.1-.64L9 3h6l.67 2.12c.39.16.76.38 1.1.64l2.15-.8 2 3.46-1.71 1.42c.08.36.11.75.11 1.16z"/></svg>}>
              Settings
            </NavItem>
          </div>
        </nav>

        {!mobile && (
          <div className="mt-4 px-3">
            <button onClick={() => setCollapsed(s => !s)} className="w-full text-left px-3 py-2 rounded hover:bg-slate-100">
              {collapsed ? 'Expand' : 'Collapse'}
            </button>
          </div>
        )}
      </motion.aside>
    </>
  )
}

export { NavItem }
