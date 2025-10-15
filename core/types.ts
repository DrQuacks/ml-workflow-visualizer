export type OpId = 'pandas.read_csv' | string;

export type ArtifactType = 'table' | 'series' | 'model' | 'metrics' | 'file' | 'text' | 'plot';

export interface ArtifactRef {
  id: string;
  type: ArtifactType;
  payload?: unknown;
}

export interface NodeParam<T = unknown> {
  key: string;
  label: string;
  value: T;
}

export interface OpNode {
  id: string;
  op: OpId;
  label: string;
  params: NodeParam[];
  inputs: string[];
  outputs: string[];
  code: { language: 'python'; text: string };
  status: 'idle' | 'ok' | 'error' | 'running';
  logs?: string[];
}

export interface Workflow {
  id: string;
  name: string;
  nodes: OpNode[];
  edges: Array<{ from: string; to: string; artifactId?: string }>;
  createdAt: string;
  updatedAt: string;
  version: 1;
}
