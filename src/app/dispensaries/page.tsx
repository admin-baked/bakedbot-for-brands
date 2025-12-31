import Link from 'next/link';
import { MapPin, Clock, ExternalLink } from 'lucide-react';
import { fetchScrapedDispensaryPages } from '@/lib/dispensary-data';

export const dynamic = 'force-dynamic';
export const revalidate = 60; // Revalidate every minute

export default async function ScrapedDispensariesPage() {
    const pages = await fetchScrapedDispensaryPages(50);

    return (
        <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
            <div className="max-w-6xl mx-auto px-4 py-12">
                {/* Header */}
                <header className="text-center mb-12">
                    <h1 className="text-4xl font-black text-slate-900 mb-4">
                        Chicago Dispensaries
                    </h1>
                    <p className="text-lg text-slate-600 max-w-2xl mx-auto">
                        Discover cannabis dispensaries in the Chicago area. 
                        Powered by BakedBot&apos;s National Discovery Layer.
                    </p>
                    <div className="mt-4 inline-flex items-center gap-2 bg-green-50 text-green-700 px-4 py-2 rounded-full text-sm font-medium">
                        <Clock className="w-4 h-4" />
                        {pages.length} dispensaries discovered
                    </div>
                </header>

                {/* Dispensary Grid */}
                {pages.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {pages.map((page) => (
                            <Link
                                key={page.id}
                                href={`/dispensaries/${page.dispensarySlug}`}
                                className="group bg-white rounded-2xl p-6 border border-slate-200 hover:border-green-300 hover:shadow-lg transition-all"
                            >
                                <div className="flex items-start justify-between mb-4">
                                    <div className="w-12 h-12 bg-green-50 rounded-xl flex items-center justify-center text-green-600 font-bold text-lg">
                                        {page.dispensaryName?.charAt(0) || 'D'}
                                    </div>
                                    <ExternalLink className="w-4 h-4 text-slate-300 group-hover:text-green-500 transition-colors" />
                                </div>

                                <h2 className="text-xl font-bold text-slate-900 mb-2 group-hover:text-green-600 transition-colors">
                                    {page.dispensaryName || 'Unknown Dispensary'}
                                </h2>

                                <div className="flex items-center gap-1 text-slate-500 text-sm mb-4">
                                    <MapPin className="w-4 h-4" />
                                    <span>{page.city}, {page.state} • {page.zipCode}</span>
                                </div>

                                {page.seoTags?.metaDescription && (
                                    <p className="text-sm text-slate-500 line-clamp-2">
                                        {page.seoTags.metaDescription}
                                    </p>
                                )}

                                <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
                                    <span>Views: {page.metrics?.pageViews || 0}</span>
                                    <span className={page.published ? 'text-green-600' : 'text-amber-500'}>
                                        {page.published ? '● Live' : '○ Draft'}
                                    </span>
                                </div>
                            </Link>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-20 bg-slate-50 rounded-2xl">
                        <p className="text-slate-500 mb-4">No scraped dispensaries yet.</p>
                        <p className="text-sm text-slate-400">
                            Run the SEO pilot to discover dispensaries.
                        </p>
                    </div>
                )}

                {/* Footer */}
                <footer className="mt-16 text-center text-sm text-slate-400">
                    <p>Powered by BakedBot Discovery • Chicago SEO Pilot</p>
                </footer>
            </div>
        </div>
    );
}
