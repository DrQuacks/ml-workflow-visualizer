import { create } from 'zustand';
import type { Workflow, OpNode, ArtifactRef } from './types';
import { registry } from './registry';

type Dict<T> = Record<string, T>;

interface Store {
  workflow: Workflow;
  artifacts: Dict<ArtifactRef>;
  uploadedFiles: string[];
  setArtifacts: (patch: Dict<ArtifactRef>) => void;
  setWorkflow: (w: Workflow) => void;
  addNode: (n: OpNode) => Promise<void>;
  updateNode: (id: string, patch: Partial<OpNode>) => void;
  addUploadedFile: (filename: string) => void;
  removeUploadedFile: (filename: string) => void;
}

export const useStore = create<Store>((set, get) => ({
  workflow: {
    id: 'w1',
    name: 'Untitled',
    nodes: [],
    edges: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    version: 1,
  },
  artifacts: {},
  uploadedFiles: [],
  setArtifacts: (patch) => set(s => ({ artifacts: { ...s.artifacts, ...patch } })),
  setWorkflow: (w) => set({ workflow: w }),
  addUploadedFile: (filename) => set(s => ({ 
    uploadedFiles: s.uploadedFiles.includes(filename) ? s.uploadedFiles : [...s.uploadedFiles, filename] 
  })),
  removeUploadedFile: (filename) => set(s => ({ 
    uploadedFiles: s.uploadedFiles.filter(f => f !== filename) 
  })),
  addNode: async (n) => {
    set(s => ({ workflow: { ...s.workflow, nodes: [...s.workflow.nodes, n], updatedAt: new Date().toISOString() } }));
    const op = registry.ops.get(n.op);
    if (op) {
      const ctx = {
        getArtifact: (id: string) => get().artifacts[id],
        emitArtifact: (art: { id?: string; type: string; payload: unknown }) => {
          const id = art.id ?? crypto.randomUUID();
          get().setArtifacts({ [id]: { id, type: art.type as any, payload: art.payload } });
          n.outputs.push(id);
          return id;
        },
        log: (msg: string) => console.debug(msg),
      };
      const params = Object.fromEntries(n.params.map(p => [p.key, (p as any).value]));
      await op.preview(params as any, ctx);
      set(s => ({
        workflow: {
          ...s.workflow,
          nodes: s.workflow.nodes.map(x => x.id === n.id ? { ...n, code: op.codegen(params as any), status: 'ok' } : x),
          updatedAt: new Date().toISOString()
        }
      }));
    }
  },
  updateNode: (id, patch) => set(s => ({
    workflow: {
      ...s.workflow,
      nodes: s.workflow.nodes.map(n => n.id === id ? { ...n, ...patch } : n),
      updatedAt: new Date().toISOString()
    }
  })),
}));
