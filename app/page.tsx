'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { login, getAccessToken } from '@/utils/auth'
import { showSuccess, showError } from '@/utils/swal'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Eye, EyeOff, Loader2 } from 'lucide-react'
import LoginLayout from '@/components/login-layout'
import GeometricDecorations from '@/components/geometric-decorations'

export default function LoginPage() {
  const router = useRouter()
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const token = getAccessToken()
    if (token) router.push('/dashboard')
  }, [router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!identifier.trim() || !password.trim()) {
      showError('Missing Fields', 'Please enter your username and password.')
      return
    }
    setLoading(true)
    try {
      const result = await login(identifier, password)
      if (result.ok) {
        await showSuccess('Welcome!', 'Login successful. Redirecting...')
        router.push('/dashboard')
      } else {
        showError('Login Failed', result.data?.message || 'Invalid username or password.')
      }
    } catch {
      showError('Network Error', 'Could not reach the server. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <LoginLayout>
      <GeometricDecorations />
      <div className="flex min-h-screen items-center justify-center px-4 py-12">
        <div className="relative z-10 w-full max-w-md">
          {/* BIGGS Logo area */}
          <div className="mb-8 flex flex-col items-center">
            <div className="mb-4 flex h-24 w-24 items-center justify-center rounded-full border-4 border-[hsl(var(--biggs-red))] bg-background shadow-lg">
              <div className="flex flex-col items-center">
                <span className="text-2xl font-black tracking-tight text-foreground">BIGGS</span>
                <span className="text-[10px] font-bold text-[hsl(var(--biggs-gold))]">1983</span>
              </div>
            </div>
            <h1 className="text-2xl font-bold text-foreground">Admin Login</h1>
          </div>

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="identifier" className="text-sm font-medium text-foreground">
                username or email
              </Label>
              <Input
                id="identifier"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="Enter your username or email"
                required
                autoComplete="username"
                className="h-11 rounded-lg border-border bg-background px-4 text-sm"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="password" className="text-sm font-medium text-foreground">
                password
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                  autoComplete="current-password"
                  className="h-11 rounded-lg border-border bg-background px-4 pr-10 text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <div className="flex justify-end">
                <button type="button" className="text-xs text-muted-foreground hover:text-primary transition-colors">
                  forgot password?
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-[hsl(var(--biggs-gold))] text-base font-bold text-foreground shadow-md transition-all hover:brightness-105 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Signing in...
                </>
              ) : (
                'Sign in'
              )}
            </button>
          </form>

          <p className="mt-8 text-center text-xs text-muted-foreground">
            BIGGS Data Operations Pipeline
          </p>
        </div>
      </div>
    </LoginLayout>
  )
}
