'use client';

export default function CodeBlock({ code }: { code: string }) {
  return (
    <pre className="rounded-lg bg-gray-50 border p-3 overflow-auto whitespace-pre-wrap">
      <code>{code}</code>
    </pre>
  );
}
