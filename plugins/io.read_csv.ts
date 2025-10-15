import Papa from 'papaparse';
import type { OpDefinition } from '@/core/registry';
import type { OpNode } from '@/core/types';
import { registry } from '@/core/registry';

type P = {
  filename: string;
  delimiter: string;
  header: boolean;
  encoding: string;
};

export const ReadCSV: OpDefinition<P> = {
  id: 'pandas.read_csv',
  label: 'Read CSV',
  category: 'IO',
  params: { defaults: { filename: 'my_file.csv', delimiter: ',', header: true, encoding: 'utf-8' } },
  codegen: (p) => ({
    language: 'python',
    text: [
      'import pandas as pd',
      `df = pd.read_csv(${JSON.stringify(p.filename)}, delimiter=${JSON.stringify(p.delimiter)}, header=${p.header ? 0 : 'None'}, encoding=${JSON.stringify(p.encoding)})`,
    ].join('\n')
  }),
  preview: async (p, ctx) => {
    const file = window.__fileMap?.get(p.filename);
    if (!file) {
      ctx.log('File not found in __fileMap: ' + p.filename);
      return { artifacts: [] };
    }
    const text = await file.text();
    const parsed = Papa.parse<string[]>(text, {
      delimiter: p.delimiter || ',',
      skipEmptyLines: true,
    });
    const rows: string[][] = Array.isArray(parsed.data) ? parsed.data.slice(0, 101) as any : [];
    const id = ctx.emitArtifact({ type: 'table', payload: { rows } });
    return { artifacts: [{ id, type: 'table', payload: { rows } }] as any };
  },
};

export function createReadCsvNode(filename: string): OpNode {
  const id = crypto.randomUUID();
  const node: OpNode = {
    id,
    op: 'pandas.read_csv',
    label: 'Read CSV',
    params: [
      { key: 'filename', label: 'Filename', value: filename },
      { key: 'delimiter', label: 'Delimiter', value: ',' },
      { key: 'header', label: 'Header', value: true },
      { key: 'encoding', label: 'Encoding', value: 'utf-8' },
    ],
    inputs: [],
    outputs: [],
    code: { language: 'python', text: 'import pandas as pd\ndf = pd.read_csv(...)' },
    status: 'idle'
  };
  return node;
}

// register on module import
registry.register({ ops: [ReadCSV] });

declare global {
  interface Window { __fileMap?: Map<string, File>; }
}
