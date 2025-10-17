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
  percent: number;
  moveRow: (dragIndex: number, hoverIndex: number) => void;
  onPercentChange: (splitName: string, value: number) => void;
}

const DRAG_TYPE = 'SPLIT_ROW';

function DraggableRow({ index, splitName, percent, moveRow, onPercentChange }: DraggableRowProps) {
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
      
      <span className="text-sm capitalize font-medium w-20 flex-shrink-0">{splitName}</span>
      
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
  const { includeValidation, trainPercent, validationPercent, testPercent, splitOrder } = params;

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
      </div>
    </div>
  );
}

