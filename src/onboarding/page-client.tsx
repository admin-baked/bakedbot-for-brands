
// src/onboarding/page-client.tsx
'use client';

import { useState } from 'react';
import { useDevAuth } from '@/dev-auth';

type BrandResult = {
  id: string;
  name: string;
  market: string | null;
};

type Step = 'role' | 'brand-search' | 'review';

export function OnboardingPageClient() {
  const { user, loginAs } = useDevAuth();
  const [step, setStep] = useState<Step>('role');
  const [role, setRole] = useState<'brand' | 'dispensary' | 'customer' | null>(
    null,
  );
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<BrandResult[]>([]);
  const [selectedBrand, setSelectedBrand] = useState<BrandResult | null>(null);

  async function searchBrands(term: string) {
    setLoading(true);
    try {
      const resp = await fetch(`/api/cannmenus/brands?q=${encodeURIComponent(term)}`);
      const data = await resp.json();
      setResults(data.brands ?? []);
    } catch (e) {
      console.error('Brand search failed', e);
      setResults([]);
    } finally {
      setLoading(false);
    }
  }

  function handleSelectRole(r: typeof role) {
    setRole(r);
    if (r === 'brand') {
      // In dev, ensure we look like a brand user
      if (!user) loginAs('brand');
      setStep('brand-search');
    } else {
      // For now, non-brand roles just land on review
      setStep('review');
    }
  }

  function handleBrandClick(brand: BrandResult) {
    setSelectedBrand(brand);
    setStep('review');
  }

  async function handleFinish() {
    // FUTURE: call a server action to create Brand doc, set claims, etc.
    // For now, we just bounce them into the demo console.
    window.location.href = '/menu/default';
  }

  return (
    <main className="max-w-3xl mx-auto px-4 py-10 space-y-8">
      <header className="space-y-2">
        <h1 className="font-display text-3xl">
          Get your BakedBot workspace ready
        </h1>
        <p className="text-sm text-gray-600">
          This onboarding flow links your account to a brand in the CannMenus
          directory so Smokey, Craig, and Pops can work off real products and
          stores.
        </p>
      </header>

      {step === 'role' && (
        <section className="space-y-4">
          <h2 className="font-display text-xl">Who are you?</h2>
          <div className="grid gap-3 sm:grid-cols-3">
            {(['brand', 'dispensary', 'customer'] as const).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => handleSelectRole(r)}
                className="border rounded-2xl px-4 py-3 text-left hover:border-green-500 hover:shadow-sm transition"
              >
                <div className="font-medium capitalize">
                  {r === 'brand' ? 'Brand' : r}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {r === 'brand' &&
                    'Own or manage a brand and want AI-driven menus & locator.'}
                  {r === 'dispensary' &&
                    'Operate a retail location that carries partner brands.'}
                  {r === 'customer' &&
                    'Just exploring the demo – no setup required.'}
                </p>
              </button>
            ))}
          </div>
        </section>
      )}

      {step === 'brand-search' && (
        <section className="space-y-4">
          <h2 className="font-display text-xl">Find your brand</h2>
          <p className="text-sm text-gray-600">
            Start typing your brand name. We&apos;ll search the CannMenus brand
            directory. If you don&apos;t see it, you can add it manually later.
          </p>

          <div className="flex gap-2">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && query.trim()) {
                  searchBrands(query.trim());
                }
              }}
              placeholder="e.g. Ultra Cannabis"
              className="flex-1 border rounded-xl px-3 py-2 text-sm"
            />
            <button
              type="button"
              disabled={!query.trim() || loading}
              onClick={() => searchBrands(query.trim())}
              className="px-4 py-2 rounded-xl bg-green-600 text-white text-sm font-medium hover:bg-green-700 disabled:opacity-60"
            >
              {loading ? 'Searching...' : 'Search'}
            </button>
          </div>

          <div className="space-y-2">
            {results.length === 0 && !loading && query && (
              <p className="text-xs text-gray-500">
                No brands found yet. Check spelling or add manually in the next step.
              </p>
            )}
            <ul className="space-y-2">
              {results.map((b) => (
                <li key={b.id}>
                  <button
                    type="button"
                    onClick={() => handleBrandClick(b)}
                    className="w-full border rounded-xl px-3 py-2 flex items-center justify-between hover:border-green-500 hover:shadow-sm text-left"
                  >
                    <div>
                      <div className="text-sm font-medium">{b.name}</div>
                      {b.market && (
                        <div className="text-xs text-gray-500">
                          {b.market}
                        </div>
                      )}
                    </div>
                    <span className="text-xs text-green-700 font-semibold">
                      Select
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {step === 'review' && (
        <section className="space-y-4">
          <h2 className="font-display text-xl">Review & finish</h2>
          <div className="border rounded-2xl px-4 py-3 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Role</span>
              <span className="font-medium capitalize">{role ?? 'not set'}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Brand</span>
              <span className="font-medium">
                {selectedBrand ? selectedBrand.name : 'Not selected (demo mode)'}
              </span>
            </div>
            {user && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Dev user</span>
                <span className="font-medium">{user.email}</span>
              </div>
            )}
          </div>

          <p className="text-xs text-gray-500">
            In production this step would create your Brand workspace, link it to
            your CannMenus brand ID, and connect it to Smokey, Craig, and Pops.
          </p>

          <button
            type="button"
            onClick={handleFinish}
            className="px-5 py-2 rounded-full bg-green-600 text-white text-sm font-medium hover:bg-green-700"
          >
            Finish & open demo console
          </button>
        </section>
      )}
    </main>
  );
}
