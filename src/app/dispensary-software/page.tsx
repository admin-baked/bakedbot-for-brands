import type { Metadata } from 'next';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowRight, CheckCircle2, BarChart3, Users, ShieldCheck, Bot, Zap } from 'lucide-react';

export const metadata: Metadata = {
    title: 'Dispensary Software — Managed AI Platform for Cannabis Operators | BakedBot',
    description:
        'BakedBot is dispensary software that manages itself. AI-powered retention, competitive intel, compliance review, and weekly reporting — delivered as a managed service, not a tool you have to run. Live at Thrive Syracuse.',
    openGraph: {
        title: 'Dispensary Software — Managed AI Platform for Cannabis Operators | BakedBot',
        description: 'Cannabis dispensary software that actually runs your retention and intelligence — managed by AI, reported weekly. No dashboards to check. Proven at Thrive Syracuse.',
        url: 'https://bakedbot.ai/dispensary-software',
    },
    alternates: { canonical: 'https://bakedbot.ai/dispensary-software' },
};

const capabilities = [
    { icon: Users, title: 'Customer retention', description: 'Welcome flows, win-back campaigns, and lifecycle sequences that run automatically based on each customer\'s purchase behavior.' },
    { icon: BarChart3, title: 'Competitive intelligence', description: 'Daily pricing and menu tracking across every competitor in your market. You know what they\'re charging before you open the door.' },
    { icon: ShieldCheck, title: 'Compliance automation', description: 'Every customer-facing message reviewed by our compliance agent before send. OCM-aligned, 280E-aware, campaign-ready.' },
    { icon: Bot, title: '20+ AI agents working daily', description: 'A dedicated squad of AI agents handles outreach, analysis, reporting, and optimization — running on your behalf every single day.' },
    { icon: Zap, title: 'POS integration', description: 'Connects to Alleaves, Dutchie, Treez, and Cova. Real transaction data drives segmentation and campaign logic automatically.' },
    { icon: CheckCircle2, title: 'Weekly KPI reports', description: 'A plain-English report every week showing what the system did, what revenue it influenced, and what\'s coming next.' },
];

const tiers = [
    { name: 'Access Complete', price: '$750/mo', badge: 'Most popular entry', description: 'Tablet check-in + managed Welcome Playbook. Best for social equity and single-location operators wanting full managed onboarding.', href: '/pricing' },
    { name: 'Operator Core', price: '$2,500/mo', badge: 'Primary revenue engine', description: 'Full welcome + retention loop, 2–4 managed playbooks, weekly KPI reporting, and a named customer success manager.', href: '/pricing' },
    { name: 'Operator Growth', price: '$3,500/mo', badge: 'Multi-location', description: 'Everything in Core plus exec KPI reviews, pricing intelligence, 90-day roadmap, and priority support.', href: '/pricing' },
];

export default function DispensarySoftwarePage() {
    return (
        <div className="min-h-screen bg-background">
            {/* Hero */}
            <section className="border-b border-border/40 bg-gradient-to-b from-emerald-50/50 to-background">
                <div className="container mx-auto px-4 py-20 max-w-5xl">
                    <div className="max-w-3xl">
                        <Badge variant="outline" className="mb-4 bg-emerald-500/10 text-emerald-700 border-emerald-500/20">
                            Dispensary software
                        </Badge>
                        <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-6 leading-tight">
                            Dispensary software that manages itself
                        </h1>
                        <p className="text-xl text-muted-foreground leading-relaxed mb-8">
                            BakedBot is the AI operating layer for cannabis dispensaries. It handles retention, competitive tracking, compliance review, and weekly reporting — automatically. You don&#39;t configure it. You don&#39;t manage it. You read the weekly report and focus on the floor.
                        </p>
                        <div className="flex flex-wrap gap-4">
                            <Button asChild size="lg" className="bg-emerald-600 hover:bg-emerald-700">
                                <Link href="/ai-retention-audit">
                                    Get a free audit <ArrowRight className="ml-2 h-4 w-4" />
                                </Link>
                            </Button>
                            <Button asChild variant="outline" size="lg">
                                <Link href="/pricing">See plans</Link>
                            </Button>
                        </div>
                    </div>
                </div>
            </section>

            {/* Proof bar */}
            <section className="border-b border-border/40 bg-muted/30">
                <div className="container mx-auto px-4 py-5 max-w-5xl">
                    <p className="text-sm text-muted-foreground text-center">
                        <strong className="text-foreground">Live proof:</strong> Thrive Syracuse (social equity, NY) — Access Complete plan, Alleaves POS integrated, check-in tablet in-store, daily competitive tracking across 5 markets.
                    </p>
                </div>
            </section>

            {/* What it does */}
            <section className="container mx-auto px-4 py-16 max-w-5xl">
                <h2 className="text-2xl font-bold mb-8">What BakedBot does every day</h2>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {capabilities.map((c) => (
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

            {/* Plans */}
            <section className="border-t border-border/40 bg-muted/20">
                <div className="container mx-auto px-4 py-16 max-w-5xl">
                    <h2 className="text-2xl font-bold mb-2 text-center">Plans built for operators</h2>
                    <p className="text-muted-foreground text-center mb-10">Start with what you need. Upgrade when you&#39;re ready. Every plan includes a 30-day money-back guarantee.</p>
                    <div className="grid md:grid-cols-3 gap-6">
                        {tiers.map((t) => (
                            <Card key={t.name} className="border-border/60">
                                <CardContent className="p-6">
                                    <Badge variant="outline" className="mb-3 text-xs">{t.badge}</Badge>
                                    <h3 className="font-bold text-lg mb-1">{t.name}</h3>
                                    <p className="text-2xl font-bold text-emerald-600 mb-3">{t.price}</p>
                                    <p className="text-sm text-muted-foreground leading-relaxed mb-4">{t.description}</p>
                                    <Button asChild variant="outline" size="sm" className="w-full">
                                        <Link href={t.href}>See what&#39;s included <ArrowRight className="ml-1 h-3 w-3" /></Link>
                                    </Button>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </div>
            </section>

            {/* CTA */}
            <section className="container mx-auto px-4 py-16 max-w-3xl text-center">
                <h2 className="text-2xl font-bold mb-4">Start with a free retention audit</h2>
                <p className="text-muted-foreground mb-8">We analyze your competitive position and customer retention before you spend a dollar. If the numbers don&#39;t make the case, we&#39;ll tell you.</p>
                <Button asChild size="lg" className="bg-emerald-600 hover:bg-emerald-700">
                    <Link href="/ai-retention-audit">Get your free audit <ArrowRight className="ml-2 h-4 w-4" /></Link>
                </Button>
            </section>
        </div>
    );
}
