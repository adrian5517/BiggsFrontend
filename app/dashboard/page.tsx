"use client"

import React, { useEffect } from 'react'
import { motion } from 'framer-motion'
import { useRouter } from 'next/navigation'
import auth, { getAccessToken } from '@/utils/auth'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import LoginLayout from '@/components/login-layout'
import ManualFetchClient from '@/components/manual-fetch-client'
import MissingScanClient from '@/components/missing-scan-client'
import AdminRetentionPanel from '@/components/AdminRetentionPanel'
import ToastProvider from '@/components/ToastProvider'

import Link from 'next/link'
import { 
  Activity, 
  Clock, 
  Upload, 
  FileText
} from 'lucide-react'

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
      <ToastProvider>
        <div />
        <div className="max-h-screen "> 
          {/* Centered white content card with gradient header */}
          <div className="max-w-8xl mx-auto -mt-10 relative block">
            <div className="bg-white dark:bg-slate-900 rounded-xl shadow-lg relative block overflow-hidden">
              {/* Top gradient bar */}
              <div className="h-1 w-full bg-gradient-to-r from-[#29a8e0] via-[#1d8bc4] to-[#bd202e]" />
            
              <div className="p-6">
                {/* Overview stat cards with premium styling */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 mb-6 -mt-8">
                  <motion.div 
                    whileHover={{ y: -6, scale: 1.02 }} 
                    whileTap={{ scale: 0.98 }} 
                    className="bg-white dark:bg-slate-800 shadow-lg shadow-slate-200/50 dark:shadow-slate-900/50 rounded-xl p-4 border border-slate-100 dark:border-slate-700 cursor-pointer group"
                  >
                    <div className="flex items-center gap-4">
                      <div className="p-3 rounded-xl bg-gradient-to-br from-[#29a8e0]/10 to-[#29a8e0]/5 text-[#29a8e0] group-hover:scale-110 transition-transform">
                        <Activity className="w-6 h-6" />
                      </div>
                      <div>
                        <div className="text-sm text-slate-500 dark:text-slate-400 font-medium">Active Jobs</div>
                        <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">—</div>
                      </div>
                    </div>
                  </motion.div>

                  <motion.div 
                    whileHover={{ y: -6, scale: 1.02 }} 
                    whileTap={{ scale: 0.98 }} 
                    className="bg-white dark:bg-slate-800 shadow-lg shadow-slate-200/50 dark:shadow-slate-900/50 rounded-xl p-4 border border-slate-100 dark:border-slate-700 cursor-pointer group"
                  >
                    <div className="flex items-center gap-4">
                      <div className="p-3 rounded-xl bg-gradient-to-br from-[#bd202e]/10 to-[#bd202e]/5 text-[#bd202e] group-hover:scale-110 transition-transform">
                        <Clock className="w-6 h-6" />
                      </div>
                      <div>
                        <div className="text-sm text-slate-500 dark:text-slate-400 font-medium">Live Events</div>
                        <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">—</div>
                      </div>
                    </div>
                  </motion.div>

                  <motion.div 
                    whileHover={{ y: -6, scale: 1.02 }} 
                    whileTap={{ scale: 0.98 }} 
                    className="bg-white dark:bg-slate-800 shadow-lg shadow-slate-200/50 dark:shadow-slate-900/50 rounded-xl p-4 border border-slate-100 dark:border-slate-700 cursor-pointer group"
                  >
                    <div className="flex items-center gap-4">
                      <div className="p-3 rounded-xl bg-gradient-to-br from-[#ecbc32]/10 to-[#ecbc32]/5 text-[#ecbc32] group-hover:scale-110 transition-transform">
                        <Upload className="w-6 h-6" />
                      </div>
                      <div>
                        <div className="text-sm text-slate-500 dark:text-slate-400 font-medium">Uploads</div>
                        <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">—</div>
                      </div>
                    </div>
                  </motion.div>

                  <motion.div 
                    whileHover={{ y: -6, scale: 1.02 }} 
                    whileTap={{ scale: 0.98 }} 
                    className="bg-white dark:bg-slate-800 shadow-lg shadow-slate-200/50 dark:shadow-slate-900/50 rounded-xl p-4 border border-slate-100 dark:border-slate-700 cursor-pointer group"
                  >
                    <div className="flex items-center gap-4">
                      <div className="p-3 rounded-xl bg-gradient-to-br from-[#29a8e0]/10 to-[#29a8e0]/5 text-[#29a8e0] group-hover:scale-110 transition-transform">
                        <FileText className="w-6 h-6" />
                      </div>
                      <div>
                        <div className="text-sm text-slate-500 dark:text-slate-400 font-medium">Files</div>
                        <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">—</div>
                      </div>
                    </div>
                  </motion.div>
                </div>

                {/* Main content grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-[calc(100vh-120px)]">
                  {/* Manual Fetch Card */}
                  <motion.div 
                    initial={{ opacity: 0, y: 8 }} 
                    animate={{ opacity: 1, y: 0 }} 
                    transition={{ duration: 0.3 }}
                    className="h-full"
                  >
                    <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 shadow-xl shadow-slate-200/30 dark:shadow-slate-900/30 h-full overflow-hidden">
                      <CardContent className="p-4 h-full">
                        <ManualFetchClient />
                      </CardContent>
                    </Card>
                  </motion.div>

                  {/* Missing Scan Card */}
                  <motion.div 
                    initial={{ opacity: 0, y: 8 }} 
                    animate={{ opacity: 1, y: 0 }} 
                    transition={{ duration: 0.3, delay: 0.02 }}
                    className="h-full"
                  >
                    <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 shadow-xl shadow-slate-200/30 dark:shadow-slate-900/30 h-full overflow-hidden">
                      <CardContent className="p-4 h-full">
                        <MissingScanClient />
                      </CardContent>
                    </Card>
                  </motion.div>
                </div>
                
                {/* Admin Retention Panel */}
                <motion.div 
                  initial={{ opacity: 0, y: 8 }} 
                  animate={{ opacity: 1, y: 0 }} 
                  transition={{ duration: 0.3, delay: 0.04 }}
                  className="mt-6"
                >
                  <AdminRetentionPanel />
                </motion.div>
              </div>
            </div>
          </div>
        </div>
      </ToastProvider>
    </LoginLayout>
  )
}
