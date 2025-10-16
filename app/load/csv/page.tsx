'use client';

import React from 'react';
import UploadDropzone from '@/components/UploadDropzone';
import UploadedFilesList from '@/components/UploadedFilesList';
import FileInspector from '@/components/FileInspector';
import { useStore } from '@/core/state';

export default function LoadCsvPage() {
  const uploadedFiles = useStore(s => s.uploadedFiles);
  const [selectedFile, setSelectedFile] = React.useState<string | null>(null);

  // Auto-select first file when files are uploaded
  React.useEffect(() => {
    if (uploadedFiles.length > 0 && !selectedFile) {
      setSelectedFile(uploadedFiles[0]);
    }
  }, [uploadedFiles, selectedFile]);

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border bg-white p-4">
        <h2 className="text-base font-semibold mb-2">1) Upload CSV Files</h2>
        <UploadDropzone />
        <p className="text-xs text-gray-500 mt-2">
          Upload CSV files, then select one below to configure and load.
        </p>
      </section>

      {uploadedFiles.length > 0 && (
        <UploadedFilesList 
          selectedFile={selectedFile}
          onSelectFile={setSelectedFile}
        />
      )}

      {selectedFile && (
        <FileInspector filename={selectedFile} />
      )}

      {!uploadedFiles.length && (
        <p className="text-sm text-gray-600">No files uploaded. Upload a CSV to get started.</p>
      )}
    </div>
  );
}

