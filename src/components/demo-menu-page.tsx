// src/components/demo-menu-page.tsx
'use client';

import { DispensaryLocatorSection } from '@/components/dispensary-locator-section';
import { SmokeyWidget } from '@/components/smokey-widget';

export function DemoMenuPage({ brandId }: { brandId?: string }) {
  return (
    <main className="max-w-6xl mx-auto px-4 py-10 space-y-10">
      <DispensaryLocatorSection />
      {/* product rails, brand content, etc. */}
       <section className="space-y-3">
        <h2 className="font-display text-xl">
          Featured Brand Content
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="h-40 rounded-2xl bg-gray-200 overflow-hidden" />
          <div className="h-40 rounded-2xl bg-gray-200 overflow-hidden" />
          <div className="h-40 rounded-2xl bg-gray-200 overflow-hidden" />
        </div>
        <p className="text-xs text-gray-500">
          In your live deployment this rail pulls real campaign assets and
          product imagery from your brand library.
        </p>
      </section>
      <SmokeyWidget />
    </main>
  );
}
