/**
 * International Destinations Landing Page
 * Route: /destination
 * Shows available destination markets
 */

import Link from 'next/link';
import { getAllInternationalMarkets } from '@/lib/config/international-markets';

export const metadata = {
    title: 'Cannabis Destinations | BakedBot',
    description:
        'Discover cannabis dispensaries, products, and local guides in international destinations. From Koh Samui to Bangkok.',
};

export default function DestinationLanding() {
    const markets = getAllInternationalMarkets();
    const countries = [...new Set(markets.map(m => m.country))];

    return (
        <main className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100">
            {/* Hero */}
            <section className="bg-gradient-to-r from-purple-600 to-blue-600 text-white py-16">
                <div className="max-w-6xl mx-auto px-6 text-center">
                    <h1 className="text-4xl md:text-5xl font-bold mb-4">
                        Cannabis Destinations
                    </h1>
                    <p className="text-lg md:text-xl opacity-90 mb-8">
                        Explore dispensaries, products, and local cannabis guides around the world
                    </p>
                    <div className="inline-block bg-white text-purple-600 px-6 py-3 rounded-lg font-semibold">
                        {markets.length} Destinations
                    </div>
                </div>
            </section>

            {/* Destinations by Country */}
            <section className="max-w-6xl mx-auto px-6 py-16">
                {countries.map(country => {
                    const countryMarkets = markets.filter(m => m.country === country);
                    const countryName = countryMarkets[0]?.countryName || country;

                    return (
                        <div key={country} className="mb-12">
                            <h2 className="text-2xl font-bold text-slate-800 mb-6">
                                🌍 {countryName}
                            </h2>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {countryMarkets.map(market => (
                                    <Link
                                        key={market.id}
                                        href={`/destination/${market.country}/${market.city}`}
                                    >
                                        <div className="bg-white rounded-lg border border-slate-200 overflow-hidden hover:shadow-lg hover:border-purple-300 transition cursor-pointer h-full">
                                            {/* Image Placeholder */}
                                            <div className="h-32 bg-gradient-to-br from-purple-400 to-blue-400 flex items-center justify-center">
                                                <span className="text-4xl">🏖️</span>
                                            </div>

                                            {/* Content */}
                                            <div className="p-4">
                                                <h3 className="text-lg font-semibold text-slate-800 mb-1">
                                                    {market.cityName}
                                                </h3>
                                                <p className="text-sm text-slate-600 mb-3">
                                                    {market.description ||
                                                        `Explore cannabis dispensaries in ${market.cityName}`}
                                                </p>

                                                {/* Meta */}
                                                <div className="flex items-center justify-between text-xs text-slate-500">
                                                    <span>💰 {market.currencySymbol}</span>
                                                    <span>📍 {market.cityName}</span>
                                                </div>
                                            </div>

                                            {/* Footer */}
                                            <div className="bg-slate-50 px-4 py-3 border-t border-slate-100">
                                                <div className="text-sm font-medium text-purple-600 hover:text-purple-700">
                                                    Explore →
                                                </div>
                                            </div>
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        </div>
                    );
                })}
            </section>

            {/* Growth CTA */}
            <section className="bg-white border-t border-slate-200 py-16">
                <div className="max-w-3xl mx-auto px-6 text-center">
                    <h3 className="text-2xl font-bold text-slate-800 mb-4">
                        Grow Your Dispensary Business
                    </h3>
                    <p className="text-slate-600 mb-6">
                        List your dispensary on BakedBot, reach customers worldwide, and use our AI
                        tools to grow your business.
                    </p>
                    <button className="bg-purple-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-purple-700 transition">
                        Get Started for Free
                    </button>
                </div>
            </section>
        </main>
    );
}
