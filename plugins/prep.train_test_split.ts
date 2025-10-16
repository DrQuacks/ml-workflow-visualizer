import type { OpDefinition } from '@/core/registry';
import type { OpNode } from '@/core/types';
import { registry } from '@/core/registry';

type P = {
  sourceArtifactId: string;
  includeValidation: boolean;
  trainPercent: number;
  validationPercent: number;
  testPercent: number;
  splitOrder: string[]; // e.g., ['train', 'validation', 'test']
};

export const TrainTestSplit: OpDefinition<P> = {
  id: 'pandas.train_test_split',
  label: 'Train/Test Split',
  category: 'Prep',
  params: {
    defaults: {
      sourceArtifactId: '',
      includeValidation: false,
      trainPercent: 80,
      validationPercent: 0,
      testPercent: 20,
      splitOrder: ['train', 'test'],
    }
  },
  codegen: (p) => {
    const lines = ['import pandas as pd', ''];
    
    // Get the total rows
    lines.push('# Assuming df is your source dataframe');
    lines.push('total_rows = len(df)');
    lines.push('');
    
    // Calculate split indices based on order
    const splits = p.includeValidation 
      ? ['train', 'validation', 'test']
      : ['train', 'test'];
    
    const percents: Record<string, number> = {
      train: p.trainPercent,
      validation: p.validationPercent,
      test: p.testPercent,
    };
    
    const order = p.splitOrder.filter(s => splits.includes(s));
    
    // Generate intermediate variables for sizes
    lines.push('# Calculate split sizes');
    order.forEach((splitName, idx) => {
      if (idx < order.length - 1) {
        const percent = percents[splitName];
        lines.push(`${splitName}_size = int(total_rows * ${(percent / 100).toFixed(2)})`);
      }
    });
    lines.push('');
    
    // Generate split indices
    lines.push('# Calculate split indices');
    const indexVars: Record<string, { start: string; end: string }> = {};
    
    order.forEach((splitName, idx) => {
      if (idx === 0) {
        indexVars[splitName] = { start: '0', end: `${splitName}_size` };
      } else if (idx === order.length - 1) {
        // Last split uses remaining rows
        const prevSplit = order[idx - 1];
        indexVars[splitName] = { start: `${prevSplit}_end`, end: 'None' };
      } else {
        const prevSplit = order[idx - 1];
        lines.push(`${splitName}_end = ${prevSplit}_end + ${splitName}_size`);
        indexVars[splitName] = { start: `${prevSplit}_end`, end: `${splitName}_end` };
      }
      
      if (idx === 0) {
        lines.push(`${splitName}_end = ${splitName}_size`);
      }
    });
    lines.push('');
    
    // Generate dataframe splits
    lines.push('# Create split dataframes');
    order.forEach((splitName) => {
      const indices = indexVars[splitName];
      if (indices.end === 'None') {
        lines.push(`${splitName}_df = df.iloc[${indices.start}:]`);
      } else {
        lines.push(`${splitName}_df = df.iloc[${indices.start}:${indices.end}]`);
      }
    });
    
    return {
      language: 'python',
      text: lines.join('\n')
    };
  },
  preview: async (p, ctx) => {
    const sourceArtifact = ctx.getArtifact(p.sourceArtifactId) as any;
    if (!sourceArtifact || !sourceArtifact.payload?.rows) {
      ctx.log('Source artifact not found or invalid');
      return { artifacts: [] };
    }
    
    const rows: string[][] = sourceArtifact.payload.rows;
    const header = rows[0];
    const dataRows = rows.slice(1);
    const totalRows = dataRows.length;
    
    // Calculate split indices
    const splits = p.includeValidation 
      ? ['train', 'validation', 'test']
      : ['train', 'test'];
    
    const percents: Record<string, number> = {
      train: p.trainPercent,
      validation: p.validationPercent,
      test: p.testPercent,
    };
    
    const order = p.splitOrder.filter(s => splits.includes(s));
    let currentIdx = 0;
    const splitData: Record<string, string[][]> = {};
    
    order.forEach((splitName, idx) => {
      const percent = percents[splitName];
      if (idx === order.length - 1) {
        // Last split gets remaining rows
        splitData[splitName] = [header, ...dataRows.slice(currentIdx)];
      } else {
        const splitSize = Math.floor(totalRows * (percent / 100));
        const endIdx = currentIdx + splitSize;
        splitData[splitName] = [header, ...dataRows.slice(currentIdx, endIdx)];
        currentIdx = endIdx;
      }
    });
    
    // Emit artifacts for each split
    const artifacts: any[] = [];
    order.forEach(splitName => {
      const id = ctx.emitArtifact({
        type: 'table',
        payload: { rows: splitData[splitName].slice(0, 101), splitName }
      });
      artifacts.push({ id, type: 'table', payload: { rows: splitData[splitName].slice(0, 101) } });
    });
    
    return { artifacts };
  },
};

export function createTrainTestSplitNode(sourceArtifactId: string): OpNode {
  const id = crypto.randomUUID();
  const params = {
    sourceArtifactId,
    includeValidation: false,
    trainPercent: 80,
    validationPercent: 0,
    testPercent: 20,
    splitOrder: ['train', 'test']
  };
  
  const node: OpNode = {
    id,
    op: 'pandas.train_test_split',
    label: 'Train/Test Split',
    params: [
      { key: 'sourceArtifactId', label: 'Source Data', value: sourceArtifactId },
      { key: 'includeValidation', label: 'Include Validation', value: false },
      { key: 'trainPercent', label: 'Train %', value: 80 },
      { key: 'validationPercent', label: 'Validation %', value: 0 },
      { key: 'testPercent', label: 'Test %', value: 20 },
      { key: 'splitOrder', label: 'Split Order', value: ['train', 'test'] },
    ],
    inputs: [sourceArtifactId],
    outputs: [],
    code: TrainTestSplit.codegen(params), // Generate proper code immediately
    status: 'idle'
  };
  return node;
}

// register on module import
registry.register({ ops: [TrainTestSplit] });

