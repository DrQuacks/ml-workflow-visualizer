'use client';

import { useStore } from '@/core/state';
import { deleteVariable } from '@/core/python-runtime';

export default function CreatedDataframesList() {
  const createdDataframes = useStore(s => s.createdDataframes);
  const removeCreatedDataframe = useStore(s => s.removeCreatedDataframe);

  // Filter to show only source DataFrames
  const sourceDataframes = createdDataframes.filter(df => df.type === 'source');

  const handleDelete = async (name: string) => {
    // Delete the dataframe
    await deleteVariable(name);
    removeCreatedDataframe(name);
    
    // Find and delete all derived dataframes (cascade)
    const derived = createdDataframes.filter(df => 
      df.type === 'derived' && df.parentDataframe === name
    );
    
    for (const df of derived) {
      await deleteVariable(df.name);
      removeCreatedDataframe(df.name);
    }
  };

  if (sourceDataframes.length === 0) {
    return (
      <div className="rounded-2xl border bg-white p-4">
        <h3 className="text-sm font-semibold mb-3">
          Created Dataframes (0)
        </h3>
        <p className="text-sm text-gray-500">
          No dataframes created yet. Run Python code to create dataframes.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border bg-white p-4">
      <h3 className="text-sm font-semibold mb-3">
        Created Dataframes ({sourceDataframes.length})
      </h3>
      <div className="space-y-2">
        {sourceDataframes.map((df) => (
          <div
            key={df.name}
            className="flex items-center justify-between p-2 rounded border bg-gray-50"
          >
            <div className="flex-1">
              <p className="text-sm font-medium">{df.name}</p>
              <p className="text-xs text-gray-500">{df.sourceFile}</p>
              <p className="text-xs text-gray-500">{df.rowCount} rows</p>
            </div>
            <button
              onClick={() => handleDelete(df.name)}
              className="text-xs text-red-600 hover:text-red-800 px-2 py-1 hover:bg-red-50 rounded"
              aria-label={`Delete ${df.name}`}
            >
              Delete
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

