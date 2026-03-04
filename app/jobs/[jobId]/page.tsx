import JobStatusPanel from '../JobStatusPanel';

export default async function JobPage({ params }: { params: Promise<{ jobId: string }> }) {
  const { jobId } = await params;
  return (
    <main className="p-4 md:p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Job Details</h1>
        <p className="text-sm text-slate-600 mt-1">Track fetch/combine progress in real time, including errors and completion state.</p>
      </div>
      <div className="max-w-5xl">
        <JobStatusPanel jobId={jobId} />
      </div>
    </main>
  );
}
