import type { Metadata } from 'next';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowRight, CheckCircle2, BarChart3, Users, ShieldCheck, RefreshCw, TrendingUp } from 'lucide-react';

export const metadata: Metadata = {
    title: 'Dispensary CRM — AI-Powered Customer Management for Cannabis Retailers',
    description:
        'BakedBot is the dispensary CRM built for cannabis operators. Automatically capture first-party customer data, segment by purchase behavior, and run retention campaigns — all managed for you. Powered by Thrive Syracuse.',
    openGraph: {
        title: 'Dispensary CRM — AI-Powered Customer Management for Cannabis Retailers',
        description: 'The dispensary CRM that runs itself. Capture, segment, and retain customers automatically. Proven at Thrive Syracuse, a New York social equity dispensary.',
        url: 'https://bakedbot.ai/dispensary-crm',
    },
    alternates: { canonical: 'https://bakedbot.ai/dispensary-crm' },
};

const features = [
    { icon: Users, title: 'First-party data capture', description: 'Tablet check-in and QR codes capture customer data at the point of sale — no reliance on third-party loyalty apps you don\'t control.' },
    { icon: BarChart3, title: 'Automatic segmentation', description: 'Customers are automatically segmented by purchase frequency, average spend, product preference, and recency — no manual tagging.' },
    { icon: RefreshCw, title: 'Retention campaigns that run themselves', description: 'Welcome sequences, win-back campaigns, and re-engagement flows trigger automatically based on customer behavior, not calendar reminders.' },
    { icon: TrendingUp, title: 'Weekly KPI reporting', description: 'Every Monday, you get a plain-English report showing which customers came back, what they bought, and what the retention loop generated in revenue.' },
    { icon: ShieldCheck, title: 'Compliance-reviewed before send', description: 'Every campaign goes through Deebo, our compliance agent, before it reaches a customer. OCM-aligned. 280E-aware. No guessing.' },
    { icon: CheckCircle2, title: '30-day proof model', description: 'If you don\'t see measurable lift in 30 days, you get your money back. We put our fee on the line because we\'ve already proven it works.' },
];

const comparison = [
    { feature: 'Setup required by operator', bakedbot: 'We set it up for you', others: 'You configure everything' },
    { feature: 'Cannabis compliance review', bakedbot: 'Built in — every campaign', others: 'Manual or none' },
    { feature: 'POS integration', bakedbot: 'Alleaves, Dutchie, Treez', others: 'Limited or paid add-on' },
    { feature: 'Weekly attribution reporting', bakedbot: 'Included — plain English', others: 'Dashboard you have to check' },
    { feature: 'AI segmentation', bakedbot: 'Automatic, behavior-driven', others: 'Manual or rules-based' },
    { feature: 'Pricing model', bakedbot: 'Managed service', others: 'Software you pay to manage' },
];

export default function DispensaryCRMPage() {
    return (
        <div className="min-h-screen bg-background">
            {/* Hero */}
            <section className="border-b border-border/40 bg-gradient-to-b from-emerald-50/50 to-background">
                <div className="container mx-auto px-4 py-20 max-w-5xl">
                    <div className="max-w-3xl">
                        <Badge variant="outline" className="mb-4 bg-emerald-500/10 text-emerald-700 border-emerald-500/20">
                            Dispensary CRM
                        </Badge>
                        <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-6 leading-tight">
                            The dispensary CRM that actually runs your retention loop
                        </h1>
                        <p className="text-xl text-muted-foreground leading-relaxed mb-8">
                            Most dispensary CRMs give you a dashboard to manage. BakedBot gives you a managed retention system — first-party data capture, AI segmentation, automated campaigns, and weekly reporting. You get the results without running the tool.
                        </p>
                        <div className="flex flex-wrap gap-4">
                            <Button asChild size="lg" className="bg-emerald-600 hover:bg-emerald-700">
                                <Link href="/ai-retention-audit">
                                    Get a free retention audit <ArrowRight className="ml-2 h-4 w-4" />
                                </Link>
                            </Button>
                            <Button asChild variant="outline" size="lg">
                                <Link href="/book">Book a founder call</Link>
                            </Button>
                        </div>
                    </div>
                </div>
            </section>

            {/* Proof */}
            <section className="container mx-auto px-4 py-12 max-w-5xl">
                <Card className="border-emerald-200 bg-emerald-50/50">
                    <CardContent className="p-6 flex flex-col sm:flex-row items-start sm:items-center gap-4">
                        <div className="shrink-0 h-10 w-10 rounded-full bg-emerald-600 flex items-center justify-center text-white font-bold">T</div>
                        <div>
                            <p className="font-semibold text-sm">Thrive Syracuse — live proof</p>
                            <p className="text-sm text-muted-foreground mt-0.5">Social equity dispensary in New York. Access Complete plan. Alleaves POS integrated, check-in tablet deployed, daily competitor tracking across 5 markets, automated welcome and retention campaigns running. This is the system you&#39;re evaluating — already proven in a real store.</p>
                        </div>
                        <Button asChild variant="outline" size="sm" className="shrink-0">
                            <Link href="/pricing">See plans <ArrowRight className="ml-1 h-3 w-3" /></Link>
                        </Button>
                    </CardContent>
                </Card>
            </section>

            {/* Features */}
            <section className="container mx-auto px-4 py-12 max-w-5xl">
                <h2 className="text-2xl font-bold mb-8">What the BakedBot CRM does for you</h2>
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

            {/* Comparison */}
            <section className="border-t border-border/40 bg-muted/20">
                <div className="container mx-auto px-4 py-16 max-w-4xl">
                    <h2 className="text-2xl font-bold mb-8 text-center">BakedBot vs. traditional dispensary CRM software</h2>
                    <div className="rounded-xl border border-border/60 overflow-hidden">
                        <div className="grid grid-cols-3 bg-muted/50 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                            <span>Feature</span>
                            <span className="text-emerald-700">BakedBot</span>
                            <span>Others</span>
                        </div>
                        {comparison.map((row, i) => (
                            <div key={row.feature} className={`grid grid-cols-3 px-4 py-3 text-sm border-t border-border/40 ${i % 2 === 0 ? '' : 'bg-muted/20'}`}>
                                <span className="font-medium pr-4">{row.feature}</span>
                                <span className="text-emerald-700 pr-4">{row.bakedbot}</span>
                                <span className="text-muted-foreground">{row.others}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* CTA */}
            <section className="container mx-auto px-4 py-16 max-w-3xl text-center">
                <h2 className="text-2xl font-bold mb-4">Ready to see your retention numbers?</h2>
                <p className="text-muted-foreground mb-8">We run a free retention audit for every dispensary before asking for a dollar. You get a competitive snapshot and a clear picture of where you&#39;re losing customers. No commitment required.</p>
                <div className="flex flex-wrap items-center justify-center gap-4">
                    <Button asChild size="lg" className="bg-emerald-600 hover:bg-emerald-700">
                        <Link href="/ai-retention-audit">Get your free audit <ArrowRight className="ml-2 h-4 w-4" /></Link>
                    </Button>
                    <Button asChild variant="outline" size="lg">
                        <Link href="/pricing">See pricing</Link>
                    </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-4">30-day money-back guarantee on all paid plans.</p>
            </section>
        </div>
    );
}
