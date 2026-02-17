"use client"

import React from 'react'
import LoginLayout from '@/components/login-layout'
import FetchLogsClient from '@/components/fetch-logs-client'

export default function Page() {
  return (
    <LoginLayout>
      <div className="max-w-6xl mx-auto py-8">
        <h1 className="text-2xl font-bold mb-4">Fetch Logs</h1>
        <div className="bg-card p-4 rounded">
          <FetchLogsClient />
        </div>
      </div>
    </LoginLayout>
  )
}
