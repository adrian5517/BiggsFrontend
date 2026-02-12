import UploadForm from './UploadForm';

export const metadata = { title: 'Uploads' };

export default function UploadsPage() {
  return (
    <main className="p-6">
      <h1 className="text-2xl font-semibold mb-4">Upload POS files</h1>
      <div className="max-w-3xl">
        <UploadForm />
      </div>
    </main>
  );
}
