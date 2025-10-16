'use client';

import { useState, useEffect } from 'react';
import PythonCodeEditor from './PythonCodeEditor';
import { executeCode, isPyodideReady } from '@/core/python-runtime';
import { useStore } from '@/core/state';

interface PythonExecutorProps {
  initialCode: string;
  csvData?: string;
  filename?: string;
}

export default function PythonExecutor({ initialCode, csvData, filename }: PythonExecutorProps) {
  const [code, setCode] = useState(initialCode);
  const [isExecuting, setIsExecuting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<Record<string, any> | null>(null);
  const [executionTime, setExecutionTime] = useState<number | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  const addCreatedDataframe = useStore(s => s.addCreatedDataframe);

  // Ensure component only renders on client
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Update code when initialCode prop changes
  useEffect(() => {
    setCode(initialCode);
  }, [initialCode]);

  if (!isMounted) {
    return <div className="p-4 border rounded-lg bg-gray-50">Loading editor...</div>;
  }

  const handleExecute = async () => {
    setIsExecuting(true);
    setError(null);
    setResults(null);
    
    const startTime = performance.now();
    
    try {
      const output = await executeCode({ code, csvData, filename });
      const endTime = performance.now();
      setExecutionTime(endTime - startTime);
      setResults(output);
      
      // Save DataFrame metadata to state
      Object.entries(output).forEach(([name, value]: [string, any]) => {
        if (value && value.type === 'dataframe') {
          addCreatedDataframe({
            name,
            sourceFile: filename || 'unknown',
            rowCount: value.shape[0],
          });
        }
      });
    } catch (err: any) {
      setError(err.message || 'An error occurred during execution');
    } finally {
      setIsExecuting(false);
    }
  };

  const hasResults = results && Object.keys(results).length > 0;
  const isReady = isPyodideReady();

  return (
    <div className="space-y-4">
      {/* Editor */}
      <div className="border rounded-lg overflow-hidden">
        <div className="flex items-center justify-between px-4 py-2 bg-gray-800 text-white text-sm">
          <span>Python Code (Editable)</span>
          <button
            onClick={handleExecute}
            disabled={isExecuting}
            className="px-3 py-1 bg-blue-600 rounded hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors"
          >
            {isExecuting 
              ? 'Executing...' 
              : isReady 
              ? 'Run Python' 
              : 'Run Python (First run loads Python runtime ~10MB)'}
          </button>
        </div>
        {code ? (
          <PythonCodeEditor code={code} onChange={setCode} />
        ) : (
          <div className="p-4 bg-gray-800 text-gray-400 text-sm">
            No code to display. Check if code is being generated properly.
          </div>
        )}
      </div>

      {/* Execution Time */}
      {executionTime !== null && !error && (
        <div className="text-xs text-gray-600">
          Executed in {executionTime.toFixed(0)}ms
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <h4 className="font-semibold text-red-800 mb-2">Python Error</h4>
          <pre className="text-xs text-red-700 whitespace-pre-wrap font-mono overflow-x-auto">
            {error}
          </pre>
        </div>
      )}

      {/* Results Display */}
      {hasResults && (
        <div className="space-y-4">
          <h4 className="font-semibold text-green-700">✓ Execution Successful</h4>
          {Object.entries(results).map(([varName, value]: [string, any]) => {
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
        </div>
      )}

      {/* No Results Message */}
      {!hasResults && !error && results !== null && (
        <div className="p-4 border rounded-lg bg-gray-50">
          <p className="text-sm text-gray-600">
            Code executed successfully, but no variables were returned. 
            Make sure your code creates variables like <code>train_df</code> or <code>test_df</code>.
          </p>
        </div>
      )}
    </div>
  );
}

