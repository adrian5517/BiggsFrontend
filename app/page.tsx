 'use client'

import React from "react"

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { setAccessToken } from '@/utils/auth'
import { Eye, EyeOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import LoginLayout from '@/components/login-layout'
import GeometricDecorations from '@/components/geometric-decorations'

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [identifier, setIdentifier] = useState('')
  const [passwordValue, setPasswordValue] = useState('')
  const [error, setError] = useState('')

  const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000'

  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!identifier.trim() || !passwordValue) {
      setError('Please enter username/email and password')
      return
    }

    setIsLoading(true)
    try {
      const res = await fetch(`${apiBaseUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include', // important: allow server to set HttpOnly refresh cookie
        body: JSON.stringify({ identifier, password: passwordValue })
      })

      const data = await res.json()
      if (!res.ok) {
        setError(data.message || 'Login failed')
        return
      }

      // Save access token (short-lived) via helper and navigate
      if (data.token) setAccessToken(data.token)
      router.push('/dashboard')
    } catch (err) {
      console.error('Login error:', err)
      setError('Network error — try again')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <LoginLayout>
      <GeometricDecorations />

      <div className="relative z-10 flex min-h-screen items-center justify-center px-4 sm:px-6">
        <div className="w-full max-w-md">
          {/* Logo */}
          <div className="mb-8 flex justify-center">
            <img
              src="/images/logo.png"
              alt="BIGGS Logo"
              className="h-24 w-auto"
            />
          </div>

          {/* Form Container */}
          <div className="rounded-lg bg-white/95 p-8 shadow-2xl backdrop-blur-sm">
            <h1 className="mb-2 text-center text-2xl font-bold text-foreground">
              Admin Login
            </h1>
            <p className="mb-8 text-center text-sm text-muted-foreground">
              Access your BIGGS administration panel
            </p>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Identifier Field */}
              <div className="space-y-2">
                <Label htmlFor="identifier" className="text-foreground">
                  Username or Email
                </Label>
                <Input
                  id="identifier"
                  name="identifier"
                  type="text"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="Enter your username or email"
                  className="border-2 border-input bg-white text-foreground placeholder:text-muted-foreground"
                  disabled={isLoading}
                />
              </div>

              {/* Password Field */}
              <div className="space-y-2">
                <Label htmlFor="password" className="text-foreground">
                  Password
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    value={passwordValue}
                    onChange={(e) => setPasswordValue(e.target.value)}
                    placeholder="Enter your password"
                    className="border-2 border-input bg-white pr-10 text-foreground placeholder:text-muted-foreground"
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    disabled={isLoading}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Forgot Password Link */}
              <div className="text-right">
                <a
                  href="#"
                  className="text-sm font-medium text-primary hover:underline"
                >
                  Forgot password?
                </a>
              </div>

              {error && <p className="text-sm text-red-600">{error}</p>}
              {/* Sign In Button */}
              <Button
                type="submit"
                className="w-full bg-accent py-3 text-base font-bold text-accent-foreground hover:bg-yellow-500 disabled:opacity-50"
                disabled={isLoading}
              >
                {isLoading ? 'Signing in...' : 'Sign in'}
              </Button>
            </form>

            {/* Footer */}
            <p className="mt-6 text-center text-xs text-muted-foreground">
              © 2026 BIGGS. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </LoginLayout>
  )
}
