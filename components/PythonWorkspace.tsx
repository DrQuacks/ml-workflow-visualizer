'use client';

import { useState, useEffect, useRef } from 'react';
import CodeBlock from './CodeBlock';

export interface DataframeContext {
  type: 'source' | 'derived';
  parentDataframe?: string;
  colType?: 'full' | 'features' | 'target';
  colTypeMap?: Record<string, 'full' | 'features' | 'target'>;
}

interface PythonWorkspaceProps<TParams> {
  // Initial params
  initialParams: TParams;
  
  // Bidirectional sync functions
  generateCode: (params: TParams) => string;
  parseCode: (code: string) => TParams | null;
  
  // Optional normalization (for split percentages)
  normalizeParams?: (parsed: TParams, current: TParams) => TParams;
  
  // Attributes UI component
  AttributesComponent: React.ComponentType<{
    params: TParams;
    onParamsChange: (params: TParams) => void;
    isExecuting: boolean;
    onRunPython: () => void;
    [key: string]: any;
  }>;
  
  // Additional props to pass to AttributesComponent
  attributesProps?: Record<string, any>;
  
  // Python execution context
  dataframeContext: DataframeContext;
  csvData?: string;
  filename?: string;
  
  // Callbacks
  onParamsChange?: (params: TParams) => void;
  onCodeChange?: (code: string) => void;
  onResultsChange?: (results: any, error: string | null) => void;
  
  // Conditions for code generation
  shouldGenerateCode?: boolean;
}

export default function PythonWorkspace<TParams>({
  initialParams,
  generateCode,
  parseCode,
  normalizeParams,
  AttributesComponent,
  attributesProps = {},
  dataframeContext,
  csvData,
  filename,
  onParamsChange,
  onCodeChange,
  onResultsChange,
  shouldGenerateCode = true,
}: PythonWorkspaceProps<TParams>) {
  const [params, setParams] = useState(initialParams);
  const [code, setCode] = useState('');
  const [isCodeManuallyEdited, setIsCodeManuallyEdited] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const runPythonRef = useRef<(() => void) | null>(null);
  
  // Sync params changes up to parent
  useEffect(() => {
    onParamsChange?.(params);
  }, [params, onParamsChange]);
  
  // GUI → Code: Generate when params change
  useEffect(() => {
    if (!isCodeManuallyEdited && shouldGenerateCode) {
      const generatedCode = generateCode(params);
      setCode(generatedCode);
    }
  }, [params, isCodeManuallyEdited, shouldGenerateCode, generateCode]);
  
  // Code → GUI: Parse when code edited
  const handleCodeChange = (newCode: string) => {
    setCode(newCode);
    setIsCodeManuallyEdited(true);
    onCodeChange?.(newCode);
    
    const parsed = parseCode(newCode);
    if (parsed) {
      const normalized = normalizeParams 
        ? normalizeParams(parsed, params) 
        : parsed;
      setParams(normalized);
    }
    
    setTimeout(() => setIsCodeManuallyEdited(false), 300);
  };
  
  const handleParamsChange = (newParams: TParams) => {
    setParams(newParams);
    setIsCodeManuallyEdited(false); // GUI change resets manual flag
  };
  
  return (
    <section className="grid md:grid-cols-2 gap-6">
      {/* Python Attributes */}
      <AttributesComponent
        params={params}
        onParamsChange={handleParamsChange}
        isExecuting={isExecuting}
        onRunPython={() => runPythonRef.current?.()}
        {...attributesProps}
      />
      
      {/* Python Code */}
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
          filename={filename}
          onExecuteRef={runPythonRef}
          onExecutingChange={setIsExecuting}
          onResultsChange={onResultsChange}
          onCodeChange={handleCodeChange}
          dataframeContext={dataframeContext}
        />
      </div>
    </section>
  );
}

