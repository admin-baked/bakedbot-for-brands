
import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import Link from 'next/link';
import {
    MapPin,
    ShieldCheck,
    Lock,
    TrendingUp,
    ExternalLink,
    ChevronRight,
    Star,
    AlertCircle
} from 'lucide-react';
import { fetchDispensaryPageData } from '@/lib/dispensary-data';
import { PageViewTracker } from '@/components/analytics/PageViewTracker';
import { ChatbotPageContext } from '@/components/chatbot-page-context';
import { Button } from '@/components/ui/button';
import { LeadCaptureForm } from '@/components/leads/lead-capture-form';

// Common categories for SEO
const CATEGORIES = ['Flower', 'Vapes', 'Edibles', 'Concentrates', 'Pre-Rolls', 'Topicals'];

// Popular brands (would come from city scan in production)
const POPULAR_BRANDS = ['Cookies', 'STIIIZY', 'Wyld', 'Jeeter', 'Cresco'];

export async function generateMetadata({ params }: { params: Promise<{ dispensarySlug: string }> }): Promise<Metadata> {
    const { dispensarySlug } = await params;
    const { retailer } = await fetchDispensaryPageData(dispensarySlug);

    if (!retailer) return { title: 'Dispensary Not Found | BakedBot' };

    return {
        title: `${retailer.name} - Dispensary in ${retailer.city}, ${retailer.state} | BakedBot`,
        description: `Visit ${retailer.name} at ${retailer.address} in ${retailer.city}. View menu, hours, and deals. Verified dispensary on BakedBot.`,
        openGraph: {
            title: `${retailer.name} | BakedBot`,
            description: `Order from ${retailer.name} in ${retailer.city}. View live menu and hours.`,
        }
    };
}

export default async function DispensaryPage({ params }: { params: Promise<{ dispensarySlug: string }> }) {
    const { dispensarySlug } = await params;
    const { retailer: dispensary, products, seoPage } = await fetchDispensaryPageData(dispensarySlug);

    if (!dispensary) {
        notFound();
    }
    
    // Use scraped logo or fallback
    const logoUrl = seoPage?.logoUrl;
    const aboutText = seoPage?.about || seoPage?.seoTags?.metaDescription;
    // Freshness date
    const freshnessDate = dispensary.updatedAt
        ? new Date(dispensary.updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
        : new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

    // Mock traffic data (would come from analytics in production)
    const trafficViews = Math.floor(Math.random() * 400) + 200;

    return (
        <div className="min-h-screen bg-[#F8FAFC]">
            <PageViewTracker
                pageType="dispensary"
                pageId={dispensary.id}
                pageSlug={dispensarySlug}
            />

            <ChatbotPageContext
                dispensaryId={dispensary.id}
                entityName={dispensary.name}
                entityType="dispensary"
            />

            {/* Schema.org Markup */}
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{
                    __html: JSON.stringify({
                        '@context': 'https://schema.org',
                        '@type': 'MedicalBusiness',
                        'name': dispensary.name,
                        'address': {
                            '@type': 'PostalAddress',
                            'streetAddress': dispensary.address,
                            'addressLocality': dispensary.city,
                            'addressRegion': dispensary.state,
                            'postalCode': dispensary.zip
                        },
                        ...(dispensary.lat && dispensary.lon ? {
                            'geo': { '@type': 'GeoCoordinates', 'latitude': dispensary.lat, 'longitude': dispensary.lon }
                        } : {}),
                        'url': `https://bakedbot.ai/dispensaries/${dispensarySlug}`
                    })
                }}
            />

            {/* SEO-FRIENDLY BREADCRUMBS */}
            <nav className="max-w-6xl mx-auto px-6 py-3 text-xs text-slate-400">
                <Link href={`/states/${dispensary.state?.toLowerCase()}`} className="hover:text-slate-600">{dispensary.state}</Link>
                {' / '}
                <Link href={`/cities/${dispensary.city?.toLowerCase()}-${dispensary.state?.toLowerCase()}`} className="hover:text-slate-600">{dispensary.city}</Link>
                {' / '}
                <span className="text-slate-600 font-medium">{dispensary.name}</span>
            </nav>

            <main className="max-w-6xl mx-auto p-4 md:p-6 grid grid-cols-1 lg:grid-cols-3 gap-8">

                {/* MAIN COLUMN */}
                <div className="lg:col-span-2 space-y-8">

                    {/* HEADER: High Authority / Unclaimed Status */}
                    <section className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm relative overflow-hidden">
                        {/* Schema.org Logo */}
                        {logoUrl && (
                             <div className="absolute top-6 right-6 w-20 h-20 bg-slate-50 rounded-xl border border-slate-100 p-1 hidden sm:block">
                                <img src={logoUrl} alt={`${dispensary.name} logo`} className="w-full h-full object-contain rounded-lg" />
                             </div>
                        )}

                        <div className="flex flex-col md:flex-row justify-between items-start gap-4 pr-0 sm:pr-24">
                            <div>
                                <div className="flex items-center gap-2 mb-1">
                                    <h1 className="text-4xl font-black text-slate-900 tracking-tight">{dispensary.name}</h1>
                                    <div className="group relative">
                                        <ShieldCheck className="text-amber-400 w-6 h-6 cursor-help" />
                                        <span className="hidden group-hover:block absolute bottom-full left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[10px] p-2 rounded w-32 mb-2 shadow-xl z-10">
                                            Business unverified. Claim to secure this badge.
                                        </span>
                                    </div>
                                </div>
                                <p className="text-lg text-slate-500 font-medium flex items-center gap-1">
                                    <MapPin className="w-4 h-4" /> {dispensary.city}, {dispensary.state} • <span className="text-green-600">Open Now</span>
                                </p>
                            </div>
                           
                             {/* Mobile Rating (Desktop uses absolute logo or rating, simpler to just hide rating on mobile if conflicting, but lets keep existing rating structure but specialized) */}
                             {/* Existing Rating Block */}
                             <div className="flex items-center gap-1 bg-slate-50 px-4 py-2 rounded-xl border border-slate-100">
                                <Star className="fill-amber-400 text-amber-400 w-4 h-4" />
                                <span className="font-bold text-slate-700">4.8</span>
                                <span className="text-slate-400 text-sm">({trafficViews} searches)</span>
                            </div>
                        </div>

                        {/* ABOUT SECTION (New) */}
                        {aboutText && (
                            <div className="mt-6 pt-6 border-t border-slate-100">
                                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-widest mb-2 flex items-center gap-2">
                                    <TrendingUp className="w-4 h-4 text-slate-400" /> About {dispensary.name}
                                </h3>
                                <div className="text-slate-600 text-sm leading-relaxed prose prose-sm max-w-none">
                                    {aboutText.length > 300 ? (
                                        <>
                                            {aboutText.slice(0, 300)}... 
                                            <span className="text-green-600 font-medium cursor-pointer hover:underline">Read more</span>
                                        </>
                                    ) : aboutText}
                                </div>
                            </div>
                        )}

                        {/* SEO-KEYWORD TAGS */}
                        <div className="flex flex-wrap gap-2 mt-6">
                            {CATEGORIES.slice(0, 4).map(cat => (
                                <span key={cat} className="text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-500 px-3 py-1 rounded-md">
                                    {cat} Near Me
                                </span>
                            ))}
                        </div>
                    </section>

                    {/* THE SEO ENGINE: API-HYDRATED CONTENT */}
                    <section className="space-y-6">
                        <div className="flex items-end justify-between border-b border-slate-200 pb-2">
                            <h2 className="text-xl font-bold text-slate-800">Shop Popular Brands in {dispensary.city}</h2>
                            <span className="text-xs text-slate-400 font-medium">Last synced: {freshnessDate}</span>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                            {POPULAR_BRANDS.map(brand => (
                                <Link key={brand} href={`/brands/${brand.toLowerCase()}`}>
                                    <div className="bg-white p-4 rounded-xl border border-slate-200 text-center hover:border-green-300 transition-colors group cursor-pointer">
                                        <div className="w-12 h-12 bg-slate-50 rounded-full mx-auto mb-2 flex items-center justify-center font-bold text-slate-300 group-hover:text-green-500">
                                            {brand[0]}
                                        </div>
                                        <p className="text-sm font-bold text-slate-700">{brand}</p>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </section>

                    {/* THE B2B HOOK: "THE LOCKED MENU" */}
                    <section className="relative overflow-hidden rounded-3xl border-2 border-slate-200 bg-white shadow-xl">
                        <div className="p-8">
                            <h2 className="text-2xl font-bold mb-2">Live Inventory Preview</h2>
                            <p className="text-slate-500 mb-6">Real-time menu for {dispensary.name}</p>

                            {/* Blurred API Data */}
                            <div className="space-y-4 filter blur-[6px] opacity-40 select-none pointer-events-none">
                                {[1, 2, 3].map(i => (
                                    <div key={i} className="flex justify-between items-center p-4 border border-slate-100 rounded-xl">
                                        <div className="flex gap-4 items-center">
                                            <div className="w-14 h-14 bg-slate-200 rounded-lg" />
                                            <div>
                                                <div className="h-4 w-32 bg-slate-300 rounded mb-2" />
                                                <div className="h-3 w-20 bg-slate-200 rounded" />
                                            </div>
                                        </div>
                                        <div className="h-8 w-20 bg-slate-100 rounded-full" />
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* The "Value Gap" Overlay */}
                        <div className="absolute inset-0 bg-white/40 backdrop-blur-[2px] flex items-center justify-center p-8">
                            <div className="max-w-sm w-full bg-white shadow-2xl rounded-2xl p-8 text-center border border-slate-100">
                                <div className="w-16 h-16 bg-green-50 text-green-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-inner">
                                    <Lock className="w-8 h-8" />
                                </div>
                                <h3 className="text-xl font-bold text-slate-900 mb-2">Unlock Your SEO Potential</h3>
                                <p className="text-sm text-slate-500 mb-6 leading-relaxed">
                                    Your menu data is ready to sync. Verification allows Google to index your real-time inventory, helping you rank for specific strain and product searches.
                                </p>
                                <Button asChild className="w-full bg-slate-900 text-white font-bold py-4 rounded-xl hover:bg-black transition-all">
                                    <Link href={`/brands/claim?name=${encodeURIComponent(dispensary.name)}&type=dispensary`} className="flex items-center justify-center gap-2 group">
                                        Claim & Sync My Menu <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                    </Link>
                                </Button>
                            </div>
                        </div>
                    </section>

                    {/* Report an Issue Link */}
                    <div className="text-center py-4">
                        <Link href={`/brands/claim?name=${encodeURIComponent(dispensary.name)}&type=correction`} className="text-sm text-slate-400 hover:text-slate-600 inline-flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" />
                            Is this info wrong? Report an issue
                        </Link>
                    </div>

                </div>

                {/* SIDEBAR: DATA DRIVEN PERSUASION */}
                <aside className="space-y-6">
                    <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
                        <div className="flex items-center gap-2 text-green-600 font-bold text-sm mb-4">
                            <TrendingUp className="w-4 h-4" />
                            <span>LIVE TRAFFIC INSIGHTS</span>
                        </div>

                        <div className="space-y-6">
                            <div>
                                <div className="text-4xl font-black text-slate-900">{trafficViews}</div>
                                <p className="text-sm text-slate-500 font-medium">Local shoppers viewed this listing</p>
                            </div>

                            <div className="space-y-3">
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Top Search Queries</p>
                                {[
                                    { q: `dispensary ${dispensary.city?.toLowerCase()}`, v: 'High' },
                                    { q: `${dispensary.name?.toLowerCase().split(' ')[0]} cannabis`, v: 'Med' },
                                    { q: `weed near ${dispensary.zip}`, v: 'High' }
                                ].map(item => (
                                    <div key={item.q} className="flex justify-between items-center text-sm">
                                        <span className="text-slate-600 italic truncate mr-2">&quot;{item.q}&quot;</span>
                                        <span className="text-[10px] font-bold bg-green-50 text-green-700 px-2 py-0.5 rounded uppercase shrink-0">{item.v}</span>
                                    </div>
                                ))}
                            </div>

                            <div className="pt-4 border-t border-slate-100">
                                <Button variant="outline" className="w-full py-3 px-4 bg-indigo-50 text-indigo-700 rounded-xl font-bold text-sm hover:bg-indigo-100 border-indigo-100" asChild>
                                    <Link href={`/brands/claim?name=${encodeURIComponent(dispensary.name)}&type=dispensary`} className="flex items-center justify-center gap-2">
                                        View Full Analytics <ExternalLink className="w-3 h-3" />
                                    </Link>
                                </Button>
                            </div>
                        </div>
                    </div>

                    <div className="bg-indigo-600 rounded-2xl p-6 text-white shadow-xl shadow-indigo-100">
                        <h3 className="text-lg font-bold mb-2">Own this shop?</h3>
                        <p className="text-indigo-100 text-sm mb-6 leading-relaxed">
                            Verify your business to remove ads, update store photos, and respond to your {dispensary.city} customers.
                        </p>
                        <Button className="w-full bg-white text-indigo-600 font-black py-4 rounded-xl shadow-lg hover:bg-indigo-50 transition-all uppercase tracking-tight text-sm" asChild>
                            <Link href={`/brands/claim?name=${encodeURIComponent(dispensary.name)}&type=dispensary&orgId=${dispensary.id.startsWith('disp_') ? dispensary.id : 'disp_' + dispensary.id}`}>
                                Claim This Page Free
                            </Link>
                        </Button>
                    </div>

                    <div id="contact">
                        <LeadCaptureForm 
                            orgId={dispensary.id.startsWith('disp_') ? dispensary.id : `disp_${dispensary.id}`}
                            orgName={dispensary.name}
                            orgType="dispensary"
                            variant="sidebar"
                        />
                    </div>

                </aside>

            </main>
        </div>
    );
}
