import MissingScanClient from '@/components/missing-scan-client'

export const metadata = { title: 'Missing Scan' }

export default function Page() {
  return (
    <div className="p-6">
      <MissingScanClient />
    </div>
  )
}
