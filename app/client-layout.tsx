'use client';

import type { ReactNode } from 'react';
import Sidebar from '@/components/Sidebar';
import Link from 'next/link';

export default function ClientLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <header className="border-b bg-white fixed top-0 left-0 right-0 z-40">
        <div className="mx-auto max-w-6xl px-4 py-3 flex items-center justify-between">
          <Link href="/" className="text-lg font-semibold hover:text-gray-700">
            ML Workflow Visualizer
          </Link>
          <nav className="text-sm flex gap-4">
            <Link className="hover:underline" href="/">Home</Link>
            {/* future: <a href="/graph" className="hover:underline">Graph</a> */}
          </nav>
        </div>
      </header>
      
      <Sidebar />
      
      <main className="pt-16 pl-0 transition-all duration-300">
        <div className="mx-auto max-w-6xl px-4 py-6 ml-60">
          {children}
        </div>
      </main>
    </>
  );
}

