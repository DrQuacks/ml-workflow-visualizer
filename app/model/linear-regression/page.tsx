'use client';

import { useState, useEffect } from 'react';
import { useStore } from '@/core/state';
import PythonWorkspace from '@/components/PythonWorkspace';
import LinearRegressionAttributes from '@/components/LinearRegressionAttributes';
import { generateLinearRegressionCode, parseLinearRegressionCode, type LinearRegressionParams } from '@/core/code-sync';
import { isPyodideReady, verifyDataframesExist } from '@/core/python-runtime';

export default function LinearRegressionPage() {
  const createdDataframes = useStore(s => s.createdDataframes);
  const removeCreatedDataframe = useStore(s => s.removeCreatedDataframe);
  
  const [params, setParams] = useState<LinearRegressionParams>({
    featuresVar: '',
    targetVar: '',
    modelVar: 'model',
    fitIntercept: true,
  });
  
  const [pythonResults, setPythonResults] = useState<Record<string, any> | null>(null);
  const [pythonError, setPythonError] = useState<string | null>(null);

  // Verify and clean up stale DataFrames on mount
  useEffect(() => {
    const syncState = async () => {
      if (!isPyodideReady() || createdDataframes.length === 0) return;
      
      const names = createdDataframes.map(df => df.name);
      const existing = await verifyDataframesExist(names);
      const stale = names.filter(n => !existing.includes(n));
      
      if (stale.length > 0) {
        console.log('[State Sync] Removing stale DataFrames:', stale);
        stale.forEach(name => removeCreatedDataframe(name));
      }
    };
    
    syncState();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Get features and targets
  const availableFeatures = createdDataframes.filter(df => df.colType === 'features');
  const availableTargets = createdDataframes.filter(df => df.colType === 'target');
  
  // Filter targets by selected features' parent (and vice versa for features)
  const selectedFeatures = createdDataframes.find(df => df.name === params.featuresVar);
  const selectedTarget = createdDataframes.find(df => df.name === params.targetVar);
  
  const filteredTargets = selectedFeatures 
    ? availableTargets.filter(t => t.parentDataframe === selectedFeatures.parentDataframe)
    : availableTargets;
    
  const filteredFeatures = selectedTarget
    ? availableFeatures.filter(f => f.parentDataframe === selectedTarget.parentDataframe)
    : availableFeatures;
  
  // Auto-select first matching pair
  useEffect(() => {
    if (!params.featuresVar && filteredFeatures.length > 0) {
      setParams(prev => ({ ...prev, featuresVar: filteredFeatures[0].name }));
    }
  }, [filteredFeatures, params.featuresVar]);
  
  useEffect(() => {
    if (!params.targetVar && filteredTargets.length > 0) {
      setParams(prev => ({ ...prev, targetVar: filteredTargets[0].name }));
    }
  }, [filteredTargets, params.targetVar]);

  return (
    <div className="space-y-6">
      {/* Linked Selector Section */}
      <section className="rounded-2xl border bg-white p-4">
        <h3 className="text-sm font-semibold mb-3">Select Features and Target</h3>
        {availableFeatures.length === 0 || availableTargets.length === 0 ? (
          <p className="text-sm text-gray-600">
            No features or targets available. Please create them on the Features and Target page first.
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Features (X)</label>
              <select 
                value={params.featuresVar} 
                onChange={(e) => setParams(p => ({...p, featuresVar: e.target.value, targetVar: ''}))}
                className="w-full border rounded px-3 py-2 text-sm"
              >
                <option value="">Select features...</option>
                {filteredFeatures.map(df => (
                  <option key={df.name} value={df.name}>
                    {df.name} (from {df.parentDataframe}, {df.rowCount} rows)
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Target (y)</label>
              <select 
                value={params.targetVar} 
                onChange={(e) => setParams(p => ({...p, targetVar: e.target.value, featuresVar: ''}))}
                className="w-full border rounded px-3 py-2 text-sm"
              >
                <option value="">Select target...</option>
                {filteredTargets.map(df => (
                  <option key={df.name} value={df.name}>
                    {df.name} (from {df.parentDataframe}, {df.rowCount} rows)
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}
      </section>
      
      {/* Python Workspace */}
      {params.featuresVar && params.targetVar && (
        <PythonWorkspace
          initialParams={params}
          generateCode={generateLinearRegressionCode}
          parseCode={parseLinearRegressionCode}
          // @ts-ignore
          AttributesComponent={LinearRegressionAttributes}
          dataframeContext={{ type: 'derived', colType: 'full' }}
          onParamsChange={setParams}
          onResultsChange={(results, error) => {
            setPythonResults(results);
            setPythonError(error);
          }}
          shouldGenerateCode={!!params.featuresVar && !!params.targetVar}
        />
      )}

      {/* Python Results */}
      {pythonError && (
        <section className="rounded-2xl border border-red-200 bg-red-50 p-4">
          <h3 className="font-semibold text-red-800 mb-2">Python Error</h3>
          <pre className="text-xs text-red-700 whitespace-pre-wrap font-mono overflow-x-auto">
            {pythonError}
          </pre>
        </section>
      )}

      {pythonResults && Object.keys(pythonResults).length > 0 && (
        <section className="rounded-2xl border bg-white p-4 space-y-4">
          <h3 className="font-semibold text-green-700">✓ Model Results</h3>
          
          {/* R² Score */}
          {pythonResults['r2'] !== undefined && (
            <div className="border rounded-lg p-4 bg-blue-50">
              <p className="text-sm font-medium mb-1">R² Score</p>
              <p className="text-2xl font-bold text-blue-700">
                {typeof pythonResults['r2'] === 'number' 
                  ? pythonResults['r2'].toFixed(4) 
                  : String(pythonResults['r2'])}
              </p>
              <p className="text-xs text-gray-600 mt-1">
                Proportion of variance explained by the model
              </p>
            </div>
          )}

          {/* Coefficients */}
          {pythonResults['coefficients'] && (
            <div className="border rounded-lg p-4">
              <p className="text-sm font-medium mb-2">Coefficients</p>
              {pythonResults['coefficients'].data ? (
                <div className="space-y-1 text-sm font-mono">
                  {pythonResults['coefficients'].data.map((coef: number, idx: number) => (
                    <div key={idx} className="flex justify-between">
                      <span className="text-gray-600">Feature {idx}:</span>
                      <span className="font-semibold">{coef.toFixed(6)}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <pre className="text-xs overflow-x-auto">{JSON.stringify(pythonResults['coefficients'], null, 2)}</pre>
              )}
            </div>
          )}

          {/* Intercept */}
          {pythonResults['intercept'] !== undefined && (
            <div className="border rounded-lg p-4">
              <p className="text-sm font-medium mb-2">Intercept</p>
              <p className="text-lg font-mono font-semibold">
                {typeof pythonResults['intercept'] === 'number'
                  ? pythonResults['intercept'].toFixed(6)
                  : String(pythonResults['intercept'])}
              </p>
            </div>
          )}

          {/* Predictions Preview */}
          {pythonResults['predictions'] && pythonResults['predictions'].data && (
            <div className="border rounded-lg p-4">
              <p className="text-sm font-medium mb-2">Predictions (first 10)</p>
              <div className="overflow-x-auto">
                <table className="min-w-full text-xs">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="px-2 py-1 text-left font-semibold">Index</th>
                      <th className="px-2 py-1 text-left font-semibold">Predicted Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pythonResults['predictions'].data.slice(0, 10).map((val: number, idx: number) => (
                      <tr key={idx} className="odd:bg-white even:bg-gray-50">
                        <td className="px-2 py-1 text-gray-500">{idx}</td>
                        <td className="px-2 py-1 font-mono">{val.toFixed(4)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Other Results */}
          {Object.entries(pythonResults).map(([key, value]) => {
            // Skip already displayed values
            if (['r2', 'coefficients', 'intercept', 'predictions'].includes(key)) return null;
            
            return (
              <div key={key} className="border rounded-lg p-4 bg-gray-50">
                <p className="text-sm font-medium mb-2">Variable: <code>{key}</code></p>
                <pre className="text-xs overflow-x-auto">{JSON.stringify(value, null, 2)}</pre>
              </div>
            );
          })}
        </section>
      )}
    </div>
  );
}

