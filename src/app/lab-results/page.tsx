import Link from 'next/link';
import { FlaskConical, Search, ShieldCheck, ShieldX, Leaf } from 'lucide-react';
import { Navbar } from '@/components/landing/navbar';
import { LandingFooter } from '@/components/landing/footer';
import { fetchLabResults, type LabResultFilters } from '@/lib/lab-data';

export const revalidate = 3600; // 1h ISR — lab results can come in from POS sync

interface Props {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function parseFilters(raw: Record<string, string | string[] | undefined>): LabResultFilters {
  const str = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
  return {
    strain: str(raw.strain) || undefined,
    lab: str(raw.lab) || undefined,
    minThc: raw.thc_min ? Number(str(raw.thc_min)) : undefined,
    state: str(raw.state) || undefined,
    page: raw.page ? Number(str(raw.page)) : 1,
  };
}

const CATEGORY_COLORS: Record<string, string> = {
  indica: 'bg-purple-100 text-purple-700',
  sativa: 'bg-amber-100 text-amber-700',
  hybrid: 'bg-green-100 text-green-700',
};

export default async function LabResultsIndexPage({ searchParams }: Props) {
  const rawParams = await searchParams;
  const filters = parseFilters(rawParams);
  const { results, total } = await fetchLabResults(filters);

  return (
    <>
    <Navbar />
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white pt-16">
      <div className="max-w-6xl mx-auto px-4 py-12">

        {/* Hero */}
        <header className="text-center mb-10">
          <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <FlaskConical className="w-8 h-8 text-blue-600" />
          </div>
          <h1 className="text-4xl font-black text-slate-900 mb-4 tracking-tight">
            Cannabis Lab Results
          </h1>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            Verified COA (Certificate of Analysis) data from certified labs.
            THC/CBD percentages, terpene profiles, and safety testing you can trust.
          </p>
          <div className="mt-6 inline-flex items-center gap-2 bg-white border border-blue-100 shadow-sm px-4 py-2 rounded-full text-sm font-medium text-slate-600">
            <FlaskConical className="w-4 h-4 text-blue-500" />
            {total.toLocaleString()} lab results
          </div>
        </header>

        {/* Search */}
        <div className="mb-8">
          <form className="flex gap-2 max-w-xl mx-auto" action="/lab-results" method="GET">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                name="strain"
                defaultValue={filters.strain || ''}
                placeholder="Search by strain or product name..."
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              />
            </div>
            <button
              type="submit"
              className="px-5 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors"
            >
              Search
            </button>
          </form>

          {/* Quick filters */}
          <div className="flex flex-wrap justify-center gap-2 mt-4">
            <Link
              href="/lab-results?thc_min=25"
              className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                filters.minThc === 25
                  ? 'bg-green-100 text-green-700 border-green-200'
                  : 'bg-white text-slate-500 border-slate-200 hover:border-slate-400'
              }`}
            >
              THC 25%+
            </Link>
            <Link
              href="/lab-results?thc_min=30"
              className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                filters.minThc === 30
                  ? 'bg-green-100 text-green-700 border-green-200'
                  : 'bg-white text-slate-500 border-slate-200 hover:border-slate-400'
              }`}
            >
              THC 30%+
            </Link>
            <Link
              href="/lab-results?state=NY"
              className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                filters.state === 'NY'
                  ? 'bg-blue-100 text-blue-700 border-blue-200'
                  : 'bg-white text-slate-500 border-slate-200 hover:border-slate-400'
              }`}
            >
              New York
            </Link>
            <Link
              href="/lab-results"
              className="px-3 py-1.5 rounded-full text-sm font-medium border bg-white text-slate-500 border-slate-200 hover:border-slate-400 transition-colors"
            >
              Clear
            </Link>
          </div>
        </div>

        {/* Results count */}
        <div className="mb-4 text-sm text-slate-500">
          {total.toLocaleString()} result{total !== 1 ? 's' : ''}
          {filters.strain ? ` matching "${filters.strain}"` : ''}
          {filters.lab ? ` from ${filters.lab}` : ''}
          {filters.minThc ? ` with THC ≥ ${filters.minThc}%` : ''}
        </div>

        {/* Results Grid */}
        {results.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {results.map((result) => (
              <Link
                key={result.slug}
                href={`/lab-results/${result.slug}`}
                className="group bg-white rounded-xl p-5 border border-slate-200 hover:border-blue-300 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <h2 className="text-lg font-bold text-slate-900 group-hover:text-blue-600 transition-colors truncate">
                      {result.strainName || result.productName}
                    </h2>
                    <p className="text-xs text-slate-400 truncate">{result.productName}</p>
                  </div>
                  {result.category && (
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full capitalize ml-2 flex-shrink-0 ${CATEGORY_COLORS[result.category] || 'bg-slate-100 text-slate-600'}`}>
                      {result.category}
                    </span>
                  )}
                </div>

                {/* THC/CBD */}
                <div className="flex gap-3 mb-3 text-sm">
                  {result.totalThc != null && (
                    <div className="flex items-center gap-1">
                      <FlaskConical className="w-3.5 h-3.5 text-green-500" />
                      <span className="font-semibold text-slate-800">{result.totalThc}%</span>
                      <span className="text-slate-400">THC</span>
                    </div>
                  )}
                  {result.totalCbd != null && result.totalCbd > 0 && (
                    <div className="flex items-center gap-1">
                      <FlaskConical className="w-3.5 h-3.5 text-blue-500" />
                      <span className="font-semibold text-slate-800">{result.totalCbd}%</span>
                      <span className="text-slate-400">CBD</span>
                    </div>
                  )}
                </div>

                {/* Safety + Lab */}
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-400 truncate">{result.labName}</span>
                  {result.safetyPassed ? (
                    <span className="inline-flex items-center gap-1 text-green-600">
                      <ShieldCheck className="w-3.5 h-3.5" /> Pass
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-red-500">
                      <ShieldX className="w-3.5 h-3.5" /> Fail
                    </span>
                  )}
                </div>

                {/* Date */}
                <div className="mt-2 text-xs text-slate-300">
                  Tested {result.testDate}
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center py-16 text-slate-400">
            <FlaskConical className="w-12 h-12 mx-auto mb-4 opacity-30" />
            <p className="text-lg">No lab results yet.</p>
            <p className="text-sm mt-2">
              Lab results are automatically added as dispensaries sync their POS inventory.
            </p>
            <Link href="/strains" className="mt-4 inline-block text-blue-600 hover:underline">
              Browse strains instead
            </Link>
          </div>
        )}

        {/* CTA */}
        <div className="mt-12 bg-blue-50 border border-blue-200 rounded-2xl p-8 text-center">
          <h3 className="text-xl font-bold text-slate-900 mb-2">Want your lab results listed here?</h3>
          <p className="text-slate-600 mb-4">
            BakedBot automatically publishes verified COA data from partner dispensaries.
            Connect your POS to get started.
          </p>
          <Link
            href="/get-started"
            className="inline-block px-6 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors"
          >
            Get Started
          </Link>
        </div>

        {/* Cross-links */}
        <div className="mt-10 flex flex-wrap justify-center gap-4 text-sm">
          <Link href="/strains" className="flex items-center gap-1.5 text-slate-500 hover:text-green-600 transition-colors">
            <Leaf className="w-4 h-4" /> Browse Strains
          </Link>
          <Link href="/terpenes" className="flex items-center gap-1.5 text-slate-500 hover:text-teal-600 transition-colors">
            <FlaskConical className="w-4 h-4" /> Terpene Guide
          </Link>
        </div>

        {/* Footer */}
        <footer className="mt-12 pt-6 border-t border-slate-100 text-center text-xs text-slate-400">
          <p>Lab data sourced from certified testing laboratories via COA verify pages and POS integrations.</p>
          <p className="mt-1">
            <Link href="/" className="text-blue-600 hover:underline">BakedBot AI</Link>
            {' — '}
            The Cannabis Data Platform
          </p>
        </footer>
      </div>
    </div>
    <LandingFooter />
    </>
  );
}
