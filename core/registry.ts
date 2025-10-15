import type { ArtifactRef, OpId } from './types';

export interface OpContext {
  getArtifact: (id: string) => unknown;
  emitArtifact: (artifact: { id?: string; type: string; payload: unknown }) => string;
  log: (msg: string) => void;
}

export interface OpDefinition<P extends Record<string, unknown>> {
  id: OpId;
  label: string;
  category: 'IO' | 'Prep' | 'Model' | 'Eval' | 'Viz' | 'Other';
  params: { schema?: unknown; defaults: P };
  codegen: (p: P) => { language: 'python'; text: string };
  preview: (p: P, ctx: OpContext) => Promise<{ artifacts: ArtifactRef[] }>;
}

export const registry = {
  ops: new Map<OpId, OpDefinition<any>>(),
  register(module: { ops: OpDefinition<any>[] }) {
    module.ops.forEach(op => this.ops.set(op.id, op));
  }
};
