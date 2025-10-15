'use client';

import { useState, useEffect } from 'react';
import { useStore } from '@/core/state';

interface SplitConfigProps {
  onSplit: (config: {
    sourceArtifactId: string;
    includeValidation: boolean;
    trainPercent: number;
    validationPercent: number;
    testPercent: number;
    splitOrder: string[];
  }) => void;
}

export default function SplitConfig({ onSplit }: SplitConfigProps) {
  const artifacts = useStore(s => s.artifacts);
  const [selectedArtifactId, setSelectedArtifactId] = useState('');
  const [includeValidation, setIncludeValidation] = useState(false);
  const [trainPercent, setTrainPercent] = useState(80);
  const [validationPercent, setValidationPercent] = useState(0);
  const [testPercent, setTestPercent] = useState(20);
  const [splitOrder, setSplitOrder] = useState(['train', 'test']);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  // Get all table artifacts
  const tableArtifacts = Object.values(artifacts).filter(a => a.type === 'table');

  // Auto-select first artifact if available
  useEffect(() => {
    if (tableArtifacts.length > 0 && !selectedArtifactId) {
      setSelectedArtifactId(tableArtifacts[0].id);
    }
  }, [tableArtifacts, selectedArtifactId]);

  // Update split order when validation is toggled
  useEffect(() => {
    if (includeValidation) {
      setSplitOrder(['train', 'validation', 'test']);
      setValidationPercent(10);
      setTestPercent(10);
    } else {
      setSplitOrder(['train', 'test']);
      setValidationPercent(0);
      setTrainPercent(80);
      setTestPercent(20);
    }
  }, [includeValidation]);

  const handlePercentChange = (splitName: string, value: number) => {
    const newValue = Math.max(0, Math.min(100, value));
    const currentOrder = includeValidation ? ['train', 'validation', 'test'] : ['train', 'test'];
    const currentIndex = currentOrder.indexOf(splitName);
    
    if (splitName === 'train') {
      const oldTrain = trainPercent;
      const diff = newValue - oldTrain;
      setTrainPercent(newValue);
      
      if (includeValidation) {
        setValidationPercent(Math.max(0, validationPercent - diff));
      } else {
        setTestPercent(Math.max(0, testPercent - diff));
      }
    } else if (splitName === 'validation') {
      const oldVal = validationPercent;
      const diff = newValue - oldVal;
      setValidationPercent(newValue);
      setTestPercent(Math.max(0, testPercent - diff));
    } else if (splitName === 'test') {
      const oldTest = testPercent;
      const diff = newValue - oldTest;
      setTestPercent(newValue);
      
      if (includeValidation) {
        setValidationPercent(Math.max(0, validationPercent - diff));
      } else {
        setTrainPercent(Math.max(0, trainPercent - diff));
      }
    }
  };

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (dropIndex: number) => {
    if (draggedIndex === null) return;
    
    const newOrder = [...splitOrder];
    const [removed] = newOrder.splice(draggedIndex, 1);
    newOrder.splice(dropIndex, 0, removed);
    setSplitOrder(newOrder);
    setDraggedIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  const handleSplit = () => {
    if (!selectedArtifactId) return;
    
    onSplit({
      sourceArtifactId: selectedArtifactId,
      includeValidation,
      trainPercent,
      validationPercent,
      testPercent,
      splitOrder,
    });
  };

  const total = trainPercent + validationPercent + testPercent;

  return (
    <div className="space-y-6">
      {/* Dataframe Selection */}
      <div>
        <label className="block text-sm font-medium mb-2">Select Source Dataframe</label>
        {tableArtifacts.length === 0 ? (
          <p className="text-sm text-gray-600">No dataframes available. Please load a CSV first.</p>
        ) : (
          <select
            value={selectedArtifactId}
            onChange={(e) => setSelectedArtifactId(e.target.value)}
            className="w-full border rounded px-3 py-2 text-sm"
          >
            {tableArtifacts.map((artifact) => {
              const rows = (artifact.payload as any)?.rows || [];
              const rowCount = Math.max(0, rows.length - 1); // exclude header
              return (
                <option key={artifact.id} value={artifact.id}>
                  Dataframe ({rowCount} rows)
                </option>
              );
            })}
          </select>
        )}
      </div>

      {/* Validation Toggle */}
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="include-validation"
          checked={includeValidation}
          onChange={(e) => setIncludeValidation(e.target.checked)}
          className="rounded"
        />
        <label htmlFor="include-validation" className="text-sm font-medium">
          Include Validation Set
        </label>
      </div>

      {/* Unified Split Configuration Table */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium">Split Configuration (drag to reorder)</h3>
          <span className={`text-xs ${total === 100 ? 'text-green-600' : 'text-red-600'}`}>
            Total: {total}%
          </span>
        </div>

        <div className="space-y-2">
          {splitOrder.map((splitName, index) => {
            const percent = splitName === 'train' ? trainPercent 
              : splitName === 'validation' ? validationPercent 
              : testPercent;
            
            return (
              <div
                key={splitName}
                draggable={draggedIndex === index}
                onDragStart={() => handleDragStart(index)}
                onDragEnd={handleDragEnd}
                onDragOver={handleDragOver}
                onDrop={() => handleDrop(index)}
                className="flex items-center gap-3 p-3 border rounded bg-white hover:bg-gray-50"
              >
                {/* Drag Handle */}
                <div
                  onMouseDown={() => setDraggedIndex(index)}
                  onMouseUp={() => {}}
                  className="cursor-ns-resize flex-shrink-0"
                >
                  <svg 
                    className="w-4 h-4 text-gray-400"
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
                  </svg>
                </div>
                
                {/* Split Name */}
                <span className="text-sm capitalize font-medium w-20 flex-shrink-0">{splitName}</span>
                
                {/* Slider */}
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={percent}
                  onChange={(e) => handlePercentChange(splitName, parseInt(e.target.value))}
                  className="flex-1"
                />
                
                {/* Percentage Display */}
                <span className="text-sm font-medium w-12 text-right flex-shrink-0">{percent}%</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Split Button */}
      <button
        onClick={handleSplit}
        disabled={!selectedArtifactId || total !== 100}
        className="w-full px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-black disabled:bg-gray-300 disabled:cursor-not-allowed"
      >
        Split
      </button>
    </div>
  );
}

