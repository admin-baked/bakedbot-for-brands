/**
 * Destination Client Component
 * Renders international market pages with dispensary listings
 */

'use client';

import { formatCurrency } from '@/lib/utils/currency';
import { InternationalMarket } from '@/lib/config/international-markets';
import { InternationalPageData } from '@/server/services/growth/international-discovery';
import { InternationalDispensary } from '@/server/services/growth/international-discovery';

interface DestinationClientProps {
    market: InternationalMarket;
    pageData: InternationalPageData;
}

export default function DestinationClient({
    market,
    pageData,
}: DestinationClientProps) {
    return (
        <main className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100">
            {/* Header */}
            <section className="bg-white border-b border-slate-200 py-8">
                <div className="max-w-6xl mx-auto px-6">
                    <h1 className="text-4xl font-bold text-slate-800 mb-2">
                        Cannabis Dispensaries in {market.cityName}
                    </h1>
                    <p className="text-slate-600 mb-4">
                        {pageData.dispensaries.length} verified dispensaries • Updated{' '}
                        {new Date(pageData.scrapedAt).toLocaleDateString()}
                    </p>

                    {/* Growth CTA */}
                    <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mt-6">
                        <p className="text-sm font-semibold text-purple-900 mb-2">
                            📊 Are you a dispensary owner or brand?
                        </p>
                        <p className="text-sm text-purple-800 mb-3">
                            Get listed, grow your customer base, and use BakedBot's AI tools to optimize your
                            business.
                        </p>
                        <button className="bg-purple-600 text-white px-4 py-2 rounded font-medium text-sm hover:bg-purple-700 transition">
                            Claim Your Listing
                        </button>
                    </div>
                </div>
            </section>

            {/* Dispensary Grid */}
            <section className="max-w-6xl mx-auto px-6 py-12">
                <h2 className="text-2xl font-bold text-slate-800 mb-6">Featured Dispensaries</h2>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {pageData.dispensaries.map((dispensary, idx) => (
                        <DispensaryCard
                            key={dispensary.id || idx}
                            dispensary={dispensary}
                            currency={pageData.currency}
                        />
                    ))}
                </div>

                {pageData.dispensaries.length === 0 && (
                    <div className="text-center py-12">
                        <p className="text-slate-600">
                            No dispensaries found. Please check back soon!
                        </p>
                    </div>
                )}
            </section>

            {/* Market Insights Sidebar (Future) */}
            <section className="bg-white border-t border-slate-200 py-8">
                <div className="max-w-6xl mx-auto px-6">
                    <h3 className="text-lg font-semibold text-slate-800 mb-4">
                        Market Insights for {market.cityName}
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="bg-slate-50 rounded-lg p-4">
                            <div className="text-2xl font-bold text-slate-800">
                                {pageData.dispensaries.length}
                            </div>
                            <div className="text-xs text-slate-600 mt-1">
                                Dispensaries
                            </div>
                        </div>
                        <div className="bg-slate-50 rounded-lg p-4">
                            <div className="text-2xl font-bold text-slate-800">
                                {(
                                    pageData.dispensaries.reduce((sum, d) => sum + (d.rating || 0), 0) /
                                    pageData.dispensaries.length
                                ).toFixed(1)}
                            </div>
                            <div className="text-xs text-slate-600 mt-1">
                                Avg Rating
                            </div>
                        </div>
                        <div className="bg-slate-50 rounded-lg p-4">
                            <div className="text-2xl font-bold text-slate-800">
                                {pageData.dispensaries.filter(d => d.website).length}
                            </div>
                            <div className="text-xs text-slate-600 mt-1">
                                Have Website
                            </div>
                        </div>
                        <div className="bg-slate-50 rounded-lg p-4">
                            <div className="text-2xl font-bold text-slate-800">
                                {pageData.currency}
                            </div>
                            <div className="text-xs text-slate-600 mt-1">
                                Currency
                            </div>
                        </div>
                    </div>
                </div>
            </section>
        </main>
    );
}

interface DispensaryCardProps {
    dispensary: InternationalDispensary;
    currency: string;
}

function DispensaryCard({ dispensary, currency }: DispensaryCardProps) {
    return (
        <div className="bg-white rounded-lg border border-slate-200 overflow-hidden hover:shadow-lg transition">
            {/* Card Header */}
            <div className="p-4 border-b border-slate-100">
                <h4 className="text-lg font-semibold text-slate-800 mb-1">
                    {dispensary.name}
                </h4>
                <p className="text-sm text-slate-600">{dispensary.address}</p>
            </div>

            {/* Card Body */}
            <div className="p-4 space-y-3">
                {/* Rating */}
                {dispensary.rating && (
                    <div className="flex items-center gap-2">
                        <div className="flex gap-0.5">
                            {[...Array(5)].map((_, i) => (
                                <span
                                    key={i}
                                    className={`text-lg ${
                                        i < Math.round(dispensary.rating!)
                                            ? 'text-yellow-400'
                                            : 'text-slate-300'
                                    }`}
                                >
                                    ★
                                </span>
                            ))}
                        </div>
                        <span className="text-sm text-slate-600">
                            {dispensary.rating.toFixed(1)}
                            {dispensary.reviewCount && (
                                <span className="ml-1">
                                    ({dispensary.reviewCount})
                                </span>
                            )}
                        </span>
                    </div>
                )}

                {/* Contact Info */}
                <div className="space-y-1 text-sm">
                    {dispensary.phone && (
                        <div className="text-slate-700">
                            📞 <a href={`tel:${dispensary.phone}`} className="text-blue-600 hover:underline">{dispensary.phone}</a>
                        </div>
                    )}
                    {dispensary.openingHours && (
                        <div className="text-slate-700">
                            🕐 {dispensary.openingHours}
                        </div>
                    )}
                </div>

                {/* Categories */}
                {dispensary.categories && dispensary.categories.length > 0 && (
                    <div className="flex flex-wrap gap-2 pt-2">
                        {dispensary.categories.map((cat, i) => (
                            <span
                                key={i}
                                className="bg-slate-100 text-slate-700 text-xs px-2 py-1 rounded"
                            >
                                {cat}
                            </span>
                        ))}
                    </div>
                )}
            </div>

            {/* Card Footer */}
            <div className="bg-slate-50 px-4 py-3 border-t border-slate-100 flex gap-2">
                {dispensary.website && (
                    <a
                        href={dispensary.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 text-center bg-blue-600 text-white py-2 rounded text-sm font-medium hover:bg-blue-700 transition"
                    >
                        Visit Website
                    </a>
                )}
                {dispensary.googleMapsUrl && (
                    <a
                        href={dispensary.googleMapsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 text-center bg-slate-200 text-slate-800 py-2 rounded text-sm font-medium hover:bg-slate-300 transition"
                    >
                        Maps
                    </a>
                )}
            </div>
        </div>
    );
}
