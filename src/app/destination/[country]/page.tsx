/**
 * Country-Level Destination Page
 * Route: /destination/[country]
 * Example: /destination/thailand
 */

import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getMarketsByCountry } from '@/lib/config/international-markets';

export const dynamic = 'force-dynamic';

interface Params {
    country: string;
}

export default async function CountryPage({
    params,
}: {
    params: Promise<Params>;
}) {
    const { country } = await params;
    const markets = getMarketsByCountry(country);

    if (markets.length === 0) {
        notFound();
    }

    const countryName = markets[0].countryName;

    return (
        <main className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100">
            {/* Hero */}
            <section className="bg-gradient-to-r from-purple-600 to-blue-600 text-white py-12">
                <div className="max-w-6xl mx-auto px-6">
                    <Link href="/destination" className="text-sm opacity-75 hover:opacity-100 mb-4 inline-block">
                        ← Back to Destinations
                    </Link>
                    <h1 className="text-4xl font-bold mb-2">
                        Cannabis in {countryName}
                    </h1>
                    <p className="text-lg opacity-90">
                        Explore {markets.length} destination{markets.length !== 1 ? 's' : ''} across{' '}
                        {countryName}
                    </p>
                </div>
            </section>

            {/* Markets Grid */}
            <section className="max-w-6xl mx-auto px-6 py-16">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {markets.map(market => (
                        <Link
                            key={market.id}
                            href={`/destination/${market.country}/${market.city}`}
                        >
                            <div className="bg-white rounded-lg border border-slate-200 overflow-hidden hover:shadow-lg hover:border-purple-300 transition cursor-pointer">
                                {/* Image */}
                                <div className="h-40 bg-gradient-to-br from-purple-400 to-blue-400 flex items-center justify-center">
                                    <span className="text-5xl">🌴</span>
                                </div>

                                {/* Content */}
                                <div className="p-6">
                                    <h3 className="text-xl font-semibold text-slate-800 mb-2">
                                        {market.cityName}
                                    </h3>
                                    <p className="text-slate-600 mb-4">
                                        {market.description ||
                                            `Discover cannabis dispensaries in ${market.cityName}`}
                                    </p>

                                    {/* Stats */}
                                    <div className="space-y-2 text-sm text-slate-600">
                                        <div>📍 {market.cityName}</div>
                                        <div>💰 {market.currencySymbol}</div>
                                        <div>🌐 {market.locale}</div>
                                    </div>
                                </div>

                                {/* Footer */}
                                <div className="bg-slate-50 px-6 py-3 border-t border-slate-100">
                                    <div className="text-sm font-medium text-purple-600">
                                        Explore Dispensaries →
                                    </div>
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>
            </section>

            {/* Info Section */}
            <section className="bg-white border-t border-slate-200 py-12">
                <div className="max-w-6xl mx-auto px-6">
                    <h2 className="text-2xl font-bold text-slate-800 mb-6">
                        About {countryName} Cannabis Market
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div>
                            <h3 className="font-semibold text-slate-800 mb-2">
                                Travel Tips
                            </h3>
                            <ul className="text-slate-600 space-y-2 text-sm">
                                <li>✓ Check local laws and regulations before traveling</li>
                                <li>✓ Bring valid identification</li>
                                <li>✓ Support local businesses</li>
                                <li>✓ Respect local customs</li>
                            </ul>
                        </div>
                        <div>
                            <h3 className="font-semibold text-slate-800 mb-2">
                                Why BakedBot?
                            </h3>
                            <ul className="text-slate-600 space-y-2 text-sm">
                                <li>✓ Real-time dispensary listings</li>
                                <li>✓ Customer reviews and ratings</li>
                                <li>✓ Local product guides</li>
                                <li>✓ Verified businesses</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </section>
        </main>
    );
}

export async function generateMetadata({ params }: { params: Promise<Params> }) {
    const { country } = await params;
    const markets = getMarketsByCountry(country);

    if (markets.length === 0) {
        return { title: 'Not Found' };
    }

    const countryName = markets[0].countryName;

    return {
        title: `Cannabis in ${countryName} | BakedBot`,
        description: `Explore cannabis dispensaries across ${markets.length} destination${markets.length !== 1 ? 's' : ''} in ${countryName}`,
    };
}
