'use client';

import React from 'react';
import PythonExecutor from './PythonExecutor';

interface CodeBlockProps {
  code: string;
  editable?: boolean;
  csvData?: string;
  filename?: string;
  onExecuteRef?: React.MutableRefObject<(() => void) | null>;
  onExecutingChange?: (isExecuting: boolean) => void;
  onResultsChange?: (results: Record<string, any> | null, error: string | null) => void;
}

export default function CodeBlock({ code, editable = false, csvData, filename, onExecuteRef, onExecutingChange, onResultsChange }: CodeBlockProps) {
  if (editable) {
    return <PythonExecutor 
      initialCode={code} 
      csvData={csvData} 
      filename={filename} 
      onExecuteRef={onExecuteRef}
      onExecutingChange={onExecutingChange}
      onResultsChange={onResultsChange}
    />;
  }

  return (
    <pre className="rounded-lg bg-gray-50 border p-3 overflow-auto whitespace-pre-wrap">
      <code>{code}</code>
    </pre>
  );
}
