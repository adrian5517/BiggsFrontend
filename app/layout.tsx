import React from 'react'
import type { Metadata, Viewport } from 'next'
import Link from 'next/link'
// ThemeProvider removed to avoid server/client theme class mismatches
import { Poppins } from 'next/font/google'

import './globals.css'
import ClientShell from '@/components/client-shell'

const poppins = Poppins({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'BIGGS Admin',
  description: 'BIGGS operations dashboard',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${poppins.className} antialiased bg-[hsl(var(--background))] text-[hsl(var(--foreground))]`}>
          <ClientShell>
            {children}
          </ClientShell>
      </body>
    </html>
  )
}
