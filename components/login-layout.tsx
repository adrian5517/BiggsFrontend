'use client'

import React from "react"

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-white">
      {/* Diagonal Stripe Background - Top Left */}
      <div className="absolute inset-0 -z-10">
        <svg
          className="absolute inset-0 h-full w-full"
          preserveAspectRatio="none"
          viewBox="0 0 1440 900"
        >
          {/* Blue diagonal stripe */}
          <polygon
            points="0,0 300,0 100,300 0,150"
            fill="#0084D4"
            opacity="0.95"
          />
          {/* Yellow diagonal stripe */}
          <polygon
            points="150,0 500,0 200,350 0,200"
            fill="#F5D547"
            opacity="0.95"
          />
          {/* Red diagonal stripe */}
          <polygon
            points="350,0 700,0 350,350 100,350"
            fill="#C83C3C"
            opacity="0.95"
          />
        </svg>
      </div>

      {/* Dark border frame */}
      <div className="absolute inset-0 -z-10 border-8 border-primary/80" />

      {/* Main content */}
      {children}
    </div>
  )
}
