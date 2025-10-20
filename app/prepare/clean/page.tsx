'use client';

import { useState, useEffect } from 'react';
import { useStore } from '@/core/state';
import PythonWorkspace from '@/components/PythonWorkspace';
import InspectionAttributes from '@/components/InspectionAttributes';
import CleanDataAttributes from '@/components/CleanDataAttributes';
import {
  generateInspectionCode,
  parseInspectionCode,
  generateCleanDataCode,
  parseCleanDataCode,
  type InspectionParams,
  type CleanDataParams
} from '@/core/code-sync';
import { getDataframeColumns } from '@/core/python-runtime';

export default function CleanDataPage() {
  const createdDataframes = useStore(s => s.createdDataframes);
  
  const [selectedDataframeName, setSelectedDataframeName] = useState<string>('');
  const [availableColumns, setAvailableColumns] = useState<string[]>([]);
  
  // Inspection workspace state
  const [inspectionParams, setInspectionParams] = useState<InspectionParams>({
    sourceVar: 'df',
    showDescribe: true,
    showHead: true,
    showDtypes: true,
    headRows: 5,
  });
  const [inspectionResults, setInspectionResults] = useState<Record<string, any> | null>(null);
  
  // Cleaning workspace state
  const [cleanParams, setCleanParams] = useState<CleanDataParams>({
    sourceVar: 'df',
    column: '',
    operation: 'dtype',
    targetDtype: 'float64',
    fillStrategy: 'mean',
    outputVar: 'df_clean',
  });
  const [cleanResults, setCleanResults] = useState<Record<string, any> | null>(null);
  const [cleanError, setCleanError] = useState<string | null>(null);

  // Auto-select first dataframe with colType 'full'
  useEffect(() => {
    const fullDataframes = createdDataframes.filter(df => df.colType === 'full');
    if (fullDataframes.length > 0 && !selectedDataframeName) {
      setSelectedDataframeName(fullDataframes[0].name);
    }
  }, [createdDataframes, selectedDataframeName]);

  // Update params.sourceVar when selection changes
  useEffect(() => {
    if (selectedDataframeName) {
      setInspectionParams(prev => ({ ...prev, sourceVar: selectedDataframeName }));
      setCleanParams(prev => ({ ...prev, sourceVar: selectedDataframeName }));
    }
  }, [selectedDataframeName]);

  // Fetch columns from selected DataFrame
  useEffect(() => {
    if (!selectedDataframeName) return;

    const fetchColumns = async () => {
      const cols = await getDataframeColumns(selectedDataframeName);
      if (cols.length > 0) {
        const uniqueCols = [...new Set(cols)];
        setAvailableColumns(uniqueCols);
        
        // Auto-select first column if none selected
        if (!cleanParams.column && uniqueCols.length > 0) {
          setCleanParams(prev => ({ ...prev, column: uniqueCols[0] }));
        }
      }
    };

    fetchColumns();
  }, [selectedDataframeName]); // eslint-disable-line react-hooks/exhaustive-deps

  const fullDataframes = createdDataframes.filter(df => df.colType === 'full');
  const sourceDataframe = createdDataframes.find(df => df.name === selectedDataframeName);

  return (
    <div className="space-y-6">
      {/* 1. Dataframe Selector */}
      <section className="rounded-2xl border bg-white p-4">
        <h3 className="text-sm font-semibold mb-3">Select Dataframe to Clean</h3>
        {fullDataframes.length === 0 ? (
          <p className="text-sm text-gray-600">
            No dataframes available. Please load or create a dataframe first.
          </p>
        ) : (
          <select
            value={selectedDataframeName}
            onChange={(e) => setSelectedDataframeName(e.target.value)}
            className="w-full border rounded px-3 py-2 text-sm"
          >
            <option value="">Select dataframe...</option>
            {fullDataframes.map((df) => (
              <option key={df.name} value={df.name}>
                {df.name} ({df.sourceFile}, {df.rowCount} rows)
              </option>
            ))}
          </select>
        )}
      </section>

      {/* 2. Inspection Workspace */}
      {selectedDataframeName && (
        <>
          <PythonWorkspace
            initialParams={inspectionParams}
            generateCode={generateInspectionCode}
            parseCode={parseInspectionCode}
            AttributesComponent={InspectionAttributes}
            dataframeContext={{ type: 'derived', colType: 'full' }}
            onParamsChange={setInspectionParams}
            onResultsChange={(results, error) => {
              setInspectionResults(results);
            }}
            shouldGenerateCode={!!selectedDataframeName}
          />

          {/* Display Inspection Results */}
          {inspectionResults && Object.keys(inspectionResults).length > 0 && (
            <section className="space-y-4">
              {/* Data Types */}
              {inspectionResults.dtypes && inspectionResults.dtypes.type === 'series' && (
                <div className="rounded-2xl border bg-white p-4">
                  <h3 className="font-semibold mb-3">Data Types</h3>
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                      <thead className="bg-gray-100">
                        <tr>
                          <th className="px-3 py-2 text-left font-semibold">Column</th>
                          <th className="px-3 py-2 text-left font-semibold">Data Type</th>
                        </tr>
                      </thead>
                      <tbody>
                        {inspectionResults.dtypes.data.map((dtype: any, idx: number) => {
                          // dtypes is a Series with column names as index
                          // We need to get the column name from the series name or reconstruct
                          const colName = availableColumns[idx] || `Column ${idx}`;
                          return (
                            <tr key={idx} className="odd:bg-white even:bg-gray-50">
                              <td className="px-3 py-2 font-medium">{colName}</td>
                              <td className="px-3 py-2 font-mono text-xs">{dtype}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Head */}
              {inspectionResults.head && inspectionResults.head.type === 'dataframe' && (
                <div className="rounded-2xl border bg-white p-4">
                  <h3 className="font-semibold mb-3">First {inspectionParams.headRows} Rows</h3>
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                      <thead className="bg-gray-100">
                        <tr>
                          <th className="px-2 py-1 text-left font-semibold text-xs">index</th>
                          {inspectionResults.head.columns.map((col: string, i: number) => (
                            <th key={i} className="px-2 py-1 text-left font-semibold whitespace-nowrap">
                              {col}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {inspectionResults.head.data.map((row: any[], ri: number) => (
                          <tr key={ri} className="odd:bg-white even:bg-gray-50">
                            <td className="px-2 py-1 text-gray-500 font-medium border-r text-xs">{ri}</td>
                            {row.map((cell: any, ci: number) => (
                              <td key={ci} className="px-2 py-1 whitespace-nowrap">
                                {cell === null ? (
                                  <span className="text-gray-400 italic">null</span>
                                ) : (
                                  String(cell)
                                )}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Describe */}
              {inspectionResults.describe && inspectionResults.describe.type === 'dataframe' && (
                <div className="rounded-2xl border bg-white p-4">
                  <h3 className="font-semibold mb-3">Statistical Summary</h3>
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                      <thead className="bg-gray-100">
                        <tr>
                          <th className="px-2 py-1 text-left font-semibold">Statistic</th>
                          {inspectionResults.describe.columns.map((col: string, i: number) => (
                            <th key={i} className="px-2 py-1 text-left font-semibold whitespace-nowrap">
                              {col}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {inspectionResults.describe.index.map((stat: string, ri: number) => (
                          <tr key={ri} className="odd:bg-white even:bg-gray-50">
                            <td className="px-2 py-1 font-medium">{stat}</td>
                            {inspectionResults.describe.data[ri].map((cell: any, ci: number) => (
                              <td key={ci} className="px-2 py-1 whitespace-nowrap">
                                {cell === null ? (
                                  <span className="text-gray-400 italic">null</span>
                                ) : typeof cell === 'number' ? (
                                  cell.toFixed(2)
                                ) : (
                                  String(cell)
                                )}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </section>
          )}
        </>
      )}

      {/* 3. Cleaning Workspace */}
      {selectedDataframeName && availableColumns.length > 0 && (
        <>
          <PythonWorkspace
            initialParams={cleanParams}
            generateCode={generateCleanDataCode}
            parseCode={parseCleanDataCode}
            AttributesComponent={CleanDataAttributes}
            attributesProps={{ availableColumns }}
            dataframeContext={{
              type: 'derived',
              parentDataframe: selectedDataframeName,
              colType: 'full'
            }}
            onParamsChange={setCleanParams}
            onResultsChange={(results, error) => {
              setCleanResults(results);
              setCleanError(error);
            }}
            shouldGenerateCode={!!cleanParams.column}
          />

          {/* Clean Results */}
          {cleanError && (
            <section className="rounded-2xl border border-red-200 bg-red-50 p-4">
              <h3 className="font-semibold text-red-800 mb-2">Python Error</h3>
              <pre className="text-xs text-red-700 whitespace-pre-wrap font-mono overflow-x-auto">
                {cleanError}
              </pre>
            </section>
          )}

          {cleanResults && Object.keys(cleanResults).length > 0 && (
            <section className="rounded-2xl border bg-white p-4">
              <h3 className="font-semibold text-green-700 mb-3">✓ Cleaning Complete</h3>
              <p className="text-sm text-gray-600">
                Created dataframe: <code className="px-1 py-0.5 bg-gray-100 rounded">{cleanParams.outputVar}</code>
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Check the "Created Dataframes" list to see your cleaned dataframe.
              </p>
            </section>
          )}
        </>
      )}

      {!selectedDataframeName && (
        <p className="text-sm text-gray-600 text-center py-8">
          Select a dataframe above to begin data inspection and cleaning.
        </p>
      )}
    </div>
  );
}

