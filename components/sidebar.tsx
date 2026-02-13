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
  const title = typeof children === 'string' ? children : undefined
  return (
    <Link href={href} title={title} aria-label={title}>
      <motion.div
        whileHover={{ 
          x: collapsed ? 0 : 4,
          scale: 1.02
        }}
        whileTap={{ scale: 0.98 }}
        transition={{ type: 'spring', stiffness: 400, damping: 25 }}
        className={`group relative flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-medium text-slate-700 hover:text-slate-900 hover:bg-gradient-to-r hover:from-blue-50/80 hover:to-indigo-50/60 transition-all duration-200 ${
          collapsed ? 'justify-center' : ''
        }`}
      >
        <motion.span 
          layout 
          className="w-5 h-5 flex items-center justify-center text-slate-500 group-hover:text-blue-600 transition-colors duration-200"
        >
          {icon}
        </motion.span>
        <AnimatePresence mode="wait">
          {!collapsed && (
            <motion.span 
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: 'auto' }}
              exit={{ opacity: 0, width: 0 }}
              transition={{ duration: 0.2, ease: 'easeInOut' }}
              className="grow font-medium"
            >
              {children}
            </motion.span>
          )}
        </AnimatePresence>
        
        {/* Premium hover indicator */}
        <motion.div
          className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-0 bg-gradient-to-b from-blue-500 to-indigo-600 rounded-r-full"
          whileHover={{ height: collapsed ? 20 : 32 }}
          transition={{ duration: 0.2 }}
        />
      </motion.div>
    </Link>
  )
}

export default function Sidebar({ mobileOpen, onClose }: { mobileOpen?: boolean; onClose?: () => void }) {
  const mobile = typeof mobileOpen !== 'undefined'
  const [collapsed, setCollapsed] = useState(false)
  const [logoFailed, setLogoFailed] = useState(false)
  const baseMobileWidth = 320

  return (
    <>
      {/* Enhanced mobile overlay with blur */}
      {mobile && (
        <AnimatePresence>
          {mobileOpen && (
            <motion.div
              key="overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={onClose}
              className="fixed inset-0 z-30 bg-black/20 backdrop-blur-sm md:hidden"
            />
          )}
        </AnimatePresence>
      )}

      <motion.aside
        initial={false}
        animate={mobile ? { x: mobileOpen ? 0 : -baseMobileWidth } : { width: collapsed ? 80 : 320 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className={`fixed inset-y-0 left-0 z-40 md:relative md:static bg-gradient-to-br from-white via-slate-50/50 to-slate-100/30 border-r border-slate-200/80 shadow-2xl shadow-slate-200/50 overflow-hidden backdrop-blur-xl ${
          mobile ? 'w-80' : collapsed ? 'w-20' : 'w-80'
        }`}
        style={{ boxSizing: 'border-box' }}
        aria-hidden={mobile ? !mobileOpen : undefined}
      >
        {/* Premium glass effect overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-white/60 via-transparent to-slate-100/20 pointer-events-none" />
        
        <div className="relative z-10 p-6 pb-20">
          {mobile ? (
            // Mobile header
            <div className="flex items-center justify-between mb-8 md:hidden">
              <div className="flex items-center gap-4">
                {!logoFailed ? (
                  <img 
                    src="/images/logo.png" 
                    alt="BIGGS" 
                    className="h-10 w-auto drop-shadow-sm" 
                    onError={() => setLogoFailed(true)} 
                  />
                ) : (
                  <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-lg shadow-lg">
                    B
                  </div>
                )}
                <div>
                  <div className="text-xl font-bold text-slate-900">BIGGS</div>
                  <div className="text-sm text-slate-500 font-medium">Operations</div>
                </div>
              </div>
              <motion.button 
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={onClose} 
                aria-label="Close menu" 
                className="p-2.5 rounded-xl hover:bg-slate-100 transition-colors"
              >
                <svg className="w-5 h-5 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </motion.button>
            </div>
          ) : (
            // Desktop header
            <div className="mb-8 flex items-center gap-4">
              <motion.div
                whileHover={{ scale: 1.02 }}
                className="flex items-center gap-4 cursor-pointer"
                onClick={() => setCollapsed(s => !s)}
              >
                {!logoFailed ? (
                  <motion.img 
                    src="/images/logo.png" 
                    alt="BIGGS" 
                    className={`drop-shadow-sm transition-all duration-300 ${collapsed ? 'h-10 w-10 object-contain' : 'h-12 w-auto'}`}
                    onError={() => setLogoFailed(true)}
                    animate={{ scale: collapsed ? 0.9 : 1 }}
                  />
                ) : (
                  <motion.div 
                    className="rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold shadow-lg"
                    animate={{ 
                      width: collapsed ? 40 : 48,
                      height: collapsed ? 40 : 48,
                      fontSize: collapsed ? '16px' : '20px'
                    }}
                  >
                    B
                  </motion.div>
                )}
              </motion.div>

              <AnimatePresence mode="wait">
                {!collapsed && (
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Link href="/" className="block">
                      <div className="text-2xl font-bold text-slate-900 leading-tight">BIGGS</div>
                      <div className="text-sm text-slate-500 font-medium -mt-1">Operations</div>
                    </Link>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* Navigation */}
          <nav className="space-y-2">
            <NavItem href="/dashboard" collapsed={collapsed} icon={
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
                <path d="M3 13h8V3H3v10zm0 8h8v-6H3v6zM13 21h8V11h-8v10zM13 3v6h8V3h-8z"/>
              </svg>
            }>
              Dashboard
            </NavItem>

            <NavItem href="/uploads" collapsed={collapsed} icon={
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            }>
              Uploads
            </NavItem>

            <NavItem href="/files" collapsed={collapsed} icon={
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor">
                <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            }>
              Files
            </NavItem>

            <NavItem href="/master" collapsed={collapsed} icon={
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            }>
              Master
            </NavItem>

            <NavItem href="/jobs" collapsed={collapsed} icon={
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor">
                <path d="M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <rect x="8" y="2" width="8" height="4" rx="1" ry="1" strokeWidth="2"/>
              </svg>
            }>
              Jobs
            </NavItem>

            {/* Premium divider */}
            <div className="my-6">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className={`${collapsed ? 'mx-auto w-8' : 'w-full'} h-px bg-gradient-to-r from-transparent via-slate-300 to-transparent`} />
                </div>
              </div>
            </div>

            <NavItem href="/users" collapsed={collapsed} icon={
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor">
                <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <circle cx="12" cy="7" r="4" strokeWidth="2"/>
              </svg>
            }>
              Users
            </NavItem>

            <NavItem href="/settings" collapsed={collapsed} icon={
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor">
                <circle cx="12" cy="12" r="3" strokeWidth="2"/>
                <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z" strokeWidth="2"/>
              </svg>
            }>
              Settings
            </NavItem>
          </nav>
        </div>

        {/* Premium Bottom Toggle Button */}
        {!mobile && (
          <motion.div 
            className="absolute bottom-6 left-1/2 -translate-x-1/2 z-50"
            whileHover={{ scale: 1.05, y: -2 }}
          >
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => setCollapsed(s => !s)}
              aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              className="relative group"
            >
              {/* Glassmorphism background */}
              <div className="absolute inset-0 bg-white/90 backdrop-blur-xl border border-slate-200/60 rounded-2xl shadow-2xl shadow-slate-200/50" />
              
              {/* Gradient border effect */}
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-blue-500/20 via-indigo-500/20 to-purple-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              
              {/* Button content */}
              <div className="relative px-4 py-3 flex items-center justify-center gap-2">
                <motion.div
                  animate={{ rotate: collapsed ? -90 : 90 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                  className="text-slate-600 group-hover:text-blue-600 transition-colors duration-200"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path d="M6 9l6 6 6-6" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </motion.div>
                
                {/* Optional text indicator */}
                <AnimatePresence mode="wait">
                  {!collapsed && (
                    <motion.span
                      initial={{ opacity: 0, width: 0 }}
                      animate={{ opacity: 1, width: 'auto' }}
                      exit={{ opacity: 0, width: 0 }}
                      transition={{ duration: 0.2 }}
                      className="text-xs font-medium text-slate-600 group-hover:text-blue-600 whitespace-nowrap"
                    >
                      Collapse
                    </motion.span>
                  )}
                </AnimatePresence>
              </div>
              
              {/* Hover glow effect */}
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-blue-400/0 via-blue-400/0 to-blue-400/0 group-hover:from-blue-400/10 group-hover:via-blue-400/5 group-hover:to-blue-400/10 transition-all duration-300" />
            </motion.button>
          </motion.div>
        )}

        {/* Enhanced Brand Accent Stripes - moved above button */}
        {!mobile && (
          <div className="absolute bottom-20 left-0 right-0 overflow-hidden">
            <motion.div 
              className={`flex ${collapsed ? 'flex-col items-center' : 'flex-row'} transition-all duration-300`}
              animate={{ gap: collapsed ? 2 : 0 }}
            >
              <motion.div 
                className={`${collapsed ? 'w-12 h-1.5 rounded-full mx-auto' : 'w-full h-2'} bg-gradient-to-r from-red-500 to-red-600 shadow-lg`}
                animate={{ 
                  width: collapsed ? 48 : '100%',
                  height: collapsed ? 6 : 8 
                }}
                transition={{ duration: 0.3 }}
              />
              <motion.div 
                className={`${collapsed ? 'w-12 h-1.5 rounded-full mx-auto' : 'w-full h-2'} bg-gradient-to-r from-yellow-400 to-yellow-500 shadow-lg`}
                animate={{ 
                  width: collapsed ? 48 : '100%',
                  height: collapsed ? 6 : 8 
                }}
                transition={{ duration: 0.3, delay: 0.05 }}
              />
              <motion.div 
                className={`${collapsed ? 'w-12 h-1.5 rounded-full mx-auto' : 'w-full h-2'} bg-gradient-to-r from-blue-500 to-blue-600 shadow-lg`}
                animate={{ 
                  width: collapsed ? 48 : '100%',
                  height: collapsed ? 6 : 8 
                }}
                transition={{ duration: 0.3, delay: 0.1 }}
              />
            </motion.div>
          </div>
        )}
      </motion.aside>
    </>
  )
}

export { NavItem }
