'use client';

import { useState } from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { useStore } from '@/core/state';
import SplitConfig from '@/components/SplitConfig';
import Inspector from '@/components/Inspector';
import TablePreview from '@/components/TablePreview';
import CodeBlock from '@/components/CodeBlock';
import { createTrainTestSplitNode } from '@/plugins/prep.train_test_split';
// Import to register the plugin
import '@/plugins/prep.train_test_split';

export default function SplitPage() {
  const [splitNodeId, setSplitNodeId] = useState<string | null>(null);
  const addNode = useStore(s => s.addNode);
  const node = useStore(s => s.workflow.nodes.find(n => n.id === splitNodeId));
  const artifacts = useStore(s => s.artifacts);

  const handleSplit = async (config: {
    sourceArtifactId: string;
    includeValidation: boolean;
    trainPercent: number;
    validationPercent: number;
    testPercent: number;
    splitOrder: string[];
  }) => {
    const newNode = createTrainTestSplitNode(config.sourceArtifactId);
    
    // Update node params with config
    newNode.params = [
      { key: 'sourceArtifactId', label: 'Source Data', value: config.sourceArtifactId },
      { key: 'includeValidation', label: 'Include Validation', value: config.includeValidation },
      { key: 'trainPercent', label: 'Train %', value: config.trainPercent },
      { key: 'validationPercent', label: 'Validation %', value: config.validationPercent },
      { key: 'testPercent', label: 'Test %', value: config.testPercent },
      { key: 'splitOrder', label: 'Split Order', value: config.splitOrder },
    ];
    
    await addNode(newNode);
    setSplitNodeId(newNode.id);
  };

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="space-y-6">
        <section className="rounded-2xl border bg-white p-4">
          <h2 className="text-base font-semibold mb-2">Configure Train/Test Split</h2>
          <SplitConfig onSplit={handleSplit} />
        </section>

      {node && (
        <>
          <section className="grid md:grid-cols-2 gap-6">
            <div className="rounded-2xl border bg-white p-4">
              <h3 className="font-semibold mb-3">Inspector</h3>
              <Inspector nodeId={node.id} />
            </div>
            <div className="rounded-2xl border bg-white p-4">
              <h3 className="font-semibold mb-2">Generated Code (Python)</h3>
              <CodeBlock code={node.code.text} />
            </div>
          </section>

          {node.outputs.length > 0 && (
            <section className="space-y-4">
              <h3 className="font-semibold">Split Results</h3>
              <div className="grid gap-4">
                {node.outputs.map((artifactId, idx) => {
                  const artifact = artifacts[artifactId];
                  const splitName = (artifact?.payload as any)?.splitName || `Split ${idx + 1}`;
                  const rows = (artifact?.payload as any)?.rows || [];
                  const rowCount = Math.max(0, rows.length - 1);
                  
                  return (
                    <div key={artifactId} className="rounded-2xl border bg-white p-4">
                      <h4 className="font-semibold mb-2 capitalize">
                        {splitName} ({rowCount} rows)
                      </h4>
                      <TablePreview artifactId={artifactId} />
                    </div>
                  );
                })}
              </div>
            </section>
          )}
        </>
      )}

      {!node && (
        <p className="text-sm text-gray-600">
          Configure and execute a split to see results.
        </p>
      )}
      </div>
    </DndProvider>
  );
}
