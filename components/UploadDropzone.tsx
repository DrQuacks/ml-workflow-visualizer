'use client';

import { useRef } from 'react';
import { useStore } from '@/core/state';

declare global {
  interface Window { __fileMap?: Map<string, File>; }
}

export default function UploadDropzone() {
  const inputRef = useRef<HTMLInputElement>(null);
  const addUploadedFile = useStore(s => s.addUploadedFile);

  function onDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    const f = e.dataTransfer.files?.[0];
    if (f) handleFile(f);
  }

  function handleFile(file: File) {
    window.__fileMap ||= new Map<string, File>();
    window.__fileMap.set(file.name, file);
    addUploadedFile(file.name);
    // No automatic node creation - user must select file and load it
  }

  return (
    <div
      onDragOver={(e) => e.preventDefault()}
      onDrop={onDrop}
      className="border-2 border-dashed rounded-xl p-6 text-center cursor-pointer bg-gray-50 hover:bg-gray-100"
      onClick={() => inputRef.current?.click()}
    >
      <p className="text-sm">Drag & drop a <code>.csv</code> here, or click to select.</p>
      <input
        ref={inputRef}
        type="file"
        accept=".csv,text/csv"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleFile(f);
        }}
      />
    </div>
  );
}
