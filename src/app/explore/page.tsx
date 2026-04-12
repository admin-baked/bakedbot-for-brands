import type { Metadata } from 'next';
import Link from 'next/link';
import {
    Leaf,
    Droplets,
    FlaskConical,
    MapPin,
    ShoppingBag,
    Globe,
    Database,
    BookOpen,
    ArrowRight,
    Search,
    TrendingUp,
} from 'lucide-react';
import { Navbar } from '@/components/landing/navbar';
import { LandingFooter } from '@/components/landing/footer';
import { Badge } from '@/components/ui/badge';
import { fetchStrainStats } from '@/lib/strain-data';
import { TERPENES } from '@/lib/terpene-data';

export const revalidate = 3600; // Revalidate hourly — strain count updates infrequently

export const metadata: Metadata = {
    title: 'Cannabis Data Library — Strains, Terpenes, Lab Results | BakedBot',
    description:
        'Explore 5,200+ cannabis strains, 15 terpene profiles, lab-tested COA results, dispensaries, and state-by-state cannabis data. The most comprehensive open cannabis database.',
    alternates: { canonical: 'https://bakedbot.ai/explore' },
    openGraph: {
        title: 'Cannabis Data Library | BakedBot',
        description:
            'The most comprehensive open cannabis database: 5,200+ strains, terpene profiles, lab results, and dispensary data.',
        type: 'website',
        url: 'https://bakedbot.ai/explore',
    },
    keywords: [
        'cannabis strain database',
        'cannabis encyclopedia',
        'terpene profiles',
        'cannabis lab results',
        'dispensary directory',
        'cannabis data',
        'COA database',
        'cannabis research',
    ],
};

// Popular strains to show as quick links
const POPULAR_STRAINS = [
    { name: 'OG Kush', slug: 'og-kush' },
    { name: 'Blue Dream', slug: 'blue-dream' },
    { name: 'Gorilla Glue', slug: 'gorilla-glue' },
    { name: 'Girl Scout Cookies', slug: 'girl-scout-cookies' },
    { name: 'Sour Diesel', slug: 'sour-diesel' },
    { name: 'Jack Herer', slug: 'jack-herer' },
];

// States with legal cannabis (used for state grid)
const LEGAL_STATES = [
    { name: 'California', slug: 'california', abbr: 'CA' },
    { name: 'Colorado', slug: 'colorado', abbr: 'CO' },
    { name: 'Illinois', slug: 'illinois', abbr: 'IL' },
    { name: 'Michigan', slug: 'michigan', abbr: 'MI' },
    { name: 'New York', slug: 'new-york', abbr: 'NY' },
    { name: 'Nevada', slug: 'nevada', abbr: 'NV' },
    { name: 'Oregon', slug: 'oregon', abbr: 'OR' },
    { name: 'Washington', slug: 'washington', abbr: 'WA' },
    { name: 'Massachusetts', slug: 'massachusetts', abbr: 'MA' },
    { name: 'Arizona', slug: 'arizona', abbr: 'AZ' },
    { name: 'New Jersey', slug: 'new-jersey', abbr: 'NJ' },
    { name: 'Maryland', slug: 'maryland', abbr: 'MD' },
];

// FAQ for AI Overview eligibility
const FAQ = [
    {
        q: 'How many cannabis strains are in the BakedBot database?',
        a: 'BakedBot tracks over 5,200 cannabis strains including indica, sativa, and hybrid varieties. Each strain page includes THC/CBD ranges, terpene profiles, effects, and real dispensary availability data.',
    },
    {
        q: 'What is a terpene in cannabis?',
        a: 'Terpenes are aromatic compounds found in cannabis that contribute to flavor, scent, and effects. Common cannabis terpenes include myrcene (earthy, relaxing), limonene (citrus, uplifting), and pinene (pine, focus). BakedBot profiles 15 of the most common cannabis terpenes.',
    },
    {
        q: 'What is a Certificate of Analysis (COA) for cannabis?',
        a: 'A Certificate of Analysis (COA) is a lab test report for a cannabis product that confirms cannabinoid potency (THC, CBD, etc.), terpene content, and safety screening for pesticides, heavy metals, and microbials. BakedBot collects COAs from dispensary products and makes them searchable.',
    },
    {
        q: 'How do I find cannabis dispensaries near me?',
        a: 'Use BakedBot\'s dispensary finder at bakedbot.ai/dispensaries or enter your ZIP code at bakedbot.ai/local to find licensed cannabis dispensaries in your area.',
    },
    {
        q: 'What states have recreational cannabis?',
        a: 'As of 2025, recreational cannabis is legal in California, Colorado, Illinois, Michigan, New York, Nevada, Oregon, Washington, Massachusetts, Arizona, New Jersey, Maryland, and over 20 other states. BakedBot has dedicated pages for each legal state.',
    },
];

export default async function ExplorePage() {
    const strainStats = await fetchStrainStats();
    const strainCount = strainStats.total > 0 ? strainStats.total.toLocaleString() : '5,200+';
    const terpeneCount = TERPENES.length;

    return (
        <div className="min-h-screen flex flex-col bg-background">
            <Navbar />

            <main className="flex-1 pt-16">

                {/* ── Hero ────────────────────────────────────────────── */}
                <section className="bg-gradient-to-b from-green-50 to-white dark:from-green-950/20 dark:to-background border-b pt-16 pb-14">
                    <div className="container mx-auto px-4 text-center max-w-4xl">
                        <Badge variant="secondary" className="mb-4 gap-1.5 text-sm">
                            <Database className="h-3.5 w-3.5" />
                            Cannabis Data Library
                        </Badge>
                        <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight mb-5 text-foreground">
                            The Open Cannabis Encyclopedia
                        </h1>
                        <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto mb-8">
                            {strainCount} cannabis strains. {terpeneCount} terpene profiles. Lab-tested results.
                            State dispensary directories. All free, all searchable.
                        </p>

                        {/* Quick stats */}
                        <div className="flex flex-wrap items-center justify-center gap-6 text-sm font-medium">
                            <div className="flex items-center gap-1.5 text-muted-foreground">
                                <Leaf className="h-4 w-4 text-green-600" />
                                <span><strong className="text-foreground">{strainCount}</strong> strains</span>
                            </div>
                            <div className="flex items-center gap-1.5 text-muted-foreground">
                                <Droplets className="h-4 w-4 text-teal-600" />
                                <span><strong className="text-foreground">{terpeneCount}</strong> terpenes</span>
                            </div>
                            <div className="flex items-center gap-1.5 text-muted-foreground">
                                <FlaskConical className="h-4 w-4 text-blue-600" />
                                <span><strong className="text-foreground">Lab-verified</strong> COAs</span>
                            </div>
                            <div className="flex items-center gap-1.5 text-muted-foreground">
                                <MapPin className="h-4 w-4 text-rose-600" />
                                <span><strong className="text-foreground">50 states</strong> covered</span>
                            </div>
                        </div>
                    </div>
                </section>

                {/* ── Browse by Category ───────────────────────────────── */}
                <section className="container mx-auto px-4 py-14 max-w-6xl">
                    <h2 className="text-2xl font-bold mb-2">Browse the Library</h2>
                    <p className="text-muted-foreground mb-8">Choose a section to explore cannabis data, research, or find a dispensary near you.</p>

                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">

                        {/* Strains */}
                        <Link href="/strains" className="group">
                            <div className="h-full rounded-xl border bg-card p-6 transition-all hover:shadow-md hover:border-green-300 dark:hover:border-green-700">
                                <div className="flex items-start justify-between mb-3">
                                    <div className="h-11 w-11 rounded-lg bg-green-100 dark:bg-green-900/40 flex items-center justify-center">
                                        <Leaf className="h-5 w-5 text-green-700 dark:text-green-400" />
                                    </div>
                                    <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-green-600 group-hover:translate-x-0.5 transition-all mt-1" />
                                </div>
                                <h3 className="font-bold text-lg mb-1">Strain Encyclopedia</h3>
                                <p className="text-sm text-muted-foreground mb-3">
                                    Indica, sativa, and hybrid strains with THC/CBD ranges, terpene profiles, effects, and dispensary availability.
                                </p>
                                <div className="flex flex-wrap gap-1.5">
                                    <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">Indica</span>
                                    <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">Sativa</span>
                                    <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Hybrid</span>
                                    <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full">{strainCount} strains</span>
                                </div>
                            </div>
                        </Link>

                        {/* Terpenes */}
                        <Link href="/terpenes" className="group">
                            <div className="h-full rounded-xl border bg-card p-6 transition-all hover:shadow-md hover:border-teal-300 dark:hover:border-teal-700">
                                <div className="flex items-start justify-between mb-3">
                                    <div className="h-11 w-11 rounded-lg bg-teal-100 dark:bg-teal-900/40 flex items-center justify-center">
                                        <Droplets className="h-5 w-5 text-teal-700 dark:text-teal-400" />
                                    </div>
                                    <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-teal-600 group-hover:translate-x-0.5 transition-all mt-1" />
                                </div>
                                <h3 className="font-bold text-lg mb-1">Terpene Profiles</h3>
                                <p className="text-sm text-muted-foreground mb-3">
                                    What terpenes are, how they affect cannabis experience, and which strains are highest in each compound.
                                </p>
                                <div className="flex flex-wrap gap-1.5">
                                    <span className="text-xs bg-teal-100 text-teal-700 px-2 py-0.5 rounded-full">Myrcene</span>
                                    <span className="text-xs bg-teal-100 text-teal-700 px-2 py-0.5 rounded-full">Limonene</span>
                                    <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full">{terpeneCount} terpenes</span>
                                </div>
                            </div>
                        </Link>

                        {/* Lab Results */}
                        <Link href="/lab-results" className="group">
                            <div className="h-full rounded-xl border bg-card p-6 transition-all hover:shadow-md hover:border-blue-300 dark:hover:border-blue-700">
                                <div className="flex items-start justify-between mb-3">
                                    <div className="h-11 w-11 rounded-lg bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center">
                                        <FlaskConical className="h-5 w-5 text-blue-700 dark:text-blue-400" />
                                    </div>
                                    <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-blue-600 group-hover:translate-x-0.5 transition-all mt-1" />
                                </div>
                                <h3 className="font-bold text-lg mb-1">Lab Results & COAs</h3>
                                <p className="text-sm text-muted-foreground mb-3">
                                    Certificates of Analysis from licensed testing labs. Verify potency, terpenes, and safety before purchasing.
                                </p>
                                <div className="flex flex-wrap gap-1.5">
                                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">Potency</span>
                                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">Pesticides</span>
                                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">Heavy Metals</span>
                                </div>
                            </div>
                        </Link>

                        {/* Dispensaries */}
                        <Link href="/dispensaries" className="group">
                            <div className="h-full rounded-xl border bg-card p-6 transition-all hover:shadow-md hover:border-rose-300 dark:hover:border-rose-700">
                                <div className="flex items-start justify-between mb-3">
                                    <div className="h-11 w-11 rounded-lg bg-rose-100 dark:bg-rose-900/40 flex items-center justify-center">
                                        <MapPin className="h-5 w-5 text-rose-700 dark:text-rose-400" />
                                    </div>
                                    <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-rose-600 group-hover:translate-x-0.5 transition-all mt-1" />
                                </div>
                                <h3 className="font-bold text-lg mb-1">Dispensary Directory</h3>
                                <p className="text-sm text-muted-foreground mb-3">
                                    Licensed cannabis dispensaries across the US. Browse menus, hours, and deals — or find one near your ZIP code.
                                </p>
                                <div className="flex flex-wrap gap-1.5">
                                    <span className="text-xs bg-rose-100 text-rose-700 px-2 py-0.5 rounded-full">Find by ZIP</span>
                                </div>
                            </div>
                        </Link>

                        {/* Brands */}
                        <Link href="/brands" className="group">
                            <div className="h-full rounded-xl border bg-card p-6 transition-all hover:shadow-md hover:border-violet-300 dark:hover:border-violet-700">
                                <div className="flex items-start justify-between mb-3">
                                    <div className="h-11 w-11 rounded-lg bg-violet-100 dark:bg-violet-900/40 flex items-center justify-center">
                                        <ShoppingBag className="h-5 w-5 text-violet-700 dark:text-violet-400" />
                                    </div>
                                    <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-violet-600 group-hover:translate-x-0.5 transition-all mt-1" />
                                </div>
                                <h3 className="font-bold text-lg mb-1">Cannabis Brands</h3>
                                <p className="text-sm text-muted-foreground mb-3">
                                    Discover cannabis brands, see where their products are on shelves, and explore their strain and product catalogs.
                                </p>
                                <div className="flex flex-wrap gap-1.5">
                                    <span className="text-xs bg-violet-100 text-violet-700 px-2 py-0.5 rounded-full">Flower</span>
                                    <span className="text-xs bg-violet-100 text-violet-700 px-2 py-0.5 rounded-full">Concentrates</span>
                                    <span className="text-xs bg-violet-100 text-violet-700 px-2 py-0.5 rounded-full">Edibles</span>
                                </div>
                            </div>
                        </Link>

                        {/* Data & Research */}
                        <Link href="/data" className="group">
                            <div className="h-full rounded-xl border bg-card p-6 transition-all hover:shadow-md hover:border-amber-300 dark:hover:border-amber-700">
                                <div className="flex items-start justify-between mb-3">
                                    <div className="h-11 w-11 rounded-lg bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center">
                                        <Database className="h-5 w-5 text-amber-700 dark:text-amber-400" />
                                    </div>
                                    <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-amber-600 group-hover:translate-x-0.5 transition-all mt-1" />
                                </div>
                                <h3 className="font-bold text-lg mb-1">Industry Research Data</h3>
                                <p className="text-sm text-muted-foreground mb-3">
                                    Open datasets for researchers and journalists: Cannabis Desert Index, Market Freshness Index, Brand Availability.
                                </p>
                                <div className="flex flex-wrap gap-1.5">
                                    <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">CC BY 4.0</span>
                                    <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full">Free to cite</span>
                                </div>
                            </div>
                        </Link>

                    </div>
                </section>

                {/* ── Browse by State ───────────────────────────────────── */}
                <section className="bg-muted/30 border-y py-14">
                    <div className="container mx-auto px-4 max-w-6xl">
                        <div className="flex items-center justify-between mb-8">
                            <div>
                                <h2 className="text-2xl font-bold mb-1">Browse by State</h2>
                                <p className="text-muted-foreground text-sm">Cannabis data, dispensaries, and brands organized by state.</p>
                            </div>
                            <Link href="/dispensaries" className="text-sm font-medium text-primary hover:underline flex items-center gap-1">
                                All states <ArrowRight className="h-3.5 w-3.5" />
                            </Link>
                        </div>
                        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
                            {LEGAL_STATES.map(state => (
                                <Link
                                    key={state.slug}
                                    href={`/states/${state.slug}`}
                                    className="group flex flex-col items-center gap-1.5 rounded-xl border bg-card px-3 py-4 text-center transition-all hover:shadow-sm hover:border-green-300 hover:bg-green-50/50 dark:hover:bg-green-950/20"
                                >
                                    <span className="text-2xl font-extrabold text-muted-foreground group-hover:text-green-700 dark:group-hover:text-green-400 transition-colors">
                                        {state.abbr}
                                    </span>
                                    <span className="text-xs text-muted-foreground leading-tight">{state.name}</span>
                                </Link>
                            ))}
                        </div>
                    </div>
                </section>

                {/* ── Popular Strains Quick Links ───────────────────────── */}
                <section className="container mx-auto px-4 py-14 max-w-6xl">
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h2 className="text-2xl font-bold mb-1">Popular Strains</h2>
                            <p className="text-sm text-muted-foreground">The most searched cannabis strains in the database.</p>
                        </div>
                        <Link href="/strains" className="text-sm font-medium text-primary hover:underline flex items-center gap-1">
                            All {strainCount} strains <ArrowRight className="h-3.5 w-3.5" />
                        </Link>
                    </div>
                    <div className="flex flex-wrap gap-3">
                        {POPULAR_STRAINS.map(strain => (
                            <Link
                                key={strain.slug}
                                href={`/strains/${strain.slug}`}
                                className="flex items-center gap-2 rounded-full border bg-card px-4 py-2 text-sm font-medium transition-all hover:bg-green-50 hover:border-green-300 hover:text-green-700 dark:hover:bg-green-950/30 dark:hover:border-green-700 dark:hover:text-green-400"
                            >
                                <Leaf className="h-3.5 w-3.5 text-green-600" />
                                {strain.name}
                            </Link>
                        ))}
                        <Link
                            href="/strains"
                            className="flex items-center gap-2 rounded-full border border-dashed bg-transparent px-4 py-2 text-sm font-medium text-muted-foreground transition-all hover:border-green-300 hover:text-green-600"
                        >
                            <Search className="h-3.5 w-3.5" />
                            Search all strains
                        </Link>
                    </div>
                </section>

                {/* ── Why This Data Matters ─────────────────────────────── */}
                <section className="bg-gradient-to-b from-background to-green-50/30 dark:to-green-950/10 border-t py-14">
                    <div className="container mx-auto px-4 max-w-4xl">
                        <div className="flex items-center gap-2 mb-2">
                            <TrendingUp className="h-5 w-5 text-green-600" />
                            <h2 className="text-2xl font-bold">About This Database</h2>
                        </div>
                        <p className="text-muted-foreground mb-8">
                            BakedBot aggregates cannabis data from licensed dispensaries, brand menus, and certified testing labs across the US. Every data point is sourced from real product listings, COA documents, and dispensary POS systems.
                        </p>
                        <div className="grid md:grid-cols-3 gap-6 text-sm">
                            <div className="rounded-xl border bg-card p-5">
                                <h3 className="font-semibold mb-2 flex items-center gap-2"><Leaf className="h-4 w-4 text-green-600" /> Strain Data</h3>
                                <p className="text-muted-foreground">Sourced from dispensary menus, Leafly, AllBud, and curated seed bank catalogs. Includes genetic lineage, common effects, and real-world terpene data from COAs.</p>
                            </div>
                            <div className="rounded-xl border bg-card p-5">
                                <h3 className="font-semibold mb-2 flex items-center gap-2"><FlaskConical className="h-4 w-4 text-blue-600" /> Lab Results</h3>
                                <p className="text-muted-foreground">COAs automatically extracted from dispensary product listings using BakedBot's document parser. Updated as dispensaries sync their menus.</p>
                            </div>
                            <div className="rounded-xl border bg-card p-5">
                                <h3 className="font-semibold mb-2 flex items-center gap-2"><MapPin className="h-4 w-4 text-rose-600" /> Dispensaries</h3>
                                <p className="text-muted-foreground">Licensed dispensaries tracked via state license databases and Weedmaps. Menus sync in real time for dispensaries using BakedBot's retail platform.</p>
                            </div>
                        </div>
                    </div>
                </section>

                {/* ── FAQ ───────────────────────────────────────────────── */}
                <section className="container mx-auto px-4 py-14 max-w-3xl">
                    <div className="flex items-center gap-2 mb-8">
                        <BookOpen className="h-5 w-5 text-muted-foreground" />
                        <h2 className="text-2xl font-bold">Frequently Asked Questions</h2>
                    </div>
                    <div className="space-y-6">
                        {FAQ.map((item, i) => (
                            <div key={i} className="border-b pb-6 last:border-0 last:pb-0">
                                <h3 className="font-semibold text-base mb-2">{item.q}</h3>
                                <p className="text-sm text-muted-foreground leading-relaxed">{item.a}</p>
                            </div>
                        ))}
                    </div>
                </section>

                {/* ── CTA strip ────────────────────────────────────────── */}
                <section className="bg-green-700 dark:bg-green-900 text-white py-12">
                    <div className="container mx-auto px-4 max-w-3xl text-center">
                        <Globe className="h-8 w-8 mx-auto mb-4 opacity-80" />
                        <h2 className="text-2xl font-bold mb-2">Are you a dispensary or cannabis brand?</h2>
                        <p className="text-green-100 mb-6">
                            Get your menu on BakedBot, sync lab results automatically, and turn walk-in customers into loyal regulars.
                        </p>
                        <div className="flex flex-col sm:flex-row gap-3 justify-center">
                            <Link
                                href="/pricing"
                                className="inline-flex items-center justify-center gap-2 rounded-xl bg-white text-green-800 font-semibold px-6 py-3 text-sm hover:bg-green-50 transition-colors"
                            >
                                See Pricing <ArrowRight className="h-4 w-4" />
                            </Link>
                            <Link
                                href="/ai-retention-audit"
                                className="inline-flex items-center justify-center gap-2 rounded-xl bg-green-600 dark:bg-green-800 border border-green-500 text-white font-semibold px-6 py-3 text-sm hover:bg-green-500 transition-colors"
                            >
                                Free Retention Audit
                            </Link>
                        </div>
                    </div>
                </section>

            </main>

            <LandingFooter />

            {/* Schema.org — DataCatalog + WebSite + FAQPage */}
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{
                    __html: JSON.stringify([
                        {
                            '@context': 'https://schema.org',
                            '@type': 'DataCatalog',
                            name: 'BakedBot Cannabis Data Library',
                            description: `The most comprehensive open cannabis database: ${strainCount} strains, terpene profiles, lab results, and dispensary data.`,
                            url: 'https://bakedbot.ai/explore',
                            publisher: {
                                '@type': 'Organization',
                                name: 'BakedBot',
                                url: 'https://bakedbot.ai',
                            },
                            dataset: [
                                { '@type': 'Dataset', name: 'Cannabis Strain Encyclopedia', url: 'https://bakedbot.ai/strains', description: `${strainCount} cannabis strains with THC/CBD, terpenes, and effects.` },
                                { '@type': 'Dataset', name: 'Terpene Profiles', url: 'https://bakedbot.ai/terpenes', description: `${terpeneCount} cannabis terpene profiles with effects and strain associations.` },
                                { '@type': 'Dataset', name: 'Cannabis Lab Results (COA)', url: 'https://bakedbot.ai/lab-results', description: 'Certificates of Analysis from licensed cannabis testing labs.' },
                                { '@type': 'Dataset', name: 'Cannabis Desert Index', url: 'https://bakedbot.ai/data/desert-index', description: 'ZIP-level cannabis access scores across the US.' },
                            ],
                        },
                        {
                            '@context': 'https://schema.org',
                            '@type': 'FAQPage',
                            mainEntity: FAQ.map(item => ({
                                '@type': 'Question',
                                name: item.q,
                                acceptedAnswer: { '@type': 'Answer', text: item.a },
                            })),
                        },
                        {
                            '@context': 'https://schema.org',
                            '@type': 'BreadcrumbList',
                            itemListElement: [
                                { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://bakedbot.ai' },
                                { '@type': 'ListItem', position: 2, name: 'Cannabis Data Library', item: 'https://bakedbot.ai/explore' },
                            ],
                        },
                    ]),
                }}
            />
        </div>
    );
}
