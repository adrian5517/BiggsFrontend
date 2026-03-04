'use client'

import { useTheme } from 'next-themes'
import { sileo, Toaster as SileoToaster } from 'sileo'

type ToasterProps = React.ComponentProps<typeof SileoToaster>
type ToastOptions = {
  id?: string
  position?: 'top-left' | 'top-center' | 'top-right' | 'bottom-left' | 'bottom-center' | 'bottom-right'
}

const toastIds = new Map<string, unknown>()

function titleFromMessage(message: unknown) {
  if (typeof message === 'string') return message
  if (message == null) return ''
  return String(message)
}

function normalizeToastMessage(message: unknown) {
  const text = titleFromMessage(message)
  const match = text.match(/^(.*)\s+for\s+job\s+(.+)$/i)
  if (!match) {
    return { title: text, description: undefined as string | undefined }
  }

  const title = match[1]?.trim() || text
  const jobId = match[2]?.trim()
  const description = jobId ? `Job fetch - ${jobId}` : undefined
  return { title, description }
}

function emit(type: 'success' | 'error' | 'warning' | 'info', message: unknown, options?: ToastOptions) {
  const idKey = options?.id
  if (idKey && toastIds.has(idKey)) {
    sileo.dismiss(toastIds.get(idKey) as any)
  }

  const normalized = normalizeToastMessage(message)
  const fillByType: Record<'success' | 'error' | 'warning' | 'info', string> = {
    success: '#0ea5e9',
    warning: '#eab308',
    error: '#ef4444',
    info: '#0f1f3d',
  }
  const textStylesByType: Record<'success' | 'error' | 'warning' | 'info', { title: string; description: string }> = {
    success: {
      title: 'text-white!',
      description: 'text-white! text-[12px]!',
    },
    warning: {
      title: 'text-white!',
      description: 'text-white! text-[12px]!',
    },
    error: {
      title: 'text-white!',
      description: 'text-white! text-[12px]!',
    },
    info: {
      title: 'text-white!',
      description: 'text-white! text-[12px]!',
    },
  }

  const payload: Record<string, unknown> = {
    title: normalized.title,
    description: normalized.description,
    fill: fillByType[type],
    styles: {
      title: textStylesByType[type].title,
      description: textStylesByType[type].description,
    },
  }
  if (options?.position) payload.position = options.position

  const nextId = (sileo as any)[type](payload)
  if (idKey) {
    toastIds.set(idKey, nextId)
  }
  return nextId
}

const baseToast = (message: unknown, options?: ToastOptions) => emit('info', message, options)

const toast = Object.assign(baseToast, {
  success: (message: unknown, options?: ToastOptions) => emit('success', message, options),
  error: (message: unknown, options?: ToastOptions) => emit('error', message, options),
  warning: (message: unknown, options?: ToastOptions) => emit('warning', message, options),
  info: (message: unknown, options?: ToastOptions) => emit('info', message, options),
  dismiss: (id?: string) => {
    if (!id) {
      sileo.clear()
      toastIds.clear()
      return
    }
    const mapped = toastIds.get(id)
    if (mapped) {
      sileo.dismiss(mapped as any)
      toastIds.delete(id)
      return
    }
    sileo.dismiss(id as any)
  },
})

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = 'system' } = useTheme()

  return (
    <>
      <SileoToaster
        position="top-center"
        theme={theme as ToasterProps['theme']}
        {...props}
      />
      <style jsx global>{`
        [data-sileo-title],
        [data-sileo-description] {
          color: #ffffff !important;
        }
      `}</style>
    </>
  )
}

export { Toaster, toast }
