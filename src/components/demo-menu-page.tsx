// src/components/demo-menu-page.tsx
'use client';

import { useState } from 'react';
import { SmokeyWidget } from '@/components/smokey-widget';

type Dispensary = {
  id: string;
  name: string;
  address: string;
  cityState: string;
};

const DISPENSARIES: Dispensary[] = [
  {
    id: 'alta',
    name: 'Alta Dispensary',
    address: '52 Kenmare Street',
    cityState: 'New York, NY 10012',
  },
  {
    id: 'bayside',
    name: 'Bayside Cannabis',
    address: '224-15 Union Turnpike',
    cityState: 'Oakland Garden, NY 11364',
  },
  {
    id: 'biggas',
    name: 'Big Gas',
    address: '98 N Chestnut St',
    cityState: 'New Paltz, NY 12561',
  },
  {
    id: 'bloom',
    name: 'Bloom Bros',
    address: '442 Broadway',
    cityState: 'Menands, NY 12204',
  },
];

type DemoMenuPageProps = {
  brandId?: string;
};

export function DemoMenuPage({ brandId = 'default' }: DemoMenuPageProps) {
  const [usingLocation, setUsingLocation] = useState(false);

  return (
    <main className="max-w-6xl mx-auto px-4 py-10 space-y-10">
      {/* Top: locator hero */}
      <section className="space-y-4 text-center">
        <p className="text-xs uppercase tracking-[0.18em] text-gray-500">
          Demo Menu · {brandId}
        </p>
        <h1 className="font-display text-3xl md:text-4xl">
          FIND A DISPENSARY NEAR YOU
        </h1>

        <button
          type="button"
          onClick={() => setUsingLocation(true)}
          className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-green-600 text-white text-sm font-medium shadow-sm hover:bg-green-700 transition"
        >
          <span>Use My Current Location</span>
        </button>

        {usingLocation && (
          <p className="text-xs text-gray-500 max-w-md mx-auto">
            Location is simulated in this demo. In production, Smokey filters to
            your closest retail partners using live data.
          </p>
        )}
      </section>

      {/* Dispensary carousel */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-xl">
            Nearby Retail Partners
          </h2>
          <span className="text-xs text-gray-500 uppercase tracking-wide">
            Demo data
          </span>
        </div>

        <div className="overflow-x-auto pb-2">
          <div className="flex gap-4 min-w-full">
            {DISPENSARIES.map((d) => (
              <article
                key={d.id}
                className="min-w-[260px] border rounded-2xl p-4 bg-white shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">📍</span>
                    <h3 className="font-display text-lg">{d.name}</h3>
                  </div>
                  <p className="text-sm text-gray-700">{d.address}</p>
                  <p className="text-sm text-gray-500">{d.cityState}</p>
                </div>
                <button
                  type="button"
                  className="mt-4 text-sm font-medium text-green-700 hover:underline self-start"
                >
                  View on Map
                </button>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Lower content rail (images / promos) */}
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

      {/* Smokey widget in bottom-right */}
      <SmokeyWidget />
    </main>
  );
}
