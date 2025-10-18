'use client';

import { useState, useEffect } from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { useStore } from '@/core/state';
import PythonWorkspace from '@/components/PythonWorkspace';
import SplitAttributes from '@/components/SplitAttributes';
import { parseSplitCode, generateSplitCode, type SplitParams } from '@/core/code-sync';
import { isPyodideReady, verifyDataframesExist } from '@/core/python-runtime';
// Import to register the plugin
import '@/plugins/prep.train_test_split';

// Normalization function to ensure percentages sum to 100%
// Detects which values changed and adjusts the others
const normalizeSplitPercentages = (parsed: SplitParams, current: SplitParams): SplitParams => {
  const { trainPercent, validationPercent, testPercent, splitOrder } = parsed;
  const total = trainPercent + validationPercent + testPercent;
  
  if (total === 100) {
    return parsed; // Already correct
  }
  
  // Find which value(s) the user changed
  const trainChanged = trainPercent !== current.trainPercent;
  const valChanged = validationPercent !== current.validationPercent;
  const testChanged = testPercent !== current.testPercent;
  
  const diff = 100 - total;
  const newPercentages: Record<string, number> = {
    train: trainPercent,
    validation: validationPercent,
    test: testPercent,
  };
  
  // Find splits in order that were NOT changed
  const unchangedSplits = splitOrder.filter(s => {
    if (s === 'train') return !trainChanged;
    if (s === 'validation') return !valChanged;
    if (s === 'test') return !testChanged;
    return false;
  });
  
  if (unchangedSplits.length > 0) {
    // Distribute diff to first unchanged split
    const targetSplit = unchangedSplits[0];
    newPercentages[targetSplit] += diff;
  } else {
    // All were changed? Just adjust first one
    newPercentages[splitOrder[0]] += diff;
  }
  
  return {
    ...parsed,
    trainPercent: Math.max(0, Math.min(100, newPercentages.train)),
    validationPercent: Math.max(0, Math.min(100, newPercentages.validation)),
    testPercent: Math.max(0, Math.min(100, newPercentages.test)),
  };
};

export default function SplitPage() {
  const createdDataframes = useStore(s => s.createdDataframes);
  const removeCreatedDataframe = useStore(s => s.removeCreatedDataframe);
  const [selectedDataframeName, setSelectedDataframeName] = useState<string>('');
  const [params, setParams] = useState<SplitParams>({
    sourceVar: 'df',
    includeValidation: false,
    trainPercent: 80,
    validationPercent: 0,
    testPercent: 20,
    splitOrder: ['train', 'test']
  });
  const [csvData, setCsvData] = useState<string | undefined>(undefined);
  const [pythonResults, setPythonResults] = useState<Record<string, any> | null>(null);
  const [pythonError, setPythonError] = useState<string | null>(null);

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

  // Auto-select first source dataframe with colType 'full'
  useEffect(() => {
    const sourceDataframes = createdDataframes.filter(df => df.type === 'source' && df.colType === 'full');
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

  // Get source file for loading CSV data
  const sourceDataframe = createdDataframes.find(df => df.name === selectedDataframeName);
  const sourceFile = sourceDataframe?.sourceFile;

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
    <DndProvider backend={HTML5Backend}>
      <div className="space-y-6">
        {/* Dataframe Selector */}
        <section className="rounded-2xl border bg-white p-4">
          <h3 className="text-sm font-semibold mb-2">Select Source Dataframe</h3>
          {createdDataframes.filter(df => df.type === 'source' && df.colType === 'full').length === 0 ? (
            <p className="text-sm text-gray-600">No dataframes available. Please load a CSV first using Run Python.</p>
          ) : (
            <select
              value={selectedDataframeName}
              onChange={(e) => setSelectedDataframeName(e.target.value)}
              className="w-full border rounded px-3 py-2 text-sm"
            >
              <option value="">Select a dataframe...</option>
              {createdDataframes.filter(df => df.type === 'source' && df.colType === 'full').map((df) => (
                <option key={df.name} value={df.name}>
                  {df.name} ({df.sourceFile}, {df.rowCount} rows)
                </option>
              ))}
            </select>
          )}
        </section>

        {/* Python Workspace */}
        {selectedDataframeName && (
          <PythonWorkspace
            initialParams={params}
            generateCode={generateSplitCode}
            parseCode={parseSplitCode}
            normalizeParams={normalizeSplitPercentages}
            AttributesComponent={SplitAttributes}
            dataframeContext={{ 
              type: 'derived', 
              parentDataframe: params.sourceVar,
              colType: 'full'
            }}
            csvData={csvData}
            filename={sourceFile}
            onParamsChange={setParams}
            onResultsChange={(results, error) => {
              setPythonResults(results);
              setPythonError(error);
            }}
            shouldGenerateCode={!!selectedDataframeName}
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
      </div>
    </DndProvider>
  );
}
