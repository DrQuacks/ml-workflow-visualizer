'use client';

import type { FeaturesTargetParams } from '@/core/code-sync';

interface FeaturesTargetAttributesProps {
  params: FeaturesTargetParams;
  onParamsChange: (params: FeaturesTargetParams) => void;
  isExecuting: boolean;
  onRunPython: () => void;
  availableColumns: string[];
}

export default function FeaturesTargetAttributes({ 
  params, 
  onParamsChange, 
  isExecuting, 
  onRunPython,
  availableColumns 
}: FeaturesTargetAttributesProps) {
  const { targetColumn, featureColumns, featuresVarName, targetVarName } = params;

  const addFeatureColumn = () => {
    // Find first available column not already selected
    const available = availableColumns.filter(c => 
      c !== targetColumn && !featureColumns.includes(c)
    );
    if (available.length > 0) {
      onParamsChange({
        ...params,
        featureColumns: [...featureColumns, available[0]]
      });
    }
  };

  const removeFeatureColumn = (index: number) => {
    onParamsChange({
      ...params,
      featureColumns: featureColumns.filter((_, i) => i !== index)
    });
  };

  const updateFeatureColumn = (index: number, newCol: string) => {
    onParamsChange({
      ...params,
      featureColumns: featureColumns.map((col, i) => i === index ? newCol : col)
    });
  };

  const updateParam = <K extends keyof FeaturesTargetParams>(key: K, value: FeaturesTargetParams[K]) => {
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

      <div className="space-y-4 text-sm">
        {/* Variable Names */}
        <div className="space-y-2">
          <div className="text-xs uppercase text-gray-500">Variable Names</div>
          <div className="flex items-center gap-2">
            <label className="w-28 text-gray-700">Features</label>
            <input
              className="border rounded px-2 py-1 flex-1"
              value={featuresVarName}
              onChange={(e) => updateParam('featuresVarName', e.target.value)}
              placeholder="X"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="w-28 text-gray-700">Target</label>
            <input
              className="border rounded px-2 py-1 flex-1"
              value={targetVarName}
              onChange={(e) => updateParam('targetVarName', e.target.value)}
              placeholder="y"
            />
          </div>
        </div>

        {/* Target Column */}
        <div className="space-y-2">
          <div className="text-xs uppercase text-gray-500">Target Column</div>
          <select
            value={targetColumn}
            onChange={(e) => updateParam('targetColumn', e.target.value)}
            className="w-full border rounded px-2 py-1"
          >
            <option value="">Select target column...</option>
            {availableColumns.map(col => (
              <option key={col} value={col}>{col}</option>
            ))}
          </select>
        </div>

        {/* Feature Columns */}
        <div className="space-y-2">
          <div className="text-xs uppercase text-gray-500">Feature Columns</div>
          <div className="space-y-2">
            {featureColumns.map((col, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <select
                  value={col}
                  onChange={(e) => updateFeatureColumn(idx, e.target.value)}
                  className="flex-1 border rounded px-2 py-1"
                >
                  {availableColumns.filter(c => c !== targetColumn).map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
                <button
                  onClick={() => removeFeatureColumn(idx)}
                  className="text-xs text-red-600 hover:text-red-800 px-2 py-1 hover:bg-red-50 rounded"
                >
                  Remove
                </button>
              </div>
            ))}
            <button
              onClick={addFeatureColumn}
              disabled={availableColumns.filter(c => c !== targetColumn && !featureColumns.includes(c)).length === 0}
              className="w-full px-3 py-2 border border-dashed rounded text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              + Add Column
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

