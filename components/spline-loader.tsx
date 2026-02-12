"use client"

import React, { useEffect, useState } from 'react'

export default function SplineLoader({ scene }: { scene: string }) {
  const [SplineComp, setSplineComp] = useState<any>(null)

  useEffect(() => {
    let mounted = true
    import('@splinetool/react-spline')
      .then((mod) => {
        if (mounted) setSplineComp(() => mod.default)
      })
      .catch(() => {
        if (mounted) setSplineComp(() => null)
      })
    return () => {
      mounted = false
    }
  }, [])

  if (!SplineComp) return null
  return <SplineComp scene={scene} />
}
