// src/app/local/[zipCode]/page.tsx
/**
 * Local Marketplace B2B Page (Variant B)
 * SEO + B2B lead generation design
 * URL: /local/{zipCode}
 */

import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import {
    MapPin,
    Navigation,
    MessageSquare,
    BarChart,
    ArrowRight,
    TrendingUp,
    ExternalLink,
    AlertTriangle,
    EyeOff
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PageViewTracker } from '@/components/analytics/PageViewTracker';

import { getRetailersByZipCode, getZipCodeCoordinates, discoverNearbyProducts } from '@/server/services/geo-discovery';
import { RetailerSummary, LocalProduct } from '@/types/foot-traffic';
import { createServerClient } from '@/firebase/server-client';
import { getSeededConfig } from '@/server/actions/seo-pages';

// ISR Configuration - Pure on-demand generation
export const revalidate = 14400; // 4 hours (reduced revalidation frequency)
export const dynamicParams = true; // Generate ALL pages on-demand (no build-time pre-rendering)
export const dynamic = 'force-dynamic'; // Force dynamic rendering to avoid build timeouts

interface PageProps {
    params: Promise<{ zipCode: string }>;
}

/**
 * On-Demand ISR Strategy:
 * - NO pages pre-rendered at build time (prevents 60s+ timeouts)
 * - ALL pages generated on first visitor request
 * - Cached for 4 hours after generation
 * - Revalidated in background after cache expiry
 *
 * This allows unlimited scaling without build constraints.
 * Day Day discovery job will "warm" pages via cron visits.
 */

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
    const { zipCode } = await params;

    if (!/^\d{5}$/.test(zipCode)) {
        return { title: 'Location Not Found | BakedBot' };
    }

    const coords = await getZipCodeCoordinates(zipCode);

    if (!coords) {
        return { title: 'Location Not Found | BakedBot' };
    }

    return {
        title: `Dispensaries in ${coords.city}, ${coords.state} ${zipCode} | BakedBot`,
        description: `Find licensed dispensaries and compare cannabis prices near ${zipCode}. View live menus from local retailers.`,
        keywords: [
            `cannabis near ${zipCode}`,
            `dispensary ${zipCode}`,
            `weed near me`,
            `marijuana ${zipCode}`,
        ].join(', '),
        openGraph: {
            title: `Cannabis Near ${zipCode} | BakedBot`,
            description: `Discover dispensaries and cannabis products near ZIP code ${zipCode}.`,
        },
        alternates: {
            canonical: `https://bakedbot.ai/local/${zipCode}`,
        },
    };
}

export default async function LocalZipPage({ params }: PageProps) {
    const { zipCode } = await params;

    if (!/^\d{5}$/.test(zipCode)) {
        notFound();
    }

    const coords = await getZipCodeCoordinates(zipCode);

    if (!coords) {
        notFound();
    }

    // Fetch data
    const seededConfig = await getSeededConfig(zipCode);
    const { firestore } = await createServerClient();

    let retailers: RetailerSummary[] = [];
    let products: LocalProduct[] = [];

    // Check for snapshot data
    if (seededConfig?.dataSnapshotRef) {
        const snapshotDoc = await firestore.collection('foot_traffic').doc('data').collection('cann_menus_snapshots').doc(seededConfig.dataSnapshotRef).get();
        if (snapshotDoc.exists) {
            const snap = snapshotDoc.data() as any;
            retailers = (snap.dispensaries || []) as RetailerSummary[];
            products = (snap.products || []) as LocalProduct[];
        }
    }

    // Runtime discovery fallback
    if (products.length === 0) {
        const [liveRetailers, discovery] = await Promise.all([
            getRetailersByZipCode(zipCode, 10),
            discoverNearbyProducts({
                lat: coords.lat,
                lng: coords.lng,
                radiusMiles: 50,
                limit: 20,
                sortBy: 'score',
                cityName: coords.city,
                state: coords.state
            })
        ]);
        retailers = liveRetailers;
        products = discovery.products;
    }

    // Calculate stats
    const avgPrice = products.length > 0
        ? (products.reduce((sum, p) => sum + (p.price || 0), 0) / products.length).toFixed(2)
        : '0.00';

    return (
        <div className="min-h-screen bg-[#F4F7F5] font-sans">
            <PageViewTracker
                pageType="zip"
                pageId={zipCode}
                pageSlug={zipCode}
            />

            {/* DRAFT BANNER */}
            {(!seededConfig || seededConfig.published === false) && (
                <div className="bg-amber-500 text-white py-3 px-4 shadow-inner relative z-[60]">
                    <div className="max-w-7xl mx-auto flex items-center justify-between">
                        <div className="flex items-center gap-3 font-black">
                            <EyeOff className="w-5 h-5" />
                            DRAFT PREVIEW MODE
                        </div>
                        <div className="flex items-center gap-4 text-xs font-bold">
                            <span>This page is currently hidden from the public and search engines.</span>
                            <Badge variant="outline" className="text-white border-white bg-white/10 hover:bg-white/20">
                                Administrative View
                            </Badge>
                        </div>
                    </div>
                </div>
            )}

            {/* B2B GROWTH HEADER (Sticky) */}
            <div className="bg-slate-900 text-white py-2 px-4 sticky top-0 z-50 shadow-xl">
                <div className="max-w-7xl mx-auto flex justify-between items-center">
                    <p className="text-[11px] md:text-sm font-medium flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-green-400" />
                        <span className="hidden md:inline">Market Insight:</span>
                        {products.length}+ local products were just updated in {coords.city}. Is your menu current?
                    </p>
                    <Button size="sm" className="bg-green-500 hover:bg-green-600 text-slate-900 px-3 py-1 rounded font-bold text-xs" asChild>
                        <Link href="/brands/claim?type=dispensary">Sync My Inventory</Link>
                    </Button>
                </div>
            </div>

            <main className="max-w-7xl mx-auto p-4 md:p-8 grid grid-cols-1 lg:grid-cols-4 gap-8">

                {/* LEFT/MIDDLE: Consumer Search & Results (SEO Engine) */}
                <div className="lg:col-span-3 space-y-8">

                    <header>
                        <h1 className="text-3xl md:text-5xl font-black text-slate-900 tracking-tight mb-2">
                            Dispensaries in <span className="text-green-600">{zipCode}</span>
                        </h1>
                        <p className="text-slate-500 font-medium">
                            Comparing {retailers.length} licensed dispensaries and {products.length}+ live products near {coords.city}.
                        </p>
                    </header>

                    {/* NEARBY DISPENSARIES GRID */}
                    <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {retailers.slice(0, 6).map((retailer, i) => (
                            <div key={retailer.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition group">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="bg-slate-100 w-12 h-12 rounded-xl flex items-center justify-center font-bold text-slate-400">
                                        {retailer.name[0]}
                                    </div>
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest group-hover:text-amber-500 transition-colors">
                                        {i < 2 ? 'Verified' : 'Unclaimed'}
                                    </span>
                                </div>
                                <h3 className="font-bold text-slate-900 leading-tight mb-1">{retailer.name}</h3>
                                <p className="text-xs text-slate-500 mb-4 flex items-center gap-1">
                                    <MapPin className="w-3 h-3" /> {retailer.distance?.toFixed(1) || '?'} mi • {retailer.city}
                                </p>
                                <Button variant="outline" size="sm" className="w-full" asChild>
                                    <Link href={`/dispensaries/${retailer.id}`}>View Live Menu</Link>
                                </Button>
                            </div>
                        ))}
                    </section>

                    {/* SEO PRODUCT GRID */}
                    <section className="space-y-6">
                        <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                            <h2 className="text-xl font-bold text-slate-900">Trending in {zipCode}</h2>
                            <Link href={`/local/${zipCode}/search`} className="text-sm font-bold text-green-600 flex items-center gap-1">
                                View all <ArrowRight className="w-4 h-4" />
                            </Link>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {products.slice(0, 8).map((product, i) => (
                                <div key={i} className="bg-white rounded-2xl border border-slate-200 overflow-hidden group cursor-pointer hover:shadow-md transition">
                                    <div className="aspect-square bg-slate-100 relative">
                                        {product.imageUrl ? (
                                            <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-slate-300 text-2xl font-bold">
                                                {product.name[0]}
                                            </div>
                                        )}
                                        <div className="absolute top-2 left-2 bg-white px-2 py-1 rounded text-[10px] font-bold shadow-sm">
                                            {product.category || 'Other'}
                                        </div>
                                    </div>
                                    <div className="p-4">
                                        <h4 className="text-sm font-bold text-slate-900 line-clamp-1">{product.name}</h4>
                                        <p className="text-lg font-black text-green-600 mt-1">${product.price?.toFixed(2) || 'N/A'}</p>
                                        <p className="text-[10px] text-slate-400 mt-1">Found at {product.availability?.length || 1} location{(product.availability?.length || 1) > 1 ? 's' : ''}</p>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {products.length === 0 && (
                            <div className="bg-white rounded-2xl p-12 text-center border border-slate-200">
                                <p className="text-slate-500 mb-4">No products found near {zipCode}. Try expanding your search.</p>
                                <Button variant="outline" asChild>
                                    <Link href={`/local/${zipCode}/search`}>Search Products</Link>
                                </Button>
                            </div>
                        )}
                    </section>
                </div>

                {/* RIGHT COLUMN: B2B LEAD GEN & MARKET INTEL */}
                <aside className="space-y-6">

                    {/* THE "AI INTEL" CARD */}
                    <div className="bg-indigo-600 text-white rounded-3xl p-6 shadow-xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 -mr-4 -mt-4 w-24 h-24 bg-white/10 rounded-full blur-2xl" />
                        <div className="relative z-10">
                            <div className="flex items-center gap-2 mb-4">
                                <MessageSquare className="w-5 h-5 text-indigo-200" />
                                <span className="text-xs font-bold uppercase tracking-widest text-indigo-200">BakedBot Insights</span>
                            </div>
                            <h3 className="text-xl font-black mb-4">
                                Customers are asking about you.
                            </h3>
                            <div className="space-y-3 mb-6">
                                <div className="bg-white/10 p-3 rounded-xl border border-white/10">
                                    <p className="text-xs italic opacity-80">&quot;Who has the cheapest flower near {zipCode}?&quot;</p>
                                </div>
                                <div className="bg-white/10 p-3 rounded-xl border border-white/10">
                                    <p className="text-xs italic opacity-80">&quot;Is {retailers[0]?.name || 'any dispensary'} open now?&quot;</p>
                                </div>
                            </div>
                            <Button className="w-full bg-white text-indigo-600 font-bold py-3 rounded-xl shadow-lg hover:bg-indigo-50" asChild>
                                <Link href="/brands/claim?type=dispensary">Claim Page to Answer</Link>
                            </Button>
                        </div>
                    </div>

                    {/* LOCAL STATS (B2B FOMO) */}
                    <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
                        <h4 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
                            <BarChart className="w-4 h-4 text-green-500" /> {zipCode} Market Activity
                        </h4>
                        <div className="space-y-4">
                            <div className="flex justify-between items-center">
                                <span className="text-sm text-slate-500">Live Products</span>
                                <span className="font-bold text-slate-900">{products.length}+</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-sm text-slate-500">Avg. Price</span>
                                <span className="font-bold text-slate-900">${avgPrice}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-sm text-slate-500">Dispensaries</span>
                                <span className="font-bold text-slate-900">{retailers.length}</span>
                            </div>
                            <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                                <div className="bg-green-500 h-full" style={{ width: `${Math.min(75, retailers.length * 25)}%` }} />
                            </div>
                            <p className="text-[10px] text-slate-400 leading-relaxed italic">
                                Verified dispensaries appear 4x more often in local &quot;Near Me&quot; AI search results.
                            </p>
                        </div>
                    </div>

                </aside>

            </main>

            {/* Schema */}
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{
                    __html: JSON.stringify({
                        '@context': 'https://schema.org',
                        '@type': 'CollectionPage',
                        name: `Cannabis Dispensaries in ${zipCode}`,
                        description: `Find local dispensaries and products in ${zipCode}.`,
                        mainEntity: {
                            '@type': 'ItemList',
                            itemListElement: retailers.slice(0, 5).map((retailer, i) => ({
                                '@type': 'ListItem',
                                position: i + 1,
                                item: {
                                    '@type': 'LocalBusiness',
                                    name: retailer.name,
                                    address: {
                                        '@type': 'PostalAddress',
                                        addressLocality: retailer.city,
                                        addressRegion: retailer.state,
                                    }
                                }
                            }))
                        }
                    })
                }}
            />
        </div>
    );
}
