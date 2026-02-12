import React from 'react'

const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000'

async function getFiles() {
  try {
    const res = await fetch(`${apiBase}/api/files`, { cache: 'no-store' })
    if (!res.ok) return []
    return await res.json()
  } catch (e) {
    return []
  }
}

export default async function FilesPage() {
  const files = await getFiles()

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-4">Files</h1>

      <div className="overflow-x-auto bg-white dark:bg-slate-800 rounded shadow p-4">
        <table className="w-full table-auto">
          <thead>
            <tr className="text-left text-sm text-slate-500">
              <th className="p-2">Job ID</th>
              <th className="p-2">Branch</th>
              <th className="p-2">POS</th>
              <th className="p-2">Date</th>
              <th className="p-2">Status</th>
              <th className="p-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {Array.isArray(files) && files.length > 0 ? files.map((f: any) => (
              <tr key={f.jobId} className="border-t border-slate-100 dark:border-slate-700">
                <td className="p-2 font-mono text-xs">{f.jobId}</td>
                <td className="p-2">{f.branch}</td>
                <td className="p-2">{f.pos}</td>
                <td className="p-2">{f.date}</td>
                <td className="p-2">{f.status}</td>
                <td className="p-2">
                  <a href={`/jobs/${f.jobId}`} className="text-sky-600">Open</a>
                </td>
              </tr>
            )) : (
              <tr>
                <td colSpan={6} className="p-4 text-slate-500">No files found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
