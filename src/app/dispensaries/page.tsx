import Link from 'next/link';
import { MapPin, Globe, BadgeCheck, ExternalLink } from 'lucide-react';
import { Navbar } from '@/components/landing/navbar';
import { LandingFooter } from '@/components/landing/footer';
import { fetchDiscoveredDispensaryPages, fetchRetailersForDirectory } from '@/lib/dispensary-data';

export const dynamic = 'force-dynamic';

interface Props {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

const STATE_TABS = [
  { code: '', label: 'All States' },
  { code: 'NY', label: 'New York' },
  { code: 'IL', label: 'Illinois' },
  { code: 'CA', label: 'California' },
  { code: 'CO', label: 'Colorado' },
  { code: 'MI', label: 'Michigan' },
  { code: 'WA', label: 'Washington' },
];

export default async function DispensariesPage({ searchParams }: Props) {
  const rawParams = await searchParams;
  const stateFilter = typeof rawParams.state === 'string' ? rawParams.state.toUpperCase() : undefined;

  const [seoPages, retailers] = await Promise.all([
    fetchDiscoveredDispensaryPages(150),
    fetchRetailersForDirectory(stateFilter, 150),
  ]);

  // Normalize retailers into display entries (CRM / OCM-licensed data)
  const retailerEntries = retailers.map(r => ({
    id: r.id,
    name: r.name,
    slug: r.slug || r.id,
    city: r.city || '',
    state: r.state || '',
    zip: r.zip || '',
    description: undefined as string | undefined,
    isLicensed: true,
  }));

  // Normalize SEO pilot pages, client-side filter by state if active
  const seoEntries = seoPages
    .filter(p => !stateFilter || (p.state || '').toUpperCase() === stateFilter)
    .map(p => ({
      id: p.id,
      name: p.dispensaryName || 'Unknown Dispensary',
      slug: p.dispensarySlug,
      city: p.city || '',
      state: p.state || '',
      zip: p.zipCode || '',
      description: p.seoTags?.metaDescription,
      isLicensed: false,
    }));

  // Merge, deduplicate by name+city — licensed retailer entries take priority
  const seen = new Set<string>();
  const entries = [...retailerEntries, ...seoEntries].filter(e => {
    const key = `${e.name.toLowerCase()}_${e.city.toLowerCase()}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  const activeTabLabel = STATE_TABS.find(t => t.code === (stateFilter || ''))?.label ?? 'All States';

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white pt-16">
        <div className="max-w-6xl mx-auto px-4 py-12">

          {/* Header */}
          <header className="text-center mb-10">
            <div className="w-16 h-16 bg-rose-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <MapPin className="w-8 h-8 text-rose-600" />
            </div>
            <h1 className="text-4xl font-black text-slate-900 mb-4 tracking-tight">
              US Cannabis Dispensary Directory
            </h1>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              Licensed cannabis dispensaries across legal states — menus, hours, and deals.
              Powered by BakedBot&apos;s National Discovery Layer.
            </p>
            <div className="mt-4 inline-flex items-center gap-2 bg-green-50 text-green-700 px-4 py-2 rounded-full text-sm font-medium">
              <Globe className="w-4 h-4" />
              {entries.length} dispensaries {stateFilter ? `in ${activeTabLabel}` : 'across the US'}
            </div>
          </header>

          {/* State filter tabs */}
          <div className="flex flex-wrap justify-center gap-2 mb-10">
            {STATE_TABS.map(tab => {
              const isActive = (stateFilter || '') === tab.code;
              return (
                <Link
                  key={tab.code}
                  href={tab.code ? `/dispensaries?state=${tab.code}` : '/dispensaries'}
                  className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                    isActive
                      ? 'bg-slate-900 text-white border-slate-900'
                      : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'
                  }`}
                >
                  {tab.label}
                </Link>
              );
            })}
          </div>

          {/* Dispensary Grid */}
          {entries.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {entries.map(entry => (
                <Link
                  key={entry.id}
                  href={`/dispensaries/${entry.slug}`}
                  className="group bg-white rounded-2xl p-6 border border-slate-200 hover:border-green-300 hover:shadow-lg transition-all"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-11 h-11 bg-rose-50 rounded-xl flex items-center justify-center text-rose-600 font-bold text-lg flex-shrink-0">
                      {entry.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex items-center gap-1.5">
                      {entry.isLicensed && (
                        <span className="inline-flex items-center gap-1 text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                          <BadgeCheck className="w-3 h-3" /> Licensed
                        </span>
                      )}
                      <ExternalLink className="w-4 h-4 text-slate-300 group-hover:text-green-500 transition-colors" />
                    </div>
                  </div>

                  <h2 className="text-lg font-bold text-slate-900 mb-1.5 group-hover:text-green-600 transition-colors leading-snug">
                    {entry.name}
                  </h2>

                  <div className="flex items-center gap-1 text-slate-500 text-sm mb-3">
                    <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                    <span>{[entry.city, entry.state, entry.zip].filter(Boolean).join(', ')}</span>
                  </div>

                  {entry.description && (
                    <p className="text-sm text-slate-500 line-clamp-2">{entry.description}</p>
                  )}
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-20 bg-slate-50 rounded-2xl">
              <MapPin className="w-12 h-12 mx-auto mb-4 text-slate-300" />
              <p className="text-slate-500 mb-2">
                No dispensaries found{stateFilter ? ` in ${activeTabLabel}` : ''}.
              </p>
              <Link href="/dispensaries" className="text-sm text-green-600 hover:underline">
                View all states
              </Link>
            </div>
          )}

          {/* Cross-links */}
          <div className="mt-12 flex flex-wrap justify-center gap-4 text-sm">
            <Link href="/local" className="flex items-center gap-1.5 text-slate-500 hover:text-rose-600 transition-colors">
              <MapPin className="w-4 h-4" /> Find by ZIP code
            </Link>
            <Link href="/strains" className="flex items-center gap-1.5 text-slate-500 hover:text-green-600 transition-colors">
              Browse Strains
            </Link>
            <Link href="/explore" className="flex items-center gap-1.5 text-slate-500 hover:text-slate-700 transition-colors">
              ← Cannabis Data Library
            </Link>
          </div>

          <footer className="mt-12 pt-6 border-t border-slate-100 text-center text-xs text-slate-400">
            <p>Licensed dispensary data sourced from state OCM registries, CannMenus, and BakedBot partner integrations.</p>
          </footer>
        </div>
      </div>
      <LandingFooter />
    </>
  );
}
