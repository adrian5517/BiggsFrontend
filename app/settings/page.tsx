"use client"

import Link from 'next/link'
import LoginLayout from '@/components/login-layout'

export default function SettingsPage() {
  return (
    <LoginLayout>
      <div className="max-w-4xl mx-auto py-8 px-4">
        <div className="bg-white border border-slate-200 rounded-xl p-6">
          <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
          <p className="text-sm text-slate-600 mt-1 mb-6">
            Quick shortcuts for reports and monitoring.
          </p>

          <div className="flex flex-col sm:flex-row gap-3">
            <Link
              href="/admin/fetch-logs"
              className="inline-flex items-center justify-center px-4 py-2 rounded-md bg-blue-600 text-white font-medium hover:bg-blue-700 transition"
            >
              View Fetch Reports
            </Link>

            <Link
              href="/master"
              className="inline-flex items-center justify-center px-4 py-2 rounded-md bg-emerald-600 text-white font-medium hover:bg-emerald-700 transition"
            >
              View Master Reports
            </Link>
          </div>
        </div>
      </div>
    </LoginLayout>
  )
}
