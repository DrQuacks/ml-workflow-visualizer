'use client';

import { useStore } from '@/core/state';

interface UploadedFilesListProps {
  selectedFile: string | null;
  onSelectFile: (filename: string) => void;
}

export default function UploadedFilesList({ selectedFile, onSelectFile }: UploadedFilesListProps) {
  const uploadedFiles = useStore(s => s.uploadedFiles);
  const removeUploadedFile = useStore(s => s.removeUploadedFile);

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleDelete = (filename: string) => {
    window.__fileMap?.delete(filename);
    removeUploadedFile(filename);
  };

  if (uploadedFiles.length === 0) {
    return null;
  }

  return (
    <div className="rounded-2xl border bg-white p-4">
      <h3 className="text-sm font-semibold mb-3">
        Uploaded Files ({uploadedFiles.length})
      </h3>
      <div className="space-y-2">
        {uploadedFiles.map((filename) => {
          const file = window.__fileMap?.get(filename);
          const fileSize = file ? formatFileSize(file.size) : 'Unknown';
          const isSelected = filename === selectedFile;

          return (
            <div
              key={filename}
              onClick={() => onSelectFile(filename)}
              className={`flex items-center justify-between p-2 rounded border cursor-pointer transition-colors ${
                isSelected ? 'bg-blue-50 border-blue-300' : 'bg-gray-50 hover:bg-gray-100'
              }`}
            >
              <div className="flex items-center gap-2 flex-1">
                {isSelected && (
                  <svg className="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                )}
                <div className="flex-1">
                  <p className="text-sm font-medium">{filename}</p>
                  <p className="text-xs text-gray-500">{fileSize}</p>
                </div>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDelete(filename);
                }}
                className="text-xs text-red-600 hover:text-red-800 px-2 py-1 hover:bg-red-50 rounded"
                aria-label={`Delete ${filename}`}
              >
                Delete
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

