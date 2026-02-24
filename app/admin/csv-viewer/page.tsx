import CsvViewerClient from '../../../components/csv-viewer/CsvViewerClient';

export default function Page() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold mb-4">CSV Viewer</h1>
      <CsvViewerClient />
    </div>
  );
}
