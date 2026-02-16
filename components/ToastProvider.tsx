'use client'
import React, { createContext, useContext, useState, useCallback, useEffect } from 'react'

type ToastType = 'info' | 'success' | 'error'
type ToastItem = { id: number; message: string; type?: ToastType }

const ToastContext = createContext<{ addToast: (message: string, type?: ToastType) => void } | null>(null)

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}

export default function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const addToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = Date.now() + Math.floor(Math.random() * 1000)
    setToasts((t) => [...t, { id, message, type }])
    // auto-dismiss after 5s
    setTimeout(() => {
      setToasts((t) => t.filter((x) => x.id !== id))
    }, 5000)
  }, [])

  // keep a small max
  useEffect(() => {
    if (toasts.length > 8) setToasts((t) => t.slice(-8))
  }, [toasts])

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      <div className="fixed top-4 right-4 z-50 flex flex-col items-end space-y-2 pointer-events-none">
        {toasts.map((t) => (
          <div key={t.id} className={`pointer-events-auto max-w-sm w-full rounded shadow-lg px-4 py-2 text-sm text-white ${t.type === 'success' ? 'bg-green-600' : t.type === 'error' ? 'bg-red-600' : 'bg-gray-700'}`}>
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}
