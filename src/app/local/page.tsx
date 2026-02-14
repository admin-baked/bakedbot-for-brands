// src/app/local/page.tsx
/**
 * Local Cannabis Landing Page
 * Entry point for ZIP-based local search
 * Redirects to /local/[zipCode] after user enters ZIP
 */

import { Metadata } from 'next';
import Link from 'next/link';
import { MapPin, Search, TrendingUp, Users, Store } from 'lucide-react';
import { Button } from '@/components/ui/button';

export const metadata: Metadata = {
    title: 'Find Cannabis Near You | BakedBot',
    description: 'Discover dispensaries, compare prices, and find cannabis products near you. Enter your ZIP code to see local options.',
    keywords: ['cannabis near me', 'dispensary near me', 'weed near me', 'local cannabis'],
    openGraph: {
        title: 'Find Cannabis Near You | BakedBot',
        description: 'Enter your ZIP code to find dispensaries and cannabis products in your area.',
    },
    alternates: {
        canonical: 'https://bakedbot.ai/local',
    },
};

// Popular areas for SEO internal linking
const POPULAR_AREAS = [
    { zip: '48201', city: 'Detroit', state: 'MI' },
    { zip: '90210', city: 'Beverly Hills', state: 'CA' },
    { zip: '80205', city: 'Denver', state: 'CO' },
    { zip: '97209', city: 'Portland', state: 'OR' },
    { zip: '98101', city: 'Seattle', state: 'WA' },
    { zip: '85001', city: 'Phoenix', state: 'AZ' },
    { zip: '60601', city: 'Chicago', state: 'IL' },
    { zip: '89101', city: 'Las Vegas', state: 'NV' },
];

export default function LocalPage() {
    return (
        <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
            {/* Hero Section */}
            <header className="py-16 md:py-24 px-4">
                <div className="max-w-4xl mx-auto text-center">
                    <div className="inline-flex items-center gap-2 bg-green-50 text-green-700 px-4 py-2 rounded-full text-sm font-medium mb-6">
                        <MapPin className="w-4 h-4" />
                        Local Cannabis Discovery
                    </div>

                    <h1 className="text-4xl md:text-6xl font-black text-slate-900 tracking-tight mb-6">
                        Find Cannabis <span className="text-green-600">Near You</span>
                    </h1>

                    <p className="text-xl text-slate-600 mb-10 max-w-2xl mx-auto">
                        Compare prices, view live menus, and discover licensed dispensaries in your area.
                    </p>

                    {/* ZIP Code Search Form */}
                    <form action="/local/search" method="GET" className="max-w-md mx-auto">
                        <div className="flex gap-2 shadow-xl rounded-2xl p-2 bg-white border border-slate-200">
                            <div className="flex-1 relative">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                <input
                                    type="text"
                                    name="zip"
                                    placeholder="Enter your ZIP code"
                                    pattern="[0-9]{5}"
                                    maxLength={5}
                                    required
                                    className="w-full pl-12 pr-4 py-4 text-lg rounded-xl border-0 focus:ring-2 focus:ring-green-500 focus:outline-none"
                                />
                            </div>
                            <Button type="submit" size="lg" className="bg-green-600 hover:bg-green-700 px-8 py-4 text-lg font-bold rounded-xl">
                                Search
                            </Button>
                        </div>
                        <p className="text-sm text-slate-400 mt-4">
                            Enter your 5-digit ZIP code to see dispensaries nearby
                        </p>
                    </form>
                </div>
            </header>

            {/* Stats Section */}
            <section className="py-12 bg-slate-900 text-white">
                <div className="max-w-6xl mx-auto px-4 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
                    <div>
                        <TrendingUp className="w-8 h-8 mx-auto mb-3 text-green-400" />
                        <div className="text-3xl font-black mb-1">10K+</div>
                        <div className="text-slate-400 text-sm">Products Indexed</div>
                    </div>
                    <div>
                        <Store className="w-8 h-8 mx-auto mb-3 text-green-400" />
                        <div className="text-3xl font-black mb-1">500+</div>
                        <div className="text-slate-400 text-sm">Dispensaries</div>
                    </div>
                    <div>
                        <Users className="w-8 h-8 mx-auto mb-3 text-green-400" />
                        <div className="text-3xl font-black mb-1">50K+</div>
                        <div className="text-slate-400 text-sm">Monthly Visits</div>
                    </div>
                    <div>
                        <MapPin className="w-8 h-8 mx-auto mb-3 text-green-400" />
                        <div className="text-3xl font-black mb-1">40+</div>
                        <div className="text-slate-400 text-sm">States Covered</div>
                    </div>
                </div>
            </section>

            {/* Popular Areas for SEO */}
            <section className="py-16 px-4">
                <div className="max-w-6xl mx-auto">
                    <h2 className="text-2xl font-bold text-slate-900 mb-8 text-center">
                        Popular Cannabis Markets
                    </h2>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {POPULAR_AREAS.map((area) => (
                            <Link
                                key={area.zip}
                                href={`/local/${area.zip}`}
                                className="bg-white p-6 rounded-2xl border border-slate-200 hover:border-green-300 hover:shadow-md transition group"
                            >
                                <div className="flex items-center gap-3 mb-2">
                                    <MapPin className="w-5 h-5 text-green-500" />
                                    <span className="font-bold text-slate-900">{area.city}</span>
                                </div>
                                <p className="text-sm text-slate-500">{area.state} • {area.zip}</p>
                            </Link>
                        ))}
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="py-16 px-4 bg-gradient-to-r from-green-600 to-emerald-600 text-white">
                <div className="max-w-4xl mx-auto text-center">
                    <h2 className="text-3xl font-bold mb-4">
                        Own a Dispensary?
                    </h2>
                    <p className="text-green-100 mb-8">
                        Claim your page to appear in local search results and connect with nearby customers.
                    </p>
                    <Button size="lg" variant="secondary" className="bg-white text-green-600 hover:bg-green-50 font-bold" asChild>
                        <Link href="/brands/claim?type=dispensary">
                            Claim Your Page Free
                        </Link>
                    </Button>
                </div>
            </section>
        </div>
    );
}
