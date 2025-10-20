'use client';

import type { CleanDataParams } from '@/core/code-sync';

interface CleanDataAttributesProps {
  params: CleanDataParams;
  onParamsChange: (params: CleanDataParams) => void;
  isExecuting: boolean;
  onRunPython: () => void;
  availableColumns: string[];
}

export default function CleanDataAttributes({
  params,
  onParamsChange,
  isExecuting,
  onRunPython,
  availableColumns
}: CleanDataAttributesProps) {
  const updateParam = <K extends keyof CleanDataParams>(
    key: K,
    value: CleanDataParams[K]
  ) => {
    onParamsChange({ ...params, [key]: value });
  };

  return (
    <div className="rounded-2xl border bg-white p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold">Clean Data</h3>
        <button
          onClick={onRunPython}
          disabled={isExecuting || !params.column}
          className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors"
        >
          {isExecuting ? 'Executing...' : 'Run Python'}
        </button>
      </div>

      <div className="space-y-3 text-sm">
        {/* Column Selector */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Column to Clean
          </label>
          <select
            value={params.column}
            onChange={(e) => updateParam('column', e.target.value)}
            className="w-full border rounded px-3 py-2 text-sm"
          >
            <option value="">Select column...</option>
            {availableColumns.map((col) => (
              <option key={col} value={col}>
                {col}
              </option>
            ))}
          </select>
        </div>

        {/* Operation Selector */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Operation
          </label>
          <select
            value={params.operation}
            onChange={(e) => updateParam('operation', e.target.value as CleanDataParams['operation'])}
            className="w-full border rounded px-3 py-2 text-sm"
          >
            <option value="dtype">Change Data Type</option>
            <option value="fill">Fill Missing Values</option>
            <option value="drop">Drop Rows with Missing</option>
          </select>
        </div>

        {/* Dtype Options */}
        {params.operation === 'dtype' && (
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Target Data Type
            </label>
            <select
              value={params.targetDtype || 'float64'}
              onChange={(e) => updateParam('targetDtype', e.target.value)}
              className="w-full border rounded px-3 py-2 text-sm"
            >
              <option value="int64">Integer (int64)</option>
              <option value="float64">Float (float64)</option>
              <option value="str">String (str)</option>
              <option value="bool">Boolean (bool)</option>
              <option value="category">Category</option>
            </select>
          </div>
        )}

        {/* Fill Options */}
        {params.operation === 'fill' && (
          <>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Fill Strategy
              </label>
              <select
                value={params.fillStrategy || 'mean'}
                onChange={(e) => updateParam('fillStrategy', e.target.value as CleanDataParams['fillStrategy'])}
                className="w-full border rounded px-3 py-2 text-sm"
              >
                <option value="mean">Mean (average)</option>
                <option value="median">Median (middle value)</option>
                <option value="mode">Mode (most frequent)</option>
                <option value="ffill">Forward Fill</option>
                <option value="bfill">Backward Fill</option>
                <option value="constant">Constant Value</option>
              </select>
            </div>

            {params.fillStrategy === 'constant' && (
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Fill Value
                </label>
                <input
                  type="text"
                  value={params.fillValue || ''}
                  onChange={(e) => updateParam('fillValue', e.target.value)}
                  placeholder="Enter value..."
                  className="w-full border rounded px-3 py-2 text-sm"
                />
              </div>
            )}
          </>
        )}

        {/* Output Variable Name */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Output Variable Name
          </label>
          <input
            type="text"
            value={params.outputVar}
            onChange={(e) => updateParam('outputVar', e.target.value)}
            placeholder="df_clean"
            className="w-full border rounded px-3 py-2 text-sm"
          />
        </div>

        {params.operation === 'drop' && (
          <p className="text-xs text-gray-600 italic">
            This will remove all rows that have missing values in the selected column.
          </p>
        )}
      </div>
    </div>
  );
}

