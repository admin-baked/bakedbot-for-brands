import { notFound } from 'next/navigation';
import Link from 'next/link';
import type { Metadata } from 'next';
import { FlaskConical, ArrowLeft, ShieldCheck, ShieldX, Droplets, ExternalLink, Leaf } from 'lucide-react';
import { fetchLabResultBySlug, buildLabResultJsonLd } from '@/lib/lab-data';

export const revalidate = 86400; // 24h ISR — COA data is immutable

interface Props {
  params: Promise<{ slug: string }>;
}

// ---------------------------------------------------------------------------
// Metadata
// ---------------------------------------------------------------------------

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const result = await fetchLabResultBySlug(slug);
  if (!result) return { title: 'Lab Result Not Found' };

  const title = `${result.strainName || result.productName} Lab Results — ${result.labName}`;
  const thcStr = result.totalThc != null ? `THC: ${result.totalThc}%` : '';
  const cbdStr = result.totalCbd != null && result.totalCbd > 0 ? `, CBD: ${result.totalCbd}%` : '';
  const description = `COA lab results for ${result.strainName || result.productName}. ${thcStr}${cbdStr}. Tested by ${result.labName} on ${result.testDate}. Full terpene profile and safety testing.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'article',
      siteName: 'BakedBot',
      url: `https://bakedbot.ai/lab-results/${slug}`,
    },
    alternates: {
      canonical: `https://bakedbot.ai/lab-results/${slug}`,
    },
  };
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function LabResultDetailPage({ params }: Props) {
  const { slug } = await params;
  const result = await fetchLabResultBySlug(slug);
  if (!result) notFound();

  const jsonLd = buildLabResultJsonLd(slug, result);
  const terpsSorted = [...(result.terpenes || [])].sort((a, b) => b.percentage - a.percentage);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
        <div className="max-w-4xl mx-auto px-4 py-10">
          {/* Back nav */}
          <Link
            href="/lab-results"
            className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-blue-600 mb-6 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            All Lab Results
          </Link>

          {/* Header */}
          <header className="mb-10">
            <div className="flex items-start gap-4 mb-4">
              <div className="w-14 h-14 bg-blue-100 rounded-2xl flex items-center justify-center flex-shrink-0">
                <FlaskConical className="w-7 h-7 text-blue-600" />
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="text-3xl font-black text-slate-900 tracking-tight">
                  {result.strainName || result.productName}
                </h1>
                <p className="text-sm text-slate-500 mt-1">
                  {result.productName !== result.strainName ? result.productName : ''}{' '}
                  {result.brandName ? `by ${result.brandName}` : ''}
                </p>
              </div>
              {/* Safety badge */}
              <div className="flex-shrink-0">
                {result.safetyPassed ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-100 text-green-700 rounded-full text-sm font-semibold">
                    <ShieldCheck className="w-4 h-4" /> All Tests Passed
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-100 text-red-700 rounded-full text-sm font-semibold">
                    <ShieldX className="w-4 h-4" /> Failed
                  </span>
                )}
              </div>
            </div>
            <div className="flex flex-wrap gap-3 text-sm text-slate-500">
              <span>Lab: <strong className="text-slate-700">{result.labName}</strong></span>
              <span>Tested: <strong className="text-slate-700">{result.testDate}</strong></span>
              {result.batchNumber && <span>Batch: <strong className="text-slate-700">{result.batchNumber}</strong></span>}
              {result.state && <span>State: <strong className="text-slate-700">{result.state}</strong></span>}
            </div>
          </header>

          {/* Cannabinoid Profile */}
          <section className="mb-10">
            <h3 className="flex items-center gap-2 text-lg font-bold text-slate-800 mb-4">
              <FlaskConical className="w-5 h-5 text-green-600" />
              Cannabinoid Profile
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {result.totalThc != null && (
                <div className="rounded-xl border border-green-200 bg-green-50 p-4 text-center">
                  <div className="text-2xl font-black text-green-600">{result.totalThc}%</div>
                  <div className="text-sm font-medium text-green-700 mt-1">THC</div>
                </div>
              )}
              {result.totalCbd != null && (
                <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-center">
                  <div className="text-2xl font-black text-blue-600">{result.totalCbd}%</div>
                  <div className="text-sm font-medium text-blue-700 mt-1">CBD</div>
                </div>
              )}
              {result.totalTerpenes != null && (
                <div className="rounded-xl border border-teal-200 bg-teal-50 p-4 text-center">
                  <div className="text-2xl font-black text-teal-600">{result.totalTerpenes}%</div>
                  <div className="text-sm font-medium text-teal-700 mt-1">Total Terpenes</div>
                </div>
              )}
              {/* Additional cannabinoids from cannabinoids map */}
              {Object.entries(result.cannabinoids || {})
                .filter(([key]) => !['thc', 'cbd', 'total_thc', 'total_cbd'].includes(key.toLowerCase()))
                .slice(0, 4)
                .map(([name, { value, unit }]) => (
                  <div key={name} className="rounded-xl border border-violet-200 bg-violet-50 p-4 text-center">
                    <div className="text-2xl font-black text-violet-600">
                      {value}{unit === 'percent' ? '%' : ` ${unit}`}
                    </div>
                    <div className="text-sm font-medium text-violet-700 mt-1">{name}</div>
                  </div>
                ))}
            </div>
          </section>

          {/* Terpene Profile */}
          {terpsSorted.length > 0 && (
            <section className="mb-10">
              <h3 className="flex items-center gap-2 text-lg font-bold text-slate-800 mb-4">
                <Droplets className="w-5 h-5 text-teal-500" />
                Terpene Profile
              </h3>
              <div className="space-y-3">
                {terpsSorted.map((t) => (
                  <div key={t.name} className="flex items-center gap-3">
                    <Link
                      href={`/terpenes/${t.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`}
                      className="text-sm text-slate-600 w-32 flex-shrink-0 hover:text-teal-600 transition-colors"
                    >
                      {t.name}
                    </Link>
                    <div className="flex-1 h-2.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full bg-teal-500"
                        style={{ width: `${Math.min(t.percentage * 20, 100)}%` }}
                      />
                    </div>
                    <span className="text-xs text-slate-400 w-12 text-right">{t.percentage}%</span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Safety Testing */}
          <section className="mb-10">
            <h3 className="flex items-center gap-2 text-lg font-bold text-slate-800 mb-4">
              <ShieldCheck className="w-5 h-5 text-green-600" />
              Safety Testing
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <SafetyCard label="Pesticides" result={result.pesticides} />
              <SafetyCard label="Heavy Metals" result={result.heavyMetals} />
              <SafetyCard label="Microbials" result={result.microbials} />
              <SafetyCard label="Residual Solvents" result={result.residualSolvents} />
            </div>
          </section>

          {/* Source Link */}
          {result.coaUrl && (
            <div className="mb-10 p-4 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
              <span className="text-sm text-slate-600">View original COA verify page</span>
              <a
                href={result.coaUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                Open COA <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          )}

          {/* Cross-links */}
          <div className="mt-10 flex flex-wrap justify-center gap-4 text-sm">
            {result.strainName && (
              <Link
                href={`/strains/${result.strainName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`}
                className="flex items-center gap-1.5 text-slate-500 hover:text-green-600 transition-colors"
              >
                <Leaf className="w-4 h-4" /> {result.strainName} Strain Info
              </Link>
            )}
            <Link
              href="/lab-results"
              className="flex items-center gap-1.5 text-slate-500 hover:text-blue-600 transition-colors"
            >
              <FlaskConical className="w-4 h-4" /> All Lab Results
            </Link>
          </div>

          {/* Footer */}
          <footer className="mt-12 pt-6 border-t border-slate-100 text-center text-xs text-slate-400">
            <p>
              Data sourced from {result.source === 'llm_fallback' ? 'AI-extracted COA data' : result.source?.replace(/_/g, ' ') || 'certified lab'}.
              COA data is immutable once published by the testing laboratory.
            </p>
          </footer>
        </div>
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// Safety card component
// ---------------------------------------------------------------------------

function SafetyCard({ label, result }: { label: string; result: { passed: boolean; details?: string } | null }) {
  if (!result) {
    return (
      <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 text-center">
        <div className="text-sm font-medium text-slate-400">N/A</div>
        <div className="text-xs text-slate-300 mt-1">{label}</div>
      </div>
    );
  }

  return (
    <div className={`rounded-xl border p-4 text-center ${
      result.passed
        ? 'border-green-200 bg-green-50'
        : 'border-red-200 bg-red-50'
    }`}>
      <div className={`text-sm font-bold ${result.passed ? 'text-green-600' : 'text-red-600'}`}>
        {result.passed ? 'PASS' : 'FAIL'}
      </div>
      <div className={`text-xs mt-1 ${result.passed ? 'text-green-700' : 'text-red-700'}`}>
        {label}
      </div>
    </div>
  );
}
