import JobStatusPanel from '../JobStatusPanel';

export default function JobPage({ params }: { params: { jobId: string } }) {
  const { jobId } = params;
  return (
    <main className="p-6">
      <h1 className="text-2xl font-semibold mb-4">Job Details</h1>
      <div className="max-w-3xl">
        <JobStatusPanel jobId={jobId} />
      </div>
    </main>
  );
}
