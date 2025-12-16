
import { fetchLocalBrandPageData } from '@/lib/brand-data';
import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import Link from 'next/link';
import {
    ShieldAlert,
    MapPin,
    Search,
    BellRing,
    BarChart3,
    ArrowRight,
    Info,
    AlertCircle,
    ExternalLink
} from 'lucide-react';
import { PageViewTracker } from '@/components/analytics/PageViewTracker';
import { ChatbotPageContext } from '@/components/chatbot-page-context';
import { Button } from '@/components/ui/button';
import { RetailerMap } from '@/components/maps/retailer-map';

export async function generateMetadata({ params }: { params: Promise<{ brandSlug: string; zip: string }> }): Promise<Metadata> {
    const { brandSlug, zip } = await params;
    const { brand } = await fetchLocalBrandPageData(brandSlug, zip);

    if (!brand) return { title: 'Brand Not Found' };

    return {
        title: `${brand.name} Near ${zip} | Find Local Dispensaries | BakedBot`,
        description: `Find ${brand.name} products at dispensaries near ${zip}. Check live inventory and verify authenticity.`,
    };
}

export default async function LocalBrandPage({ params }: { params: Promise<{ brandSlug: string; zip: string }> }) {
    const { brandSlug, zip } = await params;
    const { brand, retailers, missingCount } = await fetchLocalBrandPageData(brandSlug, zip);

    if (!brand) {
        notFound();
    }

    // Freshness date
    const freshnessDate = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

    return (
        <div className="min-h-screen bg-[#F9FBFC] font-sans">
            <PageViewTracker
                pageType="brand"
                pageId={`${brand.id}_${zip}`}
                pageSlug={`${brandSlug}/near/${zip}`}
            />

            <ChatbotPageContext
                brandId={brand.id}
                entityName={brand.name}
                entityType="brand"
            />

            {/* B2B CONVERSION HEADER (Sticky) */}
            <div className="bg-amber-50 border-b border-amber-200 py-2 px-4 sticky top-0 z-50">
                <div className="max-w-6xl mx-auto flex justify-between items-center text-xs md:text-sm">
                    <p className="text-amber-800 font-medium flex items-center gap-2">
                        <ShieldAlert className="w-4 h-4" />
                        Is this your brand? {missingCount || 5} dispensaries in {zip} don&apos;t show your products.
                    </p>
                    <Button size="sm" className="bg-amber-600 text-white px-3 py-1 rounded-md font-bold hover:bg-amber-700 transition" asChild>
                        <Link href={`/brands/claim?name=${encodeURIComponent(brand.name)}&type=brand`}>
                            Claim Brand
                        </Link>
                    </Button>
                </div>
            </div>

            {/* Breadcrumb */}
            <nav className="max-w-6xl mx-auto px-6 py-3 text-xs text-slate-400">
                <Link href={`/brands/${brandSlug}`} className="hover:text-slate-600">{brand.name}</Link>
                {' / '}
                <span className="text-slate-600 font-medium">Near {zip}</span>
            </nav>

            <main className="max-w-6xl mx-auto p-4 md:p-8 grid grid-cols-1 lg:grid-cols-3 gap-8">

                {/* LEFT COLUMN: Consumer Experience */}
                <div className="lg:col-span-2 space-y-8">

                    {/* Header Section */}
                    <section className="flex items-center gap-6 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                        <div className="w-20 h-20 bg-slate-100 rounded-2xl border-2 border-dashed border-slate-300 flex items-center justify-center overflow-hidden">
                            {brand.logoUrl ? (
                                <img src={brand.logoUrl} alt={`${brand.name} logo`} className="w-full h-full object-cover rounded-2xl" />
                            ) : (
                                <span className="text-xs font-bold uppercase text-slate-400">Logo</span>
                            )}
                        </div>
                        <div>
                            <h1 className="text-2xl md:text-3xl font-black text-slate-900 leading-tight">
                                {brand.name} near {zip}
                            </h1>
                            <p className="text-slate-500 mt-1 flex items-center gap-1">
                                <MapPin className="w-4 h-4" /> {retailers.length} verified retailers in this area
                            </p>
                        </div>
                    </section>

                    {/* Retailer List */}
                    <section className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                            <h2 className="font-bold text-slate-800">Where to Buy {brand.name}</h2>
                            <span className="text-[10px] font-black bg-slate-100 text-slate-500 px-2 py-1 rounded">SYNCED: {freshnessDate}</span>
                        </div>

                        {retailers && retailers.length > 0 ? (
                            <div className="divide-y divide-slate-100">
                                {retailers.map((retailer, i) => (
                                    <div key={i} className="flex items-center justify-between p-4 hover:bg-slate-50 transition-colors">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                                                <MapPin className="w-5 h-5 text-green-600" />
                                            </div>
                                            <div>
                                                <p className="font-medium text-slate-800">{retailer.name}</p>
                                                <p className="text-xs text-slate-500">{retailer.address || `${retailer.city}, ${retailer.state}`}</p>
                                            </div>
                                        </div>
                                        <Button variant="outline" size="sm" asChild>
                                            <Link href={`/dispensaries/${retailer.id}`} className="flex items-center gap-1">
                                                View <ExternalLink className="w-3 h-3" />
                                            </Link>
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="p-12 text-center bg-slate-50">
                                <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
                                    <Search className="text-slate-300 w-8 h-8" />
                                </div>
                                <h3 className="text-lg font-bold text-slate-900">No Stock Found Near {zip}</h3>
                                <p className="text-slate-500 max-w-sm mx-auto mb-6 text-sm">
                                    We couldn&apos;t find &quot;{brand.name}&quot; at dispensaries near {zip}. This brand may not have connected their live menu feed.
                                </p>

                                <Button variant="outline" className="flex items-center gap-2">
                                    <BellRing className="w-4 h-4 text-green-500" /> Set Drop Alert
                                </Button>
                            </div>
                        )}
                    </section>

                    {/* Map Section */}
                    {retailers.length > 0 && (
                        <section className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                            <div className="p-4 border-b border-slate-100">
                                <h2 className="font-bold text-slate-800">Dispensary Locations</h2>
                            </div>
                            <div className="h-[300px]">
                                <RetailerMap
                                    retailers={retailers.map(r => ({
                                        id: r.id,
                                        name: r.name,
                                        address: r.address || 'Address unavailable',
                                        lat: r.lat,
                                        lng: r.lon
                                    }))}
                                    height="300px"
                                />
                            </div>
                        </section>
                    )}

                    {/* Explore Links */}
                    <div className="flex flex-wrap gap-3">
                        <Button variant="secondary" size="sm" asChild>
                            <Link href={`/local/${zip}`}>All Dispensaries in {zip}</Link>
                        </Button>
                        <Button variant="outline" size="sm" asChild>
                            <Link href={`/brands/${brandSlug}`}>View All {brand.name}</Link>
                        </Button>
                    </div>

                    {/* Report an Issue */}
                    <div className="text-center py-4">
                        <Link href={`/brands/claim?name=${encodeURIComponent(brand.name)}&type=correction`} className="text-sm text-slate-400 hover:text-slate-600 inline-flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" />
                            Is this info wrong? Report an issue
                        </Link>
                    </div>
                </div>

                {/* RIGHT COLUMN: B2B Conversion */}
                <aside className="space-y-6">

                    {/* Market Intelligence Card */}
                    <div className="bg-slate-900 text-white rounded-3xl p-6 shadow-2xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500 rounded-full blur-[80px] opacity-30" />

                        <div className="relative z-10">
                            <div className="flex items-center gap-2 text-indigo-300 text-xs font-bold uppercase tracking-widest mb-4">
                                <BarChart3 className="w-4 h-4" /> Local Market
                            </div>
                            <h3 className="text-xl font-black mb-4 leading-tight">
                                {missingCount || 5} dispensaries don&apos;t stock you yet.
                            </h3>

                            <div className="space-y-3 mb-6">
                                <div className="bg-slate-800/50 p-3 rounded-xl border border-slate-700">
                                    <div className="flex justify-between items-center">
                                        <span className="text-slate-400 text-xs">Showing Your Products</span>
                                        <span className="text-lg font-bold">{retailers.length}</span>
                                    </div>
                                </div>
                                <div className="bg-slate-800/50 p-3 rounded-xl border border-slate-700">
                                    <div className="flex justify-between items-center">
                                        <span className="text-slate-400 text-xs">Missing Inventory</span>
                                        <span className="text-lg font-bold text-red-400">{missingCount || 5}</span>
                                    </div>
                                </div>
                            </div>

                            <Button className="w-full bg-indigo-500 hover:bg-indigo-400 py-3 rounded-xl font-black text-sm" asChild>
                                <Link href={`/brands/claim?name=${encodeURIComponent(brand.name)}&type=brand`} className="flex items-center justify-center gap-2">
                                    FIX DISTRIBUTION <ArrowRight className="w-4 h-4" />
                                </Link>
                            </Button>
                        </div>
                    </div>

                    {/* Why Claim Card */}
                    <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
                        <h4 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                            <Info className="w-4 h-4 text-slate-400" /> Why Claim?
                        </h4>
                        <ul className="space-y-3">
                            {[
                                { t: "Track Distribution", d: "See which stores carry your products." },
                                { t: "Sync Live Inventory", d: "Connect to CannMenus for real-time stock." },
                                { t: "Get Direct Leads", d: "Customers request stock at local shops." }
                            ].map((item, i) => (
                                <li key={i} className="flex gap-3">
                                    <div className="w-5 h-5 rounded-full bg-green-50 flex-shrink-0 flex items-center justify-center mt-0.5">
                                        <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-slate-800">{item.t}</p>
                                        <p className="text-xs text-slate-500">{item.d}</p>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </div>
                </aside>

            </main>

            {/* Schema */}
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{
                    __html: JSON.stringify({
                        '@context': 'https://schema.org',
                        '@type': 'Brand',
                        name: brand.name,
                        description: `Find ${brand.name} products near ${zip}`,
                        logo: brand.logoUrl,
                        url: `https://bakedbot.ai/brands/${brandSlug}/near/${zip}`
                    })
                }}
            />
        </div>
    );
}
