import UploadForm from './UploadForm';

export const metadata = { title: 'Uploads' };

export default function UploadsPage() {
  return (
    <main className="mx-auto w-full max-w-5xl p-6 md:p-8">
      <div className="mb-6 space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Upload POS Files</h1>
        <p className="text-sm text-muted-foreground">Manual CSV intake and queueing for processing jobs.</p>
      </div>
      <div className="max-w-4xl">
        <UploadForm />
      </div>
    </main>
  );
}
