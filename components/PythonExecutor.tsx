'use client';

import { useState, useEffect, useCallback } from 'react';
import PythonCodeEditor from './PythonCodeEditor';
import { executeCode, isPyodideReady } from '@/core/python-runtime';
import { useStore } from '@/core/state';

interface DataframeContext {
  type: 'source' | 'derived';
  parentDataframe?: string;
  colType?: 'full' | 'features' | 'target';
  colTypeMap?: Record<string, 'full' | 'features' | 'target'>;
}

interface PythonExecutorProps {
  initialCode: string;
  csvData?: string;
  filename?: string;
  onExecuteRef?: React.MutableRefObject<(() => void) | null>;
  onExecutingChange?: (isExecuting: boolean) => void;
  onResultsChange?: (results: Record<string, any> | null, error: string | null) => void;
  onCodeChange?: (code: string) => void;
  onCodeBlur?: () => void;
  dataframeContext: DataframeContext;
}

export default function PythonExecutor({ initialCode, csvData, filename, onExecuteRef, onExecutingChange, onResultsChange, onCodeChange, onCodeBlur, dataframeContext }: PythonExecutorProps) {
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

  const handleExecute = useCallback(async () => {
    setIsExecuting(true);
    onExecutingChange?.(true);
    setError(null);
    setResults(null);
    onResultsChange?.(null, null);
    
    const startTime = performance.now();
    
    try {
      const output = await executeCode({ code, csvData, filename });
      const endTime = performance.now();
      setExecutionTime(endTime - startTime);
      setResults(output);
      onResultsChange?.(output, null);
      
      // Save DataFrame and Series metadata to state with context
      Object.entries(output).forEach(([name, value]: [string, any]) => {
        if (value && (value.type === 'dataframe' || value.type === 'series')) {
          // Determine colType from map or default
          let colType: 'full' | 'features' | 'target' = 'full';
          if (dataframeContext.colTypeMap && dataframeContext.colTypeMap[name]) {
            colType = dataframeContext.colTypeMap[name];
          } else if (dataframeContext.colType) {
            colType = dataframeContext.colType;
          }
          
          console.log('[PythonExecutor] Saving dataframe:', name, 'with colType:', colType, 'from context:', dataframeContext);
          addCreatedDataframe({
            name,
            sourceFile: filename || 'unknown',
            rowCount: value.shape[0],
            type: dataframeContext.type,
            parentDataframe: dataframeContext.parentDataframe,
            colType,
          });
        }
      });
    } catch (err: any) {
      const errorMsg = err.message || 'An error occurred during execution';
      setError(errorMsg);
      onResultsChange?.(null, errorMsg);
    } finally {
      setIsExecuting(false);
      onExecutingChange?.(false);
    }
  }, [code, csvData, filename, dataframeContext, addCreatedDataframe, onExecutingChange, onResultsChange]);

  // Expose execute function to parent via ref
  useEffect(() => {
    if (onExecuteRef) {
      onExecuteRef.current = handleExecute;
    }
  }, [handleExecute, onExecuteRef]);

  const hasResults = results && Object.keys(results).length > 0;
  const isReady = isPyodideReady();

  if (!isMounted) {
    return <div className="p-4 border rounded-lg bg-gray-50">Loading editor...</div>;
  }

  return (
    <div className="border rounded-lg overflow-hidden">
      {code ? (
        <PythonCodeEditor 
          code={code} 
          onChange={(newCode) => {
            setCode(newCode);
            onCodeChange?.(newCode);
          }}
          onBlur={onCodeBlur}
        />
      ) : (
        <div className="p-4 bg-gray-800 text-gray-400 text-sm">
          No code to display. Check if code is being generated properly.
        </div>
      )}
    </div>
  );
}

