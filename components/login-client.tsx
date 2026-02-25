"use client"

import React, { useEffect, useState } from 'react'
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
      // handle common HTTP statuses with clearer messages
      if (!res.ok) {
        const serverMsg = res.data?.message || ''
        let friendly = serverMsg || `Login failed (${res.status})`
        if (res.status === 400) friendly = serverMsg || 'Invalid request — check your input.'
        else if (res.status === 401) friendly = serverMsg || 'Invalid credentials. Please try again.'
        else if (res.status === 403) friendly = serverMsg || 'Access denied. Please contact support.'
        else if (res.status === 429) friendly = serverMsg || 'Too many attempts. Try again later.'
        else if (res.status >= 500) friendly = serverMsg || 'Server error. Try again later.'
        setError(friendly)
        setLoading(false)
        return
      }

      try {
        if (res.data && res.data.user) localStorage.setItem('user', JSON.stringify(res.data.user))
      } catch (e) {
        // ignore storage errors but surface a small message if needed
        console.warn('Failed to persist user to localStorage', e)
      }

      router.push('/dashboard')
    } catch (err: any) {
      // network or unexpected errors
      const msg = err?.message || String(err) || 'Network error'
      setError(msg.includes('NetworkError') || msg.includes('Failed to fetch') ? 'Network error — check your connection' : msg)
      setLoading(false)
    } finally {
      // ensure loading is cleared in all paths once navigation hasn't happened
      setLoading(false)
    }
  }


  return (
    <LoginLayout>
      <section
        className="h-screen relative overflow-hidden bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: "url('/images/Biggs.svg')" }}
      >
        {/* <div id='stripes' className='absolute top-[-20px] left-[-90px] h-full w-[17rem] md:w-[20rem] flex rotate-90 pointer-events-none'>
          <div className='w-20 md:w-28 h-auto bg-red-500 rounded-xl'></div>
          <div className='w-20 md:w-28 h-auto bg-yellow-500 rounded-xl'></div>
          <div className='w-20 md:w-28 h-auto bg-sky-500 rounded-xl'></div>
        </div> */}
        <div className="pointer-events-none absolute inset-0 -z-20 bg-black/15" />

        <div className="flex flex-col items-center justify-center px-5 py-8 mx-auto md:h-screen lg:py-0">
          

          <div className="w-full bg-white/60 backdrop-blur-sm rounded-lg shadow sm:max-w-md xl:p-0 border border-black/10">
          <div className="flex items-center justify-center mt-3">
            <img className="w-32 h-auto" src="/images/logo.png" alt="BIGGS logo" />
          </div>
            <div className="p-6 space-y-4 sm:p-8">
              <h1 className="text-2xl font-bold leading-tight tracking-tight text-card-foreground">Sign in to your account</h1>

              {error && (
                <div role="alert" aria-live="assertive" className="text-sm text-destructive-foreground">{error}</div>
              )}

              <form className="space-y-4" onSubmit={handleSubmit}>
                <div>
                  <label htmlFor="email" className="block mb-2 text-sm font-medium text-card-foreground">Your email</label>
                  <input id="email" name="email" type="email" value={identifier} onChange={(e) => setIdentifier(e.target.value)} placeholder="name@company.com" required className="bg-[hsl(var(--background))] border border-sky-500 text-card-foreground rounded-lg focus:ring-2 focus:ring-[hsl(var(--primary))] focus:border-[hsl(var(--primary))] block w-full p-3" />
                </div>

                <div>
                  <label htmlFor="password" className="block mb-2 text-sm font-medium text-card-foreground">Password</label>
                  <div className="relative">
                    <input id="password" name="password" type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required className="bg-[hsl(var(--background))] border border-sky-500 text-card-foreground rounded-lg focus:ring-2 focus:ring-[hsl(var(--primary))] focus:border-[hsl(var(--primary))] block w-full p-3 pr-12" />
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

                  <a href="#" className="text-sm font-medium text-sky-900 hover:underline">Forgot password?</a>
                </div>

                <button type="submit" className="w-full text-black bg-[hsl(var(--accent))] hover:brightness-95 font-medium rounded-lg text-sm px-5 py-3 text-center" disabled={loading}>
                  {loading ? 'Signing in...' : 'Sign in'}
                </button>

                <p className="text-sm font-light text-muted-foreground">Don’t have an account yet? <a href="#" className="font-medium text-red-800 hover:underline">Sign up</a></p>
              </form>
            </div>
          </div>
        </div>
      </section>
    </LoginLayout>
  )
}
