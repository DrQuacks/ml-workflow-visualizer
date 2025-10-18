'use client';

import { useState, useEffect, useRef } from 'react';
import { useStore } from '@/core/state';
import FeaturesTargetAttributes from '@/components/FeaturesTargetAttributes';
import CodeBlock from '@/components/CodeBlock';
import TablePreview from '@/components/TablePreview';
import { parseFeaturesTargetCode, generateFeaturesTargetCode, type FeaturesTargetParams } from '@/core/code-sync';

export default function FeaturesTargetPage() {
  const createdDataframes = useStore(s => s.createdDataframes);
  const artifacts = useStore(s => s.artifacts);
  const setArtifacts = useStore(s => s.setArtifacts);
  
  const [selectedDataframeName, setSelectedDataframeName] = useState<string>('');
  const [params, setParams] = useState<FeaturesTargetParams>({
    sourceVar: 'df',
    targetColumn: '',
    featureColumns: [],
    featuresVarName: 'X',
    targetVarName: 'y',
  });
  const [code, setCode] = useState('');
  const [csvData, setCsvData] = useState<string | undefined>(undefined);
  const [isExecuting, setIsExecuting] = useState(false);
  const [pythonResults, setPythonResults] = useState<Record<string, any> | null>(null);
  const [pythonError, setPythonError] = useState<string | null>(null);
  const [isCodeManuallyEdited, setIsCodeManuallyEdited] = useState(false);
  const [previewArtifactId, setPreviewArtifactId] = useState<string | null>(null);
  const [availableColumns, setAvailableColumns] = useState<string[]>([]);
  const runPythonRef = useRef<(() => void) | null>(null);

  // Auto-select first source dataframe
  useEffect(() => {
    const sourceDataframes = createdDataframes.filter(df => df.type === 'source');
    if (sourceDataframes.length > 0 && !selectedDataframeName) {
      setSelectedDataframeName(sourceDataframes[0].name);
    }
  }, [createdDataframes, selectedDataframeName]);

  // Update params.sourceVar when selection changes
  useEffect(() => {
    if (selectedDataframeName) {
      setParams(prev => ({ ...prev, sourceVar: selectedDataframeName }));
    }
  }, [selectedDataframeName]);

  // Get source file and load CSV data
  const sourceDataframe = createdDataframes.find(df => df.name === selectedDataframeName);
  const sourceFile = sourceDataframe?.sourceFile;

  useEffect(() => {
    const loadCsvData = async () => {
      if (!sourceFile) return;
      const file = window.__fileMap?.get(sourceFile);
      if (file) {
        const text = await file.text();
        setCsvData(text);
        
        // Parse to get columns
        const lines = text.split('\n');
        if (lines.length > 0) {
          const headerLine = lines[0];
          const cols = headerLine.split(',').map(c => c.trim().replace(/['"]/g, ''));
          setAvailableColumns(cols);
          
          // Create preview artifact
          const artifactId = `preview_${selectedDataframeName}`;
          // Use existing artifact if available from Python execution
          if (!artifacts[artifactId]) {
            // Create simple preview from CSV
            const rows = lines.slice(0, 26).map(line => line.split(','));
            setArtifacts({
              [artifactId]: {
                id: artifactId,
                type: 'table',
                payload: { rows }
              }
            });
          }
          setPreviewArtifactId(artifactId);
        }
      }
    };
    loadCsvData();
  }, [sourceFile, selectedDataframeName, artifacts, setArtifacts]);

  // GUI → Code: Generate when params change
  useEffect(() => {
    if (!isCodeManuallyEdited && selectedDataframeName && availableColumns.length > 0) {
      const generatedCode = generateFeaturesTargetCode(params);
      setCode(generatedCode);
    }
  }, [params, isCodeManuallyEdited, selectedDataframeName, availableColumns]);

  // Code → GUI: Parse when code edited
  const handleCodeChange = (newCode: string) => {
    setCode(newCode);
    setIsCodeManuallyEdited(true);
    
    const parsed = parseFeaturesTargetCode(newCode);
    if (parsed) {
      setParams(prev => ({ ...prev, ...parsed }));
    }
    
    setTimeout(() => setIsCodeManuallyEdited(false), 100);
  };

  return (
    <div className="space-y-6">
      {/* Dataframe Selector */}
      <section className="rounded-2xl border bg-white p-4">
        <h3 className="text-sm font-semibold mb-2">Select Source Dataframe</h3>
        {createdDataframes.filter(df => df.type === 'source').length === 0 ? (
          <p className="text-sm text-gray-600">No dataframes available. Please load a CSV first using Run Python.</p>
        ) : (
          <select
            value={selectedDataframeName}
            onChange={(e) => setSelectedDataframeName(e.target.value)}
            className="w-full border rounded px-3 py-2 text-sm"
          >
            <option value="">Select a dataframe...</option>
            {createdDataframes.filter(df => df.type === 'source').map((df) => (
              <option key={df.name} value={df.name}>
                {df.name} ({df.sourceFile}, {df.rowCount} rows)
              </option>
            ))}
          </select>
        )}
      </section>

      {/* Python Attributes + Python Code */}
      {selectedDataframeName && availableColumns.length > 0 && (
        <section className="grid md:grid-cols-2 gap-6">
          <FeaturesTargetAttributes 
            params={params}
            onParamsChange={setParams}
            isExecuting={isExecuting}
            onRunPython={() => runPythonRef.current?.()}
            availableColumns={availableColumns}
          />
          
          <div className="rounded-2xl border bg-white p-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold">Python Code</h3>
              <button
                onClick={() => runPythonRef.current?.()}
                disabled={isExecuting}
                className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors"
              >
                {isExecuting ? 'Executing...' : 'Run Python'}
              </button>
            </div>
            <CodeBlock 
              code={code}
              editable={true}
              csvData={csvData}
              filename={sourceFile}
              onExecuteRef={runPythonRef}
              onExecutingChange={setIsExecuting}
              onResultsChange={(results, error) => {
                setPythonResults(results);
                setPythonError(error);
              }}
              onCodeChange={handleCodeChange}
              dataframeContext={{ 
                type: 'derived', 
                parentDataframe: params.sourceVar 
              }}
            />
          </div>
        </section>
      )}

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
          <h3 className="font-semibold text-green-700">✓ Python Results</h3>
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

