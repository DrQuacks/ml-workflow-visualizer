'use client';

import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="space-y-6">
      <section className="rounded-2xl border bg-white p-8">
        <h1 className="text-2xl font-bold mb-4">ML Workflow Visualizer</h1>
        <p className="text-gray-600 mb-6">
          Build, visualize, and export machine learning workflows with live data previews and code generation.
        </p>
        
        <div className="grid md:grid-cols-2 gap-4">
          <Link
            href="/load/csv"
            className="p-6 border rounded-xl hover:border-gray-400 hover:bg-gray-50 transition-colors"
          >
            <h3 className="font-semibold mb-2">Load Data</h3>
            <p className="text-sm text-gray-600">Upload and preview CSV files with customizable parameters</p>
          </Link>
          
          <Link
            href="/prepare/split"
            className="p-6 border rounded-xl hover:border-gray-400 hover:bg-gray-50 transition-colors"
          >
            <h3 className="font-semibold mb-2">Prepare Data</h3>
            <p className="text-sm text-gray-600">Split and transform your datasets for training</p>
          </Link>
        </div>
      </section>

      <section className="rounded-2xl border bg-white p-6">
        <h2 className="font-semibold mb-3">Getting Started</h2>
        <ol className="list-decimal list-inside space-y-2 text-sm text-gray-700">
          <li>Use the sidebar or cards above to navigate to a workflow step</li>
          <li>Upload a CSV file to create your first data node</li>
          <li>Adjust parameters and preview your data in real-time</li>
          <li>View the generated Python code for each operation</li>
        </ol>
      </section>
    </div>
  );
}
