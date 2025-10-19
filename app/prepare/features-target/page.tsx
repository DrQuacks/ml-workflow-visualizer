'use client';

import { useState, useEffect } from 'react';
import { useStore } from '@/core/state';
import PythonWorkspace from '@/components/PythonWorkspace';
import FeaturesTargetAttributes from '@/components/FeaturesTargetAttributes';
import TablePreview from '@/components/TablePreview';
import { parseFeaturesTargetCode, generateFeaturesTargetCode, type FeaturesTargetParams } from '@/core/code-sync';
import { getDataframeColumns, isPyodideReady, verifyDataframesExist } from '@/core/python-runtime';

export default function FeaturesTargetPage() {
  const createdDataframes = useStore(s => s.createdDataframes);
  const removeCreatedDataframe = useStore(s => s.removeCreatedDataframe);
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
  const [csvData, setCsvData] = useState<string | undefined>(undefined);
  const [pythonResults, setPythonResults] = useState<Record<string, any> | null>(null);
  const [pythonError, setPythonError] = useState<string | null>(null);
  const [previewArtifactId, setPreviewArtifactId] = useState<string | null>(null);
  const [availableColumns, setAvailableColumns] = useState<string[]>([]);

  // Verify and clean up stale DataFrames on mount
  useEffect(() => {
    const syncState = async () => {
      if (!isPyodideReady() || createdDataframes.length === 0) return;
      
      const names = createdDataframes.map(df => df.name);
      const existing = await verifyDataframesExist(names);
      const stale = names.filter(n => !existing.includes(n));
      
      if (stale.length > 0) {
        console.log('[State Sync] Removing stale DataFrames:', stale);
        stale.forEach(name => removeCreatedDataframe(name));
      }
    };
    
    syncState();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-select first dataframe with colType 'full'
  useEffect(() => {
    const fullDataframes = createdDataframes.filter(df => df.colType === 'full');
    if (fullDataframes.length > 0 && !selectedDataframeName) {
      setSelectedDataframeName(fullDataframes[0].name);
    }
  }, [createdDataframes, selectedDataframeName]);

  // Update params.sourceVar when selection changes
  useEffect(() => {
    if (selectedDataframeName) {
      setParams(prev => ({ ...prev, sourceVar: selectedDataframeName }));
    }
  }, [selectedDataframeName]);

  // Initialize with at least one feature column when columns become available
  useEffect(() => {
    if (availableColumns.length > 0 && params.featureColumns.length === 0) {
      // Find first column that's not the target
      const firstAvailable = availableColumns.find(c => c !== params.targetColumn);
      if (firstAvailable) {
        setParams(prev => ({ ...prev, featureColumns: [firstAvailable] }));
      }
    }
  }, [availableColumns, params.featureColumns.length, params.targetColumn]);

  // Get source file and load CSV data
  const sourceDataframe = createdDataframes.find(df => df.name === selectedDataframeName);
  const sourceFile = sourceDataframe?.sourceFile;

  // Fetch columns from selected DataFrame and create preview
  useEffect(() => {
    const fetchColumns = async () => {
      if (!selectedDataframeName) {
        setAvailableColumns([]);
        setPreviewArtifactId(null);
        return;
      }
      
      // Try to get columns from Python if available
      if (isPyodideReady()) {
        const cols = await getDataframeColumns(selectedDataframeName);
        if (cols.length > 0) {
          // Deduplicate columns
          const uniqueCols = [...new Set(cols)];
          setAvailableColumns(uniqueCols);
        }
      }
      
      // Always try to create preview from CSV file if available
      if (sourceFile) {
        const file = window.__fileMap?.get(sourceFile);
        if (file) {
          try {
            const text = await file.text();
            const lines = text.split('\n').filter(l => l.trim());
            if (lines.length > 0) {
              // If we don't have columns from Python, parse from CSV
              if (availableColumns.length === 0) {
                const headerLine = lines[0];
                const cols = headerLine.split(',').map(c => c.trim().replace(/['"]/g, ''));
                // Deduplicate columns
                const uniqueCols = [...new Set(cols)];
                setAvailableColumns(uniqueCols);
              }
              
              // Create preview artifact
              const rows = lines.slice(0, 26).map(line => line.split(',').map(cell => cell.trim()));
              const artifactId = `preview_ft_${selectedDataframeName}`;
              setArtifacts({
                [artifactId]: {
                  id: artifactId,
                  type: 'table',
                  payload: { rows }
                }
              });
              setPreviewArtifactId(artifactId);
            }
          } catch (error) {
            console.error('Failed to create preview:', error);
          }
        }
      }
    };

    fetchColumns();
  }, [selectedDataframeName, sourceFile]); // Removed setArtifacts to avoid dependency issues

  // Load CSV data for Python execution
  useEffect(() => {
    const loadCsvData = async () => {
      if (!sourceFile) return;
      const file = window.__fileMap?.get(sourceFile);
      if (file) {
        const text = await file.text();
        setCsvData(text);
      }
    };
    loadCsvData();
  }, [sourceFile]);


  return (
    <div className="space-y-6">
      {/* Dataframe Selector */}
      <section className="rounded-2xl border bg-white p-4">
        <h3 className="text-sm font-semibold mb-2">Select Source Dataframe</h3>
        {createdDataframes.filter(df => df.colType === 'full').length === 0 ? (
          <p className="text-sm text-gray-600">No dataframes available. Please load a CSV or create splits first using Run Python.</p>
        ) : (
          <select
            value={selectedDataframeName}
            onChange={(e) => setSelectedDataframeName(e.target.value)}
            className="w-full border rounded px-3 py-2 text-sm"
          >
            <option value="">Select a dataframe...</option>
            {createdDataframes.filter(df => df.colType === 'full').map((df) => (
              <option key={df.name} value={df.name}>
                {df.name} ({df.sourceFile}, {df.rowCount} rows)
              </option>
            ))}
          </select>
        )}
      </section>

      {/* Warning if DataFrame not in Python */}
      {selectedDataframeName && availableColumns.length === 0 && isPyodideReady() && (
        <section className="rounded-2xl border border-yellow-200 bg-yellow-50 p-4">
          <p className="text-sm text-yellow-800">
            <strong>Note:</strong> DataFrame <code className="bg-yellow-100 px-1 rounded">{selectedDataframeName}</code> hasn't been created in Python yet. 
            Please run Python on the Load CSV or Split page first to create this DataFrame.
          </p>
        </section>
      )}

      {/* Python Workspace */}
      {selectedDataframeName && availableColumns.length > 0 && (
        <PythonWorkspace
          initialParams={params}
          generateCode={generateFeaturesTargetCode}
          parseCode={parseFeaturesTargetCode}
          // @ts-ignore - availableColumns passed via attributesProps
          AttributesComponent={FeaturesTargetAttributes}
          attributesProps={{ availableColumns }}
          dataframeContext={{ 
            type: 'derived', 
            parentDataframe: params.sourceVar,
            colTypeMap: {
              [params.featuresVarName]: 'features',
              [params.targetVarName]: 'target'
            }
          }}
          csvData={csvData}
          filename={sourceFile}
          onParamsChange={setParams}
          onResultsChange={(results, error) => {
            setPythonResults(results);
            setPythonError(error);
          }}
          shouldGenerateCode={!!selectedDataframeName && availableColumns.length > 0}
        />
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
        <section className="space-y-4">
          <h3 className="font-semibold text-green-700">✓ Python Results</h3>
          <div className="grid grid-cols-12 gap-6">
            {/* X DataFrame (wider - 8 cols) */}
            {pythonResults[params.featuresVarName] && pythonResults[params.featuresVarName].type === 'dataframe' && (
              <div className="col-span-8">
                {(() => {
                  const { columns, data, shape } = pythonResults[params.featuresVarName];
                  return (
                    <div className="border rounded-lg overflow-hidden bg-white">
                      <div className="px-4 py-2 bg-gray-50 border-b">
                        <p className="text-sm font-medium">
                          <code className="bg-gray-200 px-1 rounded">{params.featuresVarName}</code> (features)
                          <span className="text-gray-600 ml-2">
                            {shape[0]} rows × {shape[1]} columns
                          </span>
                        </p>
                      </div>
                      <div className="overflow-auto max-h-96">
                        <table className="min-w-full text-xs">
                          <thead className="bg-gray-100 sticky top-0">
                            <tr>
                              <th className="px-1 py-1 text-left font-semibold sticky left-0 bg-gray-100 z-10 w-12 text-xs">index</th>
                              {columns.map((col: string, i: number) => (
                                <th key={i} className="px-2 py-1 text-left font-semibold whitespace-nowrap">
                                  {col}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {data.map((row: any[], ri: number) => (
                              <tr key={ri} className="odd:bg-white even:bg-gray-50">
                                <td className="px-1 py-1 text-gray-500 font-medium sticky left-0 bg-inherit border-r text-xs">{ri}</td>
                                {row.map((cell: any, ci: number) => (
                                  <td key={ci} className="px-2 py-1 whitespace-nowrap">
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
                })()}
              </div>
            )}

            {/* y Series (narrower - 4 cols) */}
            {pythonResults[params.targetVarName] && (
              pythonResults[params.targetVarName].type === 'dataframe' || 
              pythonResults[params.targetVarName].type === 'series'
            ) && (
              <div className="col-span-4">
                {(() => {
                  const result = pythonResults[params.targetVarName];
                  
                  // Handle Series
                  if (result.type === 'series') {
                    const { name, data, shape } = result;
                    return (
                      <div className="border rounded-lg overflow-hidden bg-white">
                        <div className="px-4 py-2 bg-gray-50 border-b">
                          <p className="text-sm font-medium">
                            <code className="bg-gray-200 px-1 rounded">{params.targetVarName}</code> (target - Series)
                            <span className="text-gray-600 ml-2">
                              {shape[0]} values
                            </span>
                          </p>
                        </div>
                        <div className="overflow-auto max-h-96">
                          <table className="min-w-full text-xs">
                            <thead className="bg-gray-100 sticky top-0">
                              <tr>
                                <th className="px-1 py-1 text-left font-semibold bg-gray-100 w-12 text-xs">index</th>
                                <th className="px-2 py-1 text-left font-semibold">{name || 'Value'}</th>
                              </tr>
                            </thead>
                            <tbody>
                              {data.map((cell: any, ri: number) => (
                                <tr key={ri} className="odd:bg-white even:bg-gray-50">
                                  <td className="px-1 py-1 text-gray-500 font-medium border-r text-xs">{ri}</td>
                                  <td className="px-2 py-1">
                                    {cell === null ? (
                                      <span className="text-gray-400 italic">null</span>
                                    ) : (
                                      String(cell)
                                    )}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    );
                  }
                  
                  // Handle DataFrame
                  const { columns, data, shape } = result;
                  return (
                    <div className="border rounded-lg overflow-hidden bg-white">
                      <div className="px-4 py-2 bg-gray-50 border-b">
                        <p className="text-sm font-medium">
                          <code className="bg-gray-200 px-1 rounded">{params.targetVarName}</code> (target)
                          <span className="text-gray-600 ml-2">
                            {shape[0]} rows
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
                })()}
              </div>
            )}
          </div>
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

