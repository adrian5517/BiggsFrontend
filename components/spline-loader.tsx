"use client"

import React, { useEffect, useState } from 'react'

export default function SplineLoader({ scene }: { scene: string }) {
  const [SplineComp, setSplineComp] = useState<any>(null)
  const [status, setStatus] = useState<'loading' | 'ready' | 'failed'>('loading')

  useEffect(() => {
    let mounted = true
    import('@splinetool/react-spline')
      .then((mod) => {
        if (mounted) {
          setSplineComp(() => mod.default)
          setStatus('ready')
        }
      })
      .catch(() => {
        if (mounted) {
          setSplineComp(() => null)
          setStatus('failed')
        }
      })
    return () => {
      mounted = false
    }
  }, [])

  // While the Spline runtime is loading (or failed), render a decorative gradient
  // so there's always visible background behind the login card. Also show a
  // small debug badge indicating the loader status.
  const fallback = (
    <div className="absolute inset-0 pointer-events-none -z-10">
      <div className="w-full h-full" style={{
        background: 'radial-gradient(circle at 10% 20%, rgba(41,168,224,0.08), transparent 8%), radial-gradient(circle at 90% 10%, rgba(236,188,50,0.06), transparent 20%), radial-gradient(circle at 80% 70%, rgba(189,32,46,0.06), transparent 25%)'
      }} />
      <div className="absolute top-4 right-4 pointer-events-auto z-50">
        <span className={`px-2 py-1 text-xs font-medium rounded ${status === 'loading' ? 'bg-yellow-100 text-yellow-800' : status === 'ready' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
          Spline: {status}
        </span>
      </div>
    </div>
  )

  if (!SplineComp) return fallback

  return (
    <div className="absolute inset-0 pointer-events-none -z-10">
      <SplineComp scene={scene} />
      <div className="absolute top-4 right-4 pointer-events-auto z-50">
        <span className={`px-2 py-1 text-xs font-medium rounded ${status === 'loading' ? 'bg-yellow-100 text-yellow-800' : status === 'ready' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
          Spline: {status}
        </span>
      </div>
    </div>
  )
}
