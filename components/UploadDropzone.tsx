'use client';

import { useRef } from 'react';
import { useStore } from '@/core/state';
import { createReadCsvNode } from '@/plugins/io.read_csv';

declare global {
  interface Window { __fileMap?: Map<string, File>; }
}

export default function UploadDropzone() {
  const inputRef = useRef<HTMLInputElement>(null);
  const addNode = useStore(s => s.addNode);

  function onDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    const f = e.dataTransfer.files?.[0];
    if (f) handleFile(f);
  }

  function handleFile(file: File) {
    window.__fileMap ||= new Map<string, File>();
    window.__fileMap.set(file.name, file);
    const node = createReadCsvNode(file.name);
    addNode(node);
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
