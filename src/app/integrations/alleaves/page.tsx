import type { Metadata } from 'next';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowRight, Plug, BarChart3, RefreshCw, ShieldCheck, Users, CheckCircle2 } from 'lucide-react';

export const metadata: Metadata = {
    title: 'BakedBot + Alleaves Integration — AI Retention for Alleaves Dispensaries',
    description:
        'BakedBot is live on Alleaves POS at Thrive Syracuse. The integration connects Alleaves transaction data to AI-powered retention campaigns, customer segmentation, and weekly reporting — fully managed.',
    openGraph: {
        title: 'BakedBot + Alleaves Integration — AI Retention for Alleaves Dispensaries',
        description: 'The BakedBot + Alleaves integration is live in production at Thrive Syracuse, NY. Real transaction data, AI retention, and automated campaigns — proven in a real dispensary.',
        url: 'https://bakedbot.ai/integrations/alleaves',
    },
    alternates: { canonical: 'https://bakedbot.ai/integrations/alleaves' },
};

const features = [
    { icon: CheckCircle2, title: 'Live in production', description: 'The Alleaves integration is not a demo — it\'s running at Thrive Syracuse every day. Real transaction data, real campaigns, real results.' },
    { icon: Plug, title: 'Transaction data sync', description: 'Every Alleaves sale automatically updates customer profiles in BakedBot with purchase history, product preferences, and recency scores.' },
    { icon: Users, title: 'Customer ID matching', description: 'BakedBot matches Alleaves customer IDs to behavioral profiles so the retention loop starts from day one of integration — no data migration required.' },
    { icon: RefreshCw, title: 'Behavior-triggered campaigns', description: 'Alleaves transaction data drives the campaign logic. When a customer\'s behavior changes — visit frequency drops, new product preference emerges — campaigns adapt automatically.' },
    { icon: BarChart3, title: 'Verified revenue attribution', description: 'Every campaign outcome is tied back to an Alleaves transaction. The weekly report shows exactly which automation generated which revenue.' },
    { icon: ShieldCheck, title: 'Compliance before every send', description: 'Every campaign reviewed by Deebo before send — OCM-aligned for NY operators, cannabis-compliant across all markets.' },
];

export default function AlleavesIntegrationPage() {
    return (
        <div className="min-h-screen bg-background">
            <section className="border-b border-border/40 bg-gradient-to-b from-emerald-50/50 to-background">
                <div className="container mx-auto px-4 py-20 max-w-5xl">
                    <div className="max-w-3xl">
                        <Badge variant="outline" className="mb-4 bg-emerald-500/10 text-emerald-700 border-emerald-500/20">
                            Alleaves integration
                        </Badge>
                        <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-6 leading-tight">
                            BakedBot + Alleaves: the integration that&#39;s already live
                        </h1>
                        <p className="text-xl text-muted-foreground leading-relaxed mb-8">
                            The BakedBot + Alleaves integration is running in production at Thrive Syracuse, New York. Alleaves transaction data flows into BakedBot AI segmentation in real-time, driving automated welcome playbooks, win-back campaigns, and competitive intelligence — every day.
                        </p>
                        <div className="flex flex-wrap gap-4">
                            <Button asChild size="lg" className="bg-emerald-600 hover:bg-emerald-700">
                                <Link href="/ai-retention-audit">Get a free audit <ArrowRight className="ml-2 h-4 w-4" /></Link>
                            </Button>
                            <Button asChild variant="outline" size="lg">
                                <Link href="/book">Talk to Martez</Link>
                            </Button>
                        </div>
                    </div>
                </div>
            </section>

            {/* Live proof bar */}
            <section className="border-b border-border/40 bg-emerald-50/70">
                <div className="container mx-auto px-4 py-5 max-w-5xl">
                    <div className="flex items-center gap-2 justify-center">
                        <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                        <p className="text-sm font-medium text-emerald-800">
                            Live in production — Thrive Syracuse, NY — Alleaves POS + BakedBot running daily
                        </p>
                    </div>
                </div>
            </section>

            <section className="container mx-auto px-4 py-16 max-w-5xl">
                <h2 className="text-2xl font-bold mb-8">What the live Alleaves integration delivers</h2>
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

            <section className="border-t border-border/40 bg-muted/20">
                <div className="container mx-auto px-4 py-12 max-w-4xl">
                    <Card className="border-emerald-200 bg-emerald-50/50">
                        <CardContent className="p-6">
                            <Badge variant="outline" className="bg-emerald-500/10 text-emerald-700 border-emerald-500/20 mb-3">Thrive Syracuse</Badge>
                            <h3 className="font-bold mb-2">The only Alleaves + AI retention integration in production</h3>
                            <p className="text-sm text-muted-foreground leading-relaxed mb-4">Thrive Syracuse (social equity, NY) was the first Alleaves dispensary live on BakedBot. The integration handles customer ID matching (via Alleaves customer IDs), transaction data sync, and real-time segmentation updates. Every new Alleaves integration we deploy uses this proven pattern.</p>
                            <Button asChild size="sm" className="bg-emerald-600 hover:bg-emerald-700">
                                <Link href="/pricing">See Access Complete plan — $750/mo <ArrowRight className="ml-1 h-3 w-3" /></Link>
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            </section>

            <section className="container mx-auto px-4 py-16 max-w-3xl text-center">
                <h2 className="text-2xl font-bold mb-4">Running Alleaves? We&#39;ve already done this.</h2>
                <p className="text-muted-foreground mb-8">Get a free retention audit and we&#39;ll show you exactly what the Alleaves + BakedBot integration looks like in your market.</p>
                <div className="flex flex-wrap items-center justify-center gap-4">
                    <Button asChild size="lg" className="bg-emerald-600 hover:bg-emerald-700">
                        <Link href="/ai-retention-audit">Free retention audit <ArrowRight className="ml-2 h-4 w-4" /></Link>
                    </Button>
                    <Button asChild variant="outline" size="lg">
                        <Link href="/book">Book a call</Link>
                    </Button>
                </div>
            </section>
        </div>
    );
}
