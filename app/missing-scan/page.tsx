import MissingScanResultTableClient from '@/components/missing-scan-result-table-client'

export const metadata = { title: 'Missing Scan' }

export default function Page() {
  return (
    <div className="p-6">
      <MissingScanResultTableClient />
    </div>
  )
}
