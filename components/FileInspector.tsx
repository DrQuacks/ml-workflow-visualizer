'use client';

import { useState, useEffect, useRef } from 'react';
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
  const [isExecuting, setIsExecuting] = useState(false);
  const [pythonResults, setPythonResults] = useState<Record<string, any> | null>(null);
  const [pythonError, setPythonError] = useState<string | null>(null);
  const setArtifacts = useStore(s => s.setArtifacts);
  const runPythonRef = useRef<(() => void) | null>(null);

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
    <div className="space-y-6">
      <section className="grid md:grid-cols-2 gap-6">
        {/* Python Attributes Panel */}
        <div className="rounded-2xl border bg-white p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold">Python Attributes</h3>
            <button
              onClick={() => runPythonRef.current?.()}
              disabled={isExecuting}
              className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors"
            >
              {isExecuting ? 'Executing...' : 'Run Python'}
            </button>
          </div>
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

        {/* Python Code Panel */}
        <div className="rounded-2xl border bg-white p-4">
          <h3 className="font-semibold mb-2">Python Code</h3>
          <CodeBlock 
            code={code}
            editable={true}
            csvData={csvData}
            filename={filename}
            onExecuteRef={runPythonRef}
            onExecutingChange={setIsExecuting}
            onResultsChange={(results, error) => {
              setPythonResults(results);
              setPythonError(error);
            }}
          />
        </div>
      </section>

      {/* Python Results (separate section) */}
      {pythonError && (
        <section className="rounded-2xl border border-red-200 bg-red-50 p-4">
          <h3 className="font-semibold text-red-800 mb-2">Python Error</h3>
          <pre className="text-xs text-red-700 whitespace-pre-wrap font-mono overflow-x-auto">
            {pythonError}
          </pre>
        </section>
      )}

      {pythonResults && Object.keys(pythonResults).length > 0 && (
        <section className="rounded-2xl border bg-white p-4 space-y-4">
          <h3 className="font-semibold text-green-700">✓ Python Results</h3>
          {Object.entries(pythonResults).map(([varName, value]: [string, any]) => {
            // Check if it's a DataFrame result
            if (value && value.type === 'dataframe') {
              const { columns, data, shape } = value;
              
              return (
                <div key={varName} className="border rounded-lg overflow-hidden bg-white">
                  <div className="px-4 py-2 bg-gray-50 border-b">
                    <p className="text-sm font-medium">
                      Variable: <code className="bg-gray-200 px-1 rounded">{varName}</code>
                      <span className="text-gray-600 ml-2">
                        {shape[0]} rows × {shape[1]} columns (showing first 100)
                      </span>
                    </p>
                  </div>
                  <div className="overflow-auto max-h-96">
                    <table className="min-w-full text-xs">
                      <thead className="bg-gray-100 sticky top-0">
                        <tr>
                          {columns.map((col: string, i: number) => (
                            <th key={i} className="px-2 py-1 text-left font-semibold">
                              {col}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {data.map((row: any[], ri: number) => (
                          <tr key={ri} className="odd:bg-white even:bg-gray-50">
                            {row.map((cell: any, ci: number) => (
                              <td key={ci} className="px-2 py-1">
                                {cell === null ? (
                                  <span className="text-gray-400 italic">null</span>
                                ) : (
                                  String(cell)
                                )}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            }
            
            return (
              <div key={varName} className="border rounded-lg p-4 bg-gray-50">
                <p className="text-sm font-medium mb-2">Variable: <code>{varName}</code></p>
                <pre className="text-xs overflow-x-auto">{JSON.stringify(value, null, 2)}</pre>
              </div>
            );
          })}
        </section>
      )}

      {/* JS Preview (separate section) */}
      {previewArtifactId && (
        <section className="rounded-2xl border bg-white p-4">
          <h3 className="font-semibold mb-2">Preview (JavaScript)</h3>
          <TablePreview artifactId={previewArtifactId} />
        </section>
      )}
    </div>
  );
}

