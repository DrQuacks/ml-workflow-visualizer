import "./../styles/globals.css";
import type { ReactNode } from "react";

export const metadata = {
  title: "ML Workflow Visualizer",
  description: "Visualize data/ML steps with previews and code",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen">
        <header className="border-b bg-white">
          <div className="mx-auto max-w-6xl px-4 py-3 flex items-center justify-between">
            <h1 className="text-lg font-semibold">ML Workflow Visualizer</h1>
            <nav className="text-sm flex gap-4">
              <a className="hover:underline" href="/">MVP</a>
              {/* future: <a href="/graph" className="hover:underline">Graph</a> */}
            </nav>
          </div>
        </header>
        <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
      </body>
    </html>
  );
}
