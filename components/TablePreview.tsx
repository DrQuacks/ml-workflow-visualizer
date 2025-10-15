'use client';

import { useState } from 'react';
import { useStore } from '@/core/state';

export default function TablePreview({ artifactId }: { artifactId: string }) {
  const [rowLimit, setRowLimit] = useState(25);
  const [showAll, setShowAll] = useState(false);
  const art = useStore(s => s.artifacts[artifactId]) as any;
  
  if (!art) return <div className="text-xs text-gray-500">No artifact</div>;
  const rows: string[][] = art.payload?.rows ?? [];
  if (!rows.length) return <div className="text-xs text-gray-500">Empty</div>;
  
  const header = rows[0];
  const allBodyRows = rows.slice(1);
  const displayedRows = showAll ? allBodyRows : allBodyRows.slice(0, rowLimit);

  const handleRowLimitChange = (value: string) => {
    const num = parseInt(value);
    if (!isNaN(num) && num > 0) {
      setRowLimit(num);
      setShowAll(false);
    }
  };

  const toggleShowAll = () => {
    setShowAll(!showAll);
  };

  return (
    <div className="space-y-2">
      {/* Controls */}
      <div className="flex items-center justify-end gap-3 text-xs">
        <span className="text-gray-600">
          Showing {displayedRows.length} of {allBodyRows.length} rows
        </span>
        <div className="flex items-center gap-2">
          <label className="text-gray-600">Rows:</label>
          <input
            type="number"
            min="1"
            value={rowLimit}
            onChange={(e) => handleRowLimitChange(e.target.value)}
            disabled={showAll}
            className="w-16 px-2 py-1 border rounded text-xs"
          />
        </div>
        <button
          onClick={toggleShowAll}
          className="px-3 py-1 border rounded hover:bg-gray-50 text-xs"
        >
          {showAll ? 'Show Less' : 'Show All'}
        </button>
      </div>

      {/* Table */}
      <div className="overflow-auto border rounded-lg" style={{ maxHeight: showAll ? 'none' : '600px' }}>
        <table className="min-w-full text-xs">
          <thead className="bg-gray-100 sticky top-0">
            <tr>
              {header.map((h, i) => <th key={i} className="px-2 py-1 text-left font-semibold">{String(h)}</th>)}
            </tr>
          </thead>
          <tbody>
            {displayedRows.map((r, ri) => (
              <tr key={ri} className="odd:bg-white even:bg-gray-50">
                {r.map((c, ci) => <td key={ci} className="px-2 py-1">{String(c)}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
