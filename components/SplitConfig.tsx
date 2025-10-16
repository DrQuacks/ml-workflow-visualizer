'use client';

import { useState, useEffect, useRef } from 'react';
import { useDrag, useDrop } from 'react-dnd';
import type { Identifier } from 'dnd-core';
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

interface DraggableRowProps {
  index: number;
  splitName: string;
  percent: number;
  moveRow: (dragIndex: number, hoverIndex: number) => void;
  onPercentChange: (splitName: string, value: number) => void;
}

const DRAG_TYPE = 'SPLIT_ROW';

function DraggableRow({ index, splitName, percent, moveRow, onPercentChange }: DraggableRowProps) {
  const ref = useRef<HTMLDivElement>(null);

  const [{ handlerId }, drop] = useDrop<
    { index: number },
    void,
    { handlerId: Identifier | null }
  >({
    accept: DRAG_TYPE,
    collect(monitor) {
      return {
        handlerId: monitor.getHandlerId(),
      };
    },
    hover(item, monitor) {
      if (!ref.current) return;
      
      const dragIndex = item.index;
      const hoverIndex = index;
      
      if (dragIndex === hoverIndex) return;
      
      const hoverBoundingRect = ref.current?.getBoundingClientRect();
      const hoverMiddleY = (hoverBoundingRect.bottom - hoverBoundingRect.top) / 2;
      const clientOffset = monitor.getClientOffset();
      const hoverClientY = clientOffset!.y - hoverBoundingRect.top;
      
      if (dragIndex < hoverIndex && hoverClientY < hoverMiddleY) return;
      if (dragIndex > hoverIndex && hoverClientY > hoverMiddleY) return;
      
      moveRow(dragIndex, hoverIndex);
      item.index = hoverIndex;
    },
  });

  const [{ isDragging }, drag, preview] = useDrag({
    type: DRAG_TYPE,
    item: () => ({ index }),
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  preview(drop(ref));

  return (
    <div
      ref={ref}
      data-handler-id={handlerId}
      className={`flex items-center gap-3 p-3 border rounded bg-white hover:bg-gray-50 ${
        isDragging ? 'opacity-40' : ''
      }`}
    >
      {/* Drag Handle */}
      <div ref={drag} className="cursor-ns-resize flex-shrink-0 p-1">
        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
        onChange={(e) => onPercentChange(splitName, parseInt(e.target.value))}
        className="flex-1"
      />
      
      {/* Percentage Display */}
      <span className="text-sm font-medium w-12 text-right flex-shrink-0">{percent}%</span>
    </div>
  );
}

export default function SplitConfig({ onSplit }: SplitConfigProps) {
  const artifacts = useStore(s => s.artifacts);
  const createdDataframes = useStore(s => s.createdDataframes);
  const [selectedArtifactId, setSelectedArtifactId] = useState('');
  const [includeValidation, setIncludeValidation] = useState(false);
  const [trainPercent, setTrainPercent] = useState(80);
  const [validationPercent, setValidationPercent] = useState(0);
  const [testPercent, setTestPercent] = useState(20);
  const [splitOrder, setSplitOrder] = useState(['train', 'test']);

  // Get all table artifacts
  const tableArtifacts = Object.values(artifacts).filter(a => a.type === 'table');

  // Auto-select first dataframe if available
  useEffect(() => {
    if (createdDataframes.length > 0 && !selectedArtifactId) {
      setSelectedArtifactId(createdDataframes[0].name);
    }
  }, [createdDataframes, selectedArtifactId]);

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
    
    // Get current percentages
    const percentages: Record<string, number> = {
      train: trainPercent,
      validation: validationPercent,
      test: testPercent,
    };
    
    const oldValue = percentages[splitName];
    const diff = newValue - oldValue;
    
    // Update the changed split
    percentages[splitName] = newValue;
    
    // Now distribute the diff across other splits
    if (diff !== 0) {
      const currentIndex = splitOrder.indexOf(splitName);
      let remaining = diff;
      
      // Try to borrow/add to splits on the right first
      for (let i = currentIndex + 1; i < splitOrder.length && remaining !== 0; i++) {
        const targetSplit = splitOrder[i];
        const available = percentages[targetSplit];
        const take = Math.min(available, Math.abs(remaining)) * Math.sign(remaining);
        percentages[targetSplit] -= take;
        remaining -= take;
      }
      
      // If still have remaining, try splits on the left
      for (let i = currentIndex - 1; i >= 0 && remaining !== 0; i--) {
        const targetSplit = splitOrder[i];
        const available = percentages[targetSplit];
        const take = Math.min(available, Math.abs(remaining)) * Math.sign(remaining);
        percentages[targetSplit] -= take;
        remaining -= take;
      }
    }
    
    // Apply the new percentages
    setTrainPercent(Math.max(0, percentages.train));
    setValidationPercent(Math.max(0, percentages.validation));
    setTestPercent(Math.max(0, percentages.test));
  };

  const moveRow = (dragIndex: number, hoverIndex: number) => {
    const newOrder = [...splitOrder];
    const [removed] = newOrder.splice(dragIndex, 1);
    newOrder.splice(hoverIndex, 0, removed);
    setSplitOrder(newOrder);
  };

  const handleSplit = () => {
    if (!selectedArtifactId) return;
    
    onSplit({
      sourceArtifactId: selectedArtifactId, // Now this is the DataFrame variable name, not artifact ID
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
        {createdDataframes.length === 0 ? (
          <p className="text-sm text-gray-600">No dataframes available. Please load a CSV first using Run Python.</p>
        ) : (
          <select
            value={selectedArtifactId}
            onChange={(e) => setSelectedArtifactId(e.target.value)}
            className="w-full border rounded px-3 py-2 text-sm"
          >
            <option value="">Select a dataframe...</option>
            {createdDataframes.map((df) => (
              <option key={df.name} value={df.name}>
                {df.name} ({df.sourceFile}, {df.rowCount} rows)
              </option>
            ))}
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
              <DraggableRow
                key={splitName}
                index={index}
                splitName={splitName}
                percent={percent}
                moveRow={moveRow}
                onPercentChange={handlePercentChange}
              />
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

