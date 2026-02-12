'use client'

import React from "react"
export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-white">
      <div className="absolute inset-0 -z-10">
        <svg className="absolute left-0 top-0 h-80 w-80" viewBox="0 0 200 200" preserveAspectRatio="none">
          <rect x="0" y="0" width="200" height="60" fill="hsl(var(--accent))" />
          <rect x="0" y="60" width="200" height="40" transform="skewX(-18)" fill="hsl(var(--destructive))" />
        </svg>

        <svg className="absolute right-0 top-12 h-48 w-48" viewBox="0 0 100 100" preserveAspectRatio="none">
          <g>
            <rect x="0" y="0" width="22" height="22" fill="hsl(var(--primary))" />
            <rect x="26" y="0" width="22" height="22" fill="hsl(var(--primary))" />
            <rect x="52" y="0" width="22" height="22" fill="hsl(var(--accent))" />
            <rect x="78" y="0" width="22" height="22" fill="hsl(var(--destructive))" />
          </g>
        </svg>

        <svg className="absolute right-0 bottom-0 h-48 w-48" viewBox="0 0 200 200" preserveAspectRatio="none">
          <circle cx="50" cy="150" r="40" fill="hsl(var(--primary))" opacity="0.95" />
          <circle cx="120" cy="160" r="30" fill="hsl(var(--accent))" opacity="0.95" />
          <circle cx="165" cy="140" r="24" fill="hsl(var(--destructive))" opacity="0.95" />
        </svg>
      </div>

      <div className="relative z-10 flex min-h-screen items-center justify-center px-6 py-12">
        <div className="w-full max-w-3xl">{children}</div>
      </div>
    </div>
  )
}

