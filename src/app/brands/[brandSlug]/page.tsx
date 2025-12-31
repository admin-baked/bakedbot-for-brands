
import { fetchBrandPageData } from '@/lib/brand-data';
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
    Lock,
    AlertCircle,
    TrendingUp
} from 'lucide-react';
import { PageViewTracker } from '@/components/analytics/PageViewTracker';
import { ChatbotPageContext } from '@/components/chatbot-page-context';
import { Button } from '@/components/ui/button';

export async function generateMetadata({ params }: { params: Promise<{ brandSlug: string }> }): Promise<Metadata> {
    const { brandSlug } = await params;
    const { brand } = await fetchBrandPageData(brandSlug);

    if (!brand) return { title: 'Brand Not Found' };

    return {
        title: `${brand.name} Cannabis Products | BakedBot`,
        description: brand.description?.slice(0, 160) || `Discover premium cannabis products from ${brand.name}. Find availability near you and verify authenticity on BakedBot.`,
        openGraph: {
            title: `${brand.name} | BakedBot`,
            description: `Verify authenticity and find ${brand.name} products near you.`,
            images: brand.logoUrl ? [brand.logoUrl] : [],
        }
    };
}

export default async function GlobalBrandPage({ params }: { params: Promise<{ brandSlug: string }> }) {
    const { brandSlug } = await params;
    const { brand, products, retailers } = await fetchBrandPageData(brandSlug);

    if (!brand) {
        notFound();
    }

    // Mock data for display
    const nearbyDispensaries = retailers?.length || Math.floor(Math.random() * 15) + 5;
    const defaultZip = retailers?.[0]?.zip || '60472';

    return (
        <div className="min-h-screen bg-[#F9FBFC] font-sans">
            <PageViewTracker
                pageType="brand"
                pageId={brand.id}
                pageSlug={brandSlug}
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
                        Is this your brand? {nearbyDispensaries} dispensaries nearby are missing your latest inventory data.
                    </p>
                    <Button size="sm" className="bg-amber-600 text-white px-3 py-1 rounded-md font-bold hover:bg-amber-700 transition" asChild>
                        <Link href={`/brands/claim?name=${encodeURIComponent(brand.name)}&type=brand`}>
                            Claim Brand Portal
                        </Link>
                    </Button>
                </div>
            </div>

            <main className="max-w-6xl mx-auto p-4 md:p-8 grid grid-cols-1 lg:grid-cols-3 gap-8">

                {/* LEFT COLUMN: Consumer Experience (SEO Loaded) */}
                <div className="lg:col-span-2 space-y-8">

                    {/* Brand Identity Section */}
                    <section className="flex items-center gap-6 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                        <div className="w-24 h-24 bg-slate-100 rounded-2xl border-2 border-dashed border-slate-300 flex items-center justify-center overflow-hidden">
                            {brand.logoUrl ? (
                                <img src={brand.logoUrl} alt={`${brand.name} logo`} className="w-full h-full object-cover rounded-2xl" />
                            ) : (
                                <span className="text-xs font-bold uppercase text-slate-400">Logo</span>
                            )}
                        </div>
                        <div>
                            <h1 className="text-3xl font-black text-slate-900 leading-tight">
                                {brand.name} <span className="text-slate-400 font-light">in {defaultZip}</span>
                            </h1>
                            <p className="text-slate-500 mt-1 flex items-center gap-1">
                                <MapPin className="w-4 h-4" /> Tracking {retailers?.length || 0} active retailers in this area
                            </p>
                        </div>
                    </section>
                    
                    {/* ABOUT SECTION (New) */}
                    {brand.description && (
                         <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
                            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-widest mb-2 flex items-center gap-2">
                                <TrendingUp className="w-4 h-4 text-slate-400" /> About {brand.name}
                            </h3>
                            <div className="text-slate-600 text-sm leading-relaxed prose prose-sm max-w-none">
                                {brand.description.length > 500 ? (
                                    <>
                                        {brand.description.slice(0, 500)}...
                                    </>
                                ) : brand.description}
                            </div>
                        </div>
                    )}

                    {/* THE "MISSING DATA" MAP (SEO + B2B Pain Point) */}
                    <section className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                            <h2 className="font-bold text-slate-800">Verified Retailers</h2>
                            <span className="text-[10px] font-black bg-slate-100 text-slate-500 px-2 py-1 rounded">DATA SOURCE: CANNMENUS</span>
                        </div>

                        {retailers && retailers.length > 0 ? (
                            <div className="p-6 space-y-3">
                                {retailers.slice(0, 5).map((retailer, i) => (
                                    <div key={i} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                                                <MapPin className="w-5 h-5 text-green-600" />
                                            </div>
                                            <div>
                                                <p className="font-medium text-slate-800">{retailer.name}</p>
                                                <p className="text-xs text-slate-500">{retailer.city}, {retailer.state}</p>
                                            </div>
                                        </div>
                                        <Button variant="outline" size="sm" asChild>
                                            <Link href={`/dispensaries/${retailer.id}`}>View</Link>
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="p-12 text-center bg-slate-50">
                                <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
                                    <Search className="text-slate-300 w-8 h-8" />
                                </div>
                                <h3 className="text-lg font-bold text-slate-900">No Verified Stock Found</h3>
                                <p className="text-slate-500 max-w-sm mx-auto mb-6 text-sm">
                                    We couldn&apos;t find &quot;{brand.name}&quot; at dispensaries near {defaultZip}. This brand may not have connected their live menu feed yet.
                                </p>

                                <div className="flex flex-wrap justify-center gap-3">
                                    <Button variant="outline" className="flex items-center gap-2">
                                        <BellRing className="w-4 h-4 text-green-500" /> Set Drop Alert
                                    </Button>
                                </div>
                            </div>
                        )}
                    </section>

                    {/* SEO PRODUCT FEED (Blurred B2B Teaser) */}
                    <section className="space-y-4">
                        <h2 className="text-xl font-bold text-slate-800">Popular Products by {brand.name}</h2>
                        <div className="grid grid-cols-2 gap-4 filter blur-[4px] opacity-40 grayscale pointer-events-none">
                            {[1, 2, 3, 4].map(i => (
                                <div key={i} className="bg-white p-4 rounded-xl border border-slate-200 flex gap-4">
                                    <div className="w-16 h-16 bg-slate-100 rounded-lg" />
                                    <div className="space-y-2">
                                        <div className="h-4 w-24 bg-slate-200 rounded" />
                                        <div className="h-3 w-16 bg-slate-100 rounded" />
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="text-center -mt-20 relative z-10 p-8">
                            <div className="bg-white/80 backdrop-blur-md border border-white p-6 rounded-2xl shadow-xl inline-block max-w-xs">
                                <Lock className="w-8 h-8 text-amber-500 mx-auto mb-3" />
                                <h4 className="font-bold text-slate-900">Unlock Product Catalog</h4>
                                <p className="text-xs text-slate-500 mb-4">Claim your brand to display your full product line to local shoppers.</p>
                                <Link href={`/brands/claim?name=${encodeURIComponent(brand.name)}&type=brand`} className="text-sm font-bold text-indigo-600 hover:underline">
                                    Get Started →
                                </Link>
                            </div>
                        </div>
                    </section>

                    {/* Report an Issue Link */}
                    <div className="text-center py-4">
                        <Link href={`/brands/claim?name=${encodeURIComponent(brand.name)}&type=correction`} className="text-sm text-slate-400 hover:text-slate-600 inline-flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" />
                            Is this info wrong? Report an issue
                        </Link>
                    </div>
                </div>

                {/* RIGHT COLUMN: B2B Conversion Engine */}
                <aside className="space-y-6">

                    {/* THE "MARKET SHARE" CARD */}
                    <div className="bg-slate-900 text-white rounded-3xl p-6 shadow-2xl relative overflow-hidden">
                        {/* Background Decoration */}
                        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500 rounded-full blur-[80px] opacity-30" />

                        <div className="relative z-10">
                            <div className="flex items-center gap-2 text-indigo-300 text-xs font-bold uppercase tracking-widest mb-4">
                                <BarChart3 className="w-4 h-4" /> Market Intelligence
                            </div>
                            <h3 className="text-2xl font-black mb-4 leading-tight">
                                Your competitors are gaining ground.
                            </h3>

                            <div className="space-y-4 mb-8">
                                <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700">
                                    <p className="text-slate-400 text-xs mb-1">Missed Opportunities</p>
                                    <div className="flex justify-between items-end">
                                        <span className="text-2xl font-bold">{nearbyDispensaries}</span>
                                        <span className="text-xs text-red-400 font-medium pb-1">Nearby Dispensaries</span>
                                    </div>
                                    <p className="text-[10px] text-slate-500 mt-2">These stores carry your category but don&apos;t show your products.</p>
                                </div>

                                <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700">
                                    <p className="text-slate-400 text-xs mb-1">Local Interest</p>
                                    <div className="flex justify-between items-end">
                                        <span className="text-2xl font-bold text-green-400">High</span>
                                        <span className="text-xs text-slate-400 pb-1">Zip: {defaultZip}</span>
                                    </div>
                                </div>
                            </div>

                            <Button className="w-full bg-indigo-500 hover:bg-indigo-400 py-4 rounded-xl font-black text-sm transition-all shadow-lg shadow-indigo-900/40" asChild>
                                <Link href={`/brands/claim?name=${encodeURIComponent(brand.name)}&type=brand`} className="flex items-center justify-center gap-2">
                                    CLAIM BRAND PAGE <ArrowRight className="w-4 h-4" />
                                </Link>
                            </Button>
                        </div>
                    </div>

                    {/* VERIFICATION CHECKLIST */}
                    <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
                        <h4 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                            <Info className="w-4 h-4 text-slate-400" /> Why Claim?
                        </h4>
                        <ul className="space-y-4">
                            {[
                                { t: "Verify Retailers", d: "Ensure shoppers find you at the right stores." },
                                { t: "Live Menu Sync", d: "Connect CannMenus API to show real-time stock." },
                                { t: "Direct Leads", d: "Let customers 'Request Stock' at their local shop." }
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
                        description: brand.description,
                        logo: brand.logoUrl,
                        url: `https://bakedbot.ai/brands/${brandSlug}`,
                        sameAs: brand.website ? [brand.website] : []
                    })
                }}
            />
        </div>
    );
}
