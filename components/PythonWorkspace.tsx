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
  const [paramsBeforeEdit, setParamsBeforeEdit] = useState<TParams | null>(null);
  const runPythonRef = useRef<(() => void) | null>(null);
  
  // Sync params from parent when initialParams changes (parent is source of truth)
  useEffect(() => {
    setParams(initialParams);
  }, [initialParams]);
  
  // GUI → Code: Generate when params change
  useEffect(() => {
    if (!isCodeManuallyEdited && shouldGenerateCode) {
      const generatedCode = generateCode(params);
      setCode(generatedCode);
    }
  }, [params, isCodeManuallyEdited, shouldGenerateCode, generateCode]);
  
  // Code onChange: Parse immediately (NO normalization)
  const handleCodeChange = (newCode: string) => {
    // Save original params on first edit
    if (!isCodeManuallyEdited) {
      setParamsBeforeEdit(params);
      setIsCodeManuallyEdited(true);
    }
    
    setCode(newCode);
    onCodeChange?.(newCode);
    
    const parsed = parseCode(newCode);
    if (parsed) {
      setParams(parsed);  // Direct update, no normalization
      onParamsChange?.(parsed);
    }
  };
  
  // Code onBlur: Normalize after user finishes editing
  const handleCodeBlur = () => {
    if (!isCodeManuallyEdited || !paramsBeforeEdit) return;
    
    const currentParsed = parseCode(code);
    if (currentParsed && normalizeParams) {
      console.log('[PythonWorkspace] Normalizing on blur');
      // Compare to params BEFORE editing started
      const normalized = normalizeParams(currentParsed, paramsBeforeEdit);
      setParams(normalized);
      onParamsChange?.(normalized);
    }
    
    // Reset edit state
    setIsCodeManuallyEdited(false);
    setParamsBeforeEdit(null);
  };
  
  // Attributes onChange: Direct update (normalization already in component)
  const handleParamsChange = (newParams: TParams) => {
    setParams(newParams);
    onParamsChange?.(newParams);
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
          onCodeBlur={handleCodeBlur}
          dataframeContext={dataframeContext}
        />
      </div>
    </section>
  );
}

