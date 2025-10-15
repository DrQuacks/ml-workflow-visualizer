'use client';

import { useStore } from '@/core/state';
import { registry } from '@/core/registry';

type Props = { nodeId: string };

export default function Inspector({ nodeId }: Props) {
  const node = useStore(s => s.workflow.nodes.find(n => n.id === nodeId));
  const updateNode = useStore(s => s.updateNode);
  const setArtifacts = useStore(s => s.setArtifacts);

  if (!node) return <div className="text-sm text-red-600">Node not found</div>;

  const op = registry.ops.get(node.op);
  async function rePreview() {
    if (!op) return;
    // clear previous outputs
    node.outputs = [];
    const ctx = {
      getArtifact: (id: string) => useStore.getState().artifacts[id],
      emitArtifact: (art: { id?: string; type: string; payload: unknown }) => {
        const id = art.id ?? crypto.randomUUID();
        setArtifacts({ [id]: { id, type: art.type, payload: art.payload } });
        node.outputs.push(id);
        return id;
      },
      log: (msg: string) => console.debug(msg),
    };
    const res = await op.preview(paramsToObj(node.params), ctx);
    updateNode(node.id, { outputs: node.outputs, status: 'ok' });
  }

  function paramsToObj(params: { key: string; value: any }[]) {
    const o: any = {};
    for (const p of params) o[p.key] = p.value;
    return o;
  }

  function onParamChange(k: string, v: any) {
    const newParams = node.params.map(p => p.key === k ? { ...p, value: v } : p);
    updateNode(node.id, { params: newParams, code: op?.codegen(paramsToObj(newParams))! });
  }

  return (
    <div className="space-y-4 text-sm">
      <div>
        <div className="text-xs uppercase text-gray-500">Operation</div>
        <div className="font-medium">{node.label}</div>
      </div>
      <div className="space-y-2">
        <div className="text-xs uppercase text-gray-500">Parameters</div>
        {node.params.map(p => (
          <div key={p.key} className="flex items-center gap-2">
            <label className="w-28 text-gray-700">{p.label}</label>
            {typeof p.value === 'boolean' ? (
              <input
                type="checkbox"
                checked={Boolean(p.value)}
                onChange={(e) => onParamChange(p.key, e.target.checked)}
              />
            ) : (
              <input
                className="border rounded px-2 py-1 flex-1"
                value={String(p.value)}
                onChange={(e) => onParamChange(p.key, e.target.value)}
              />
            )}
          </div>
        ))}
        <button
          onClick={rePreview}
          className="mt-2 inline-flex items-center rounded-lg border px-3 py-1.5 text-xs bg-gray-900 text-white hover:bg-black"
        >
          Refresh Preview
        </button>
      </div>
    </div>
  );
}
