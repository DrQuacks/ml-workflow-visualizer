'use client';

import { useState, useEffect } from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { useStore } from '@/core/state';
import SplitConfig from '@/components/SplitConfig';
import CodeBlock from '@/components/CodeBlock';
import { TrainTestSplit } from '@/plugins/prep.train_test_split';
// Import to register the plugin
import '@/plugins/prep.train_test_split';

export default function SplitPage() {
  const [selectedDataframeName, setSelectedDataframeName] = useState<string>('');
  const [splitParams, setSplitParams] = useState({
    includeValidation: false,
    trainPercent: 80,
    validationPercent: 0,
    testPercent: 20,
    splitOrder: ['train', 'test']
  });
  const createdDataframes = useStore(s => s.createdDataframes);

  const handleSplit = (config: {
    sourceArtifactId: string;
    includeValidation: boolean;
    trainPercent: number;
    validationPercent: number;
    testPercent: number;
    splitOrder: string[];
  }) => {
    setSelectedDataframeName(config.sourceArtifactId);
    setSplitParams(config);
  };

  // Generate Python code for split
  const splitCode = selectedDataframeName ? TrainTestSplit.codegen({
    sourceArtifactId: selectedDataframeName,
    includeValidation: splitParams.includeValidation,
    trainPercent: splitParams.trainPercent,
    validationPercent: splitParams.validationPercent,
    testPercent: splitParams.testPercent,
    splitOrder: splitParams.splitOrder,
  }).text : '';

  // Get source file for the selected dataframe
  const sourceDataframe = createdDataframes.find(df => df.name === selectedDataframeName);
  const sourceFile = sourceDataframe?.sourceFile;
  
  const [csvData, setCsvData] = useState<string | undefined>(undefined);

  useEffect(() => {
    const loadCsvData = async () => {
      if (!sourceFile) return;
      const file = window.__fileMap?.get(sourceFile);
      if (file) {
        const text = await file.text();
        setCsvData(text);
      }
    };
    loadCsvData();
  }, [sourceFile]);

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="space-y-6">
        <section className="rounded-2xl border bg-white p-4">
          <h2 className="text-base font-semibold mb-2">Configure Train/Test Split</h2>
          <SplitConfig onSplit={handleSplit} />
        </section>

      {selectedDataframeName && splitCode && (
        <section className="rounded-2xl border bg-white p-4">
          <h3 className="font-semibold mb-2">Python Code</h3>
          <p className="text-xs text-gray-500 mb-3">
            Configure split above, then click "Run Python" to execute the split.
          </p>
          <CodeBlock 
            code={splitCode}
            editable={true}
            csvData={csvData}
            filename={sourceFile}
          />
        </section>
      )}
      </div>
    </DndProvider>
  );
}
