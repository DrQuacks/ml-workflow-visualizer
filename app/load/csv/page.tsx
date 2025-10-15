'use client';

import UploadDropzone from '@/components/UploadDropzone';
import Inspector from '@/components/Inspector';
import TablePreview from '@/components/TablePreview';
import CodeBlock from '@/components/CodeBlock';
import { useStore } from '@/core/state';

export default function LoadCsvPage() {
  const node = useStore(s => s.workflow.nodes[0]);
  const artifacts = useStore(s => s.artifacts);
  return (
    <div className="space-y-6">
      <section className="rounded-2xl border bg-white p-4">
        <h2 className="text-base font-semibold mb-2">1) Upload a CSV</h2>
        <UploadDropzone />
        <p className="text-xs text-gray-500 mt-2">MVP: client-only parsing using PapaParse; shows preview + code.</p>
      </section>

      {node && (
        <section className="grid md:grid-cols-2 gap-6">
          <div className="rounded-2xl border bg-white p-4">
            <h3 className="font-semibold mb-3">Inspector</h3>
            <Inspector nodeId={node.id} />
          </div>
          <div className="rounded-2xl border bg-white p-4 space-y-4">
            <div>
              <h3 className="font-semibold mb-2">Generated Code (Python)</h3>
              <CodeBlock code={node.code.text} />
            </div>
            <div>
              <h3 className="font-semibold mb-2">Preview</h3>
              {node.outputs.map(id => (
                <div key={id} className="mb-4">
                  <TablePreview artifactId={id} />
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {!node && (
        <p className="text-sm text-gray-600">No nodes yet. Upload a CSV to create a <em>Read CSV</em> node.</p>
      )}
    </div>
  );
}

