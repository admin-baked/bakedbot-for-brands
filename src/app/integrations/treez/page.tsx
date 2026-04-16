import type { Metadata } from 'next';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowRight, Bot, BarChart3, RefreshCw, ShieldCheck, Users, TrendingUp, Eye } from 'lucide-react';

export const metadata: Metadata = {
    title: 'BakedBot + Treez Integration — AI Agents Manage Your Treez Dispensary',
    description:
        'BakedBot\'s AI agents log into your Treez back office, pull customer and sales data daily, and run automated retention campaigns — fully managed, no Treez API partnership required. Add the intelligence layer to your existing Treez setup.',
    openGraph: {
        title: 'BakedBot + Treez Integration — AI Agents Manage Your Treez Dispensary',
        description: 'BakedBot AI agents authenticate into Treez, read your transaction data, and run retention campaigns on your behalf — no native API needed. Managed execution for Treez dispensaries.',
        url: 'https://bakedbot.ai/integrations/treez',
    },
    alternates: { canonical: 'https://bakedbot.ai/integrations/treez' },
};

const features = [
    {
        icon: Bot,
        title: 'AI agents log in and do the work',
        description: 'BakedBot\'s agents authenticate into your Treez back office using your credentials and pull the data they need — customer records, transaction history, product movement — without any manual exports or API setup on your end.',
    },
    {
        icon: Eye,
        title: 'Full Treez visibility without extra work',
        description: 'Agents read your Treez reports and sales data the same way your staff does — then hand that data to the retention and segmentation engine automatically. No spreadsheets, no exports, no manual work.',
    },
    {
        icon: Users,
        title: 'RFM segmentation from Treez data',
        description: 'Recency, frequency, and monetary value scoring runs automatically from your Treez transaction history. Every customer segment gets a different retention strategy based on real behavior.',
    },
    {
        icon: RefreshCw,
        title: 'Automated lifecycle campaigns',
        description: 'Welcome sequences, win-back flows, and loyalty campaigns trigger based on actual Treez transaction behavior — not calendar reminders or manual triggers.',
    },
    {
        icon: TrendingUp,
        title: 'Competitive intelligence alongside retention',
        description: 'While Treez agents track your sales, BakedBot\'s Ezal agent tracks what your competitors are selling and pricing — daily across every market you operate in.',
    },
    {
        icon: ShieldCheck,
        title: 'Compliance review on every send',
        description: 'Every customer-facing campaign reviewed against state cannabis advertising rules before send. Works across all states where Treez operates.',
    },
    {
        icon: BarChart3,
        title: 'Weekly revenue attribution report',
        description: 'Plain-English weekly report tying every BakedBot campaign back to real Treez transactions — so you see the exact ROI of the retention system.',
    },
];

const howAgentsWork = [
    { step: '1', title: 'Credential setup', detail: 'You provide your Treez back-office login once, encrypted and stored in your BakedBot account. No Treez API key or developer account required.' },
    { step: '2', title: 'Daily data sync', detail: 'Agents log into Treez each morning, read the previous day\'s transactions and customer records, and sync the data into BakedBot\'s retention engine.' },
    { step: '3', title: 'Segment refresh', detail: 'Customer profiles are updated — recency, frequency, spend tier, and product preferences recalculated from the latest Treez data.' },
    { step: '4', title: 'Campaign execution', detail: 'Updated segments trigger the right campaigns: new customers enter the welcome flow, lapsed customers get win-back messages, loyalists get milestone rewards.' },
    { step: '5', title: 'Weekly report', detail: 'A plain-English summary of what the agents did, what Treez data drove the decisions, and what revenue the campaigns influenced.' },
];

export default function TreezIntegrationPage() {
    return (
        <div className="min-h-screen bg-background">
            {/* Hero */}
            <section className="border-b border-border/40 bg-gradient-to-b from-emerald-50/50 to-background">
                <div className="container mx-auto px-4 py-20 max-w-5xl">
                    <div className="max-w-3xl">
                        <Badge variant="outline" className="mb-4 bg-emerald-500/10 text-emerald-700 border-emerald-500/20">
                            Treez integration
                        </Badge>
                        <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-6 leading-tight">
                            AI agents that log into Treez and turn your data into retention revenue
                        </h1>
                        <p className="text-xl text-muted-foreground leading-relaxed mb-8">
                            BakedBot doesn&#39;t need a Treez API partnership. Our AI agents authenticate into your Treez back office daily, pull your customer and transaction data, and run the full retention loop automatically. You stay on Treez. We add the intelligence and execution layer it&#39;s missing.
                        </p>
                        <div className="flex flex-wrap gap-4">
                            <Button asChild size="lg" className="bg-emerald-600 hover:bg-emerald-700">
                                <Link href="/ai-retention-audit">Get a free audit <ArrowRight className="ml-2 h-4 w-4" /></Link>
                            </Button>
                            <Button asChild variant="outline" size="lg">
                                <Link href="/book">Book a demo</Link>
                            </Button>
                        </div>
                    </div>
                </div>
            </section>

            {/* How agents work */}
            <section className="border-b border-border/40 bg-muted/20">
                <div className="container mx-auto px-4 py-12 max-w-4xl">
                    <h2 className="text-xl font-bold mb-6">How BakedBot agents work with Treez</h2>
                    <div className="space-y-4">
                        {howAgentsWork.map((s) => (
                            <div key={s.step} className="flex gap-4 items-start">
                                <div className="h-7 w-7 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">{s.step}</div>
                                <div>
                                    <span className="font-semibold text-sm">{s.title}: </span>
                                    <span className="text-sm text-muted-foreground">{s.detail}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Features */}
            <section className="container mx-auto px-4 py-16 max-w-5xl">
                <h2 className="text-2xl font-bold mb-8">What Treez + BakedBot delivers</h2>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {features.map((f) => (
                        <div key={f.title} className="flex gap-3">
                            <f.icon className="h-5 w-5 text-emerald-600 mt-0.5 shrink-0" />
                            <div>
                                <h3 className="font-semibold mb-1">{f.title}</h3>
                                <p className="text-sm text-muted-foreground leading-relaxed">{f.description}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            {/* Proof */}
            <section className="border-t border-border/40 bg-muted/20">
                <div className="container mx-auto px-4 py-12 max-w-4xl">
                    <Card className="border-emerald-200 bg-emerald-50/50">
                        <CardContent className="p-6">
                            <p className="font-semibold text-emerald-800 mb-2">Same agent architecture, proven at Thrive Syracuse</p>
                            <p className="text-sm text-muted-foreground">Thrive Syracuse runs Alleaves POS with BakedBot agents managing the data and retention layer on top. Agents authenticate daily, pull transaction data, refresh segments, and execute campaigns. That same agent-driven architecture is exactly how we work with Treez — the only difference is which back office the agents log into.</p>
                        </CardContent>
                    </Card>
                </div>
            </section>

            {/* CTA */}
            <section className="container mx-auto px-4 py-16 max-w-3xl text-center">
                <h2 className="text-2xl font-bold mb-4">Running Treez? Let&#39;s show you what&#39;s possible.</h2>
                <p className="text-muted-foreground mb-8">Free retention audit. We use your market data to show exactly where your customers are going — and what the gap costs you.</p>
                <div className="flex flex-wrap items-center justify-center gap-4">
                    <Button asChild size="lg" className="bg-emerald-600 hover:bg-emerald-700">
                        <Link href="/ai-retention-audit">Free audit <ArrowRight className="ml-2 h-4 w-4" /></Link>
                    </Button>
                    <Button asChild variant="outline" size="lg">
                        <Link href="/pricing">Pricing</Link>
                    </Button>
                </div>
            </section>
        </div>
    );
}
