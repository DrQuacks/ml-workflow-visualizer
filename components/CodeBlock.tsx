'use client';

import PythonExecutor from './PythonExecutor';

interface CodeBlockProps {
  code: string;
  editable?: boolean;
  csvData?: string;
  filename?: string;
}

export default function CodeBlock({ code, editable = false, csvData, filename }: CodeBlockProps) {
  if (editable) {
    return <PythonExecutor initialCode={code} csvData={csvData} filename={filename} />;
  }

  return (
    <pre className="rounded-lg bg-gray-50 border p-3 overflow-auto whitespace-pre-wrap">
      <code>{code}</code>
    </pre>
  );
}
