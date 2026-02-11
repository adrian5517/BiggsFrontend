'use client'

import React from 'react'

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      {/* Diagonal stripes - top left corner */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        <svg
          className="absolute inset-0 h-full w-full"
          preserveAspectRatio="none"
          viewBox="0 0 1440 900"
        >
          <polygon
            points="0,0 250,0 50,300 0,120"
            fill="hsl(200 100% 41%)"
            opacity="0.92"
          />
          <polygon
            points="100,0 420,0 150,350 0,180"
            fill="hsl(45 100% 62%)"
            opacity="0.92"
          />
          <polygon
            points="280,0 600,0 280,380 60,300"
            fill="hsl(0 70% 50%)"
            opacity="0.92"
          />
        </svg>
      </div>

      {/* Content */}
      <div className="relative z-10">
        {children}
      </div>
    </div>
  )
}
