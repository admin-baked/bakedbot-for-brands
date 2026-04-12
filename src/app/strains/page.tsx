import Link from 'next/link';
import { Leaf, Search, FlaskConical, Star } from 'lucide-react';
import { fetchStrains, fetchStrainStats, type StrainFilters } from '@/lib/strain-data';

export const revalidate = 86400; // 24h ISR — strain data changes infrequently

interface Props {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function parseFilters(raw: Record<string, string | string[] | undefined>): StrainFilters {
  const str = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
  return {
    category: (['indica', 'sativa', 'hybrid'].includes(str(raw.category) || '') ? str(raw.category) : undefined) as StrainFilters['category'],
    minThc: raw.thc_min ? Number(str(raw.thc_min)) : undefined,
    effect: str(raw.effect) || undefined,
    search: str(raw.q) || undefined,
    page: raw.page ? Number(str(raw.page)) : 1,
  };
}

const CATEGORY_COLORS: Record<string, string> = {
  indica: 'bg-purple-100 text-purple-700 border-purple-200',
  sativa: 'bg-amber-100 text-amber-700 border-amber-200',
  hybrid: 'bg-green-100 text-green-700 border-green-200',
};

const POPULAR_EFFECTS = ['Relaxed', 'Happy', 'Euphoric', 'Creative', 'Energetic', 'Sleepy', 'Focused', 'Uplifted'];

export default async function StrainsIndexPage({ searchParams }: Props) {
  const rawParams = await searchParams;
  const filters = parseFilters(rawParams);
  const [{ strains, total }, stats] = await Promise.all([
    fetchStrains(filters),
    fetchStrainStats(),
  ]);

  const totalPages = Math.ceil(total / 30);
  const currentPage = filters.page || 1;

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-white">
      <div className="max-w-6xl mx-auto px-4 py-12">

        {/* Hero */}
        <header className="text-center mb-10">
          <div className="w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <Leaf className="w-8 h-8 text-green-600" />
          </div>
          <h1 className="text-4xl font-black text-slate-900 mb-4 tracking-tight">
            Cannabis Strain Encyclopedia
          </h1>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            Browse {stats.total.toLocaleString()}+ strains with THC/CBD data, terpene profiles,
            effects, and community ratings. Powered by BakedBot AI.
          </p>
          <div className="mt-6 flex justify-center gap-4 text-sm">
            <span className="inline-flex items-center gap-1.5 bg-purple-50 border border-purple-200 px-3 py-1.5 rounded-full font-medium text-purple-700">
              {stats.indica.toLocaleString()} Indica
            </span>
            <span className="inline-flex items-center gap-1.5 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-full font-medium text-amber-700">
              {stats.sativa.toLocaleString()} Sativa
            </span>
            <span className="inline-flex items-center gap-1.5 bg-green-50 border border-green-200 px-3 py-1.5 rounded-full font-medium text-green-700">
              {stats.hybrid.toLocaleString()} Hybrid
            </span>
          </div>
        </header>

        {/* Search + Filters */}
        <div className="mb-8 space-y-4">
          <form className="flex gap-2 max-w-xl mx-auto" action="/strains" method="GET">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                name="q"
                defaultValue={filters.search || ''}
                placeholder="Search strains by name..."
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
              />
            </div>
            <button
              type="submit"
              className="px-5 py-2.5 bg-green-600 text-white rounded-xl text-sm font-medium hover:bg-green-700 transition-colors"
            >
              Search
            </button>
          </form>

          {/* Category + Effect Filters */}
          <div className="flex flex-wrap justify-center gap-2">
            <Link
              href="/strains"
              className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                !filters.category ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'
              }`}
            >
              All
            </Link>
            {(['indica', 'sativa', 'hybrid'] as const).map((cat) => (
              <Link
                key={cat}
                href={`/strains?category=${cat}${filters.search ? `&q=${filters.search}` : ''}`}
                className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors capitalize ${
                  filters.category === cat
                    ? CATEGORY_COLORS[cat]
                    : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'
                }`}
              >
                {cat}
              </Link>
            ))}
            <span className="mx-2 border-l border-slate-200" />
            {POPULAR_EFFECTS.map((effect) => (
              <Link
                key={effect}
                href={`/strains?effect=${effect}${filters.category ? `&category=${filters.category}` : ''}`}
                className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                  filters.effect === effect
                    ? 'bg-blue-100 text-blue-700 border-blue-200'
                    : 'bg-white text-slate-500 border-slate-200 hover:border-slate-400'
                }`}
              >
                {effect}
              </Link>
            ))}
          </div>
        </div>

        {/* Results count */}
        <div className="mb-4 text-sm text-slate-500">
          {total.toLocaleString()} strain{total !== 1 ? 's' : ''} found
          {filters.category ? ` in ${filters.category}` : ''}
          {filters.effect ? ` with ${filters.effect} effect` : ''}
          {filters.search ? ` matching "${filters.search}"` : ''}
        </div>

        {/* Strain Grid */}
        {strains.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {strains.map((strain) => (
              <Link
                key={strain.id}
                href={`/strains/${strain.slug}`}
                className="group bg-white rounded-xl p-5 border border-slate-200 hover:border-green-300 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200"
              >
                <div className="flex items-start justify-between mb-3">
                  <h2 className="text-lg font-bold text-slate-900 group-hover:text-green-600 transition-colors">
                    {strain.name}
                  </h2>
                  {strain.category && (
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full border capitalize ${CATEGORY_COLORS[strain.category] || 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                      {strain.category}
                    </span>
                  )}
                </div>

                {/* THC/CBD */}
                <div className="flex gap-3 mb-3 text-sm">
                  {strain.thc_pct != null && (
                    <div className="flex items-center gap-1">
                      <FlaskConical className="w-3.5 h-3.5 text-green-500" />
                      <span className="font-semibold text-slate-800">{strain.thc_pct}%</span>
                      <span className="text-slate-400">THC</span>
                    </div>
                  )}
                  {strain.cbd_pct != null && strain.cbd_pct > 0 && (
                    <div className="flex items-center gap-1">
                      <FlaskConical className="w-3.5 h-3.5 text-blue-500" />
                      <span className="font-semibold text-slate-800">{strain.cbd_pct}%</span>
                      <span className="text-slate-400">CBD</span>
                    </div>
                  )}
                </div>

                {/* Effect + Rating */}
                <div className="flex items-center justify-between text-sm">
                  {strain.top_effect && (
                    <span className="text-slate-500">{strain.top_effect}</span>
                  )}
                  {strain.average_rating != null && (
                    <span className="inline-flex items-center gap-1 text-slate-400">
                      <Star className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" />
                      {strain.average_rating.toFixed(1)}
                      {strain.review_count ? <span className="text-xs">({strain.review_count})</span> : null}
                    </span>
                  )}
                </div>

                {/* Flavors */}
                {strain.flavors && (
                  <div className="mt-3 flex flex-wrap gap-1">
                    {strain.flavors.split(',').slice(0, 3).map((f) => (
                      <span key={f} className="text-xs bg-slate-50 text-slate-500 px-2 py-0.5 rounded-full">
                        {f.trim()}
                      </span>
                    ))}
                  </div>
                )}
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center py-16 text-slate-400">
            <Leaf className="w-12 h-12 mx-auto mb-4 opacity-30" />
            <p className="text-lg">No strains found matching your filters.</p>
            <Link href="/strains" className="mt-4 inline-block text-green-600 hover:underline">
              Clear filters
            </Link>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <nav className="mt-10 flex justify-center gap-2">
            {currentPage > 1 && (
              <Link
                href={buildPageUrl(filters, currentPage - 1)}
                className="px-4 py-2 rounded-lg border border-slate-200 text-sm text-slate-600 hover:bg-slate-50"
              >
                Previous
              </Link>
            )}
            <span className="px-4 py-2 text-sm text-slate-500">
              Page {currentPage} of {totalPages}
            </span>
            {currentPage < totalPages && (
              <Link
                href={buildPageUrl(filters, currentPage + 1)}
                className="px-4 py-2 rounded-lg border border-slate-200 text-sm text-slate-600 hover:bg-slate-50"
              >
                Next
              </Link>
            )}
          </nav>
        )}

        {/* SEO Footer */}
        <footer className="mt-16 pt-8 border-t border-slate-100 text-center text-sm text-slate-400">
          <p>
            Data sourced from Leafly, Seed City, and community contributions.
            Updated daily. Powered by <Link href="/" className="text-green-600 hover:underline">BakedBot AI</Link>.
          </p>
        </footer>
      </div>
    </div>
  );
}

function buildPageUrl(filters: StrainFilters, page: number): string {
  const params = new URLSearchParams();
  if (filters.category) params.set('category', filters.category);
  if (filters.effect) params.set('effect', filters.effect);
  if (filters.search) params.set('q', filters.search);
  if (page > 1) params.set('page', String(page));
  const qs = params.toString();
  return `/strains${qs ? `?${qs}` : ''}`;
}
