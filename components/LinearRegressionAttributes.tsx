'use client';

import type { LinearRegressionParams } from '@/core/code-sync';

interface LinearRegressionAttributesProps {
  params: LinearRegressionParams;
  onParamsChange: (params: LinearRegressionParams) => void;
  isExecuting: boolean;
  onRunPython: () => void;
}

export default function LinearRegressionAttributes({ 
  params, 
  onParamsChange, 
  isExecuting, 
  onRunPython 
}: LinearRegressionAttributesProps) {
  const updateParam = <K extends keyof LinearRegressionParams>(
    key: K, 
    value: LinearRegressionParams[K]
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
        {/* Model Variable Name */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Model Variable Name</label>
          <input
            className="w-full border rounded px-2 py-1"
            value={params.modelVar}
            onChange={(e) => updateParam('modelVar', e.target.value)}
            placeholder="model"
          />
        </div>

        {/* Fit Intercept */}
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="fit-intercept"
            checked={params.fitIntercept}
            onChange={(e) => updateParam('fitIntercept', e.target.checked)}
            className="rounded"
          />
          <label htmlFor="fit-intercept" className="text-sm">Fit Intercept</label>
        </div>
      </div>
    </div>
  );
}

