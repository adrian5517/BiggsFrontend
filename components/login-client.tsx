"use client"

import React, { useEffect, useState } from 'react'
import SplineLoader from '@/components/spline-loader'
import { useRouter } from 'next/navigation'
import { login } from '@/utils/auth'
import LoginLayout from '@/components/login-layout'

export default function LoginClient() {
  const router = useRouter()
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault()
    setError(null)
    if (!identifier || identifier.trim().length === 0) {
      setError('Please enter your email or username')
      return
    }
    if (!password || password.length < 4) {
      setError('Password must be at least 4 characters')
      return
    }
    setLoading(true)
    try {
      const res = await login(identifier, password)
      if (!res.ok) {
        setError(res.data?.message || `Login failed (${res.status})`)
        setLoading(false)
        return
      }
      try { if (res.data && res.data.user) localStorage.setItem('user', JSON.stringify(res.data.user)) } catch (e) {}
      router.push('/dashboard')
    } catch (err) {
      setError('Network error')
      setLoading(false)
    }
  }

  const [mounted, setMounted] = useState(false)
  const [splineFailed, setSplineFailed] = useState(false)

  useEffect(() => {
    setMounted(true)
    const onError = (ev: ErrorEvent) => {
      try {
        const msg = String(ev.message || ev.error?.message || '')
        if (msg.includes('Failed to fetch') || msg.includes('@splinetool') || msg.includes('Splinetool')) {
          setSplineFailed(true)
        }
      } catch (e) {}
    }
    window.addEventListener('error', onError)
    return () => window.removeEventListener('error', onError)
  }, [])

  return (
    <LoginLayout>
      <section className="relative bg-white">
        <div className="pointer-events-none absolute inset-0 -z-10">
          <svg className="w-full h-full" preserveAspectRatio="xMidYMid slice" viewBox="0 0 800 600" xmlns="http://www.w3.org/2000/svg" aria-hidden>
            <defs>
              <linearGradient id="g1" x1="0" x2="1">
                <stop offset="0%" stopColor="#29a8e0" stopOpacity="0.08" />
                <stop offset="50%" stopColor="#ecbc32" stopOpacity="0.06" />
                <stop offset="100%" stopColor="#bd202e" stopOpacity="0.08" />
              </linearGradient>
            </defs>
            <rect width="800" height="600" fill="url(#g1)" />
            <circle cx="120" cy="140" r="90" fill="#29a8e0" fillOpacity="0.08" />
            <circle cx="700" cy="80" r="160" fill="#ecbc32" fillOpacity="0.06" />
            <circle cx="650" cy="420" r="120" fill="#bd202e" fillOpacity="0.05" />
          </svg>
          {mounted && !splineFailed && (
            <div className="absolute inset-0">
              <SplineLoader scene="https://prod.spline.design/kymVcwu2ztxC7hDA/scene.splinecode" />
            </div>
          )}
        </div>

        <div className="flex flex-col items-center justify-center px-6 py-8 mx-auto md:h-screen lg:py-0">
          <div className="flex items-center justify-center mb-6">
            <img className="w-20 h-auto" src="/images/logo.png" alt="BIGGS logo" />
          </div>

          <div className="w-full bg-card rounded-lg shadow sm:max-w-md xl:p-0">
            <div className="p-6 space-y-4 sm:p-8">
              <h1 className="text-2xl font-bold leading-tight tracking-tight text-card-foreground">Sign in to your account</h1>

              {error && <div className="text-sm text-destructive-foreground">{error}</div>}

              <form className="space-y-4" onSubmit={handleSubmit}>
                <div>
                  <label htmlFor="email" className="block mb-2 text-sm font-medium text-card-foreground">Your email</label>
                  <input id="email" name="email" type="email" value={identifier} onChange={(e) => setIdentifier(e.target.value)} placeholder="name@company.com" required className="bg-[hsl(var(--background))] border border-[hsl(var(--border))] text-card-foreground rounded-lg focus:ring-2 focus:ring-[hsl(var(--primary))] focus:border-[hsl(var(--primary))] block w-full p-3" />
                </div>

                <div>
                  <label htmlFor="password" className="block mb-2 text-sm font-medium text-card-foreground">Password</label>
                  <div className="relative">
                    <input id="password" name="password" type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required className="bg-[hsl(var(--background))] border border-[hsl(var(--border))] text-card-foreground rounded-lg focus:ring-2 focus:ring-[hsl(var(--primary))] focus:border-[hsl(var(--primary))] block w-full p-3 pr-12" />
                    <button type="button" onClick={() => setShowPassword(s => !s)} className="absolute right-2 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                      {showPassword ? 'Hide' : 'Show'}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-start">
                    <div className="flex items-center h-5">
                      <input id="remember" aria-describedby="remember" type="checkbox" checked={false} onChange={() => {}} className="w-4 h-4 border border-[hsl(var(--border))] rounded bg-[hsl(var(--background))] focus:ring-3 focus:ring-[hsl(var(--primary))]" />
                    </div>
                    <div className="ml-3 text-sm">
                      <label htmlFor="remember" className="text-muted-foreground">Remember me</label>
                    </div>
                  </div>

                  <a href="#" className="text-sm font-medium text-[hsl(var(--primary))] hover:underline">Forgot password?</a>
                </div>

                <button type="submit" className="w-full text-black bg-[hsl(var(--accent))] hover:brightness-95 font-medium rounded-lg text-sm px-5 py-3 text-center" disabled={loading}>
                  {loading ? 'Signing in...' : 'Sign in'}
                </button>

                <p className="text-sm font-light text-muted-foreground">Don’t have an account yet? <a href="#" className="font-medium text-[hsl(var(--primary))] hover:underline">Sign up</a></p>
              </form>
            </div>
          </div>
        </div>
      </section>
    </LoginLayout>
  )
}
