"use client"

import React, { useEffect } from 'react'
import { motion } from 'framer-motion'
import { useRouter } from 'next/navigation'
import auth, { getAccessToken } from '@/utils/auth'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
// Input/Label not needed; ManualFetchClient handles its own inputs
import LoginLayout from '@/components/login-layout'
import ManualFetchClient from '@/components/manual-fetch-client'
import MissingScanClient from '@/components/missing-scan-client'

import Link from 'next/link'

type FetchEvent = { type: string; message?: string; batchRows?: number; totalRows?: number }

export default function DashboardPage() {
  const router = useRouter()
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000'

  

  useEffect(() => {
    const token = auth.getAccessToken()
    if (!token) router.push('/login')
  }, [router])

  

  

  const openSse = () => {
    const token = getAccessToken()
    const url = `${apiBaseUrl}/api/queue/events?queue=importQueue${token ? `&token=${encodeURIComponent(token)}` : ''}`
    window.open(url, '_blank')
  }

  return (
    <LoginLayout>
      <div />
      <div className="max-h-screen "> 
        {/* Centered white content card with single internal gradient header */}
        <div className="max-w-8xl mx-auto -mt-10 relative block">
          <div className="bg-white rounded-xl shadow-lg relative block overflow-hidden">
           
            <div className="p-6">
              {/* Overview stat cards (slightly lifted) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 mb-6 -mt-8">
                <motion.div whileHover={{ y: -6 }} whileTap={{ scale: 0.98 }} className="bg-white shadow rounded-lg p-4">
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-md bg-[#29a8e0]/10 text-[#29a8e0]">
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M3 12h18" strokeLinecap="round" strokeLinejoin="round" />
                        <path d="M12 3v18" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Active Jobs</div>
                      <div className="text-xl font-semibold">—</div>
                    </div>
                  </div>
                </motion.div>

                <motion.div whileHover={{ y: -6 }} whileTap={{ scale: 0.98 }} className="bg-white shadow rounded-lg p-4">
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-md bg-[#bd202e]/10 text-[#bd202e]">
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M12 6v6l4 2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Live Events</div>
                      <div className="text-xl font-semibold">—</div>
                    </div>
                  </div>
                </motion.div>

                <motion.div whileHover={{ y: -6 }} whileTap={{ scale: 0.98 }} className="bg-white shadow rounded-lg p-4">
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-md bg-[#ecbc32]/10 text-[#ecbc32]">
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M12 2l3 7h7l-5.5 4 2 7L12 16l-6.5 4 2-7L2 9h7z" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Uploads</div>
                      <div className="text-xl font-semibold">—</div>
                    </div>
                  </div>
                </motion.div>

                <motion.div whileHover={{ y: -6 }} whileTap={{ scale: 0.98 }} className="bg-white shadow rounded-lg p-4">
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-md bg-[#29a8e0]/10 text-[#29a8e0]">
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M3 7h18M3 12h18M3 17h18" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Files</div>
                      <div className="text-xl font-semibold">—</div>
                    </div>
                  </div>
                </motion.div>
              </div>

              {/* <nav className="mb-6 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <Link href="/dashboard" className="text-sm text-muted-foreground">Dashboard</Link>
                  <Link href="/files" className="text-sm text-muted-foreground">Files</Link>
                  <Link href="/master" className="text-sm text-muted-foreground">Master</Link>
                </div>
                <div className="flex items-center gap-3">
                  <Button variant="ghost" onClick={openSse}>Open Queue Events (SSE)</Button>
                  <Button onClick={() => router.push('/upload')}>Upload CSVs</Button>
                </div>
              </nav> */}

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-[calc(100vh-120px)]">
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
                  <Card className="bg-white text-slate-900 shadow">
                    <CardHeader>
                      <CardTitle className="text-2xl text-[#29a8e0]">Manual Fetch</CardTitle>
                    </CardHeader>
                    <CardContent style={{ minHeight: 420 }}>
                      <ManualFetchClient />
                    </CardContent>
                  </Card>
                </motion.div>

                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.02 }}>
                  <Card className="bg-white text-slate-900 shadow">
                    <CardHeader>
                      <CardTitle className="text-2xl text-[#29a8e0]">Missing Scan</CardTitle>
                    </CardHeader>
                    <CardContent style={{ minHeight: 420 }}>
                      <MissingScanClient />
                    </CardContent>
                  </Card>
                </motion.div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </LoginLayout>
  )
}
