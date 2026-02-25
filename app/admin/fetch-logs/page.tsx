"use client"

import React from 'react'
import LoginLayout from '@/components/login-layout'
import FetchLogsClient from '@/components/fetch-logs-client'

export default function Page() {
  return (
    
      <div className="max-w-8xl mx-auto py-3 ">
        
        <div className="bg-card p-4 rounded">
          <FetchLogsClient />
        </div>
      </div>
    
  )
}
