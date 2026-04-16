import type { Metadata } from 'next';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowRight, BarChart3, Eye, Zap, TrendingDown, RefreshCw, ShieldCheck, Database } from 'lucide-react';

export const metadata: Metadata = {
    title: 'BakedBot + CannMenus Integration — Live Menu Data Powers Ezal, Our Competitive Intelligence Agent',
    description:
        'CannMenus provides the real-time menu and pricing data that powers Ezal, BakedBot\'s competitive intelligence agent. Every day, Ezal reads live menu data from CannMenus to track what your competitors are selling, pricing, and promoting — automatically.',
    openGraph: {
        title: 'BakedBot + CannMenus — The Data Backbone of Competitive Intelligence',
        description: 'CannMenus is the live data feed that powers Ezal, BakedBot\'s daily competitive intelligence agent. Real menu prices, inventory levels, and product availability across every competitor in your market.',
        url: 'https://bakedbot.ai/integrations/cannmenus',
    },
    alternates: { canonical: 'https://bakedbot.ai/integrations/cannmenus' },
};

const ezalCapabilities = [
    {
        icon: Eye,
        title: 'Daily competitor menu scans',
        description: 'Every day, Ezal uses CannMenus data to read the live menus of every competitor in your market — current prices, available products, active promotions, and out-of-stock items.',
    },
    {
        icon: TrendingDown,
        title: 'Price movement detection',
        description: 'When a competitor drops the price on a product you carry, Ezal catches it in the same daily scan. You know about pricing moves before they affect your foot traffic.',
    },
    {
        icon: BarChart3,
        title: 'Product gap analysis',
        description: 'CannMenus data lets Ezal identify products your competitors carry that you don\'t — and products you carry that they\'ve gone out of stock on, creating a window to capture that demand.',
    },
    {
        icon: RefreshCw,
        title: 'Promotion tracking',
        description: 'Ezal surfaces active deals and promotions across competitor menus. If a nearby dispensary is running a half-off flower Friday, your weekly briefing will include it.',
    },
    {
        icon: Database,
        title: 'Multi-market coverage',
        description: 'CannMenus aggregates menu data across hundreds of dispensaries. Ezal uses that breadth to track up to 15 competitors simultaneously across your market — not just the one next door.',
    },
    {
        icon: Zap,
        title: 'Feeds directly into Marty\'s weekly briefing',
        description: 'Ezal\'s CannMenus-powered findings flow directly into Marty\'s morning briefing. Every Monday, you see your competitive position summarized alongside your retention metrics.',
    },
];

const dataPoints = [
    { label: 'Live menu prices', detail: 'Current price per gram, eighth, quarter, ounce for every tracked product category' },
    { label: 'Product availability', detail: 'In-stock vs. out-of-stock across competitor SKUs — updated on each daily scan' },
    { label: 'Active promotions', detail: 'Deals, bundle pricing, happy-hour specials, and loyalty point multipliers' },
    { label: 'Menu breadth', detail: 'Product count by category — flower, concentrates, edibles, topicals, accessories' },
    { label: 'Brand presence', detail: 'Which brands a competitor carries — useful for spotting exclusive relationships or distribution gaps' },
    { label: 'Historical trends', detail: 'Price changes over time across tracked competitors, surfaced in the weekly competitive report' },
];

export default function CannMenusIntegrationPage() {
    return (
        <div className="min-h-screen bg-background">
            {/* Hero */}
            <section className="border-b border-border/40 bg-gradient-to-b from-emerald-50/50 to-background">
                <div className="container mx-auto px-4 py-20 max-w-5xl">
                    <div className="max-w-3xl">
                        <Badge variant="outline" className="mb-4 bg-emerald-500/10 text-emerald-700 border-emerald-500/20">
                            CannMenus integration
                        </Badge>
                        <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-6 leading-tight">
                            The live menu data backbone that powers Ezal, our competitive intelligence agent
                        </h1>
                        <p className="text-xl text-muted-foreground leading-relaxed mb-8">
                            BakedBot integrates directly with CannMenus to give Ezal — our dedicated competitive intelligence agent — a real-time view of every competitor&#39;s menu, pricing, and promotions. Every day, Ezal reads CannMenus data across your market and surfaces what changed. You find out before it costs you customers.
                        </p>
                        <div className="flex flex-wrap gap-4">
                            <Button asChild size="lg" className="bg-emerald-600 hover:bg-emerald-700">
                                <Link href="/ai-retention-audit">
                                    Get a free competitive snapshot <ArrowRight className="ml-2 h-4 w-4" />
                                </Link>
                            </Button>
                            <Button asChild variant="outline" size="lg">
                                <Link href="/book">Talk to a founder</Link>
                            </Button>
                        </div>
                    </div>
                </div>
            </section>

            {/* Ezal callout */}
            <section className="border-b border-border/40 bg-slate-900 text-white">
                <div className="container mx-auto px-4 py-10 max-w-5xl">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
                        <div className="h-14 w-14 rounded-full bg-amber-500 flex items-center justify-center text-white font-bold text-xl shrink-0">E</div>
                        <div className="flex-1">
                            <p className="font-bold text-lg mb-1">Meet Ezal — BakedBot&#39;s competitive intelligence agent</p>
                            <p className="text-slate-300 text-sm leading-relaxed">
                                Ezal runs a daily scan of your competitive market using CannMenus as his primary data source. He reads live menus, tracks price moves, spots promotions, and identifies product gaps — then hands his findings to Marty for the morning briefing. CannMenus is the backbone. Ezal is the analyst that makes it actionable.
                            </p>
                        </div>
                        <Button asChild variant="outline" size="sm" className="border-white/30 text-white hover:bg-white/10 shrink-0">
                            <Link href="/pricing">See plans that include Ezal</Link>
                        </Button>
                    </div>
                </div>
            </section>

            {/* What Ezal does with CannMenus data */}
            <section className="container mx-auto px-4 py-16 max-w-5xl">
                <h2 className="text-2xl font-bold mb-3">What Ezal does with CannMenus data every day</h2>
                <p className="text-muted-foreground mb-10">CannMenus provides the raw feed. Ezal turns it into competitive intelligence your team can act on — surfaced automatically in your daily briefing.</p>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {ezalCapabilities.map((c) => (
                        <div key={c.title} className="flex gap-3">
                            <c.icon className="h-5 w-5 text-emerald-600 mt-0.5 shrink-0" />
                            <div>
                                <h3 className="font-semibold mb-1">{c.title}</h3>
                                <p className="text-sm text-muted-foreground leading-relaxed">{c.description}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            {/* Data points tracked */}
            <section className="border-t border-border/40 bg-muted/20">
                <div className="container mx-auto px-4 py-16 max-w-4xl">
                    <h2 className="text-2xl font-bold mb-3 text-center">What CannMenus data Ezal tracks</h2>
                    <p className="text-muted-foreground text-center mb-10">Every data point below is pulled from CannMenus on each daily scan and fed into Ezal&#39;s competitive analysis.</p>
                    <div className="grid sm:grid-cols-2 gap-4">
                        {dataPoints.map((d) => (
                            <div key={d.label} className="rounded-xl border border-border/60 bg-background p-4">
                                <p className="font-semibold text-sm mb-1">{d.label}</p>
                                <p className="text-xs text-muted-foreground leading-relaxed">{d.detail}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* How it flows */}
            <section className="container mx-auto px-4 py-16 max-w-4xl">
                <h2 className="text-2xl font-bold mb-8 text-center">From raw data to actionable intelligence</h2>
                <div className="space-y-4">
                    {[
                        { step: '1', title: 'CannMenus aggregates live dispensary menu data', detail: 'CannMenus continuously indexes menus, prices, and availability across hundreds of cannabis dispensaries in real time.' },
                        { step: '2', title: 'BakedBot queries CannMenus daily for your market', detail: 'Each morning, BakedBot pulls the latest CannMenus data for every competitor within your configured market radius — up to 15 competitors on Operator plans.' },
                        { step: '3', title: 'Ezal analyzes what changed', detail: 'Ezal compares today\'s CannMenus snapshot against yesterday\'s baseline. Price drops, new products, out-of-stocks, and new promotions are flagged automatically.' },
                        { step: '4', title: 'Findings flow into the morning briefing', detail: 'Significant competitive moves surface in Marty\'s daily briefing — alongside your own retention metrics and outreach pipeline.' },
                        { step: '5', title: 'Weekly competitive report', detail: 'Every week, a structured competitive summary shows pricing trends, market share signals, and product gap opportunities across all tracked competitors.' },
                    ].map((s) => (
                        <div key={s.step} className="flex gap-4 items-start">
                            <div className="h-7 w-7 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">{s.step}</div>
                            <div>
                                <span className="font-semibold text-sm">{s.title}: </span>
                                <span className="text-sm text-muted-foreground">{s.detail}</span>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            {/* Plan coverage */}
            <section className="border-t border-border/40 bg-muted/20">
                <div className="container mx-auto px-4 py-12 max-w-4xl">
                    <h2 className="text-xl font-bold mb-6 text-center">Ezal&#39;s CannMenus coverage by plan</h2>
                    <div className="rounded-xl border border-border/60 overflow-hidden">
                        <div className="grid grid-cols-3 bg-muted/50 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                            <span>Plan</span>
                            <span>Competitors tracked</span>
                            <span>Scan frequency</span>
                        </div>
                        {[
                            { plan: 'Access Intel', competitors: 'Up to 10', freq: 'Daily' },
                            { plan: 'Access Complete ⭐', competitors: 'Up to 15', freq: 'Daily' },
                            { plan: 'Operator Core', competitors: 'Up to 30', freq: 'Every 12 hours' },
                            { plan: 'Operator Growth', competitors: 'Up to 100', freq: 'Every 6 hours' },
                        ].map((row, i) => (
                            <div key={row.plan} className={`grid grid-cols-3 px-4 py-3 text-sm border-t border-border/40 ${i % 2 === 0 ? '' : 'bg-muted/20'}`}>
                                <span className="font-medium">{row.plan}</span>
                                <span className="text-muted-foreground">{row.competitors}</span>
                                <span className="text-muted-foreground">{row.freq}</span>
                            </div>
                        ))}
                    </div>
                    <p className="text-xs text-muted-foreground text-center mt-3">
                        Competitor tracking is available on all paid plans. <Link href="/pricing" className="underline">See full plan comparison →</Link>
                    </p>
                </div>
            </section>

            {/* Proof */}
            <section className="container mx-auto px-4 py-12 max-w-4xl">
                <Card className="border-emerald-200 bg-emerald-50/50">
                    <CardContent className="p-6">
                        <Badge variant="outline" className="bg-emerald-500/10 text-emerald-700 border-emerald-500/20 mb-3">Live proof</Badge>
                        <h3 className="font-bold mb-2">Thrive Syracuse — Ezal tracks 5+ NY competitors daily</h3>
                        <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                            At Thrive Syracuse, Ezal uses CannMenus data to monitor competitor pricing and menu changes across five-plus markets in upstate New York — every single day. When a competitor drops their eighths price or runs a weekend promo, Martez knows about it in the morning briefing before the store opens. That&#39;s the advantage CannMenus + Ezal delivers.
                        </p>
                        <Button asChild className="bg-emerald-600 hover:bg-emerald-700" size="sm">
                            <Link href="/ai-retention-audit">Get a free competitive snapshot <ArrowRight className="ml-1 h-3 w-3" /></Link>
                        </Button>
                    </CardContent>
                </Card>
            </section>

            {/* CTA */}
            <section className="container mx-auto px-4 py-16 max-w-3xl text-center">
                <h2 className="text-2xl font-bold mb-4">See what Ezal finds in your market</h2>
                <p className="text-muted-foreground mb-8">
                    We run a free competitive snapshot for every dispensary we talk to — powered by CannMenus data, analyzed by Ezal, delivered before you spend a dollar. No commitment required.
                </p>
                <div className="flex flex-wrap items-center justify-center gap-4">
                    <Button asChild size="lg" className="bg-emerald-600 hover:bg-emerald-700">
                        <Link href="/ai-retention-audit">Free competitive snapshot <ArrowRight className="ml-2 h-4 w-4" /></Link>
                    </Button>
                    <Button asChild variant="outline" size="lg">
                        <Link href="/pricing">See pricing</Link>
                    </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-4">
                    Also powers: <Link href="/integrations/alleaves" className="underline">Alleaves</Link> · <Link href="/integrations/dutchie" className="underline">Dutchie</Link> · <Link href="/integrations/treez" className="underline">Treez</Link>
                </p>
            </section>
        </div>
    );
}
