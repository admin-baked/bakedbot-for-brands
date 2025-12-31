import Link from 'next/link';
import { Package, TrendingUp, ExternalLink } from 'lucide-react';
import { fetchScrapedBrandPages } from '@/lib/brand-data';

export const dynamic = 'force-dynamic';
export const revalidate = 60; // Revalidate every minute

export default async function ScrapedBrandsPage() {
    const pages = await fetchScrapedBrandPages(50);

    return (
        <div className="min-h-screen bg-gradient-to-b from-indigo-50 to-white">
            <div className="max-w-6xl mx-auto px-4 py-12">
                {/* Header */}
                <header className="text-center mb-12">
                    <div className="w-16 h-16 bg-indigo-100 rounded-2xl flex items-center justify-center mx-auto mb-6 transform rotate-3">
                        <Package className="w-8 h-8 text-indigo-600" />
                    </div>
                    <h1 className="text-4xl font-black text-slate-900 mb-4 tracking-tight">
                        Cannabis Brands in Chicago
                    </h1>
                    <p className="text-lg text-slate-600 max-w-2xl mx-auto">
                        Discover top-trending cannabis brands available in Chicago dispensaries. 
                        Powered by BakedBot Market Intelligence.
                    </p>
                    <div className="mt-6 inline-flex items-center gap-2 bg-white border border-indigo-100 shadow-sm px-4 py-2 rounded-full text-sm font-medium text-slate-600">
                        <TrendingUp className="w-4 h-4 text-indigo-500" />
                        {pages.length} brands tracked this week
                    </div>
                </header>

                {/* Brand Grid */}
                {pages.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {pages.map((page) => (
                            <Link
                                key={page.id}
                                href={`/brands/${page.brandSlug || page.id}`}
                                className="group bg-white rounded-2xl p-6 border border-slate-200 hover:border-indigo-300 hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
                            >
                                <div className="flex items-start justify-between mb-6">
                                    <div className="w-16 h-16 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-center overflow-hidden">
                                        {page.logoUrl ? (
                                            <img src={page.logoUrl} alt={page.brandName} className="w-full h-full object-cover" />
                                        ) : (
                                            <span className="text-2xl font-bold text-slate-300">{page.brandName?.charAt(0)}</span>
                                        )}
                                    </div>
                                    <ExternalLink className="w-4 h-4 text-slate-300 group-hover:text-indigo-500 transition-colors" />
                                </div>

                                <h2 className="text-xl font-bold text-slate-900 mb-2 group-hover:text-indigo-600 transition-colors">
                                    {page.brandName}
                                </h2>

                                {page.seoTags?.metaDescription && (
                                    <p className="text-sm text-slate-500 line-clamp-2 mb-4">
                                        {page.seoTags.metaDescription}
                                    </p>
                                )}

                                <div className="flex flex-wrap gap-2 mb-6">
                                    {page.zipCodes?.slice(0, 3).map((zip: string) => (
                                        <span key={zip} className="text-[10px] bg-slate-100 text-slate-500 px-2 py-1 rounded font-medium">
                                            {zip}
                                        </span>
                                    ))}
                                    {page.zipCodes?.length > 3 && (
                                        <span className="text-[10px] bg-slate-50 text-slate-400 px-2 py-1 rounded">+{page.zipCodes.length - 3}</span>
                                    )}
                                </div>

                                <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
                                    <span>Views: {page.metrics?.pageViews || 0}</span>
                                    <span className={page.published ? 'text-green-600 font-bold' : 'text-amber-500'}>
                                        {page.published ? '● Live' : '○ Draft'}
                                    </span>
                                </div>
                            </Link>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-20 bg-white border border-dashed border-slate-200 rounded-3xl">
                        <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Package className="text-slate-300 w-8 h-8" />
                        </div>
                        <h3 className="text-xl font-bold text-slate-900 mb-2">No Brands Discovered Yet</h3>
                        <p className="text-slate-500 mb-6">Run the Brand Pilot to populate this list.</p>
                        <Link href="/api/cron/brand-pilot?key=pilot_run" className="text-indigo-600 font-bold hover:underline">
                            Trigger Pilot →
                        </Link>
                    </div>
                )}

                {/* Footer */}
                <footer className="mt-16 text-center text-sm text-slate-400">
                    <p>Powered by BakedBot Market Intelligence • Chicago Pilot</p>
                </footer>
            </div>
        </div>
    );
}
