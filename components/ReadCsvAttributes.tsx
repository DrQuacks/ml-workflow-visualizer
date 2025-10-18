'use client';

import type { ReadCsvParams } from '@/core/code-sync';

interface ReadCsvAttributesProps {
  params: ReadCsvParams;
  onParamsChange: (params: ReadCsvParams) => void;
  isExecuting: boolean;
  onRunPython: () => void;
}

export default function ReadCsvAttributes({ 
  params, 
  onParamsChange, 
  isExecuting, 
  onRunPython 
}: ReadCsvAttributesProps) {
  const updateParam = <K extends keyof ReadCsvParams>(
    key: K, 
    value: ReadCsvParams[K]
  ) => {
    onParamsChange({ ...params, [key]: value });
  };

  return (
    <div className="rounded-2xl border bg-white p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold">Python Attributes</h3>
        <button
          onClick={onRunPython}
          disabled={isExecuting}
          className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors"
        >
          {isExecuting ? 'Executing...' : 'Run Python'}
        </button>
      </div>

      <div className="space-y-3 text-sm">
        {/* Name */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Name</label>
          <input
            className="w-full border rounded px-2 py-1"
            value={params.varName}
            onChange={(e) => updateParam('varName', e.target.value)}
            placeholder="df"
          />
        </div>

        {/* Delimiter */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Delimiter</label>
          <input
            className="w-full border rounded px-2 py-1"
            value={params.delimiter}
            onChange={(e) => updateParam('delimiter', e.target.value)}
            placeholder=","
          />
        </div>

        {/* Header */}
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="header-checkbox"
            checked={params.header}
            onChange={(e) => updateParam('header', e.target.checked)}
            className="rounded"
          />
          <label htmlFor="header-checkbox" className="text-sm">First row is header</label>
        </div>

        {/* Encoding */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Encoding</label>
          <input
            className="w-full border rounded px-2 py-1"
            value={params.encoding}
            onChange={(e) => updateParam('encoding', e.target.value)}
            placeholder="utf-8"
          />
        </div>
      </div>
    </div>
  );
}

