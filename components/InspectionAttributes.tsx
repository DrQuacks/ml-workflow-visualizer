'use client';

import type { InspectionParams } from '@/core/code-sync';

interface InspectionAttributesProps {
  params: InspectionParams;
  onParamsChange: (params: InspectionParams) => void;
  isExecuting: boolean;
  onRunPython: () => void;
}

export default function InspectionAttributes({
  params,
  onParamsChange,
  isExecuting,
  onRunPython
}: InspectionAttributesProps) {
  const updateParam = <K extends keyof InspectionParams>(
    key: K,
    value: InspectionParams[K]
  ) => {
    onParamsChange({ ...params, [key]: value });
  };

  return (
    <div className="rounded-2xl border bg-white p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold">Data Inspection</h3>
        <button
          onClick={onRunPython}
          disabled={isExecuting}
          className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors"
        >
          {isExecuting ? 'Executing...' : 'Run Python'}
        </button>
      </div>

      <div className="space-y-3 text-sm">
        {/* Show Data Types */}
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="show-dtypes"
            checked={params.showDtypes}
            onChange={(e) => updateParam('showDtypes', e.target.checked)}
            className="rounded"
          />
          <label htmlFor="show-dtypes" className="text-sm cursor-pointer">
            Show Data Types (.dtypes)
          </label>
        </div>

        {/* Show Head */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="show-head"
              checked={params.showHead}
              onChange={(e) => updateParam('showHead', e.target.checked)}
              className="rounded"
            />
            <label htmlFor="show-head" className="text-sm cursor-pointer">
              Show First Rows (.head)
            </label>
          </div>
          {params.showHead && (
            <div className="ml-6">
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Number of rows
              </label>
              <input
                type="number"
                min="1"
                max="100"
                value={params.headRows}
                onChange={(e) => updateParam('headRows', parseInt(e.target.value) || 5)}
                className="w-24 border rounded px-2 py-1 text-sm"
              />
            </div>
          )}
        </div>

        {/* Show Describe */}
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="show-describe"
            checked={params.showDescribe}
            onChange={(e) => updateParam('showDescribe', e.target.checked)}
            className="rounded"
          />
          <label htmlFor="show-describe" className="text-sm cursor-pointer">
            Show Statistical Summary (.describe)
          </label>
        </div>
      </div>
    </div>
  );
}

