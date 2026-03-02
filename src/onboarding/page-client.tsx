// src/onboarding/page-client.tsx
'use client';

import { useState } from 'react';
import { useDevAuth } from '@/dev-auth';

import { logger } from '@/lib/logger';
type BrandResult = {
  id: string;
  name: string;
  market: string | null;
};

type Step = 'role' | 'brand-search' | 'manual' | 'review';

export function OnboardingPageClient() {
  const { user, loginAs } = useDevAuth();
  const [step, setStep] = useState<Step>('role');
  const [role, setRole] = useState<'brand' | 'dispensary' | 'grower' | 'customer' | null>(
    null,
  );
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<BrandResult[]>([]);
  const [selectedBrand, setSelectedBrand] = useState<BrandResult | null>(null);

  // New state for manual brand entry
  const [manualBrandName, setManualBrandName] = useState('');
  const [manualMarket, setManualMarket] = useState('');
  const [manualWebsite, setManualWebsite] = useState('');

  async function searchBrands(term: string) {
    setLoading(true);
    try {
      const resp = await fetch(`/api/cannmenus/brands?q=${encodeURIComponent(term)}`);
      const data = await resp.json();
      setResults(data.brands ?? []);
    } catch (e) {
      logger.error('Brand search failed', e instanceof Error ? e : new Error(String(e)));
      setResults([]);
    } finally {
      setLoading(false);
    }
  }

  function handleSelectRole(r: typeof role) {
    setRole(r);
    if (r === 'brand' || r === 'grower') {
      // In dev, ensure we look like a brand-level user
      if (!user) loginAs(r === 'grower' ? 'grower' : 'brand');
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
    // For now just send them to the dashboard stub
    window.location.href = '/dashboard';
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
            {(['brand', 'dispensary', 'grower', 'customer'] as const).map((r) => (
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
                  {r === 'grower' &&
                    'Cultivate flower and sell wholesale to brands (B2B).'}
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
            directory.
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
                No brands found yet. Check spelling or add manually.
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
            <button
              type="button"
              onClick={() => {
                setSelectedBrand(null);
                setManualBrandName(query); // prefill with what they typed
                setStep('manual');
              }}
              className="text-xs text-green-700 hover:underline"
            >
              Can’t find your brand? Add it manually.
            </button>
          </div>
        </section>
      )}

      {step === 'manual' && (
        <section className="space-y-4">
          <h2 className="font-display text-xl">Add your brand manually</h2>
          <p className="text-sm text-gray-600">
            We&apos;ll create a workspace for your brand even if it isn&apos;t in the
            CannMenus directory yet. Our team can map it to the directory later.
          </p>

          <div className="space-y-3">
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-700">
                Brand name *
              </label>
              <input
                type="text"
                value={manualBrandName}
                onChange={(e) => setManualBrandName(e.target.value)}
                className="w-full border rounded-xl px-3 py-2 text-sm"
                placeholder="e.g. 40 Tons"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-700">
                Primary market (state / region)
              </label>
              <input
                type="text"
                value={manualMarket}
                onChange={(e) => setManualMarket(e.target.value)}
                className="w-full border rounded-xl px-3 py-2 text-sm"
                placeholder="e.g. CA, IL, MI"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-700">
                Website (optional)
              </label>
              <input
                type="url"
                value={manualWebsite}
                onChange={(e) => setManualWebsite(e.target.value)}
                className="w-full border rounded-xl px-3 py-2 text-sm"
                placeholder="https://yourbrand.com"
              />
            </div>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setStep('brand-search')}
              className="px-4 py-2 rounded-full border text-sm"
            >
              Back to search
            </button>
            <button
              type="button"
              disabled={!manualBrandName.trim()}
              onClick={() => {
                // Treat manual brand like a "selectedBrand" with a special source
                setSelectedBrand({
                  id: 'manual', // server action will replace this with real ID
                  name: manualBrandName.trim(),
                  market: manualMarket.trim() || null,
                });
                setStep('review');
              }}
              className="px-5 py-2 rounded-full bg-green-600 text-white text-sm font-medium hover:bg-green-700 disabled:opacity-60"
            >
              Continue
            </button>
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
                {selectedBrand ? selectedBrand.name : 'Not selected'}
              </span>
            </div>

            {selectedBrand?.id === 'manual' && (
              <p className="text-xs text-amber-600">
                This brand will be created manually and flagged for verification.
              </p>
            )}

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
