import React from 'react'
import type { Metadata, Viewport } from 'next'
import Link from 'next/link'
// ThemeProvider removed to avoid server/client theme class mismatches
import { Kanit } from 'next/font/google'

import './globals.css'
import ClientShell from '@/components/client-shell'

const kanit = Kanit({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'BIGGS Admin',
  description: 'BIGGS operations dashboard',
  icons: {
    icon: '/images/logo.png',
    apple: '/images/logo.png',
    shortcut: '/images/logo.png',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/images/logo.png" />
        <link rel="apple-touch-icon" href="/images/logo.png" />
      </head>
      <body className={`${kanit.className} antialiased bg-[hsl(var(--background))] text-[hsl(var(--foreground))]`}>
          <ClientShell>
            {children}
          </ClientShell>
      </body>
    </html>
  )
}
