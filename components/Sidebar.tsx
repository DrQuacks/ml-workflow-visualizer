'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSidebar } from './SidebarContext';

interface MenuItem {
  label: string;
  href?: string;
  children?: MenuItem[];
}

const menuItems: MenuItem[] = [
  {
    label: 'Load',
    children: [
      { label: 'Load a CSV', href: '/load/csv' }
    ]
  },
  {
    label: 'Prepare',
    children: [
      { label: 'Split', href: '/prepare/split' },
      { label: 'Features and Target', href: '/prepare/features-target' }
    ]
  },
  {
    label: 'Model',
    children: [
      { label: 'Linear Regression', href: '/model/linear-regression' }
    ]
  }
];

export default function Sidebar() {
  const { isOpen, setIsOpen } = useSidebar();
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['Load', 'Prepare', 'Model']));
  const pathname = usePathname();

  const toggleSection = (label: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(label)) {
        next.delete(label);
      } else {
        next.add(label);
      }
      return next;
    });
  };

  return (
    <>
      {/* Show Sidebar Button (when closed) */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed top-20 left-4 z-50 flex items-center gap-1.5 px-2 py-1 text-xs rounded border bg-white hover:bg-gray-50 shadow-sm"
          aria-label="Open sidebar"
        >
          <svg
            className="w-3 h-3"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
          </svg>
          <span>show</span>
        </button>
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-16 left-0 h-[calc(100vh-4rem)] bg-white border-r transition-transform duration-300 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        style={{ width: '240px' }}
      >
        {/* Header with Title and Hide Button */}
        <div className="flex items-center justify-between px-4 pt-2 pb-1">
          <h2 className="font-semibold text-lg">Tools</h2>
          <button
            onClick={() => setIsOpen(false)}
            className="flex items-center gap-1.5 px-2 py-1 text-xs rounded border bg-white hover:bg-gray-50"
            aria-label="Close sidebar"
          >
            <svg
              className="w-3 h-3"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
            </svg>
            <span>hide</span>
          </button>
        </div>
        <nav className="p-4 space-y-2">
          {menuItems.map((item) => (
            <div key={item.label}>
              {/* Parent Item */}
              <button
                onClick={() => toggleSection(item.label)}
                className="w-full flex items-center justify-between px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg"
              >
                <span>{item.label}</span>
                <svg
                  className={`w-4 h-4 transition-transform ${
                    expandedSections.has(item.label) ? 'rotate-90' : ''
                  }`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>

              {/* Children */}
              {expandedSections.has(item.label) && item.children && (
                <div className="ml-4 mt-1 space-y-1">
                  {item.children.map((child) => (
                    <Link
                      key={child.href}
                      href={(child.href || '/') as any}
                      className={`block px-3 py-2 text-sm rounded-lg ${
                        pathname === child.href
                          ? 'bg-gray-900 text-white'
                          : 'text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      {child.label}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          ))}
        </nav>
      </aside>
    </>
  );
}

