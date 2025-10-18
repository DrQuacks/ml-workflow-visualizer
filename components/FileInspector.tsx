'use client';

import { useState, useEffect } from 'react';
import Papa from 'papaparse';
import PythonWorkspace from './PythonWorkspace';
import ReadCsvAttributes from './ReadCsvAttributes';
import TablePreview from './TablePreview';
import { useStore } from '@/core/state';
import { parseReadCsvCode, generateReadCsvCode, type ReadCsvParams } from '@/core/code-sync';

interface FileInspectorProps {
  filename: string;
  onPythonRun?: () => void;
}

export default function FileInspector({ filename, onPythonRun }: FileInspectorProps) {
  const setArtifacts = useStore(s => s.setArtifacts);
  
  const [params, setParams] = useState<ReadCsvParams>({
    varName: 'df',
    filename,
    delimiter: ',',
    header: true,
    encoding: 'utf-8',
  });
  const [csvData, setCsvData] = useState<string | undefined>(undefined);
  const [previewArtifactId, setPreviewArtifactId] = useState<string | null>(null);
  const [pythonResults, setPythonResults] = useState<Record<string, any> | null>(null);
  const [pythonError, setPythonError] = useState<string | null>(null);

  // Update params.filename when prop changes
  useEffect(() => {
    setParams(prev => ({ ...prev, filename }));
  }, [filename]);

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

  // Generate JS preview when file or params change
  useEffect(() => {
    const generatePreview = async () => {
      if (!csvData) return;

      const parsed = Papa.parse<string[]>(csvData, {
        delimiter: params.delimiter || ',',
        skipEmptyLines: true,
      });

      const rows: string[][] = Array.isArray(parsed.data) 
        ? parsed.data.slice(0, 101) as any 
        : [];
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
  }, [csvData, params.delimiter, params.header, filename, setArtifacts]);

  return (
    <div className="space-y-6">
      {/* Python Workspace */}
      <PythonWorkspace
        initialParams={params}
        generateCode={generateReadCsvCode}
        parseCode={parseReadCsvCode}
        AttributesComponent={ReadCsvAttributes}
        dataframeContext={{ type: 'source', colType: 'full' }}
        csvData={csvData}
        filename={filename}
        onParamsChange={setParams}
        onResultsChange={(results, error) => {
          setPythonResults(results);
          setPythonError(error);
          onPythonRun?.();
        }}
        shouldGenerateCode={true}
      />

      {/* Python Results */}
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
          <h3 className="font-semibold text-green-700">✓ Execution Successful</h3>
          {Object.entries(pythonResults).map(([varName, value]: [string, any]) => {
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

      {/* JS Preview */}
      {previewArtifactId && (
        <section className="rounded-2xl border bg-white p-4">
          <h3 className="font-semibold mb-2">Preview (JavaScript)</h3>
          <TablePreview artifactId={previewArtifactId} />
        </section>
      )}
    </div>
  );
}
