'use client';

import { useState, useEffect } from 'react';
import Papa from 'papaparse';
import CodeBlock from './CodeBlock';
import TablePreview from './TablePreview';
import { ReadCSV } from '@/plugins/io.read_csv';
import { useStore } from '@/core/state';

interface FileInspectorProps {
  filename: string;
  onPythonRun?: () => void;
}

export default function FileInspector({ filename, onPythonRun }: FileInspectorProps) {
  const [delimiter, setDelimiter] = useState(',');
  const [header, setHeader] = useState(true);
  const [encoding, setEncoding] = useState('utf-8');
  const [csvData, setCsvData] = useState<string | undefined>(undefined);
  const [code, setCode] = useState('');
  const [previewArtifactId, setPreviewArtifactId] = useState<string | null>(null);
  const setArtifacts = useStore(s => s.setArtifacts);

  // Load CSV data when filename changes
  useEffect(() => {
    const loadCsvData = async () => {
      const file = window.__fileMap?.get(filename);
      if (file) {
        const text = await file.text();
        setCsvData(text);
      }
    };
    loadCsvData();
  }, [filename]);

  // Generate Python code based on current params
  useEffect(() => {
    const generatedCode = ReadCSV.codegen({
      filename,
      delimiter,
      header,
      encoding,
    }).text;
    setCode(generatedCode);
  }, [filename, delimiter, header, encoding]);

  // Generate JS preview when file or params change
  useEffect(() => {
    const generatePreview = async () => {
      if (!csvData) return;

      const parsed = Papa.parse<string[]>(csvData, {
        delimiter: delimiter || ',',
        skipEmptyLines: true,
      });

      const rows: string[][] = Array.isArray(parsed.data) ? parsed.data.slice(0, 101) as any : [];
      const artifactId = `preview_${filename}`;
      
      setArtifacts({
        [artifactId]: {
          id: artifactId,
          type: 'table',
          payload: { rows }
        }
      });
      
      setPreviewArtifactId(artifactId);
    };

    generatePreview();
  }, [csvData, delimiter, header, filename, setArtifacts]);

  return (
    <section className="grid md:grid-cols-2 gap-6">
      {/* Configuration & Preview Panel */}
      <div className="rounded-2xl border bg-white p-4 space-y-4">
        <div>
          <h3 className="font-semibold mb-3">Configuration</h3>
          <div className="space-y-4 text-sm">
            <div>
              <div className="text-xs uppercase text-gray-500">File</div>
              <div className="font-medium">{filename}</div>
            </div>
            <div className="space-y-2">
              <div className="text-xs uppercase text-gray-500">Parameters</div>
              <div className="flex items-center gap-2">
                <label className="w-28 text-gray-700">Delimiter</label>
                <input
                  className="border rounded px-2 py-1 flex-1"
                  value={delimiter}
                  onChange={(e) => setDelimiter(e.target.value)}
                />
              </div>
              <div className="flex items-center gap-2">
                <label className="w-28 text-gray-700">Header</label>
                <input
                  type="checkbox"
                  checked={header}
                  onChange={(e) => setHeader(e.target.checked)}
                />
              </div>
              <div className="flex items-center gap-2">
                <label className="w-28 text-gray-700">Encoding</label>
                <input
                  className="border rounded px-2 py-1 flex-1"
                  value={encoding}
                  onChange={(e) => setEncoding(e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>
        
        {/* JS Preview */}
        {previewArtifactId && (
          <div>
            <h3 className="font-semibold mb-2">Preview (JavaScript)</h3>
            <TablePreview artifactId={previewArtifactId} />
          </div>
        )}
      </div>

      {/* Python Code Panel */}
      <div className="rounded-2xl border bg-white p-4">
        <h3 className="font-semibold mb-2">Python Code</h3>
        <CodeBlock 
          code={code}
          editable={true}
          csvData={csvData}
          filename={filename}
        />
      </div>
    </section>
  );
}

