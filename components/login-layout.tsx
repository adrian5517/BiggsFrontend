'use client'

import React from "react"
export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative">
      <div className="absolute inset-0 -z-10 pointer-events-none">
        <svg className="absolute left-6 top-8 h-44 w-44 opacity-95" viewBox="0 0 200 200" preserveAspectRatio="none">
          <rect x="0" y="0" width="200" height="60" fill="hsl(var(--accent))" />
          <rect x="0" y="60" width="200" height="40" transform="skewX(-18)" fill="hsl(var(--destructive))" />
        </svg>

        <svg className="absolute right-6 top-12 h-32 w-32 opacity-90" viewBox="0 0 100 100" preserveAspectRatio="none">
          <g>
            <rect x="0" y="0" width="22" height="22" fill="hsl(var(--primary))" />
            <rect x="26" y="0" width="22" height="22" fill="hsl(var(--primary))" />
            <rect x="52" y="0" width="22" height="22" fill="hsl(var(--accent))" />
            <rect x="78" y="0" width="22" height="22" fill="hsl(var(--destructive))" />
          </g>
        </svg>

        <svg className="absolute right-6 bottom-6 h-32 w-32 opacity-90" viewBox="0 0 200 200" preserveAspectRatio="none">
          <circle cx="50" cy="150" r="40" fill="hsl(var(--primary))" opacity="0.95" />
          <circle cx="120" cy="160" r="30" fill="hsl(var(--accent))" opacity="0.95" />
          <circle cx="165" cy="140" r="24" fill="hsl(var(--destructive))" opacity="0.95" />
        </svg>
      </div>

      <div className="relative z-10 flex flex-col min-h-screen items-start justify-start ">
        <div className="w-full mx-auto">{children}</div>
      </div>
    </div>
  )
}

