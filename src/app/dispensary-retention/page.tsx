import type { Metadata } from 'next';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowRight, TrendingUp, RefreshCw, Users, BarChart3, DollarSign, ShieldCheck } from 'lucide-react';

export const metadata: Metadata = {
    title: 'Dispensary Retention Software — Keep Customers Coming Back | BakedBot',
    description:
        'BakedBot is the dispensary retention platform that runs automatically. Capture first-party data, trigger win-back campaigns, and recover lost revenue — managed by AI, proven at Thrive Syracuse, NY.',
    openGraph: {
        title: 'Dispensary Retention Software — Keep Customers Coming Back | BakedBot',
        description: 'Stop losing dispensary customers to competitors. BakedBot\'s AI retention system captures, segments, and re-engages customers automatically. Proven at Thrive Syracuse.',
        url: 'https://bakedbot.ai/dispensary-retention',
    },
    alternates: { canonical: 'https://bakedbot.ai/dispensary-retention' },
};

const stats = [
    { label: 'Average days before a lost customer is gone for good', value: '45', unit: 'days' },
    { label: 'Dispensaries with an active win-back campaign running', value: '<20', unit: '%' },
    { label: 'Revenue recovery on reactivated churned customers', value: '4–8×', unit: 'ROI' },
];

const howItWorks = [
    { icon: Users, title: 'Capture', description: 'Tablet check-in and QR codes capture first-party customer data at point of purchase. No relying on third-party apps you don\'t own.' },
    { icon: BarChart3, title: 'Segment', description: 'AI automatically tags customers by recency, frequency, spend, and product preference. Every cohort has a different retention strategy.' },
    { icon: RefreshCw, title: 'Activate', description: 'Welcome sequences, re-engagement flows, and win-back campaigns fire automatically based on customer behavior. You don\'t trigger them — the system does.' },
    { icon: TrendingUp, title: 'Measure', description: 'Weekly KPI report ties every campaign back to real transactions. You see exactly what retention revenue the system generated.' },
    { icon: ShieldCheck, title: 'Comply', description: 'Every message reviewed by Deebo before send — OCM-aligned, cannabis-compliant. No guessing what\'s allowed.' },
    { icon: DollarSign, title: 'Prove', description: '30-day proof model. If you don\'t see measurable retention lift in 30 days, you get your money back.' },
];

export default function DispensaryRetentionPage() {
    return (
        <div className="min-h-screen bg-background">
            <section className="border-b border-border/40 bg-gradient-to-b from-emerald-50/50 to-background">
                <div className="container mx-auto px-4 py-20 max-w-5xl">
                    <div className="max-w-3xl">
                        <Badge variant="outline" className="mb-4 bg-emerald-500/10 text-emerald-700 border-emerald-500/20">
                            Retention software
                        </Badge>
                        <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-6 leading-tight">
                            Stop losing dispensary customers to the store down the street
                        </h1>
                        <p className="text-xl text-muted-foreground leading-relaxed mb-8">
                            Most dispensaries find out they&#39;re losing customers when their weekly revenue dips. By then, those customers are already on a competitor&#39;s loyalty list. BakedBot catches them before they leave — and brings them back automatically when they do.
                        </p>
                        <div className="flex flex-wrap gap-4">
                            <Button asChild size="lg" className="bg-emerald-600 hover:bg-emerald-700">
                                <Link href="/ai-retention-audit">Get your free retention audit <ArrowRight className="ml-2 h-4 w-4" /></Link>
                            </Button>
                            <Button asChild variant="outline" size="lg">
                                <Link href="/book">Book a founder call</Link>
                            </Button>
                        </div>
                    </div>
                </div>
            </section>

            {/* Stats */}
            <section className="border-b border-border/40 bg-muted/30">
                <div className="container mx-auto px-4 py-8 max-w-4xl">
                    <div className="grid grid-cols-3 gap-6 text-center">
                        {stats.map((s) => (
                            <div key={s.label}>
                                <div className="text-3xl font-bold text-emerald-600">{s.value}</div>
                                <div className="text-xs text-muted-foreground mt-1 leading-tight">{s.label}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* How it works */}
            <section className="container mx-auto px-4 py-16 max-w-5xl">
                <h2 className="text-2xl font-bold mb-3">The BakedBot retention loop</h2>
                <p className="text-muted-foreground mb-10">Six steps that run automatically from first visit to loyal repeat customer. Proven at Thrive Syracuse, a social equity dispensary in New York.</p>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {howItWorks.map((h) => (
                        <div key={h.title} className="flex gap-3">
                            <h.icon className="h-5 w-5 text-emerald-600 mt-0.5 shrink-0" />
                            <div>
                                <h3 className="font-semibold mb-1">{h.title}</h3>
                                <p className="text-sm text-muted-foreground leading-relaxed">{h.description}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            {/* Proof */}
            <section className="border-t border-border/40 bg-muted/20">
                <div className="container mx-auto px-4 py-12 max-w-4xl">
                    <Card className="border-emerald-200 bg-emerald-50/50">
                        <CardContent className="p-8">
                            <Badge variant="outline" className="bg-emerald-500/10 text-emerald-700 border-emerald-500/20 mb-4">Live proof</Badge>
                            <h3 className="font-bold text-lg mb-3">Thrive Syracuse: the system in production</h3>
                            <p className="text-muted-foreground leading-relaxed mb-4">
                                Thrive Syracuse is a social equity dispensary in New York operating on BakedBot&#39;s Access Complete plan. The full retention loop is live: check-in tablet deployed in-store, Alleaves POS integrated, automated welcome playbook and win-back campaigns running, daily competitor tracking across 5 nearby markets. This is not a demo — it&#39;s running in a real store.
                            </p>
                            <Button asChild className="bg-emerald-600 hover:bg-emerald-700">
                                <Link href="/ai-retention-audit">Get the same system <ArrowRight className="ml-2 h-4 w-4" /></Link>
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            </section>

            <section className="container mx-auto px-4 py-16 max-w-3xl text-center">
                <h2 className="text-2xl font-bold mb-4">See how much retention revenue you&#39;re leaving behind</h2>
                <p className="text-muted-foreground mb-8">Free retention audit. We analyze your customer patterns and show you the gap. No commitment required.</p>
                <div className="flex flex-wrap items-center justify-center gap-4">
                    <Button asChild size="lg" className="bg-emerald-600 hover:bg-emerald-700">
                        <Link href="/ai-retention-audit">Free retention audit <ArrowRight className="ml-2 h-4 w-4" /></Link>
                    </Button>
                    <Button asChild variant="outline" size="lg">
                        <Link href="/pricing">Pricing →</Link>
                    </Button>
                </div>
            </section>
        </div>
    );
}
