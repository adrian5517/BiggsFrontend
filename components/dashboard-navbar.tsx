'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard,
  Upload,
  FolderOpen,
  FileSpreadsheet,
  LogOut,
  Menu,
  X,
  Moon,
  Sun,
  Search,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { logout } from '@/utils/auth'
import { showConfirm, Toast } from '@/utils/swal'
import { useTheme } from 'next-themes'

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/uploads', label: 'Uploads', icon: Upload },
  { href: '/files', label: 'Files', icon: FolderOpen },
  { href: '/master', label: 'Masterfile', icon: FileSpreadsheet },
]

export function DashboardNavbar() {
  const pathname = usePathname()
  const router = useRouter()
  const { theme, setTheme } = useTheme()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const handleLogout = async () => {
    const result = await showConfirm('Sign Out', 'Are you sure you want to sign out?')
    if (result.isConfirmed) {
      await logout()
      Toast.fire({ icon: 'success', title: 'Signed out successfully' })
      router.push('/')
    }
  }

  return (
    <header className="relative z-50">
      {/* Colored stripe bar - matches the reference gradient */}
      <div className="h-1.5 w-full bg-gradient-to-r from-[hsl(var(--biggs-red))] via-[hsl(var(--biggs-gold))] to-[hsl(var(--biggs-red))]" />

      {/* Main navbar */}
      <nav className="border-b border-border bg-card">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 lg:px-6">
          {/* Logo */}
          <Link href="/dashboard" className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-[hsl(var(--biggs-red))] bg-background">
              <span className="text-xs font-black text-foreground">B</span>
            </div>
            <div className="hidden sm:block">
              <span className="text-base font-bold text-foreground">BIGGS</span>
              <span className="ml-1 text-[10px] font-medium text-muted-foreground">Pipeline</span>
            </div>
          </Link>

          {/* Desktop navigation links */}
          <div className="hidden md:flex md:items-center md:gap-1">
            {navItems.map(({ href, label, icon: Icon }) => {
              const isActive = pathname === href || pathname?.startsWith(href + '/')
              return (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    'flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-primary/10 text-primary'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </Link>
              )
            })}
          </div>

          {/* Right side actions */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              aria-label="Toggle theme"
            >
              <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
              <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
            </button>

            <button
              onClick={handleLogout}
              className="hidden md:flex h-9 items-center gap-2 rounded-lg px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
            >
              <LogOut className="h-4 w-4" />
              Sign Out
            </button>

            {/* Mobile hamburger */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground md:hidden"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* Mobile dropdown menu */}
        {mobileMenuOpen && (
          <div className="border-t border-border bg-card px-4 py-3 md:hidden">
            <div className="flex flex-col gap-1">
              {navItems.map(({ href, label, icon: Icon }) => {
                const isActive = pathname === href || pathname?.startsWith(href + '/')
                return (
                  <Link
                    key={href}
                    href={href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={cn(
                      'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-primary/10 text-primary'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {label}
                  </Link>
                )
              })}
              <button
                onClick={handleLogout}
                className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
              >
                <LogOut className="h-4 w-4" />
                Sign Out
              </button>
            </div>
          </div>
        )}
      </nav>

      {/* Bottom accent stripe */}
      <div className="flex h-1">
        <div className="flex-1 bg-[hsl(var(--biggs-red))]" />
        <div className="flex-1 bg-[hsl(var(--biggs-blue))]" />
        <div className="flex-1 bg-[hsl(var(--biggs-gold))]" />
      </div>
    </header>
  )
}
