'use client';

import { useRef } from 'react';
import { useDrag, useDrop } from 'react-dnd';
import type { Identifier } from 'dnd-core';
import type { SplitParams } from '@/core/code-sync';

interface SplitAttributesProps {
  params: SplitParams;
  onParamsChange: (params: SplitParams) => void;
  isExecuting: boolean;
  onRunPython: () => void;
}

interface DraggableRowProps {
  index: number;
  splitName: string;
  displayName: string;
  percent: number;
  moveRow: (dragIndex: number, hoverIndex: number) => void;
  onPercentChange: (splitName: string, value: number) => void;
  onNameChange: (splitName: string, newName: string) => void;
}

const DRAG_TYPE = 'SPLIT_ROW';

function DraggableRow({ index, splitName, displayName, percent, moveRow, onPercentChange, onNameChange }: DraggableRowProps) {
  const ref = useRef<HTMLDivElement>(null);
  const dragRef = useRef<HTMLDivElement>(null);

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

  const [{ isDragging }, drag] = useDrag({
    type: DRAG_TYPE,
    item: () => ({ index }),
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  drop(ref);
  drag(dragRef);

  return (
    <div
      ref={ref}
      data-handler-id={handlerId}
      className={`flex items-center gap-3 p-3 border rounded bg-white hover:bg-gray-50 ${
        isDragging ? 'opacity-40' : ''
      }`}
    >
      <div ref={dragRef} className="cursor-ns-resize flex-shrink-0 p-1">
        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
        </svg>
      </div>
      
      <input
        type="text"
        value={displayName}
        onChange={(e) => onNameChange(splitName, e.target.value)}
        className="text-sm font-medium w-28 flex-shrink-0 border rounded px-2 py-1 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
        placeholder={splitName}
      />
      
      <input
        type="range"
        min="0"
        max="100"
        value={percent}
        onChange={(e) => onPercentChange(splitName, parseInt(e.target.value))}
        className="flex-1"
      />
      
      <span className="text-sm font-medium w-12 text-right flex-shrink-0">{percent}%</span>
    </div>
  );
}

export default function SplitAttributes({ params, onParamsChange, isExecuting, onRunPython }: SplitAttributesProps) {
  const { includeValidation, trainPercent, validationPercent, testPercent, splitOrder, trainName = 'train_df', validationName = 'validation_df', testName = 'test_df' } = params;

  const handlePercentChange = (splitName: string, value: number) => {
    const newValue = Math.max(0, Math.min(100, value));
    
    const percentages: Record<string, number> = {
      train: trainPercent,
      validation: validationPercent,
      test: testPercent,
    };
    
    const oldValue = percentages[splitName];
    const diff = newValue - oldValue;
    
    percentages[splitName] = newValue;
    
    if (diff !== 0) {
      const currentIndex = splitOrder.indexOf(splitName);
      let remaining = diff;
      
      for (let i = currentIndex + 1; i < splitOrder.length && remaining !== 0; i++) {
        const targetSplit = splitOrder[i];
        const available = percentages[targetSplit];
        const take = Math.min(available, Math.abs(remaining)) * Math.sign(remaining);
        percentages[targetSplit] -= take;
        remaining -= take;
      }
      
      for (let i = currentIndex - 1; i >= 0 && remaining !== 0; i--) {
        const targetSplit = splitOrder[i];
        const available = percentages[targetSplit];
        const take = Math.min(available, Math.abs(remaining)) * Math.sign(remaining);
        percentages[targetSplit] -= take;
        remaining -= take;
      }
    }
    
    onParamsChange({
      ...params,
      trainPercent: Math.max(0, percentages.train),
      validationPercent: Math.max(0, percentages.validation),
      testPercent: Math.max(0, percentages.test),
    });
  };

  const moveRow = (dragIndex: number, hoverIndex: number) => {
    const newOrder = [...splitOrder];
    const [removed] = newOrder.splice(dragIndex, 1);
    newOrder.splice(hoverIndex, 0, removed);
    onParamsChange({ ...params, splitOrder: newOrder });
  };

  const handleNameChange = (splitType: string, newName: string) => {
    const updates: Partial<SplitParams> = {};
    if (splitType === 'train') {
      updates.trainName = newName;
    } else if (splitType === 'validation') {
      updates.validationName = newName;
    } else if (splitType === 'test') {
      updates.testName = newName;
    }
    
    onParamsChange({ ...params, ...updates });
  };

  const handleValidationToggle = (checked: boolean) => {
    const newSplitOrder = checked 
      ? ['train', 'validation', 'test']
      : ['train', 'test'];
    
    const newParams = {
      ...params,
      includeValidation: checked,
      splitOrder: newSplitOrder,
    };
    
    if (checked) {
      newParams.validationPercent = 10;
      newParams.testPercent = 10;
      newParams.trainPercent = 80;
    } else {
      newParams.validationPercent = 0;
      newParams.trainPercent = 80;
      newParams.testPercent = 20;
    }
    
    onParamsChange(newParams);
  };

  const total = trainPercent + validationPercent + testPercent;

  return (
    <div className="rounded-2xl border bg-white p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold">Python Attributes</h3>
        <button
          onClick={onRunPython}
          disabled={isExecuting}
          className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors"
        >
          {isExecuting ? 'Executing...' : 'Run Python'}
        </button>
      </div>

      <div className="space-y-4">
        {/* Include Validation Toggle */}
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="include-validation"
            checked={includeValidation}
            onChange={(e) => handleValidationToggle(e.target.checked)}
            className="rounded"
          />
          <label htmlFor="include-validation" className="text-sm font-medium">
            Include Validation Set
          </label>
        </div>

        {/* Split Configuration */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium">Split Configuration</h4>
            <span className={`text-xs ${total === 100 ? 'text-green-600' : 'text-red-600'}`}>
              Total: {total}%
            </span>
          </div>

          <div className="space-y-2">
            {splitOrder.map((splitName, index) => {
              const percent = splitName === 'train' ? trainPercent 
                : splitName === 'validation' ? validationPercent 
                : testPercent;
              
              const displayName = splitName === 'train' ? trainName
                : splitName === 'validation' ? validationName
                : testName;
              
              return (
                <DraggableRow
                  key={splitName}
                  index={index}
                  splitName={splitName}
                  displayName={displayName}
                  percent={percent}
                  moveRow={moveRow}
                  onPercentChange={handlePercentChange}
                  onNameChange={handleNameChange}
                />
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

