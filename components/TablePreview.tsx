'use client';

import { useStore } from '@/core/state';

export default function TablePreview({ artifactId }: { artifactId: string }) {
  const art = useStore(s => s.artifacts[artifactId]) as any;
  if (!art) return <div className="text-xs text-gray-500">No artifact</div>;
  const rows: string[][] = art.payload?.rows ?? [];
  if (!rows.length) return <div className="text-xs text-gray-500">Empty</div>;
  const header = rows[0];
  const body = rows.slice(1, Math.min(rows.length, 101));

  return (
    <div className="overflow-auto border rounded-lg">
      <table className="min-w-full text-xs">
        <thead className="bg-gray-100">
          <tr>
            {header.map((h, i) => <th key={i} className="px-2 py-1 text-left font-semibold">{String(h)}</th>)}
          </tr>
        </thead>
        <tbody>
          {body.map((r, ri) => (
            <tr key={ri} className="odd:bg-white even:bg-gray-50">
              {r.map((c, ci) => <td key={ci} className="px-2 py-1">{String(c)}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
