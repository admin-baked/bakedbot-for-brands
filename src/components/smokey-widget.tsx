// src/components/smokey-widget.tsx
'use client';

  import { useState, useEffect } from 'react';

export function SmokeyWidget() {
  const [open, setOpen] = useState(false);

  // Auto-open listener for demo interactions
  useEffect(() => {
    const handleOpen = () => setOpen(true);
    window.addEventListener('open-smokey-widget', handleOpen);
    return () => window.removeEventListener('open-smokey-widget', handleOpen);
  }, []);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 w-14 h-14 rounded-full bg-green-600 text-white shadow-lg flex items-center justify-center text-xs font-semibold hover:bg-green-700 transition"
      >
        Chat
      </button>

      {open && (
        <div className="fixed bottom-24 right-6 w-80 max-w-[90vw] rounded-2xl border bg-white shadow-xl flex flex-col overflow-hidden">
          <div className="px-4 py-2 border-b flex items-center justify-between">
            <span className="font-display text-sm">Smokey · Demo</span>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-xs text-gray-500 hover:text-gray-800"
            >
              ✕
            </button>
          </div>
          <div className="px-4 py-3 text-xs text-gray-700 space-y-2 max-h-64 overflow-auto">
            <p>
              This is a demo of Smokey, the AI budtender. In production this is
              wired to your product catalog and compliance guardrails.
            </p>
            <ul className="list-disc list-inside space-y-1">
              <li>&quot;Show me relaxing vapes around $40.&quot;</li>
              <li>&quot;What&apos;s good for sleep from Alta?&quot;</li>
              <li>&quot;Which edibles are best for movie night?&quot;</li>
            </ul>
          </div>
          <div className="border-t px-3 py-2">
            <input
              type="text"
              placeholder="Typing disabled in demo…"
              className="w-full text-xs px-2 py-1.5 rounded-md bg-gray-50 border border-gray-200"
              disabled
            />
          </div>
        </div>
      )}
    </>
  );
}
